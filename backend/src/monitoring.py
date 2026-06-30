"""
Metrics & Health Monitoring
Exposes Prometheus-compatible metrics and structured health endpoints.
"""

import time
import logging
import os
import psutil
from datetime import datetime, timedelta
from typing import Dict, Optional
from collections import defaultdict, deque
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


# ════════════════════════════════════════════
# METRICS STORE
# ════════════════════════════════════════════

@dataclass
class Counter:
    name: str
    value: float = 0.0
    labels: dict = field(default_factory=dict)

    def inc(self, amount: float = 1.0):
        self.value += amount


@dataclass
class Gauge:
    name: str
    value: float = 0.0

    def set(self, v: float):
        self.value = v

    def inc(self, amount: float = 1.0):
        self.value += amount

    def dec(self, amount: float = 1.0):
        self.value -= amount


@dataclass
class Histogram:
    name: str
    buckets: list = field(default_factory=lambda: [5, 10, 25, 50, 100, 250, 500, 1000, 2500])
    _observations: deque = field(default_factory=lambda: deque(maxlen=10000))

    def observe(self, value: float):
        self._observations.append(value)

    @property
    def count(self):
        return len(self._observations)

    @property
    def sum(self):
        return sum(self._observations)

    @property
    def avg(self):
        return self.sum / max(self.count, 1)

    def percentile(self, p: float) -> float:
        if not self._observations:
            return 0.0
        sorted_obs = sorted(self._observations)
        idx = int(len(sorted_obs) * p / 100)
        return sorted_obs[min(idx, len(sorted_obs) - 1)]


class MetricsRegistry:
    """Central metrics registry"""

    def __init__(self):
        self._start_time = time.time()

        # ── Ingestion Metrics ──
        self.ingest_total = Counter("ecotronics_ingest_total")
        self.ingest_errors = Counter("ecotronics_ingest_errors_total")
        self.ingest_latency = Histogram("ecotronics_ingest_latency_ms")
        self.ingest_rate = Gauge("ecotronics_ingest_rate_per_minute")

        # ── Device Metrics ──
        self.devices_total = Gauge("ecotronics_devices_total")
        self.devices_online = Gauge("ecotronics_devices_online")
        self.devices_offline = Gauge("ecotronics_devices_offline")
        self.device_offline_rate = Gauge("ecotronics_device_offline_rate_pct")

        # ── ML Metrics ──
        self.ml_predictions_total = Counter("ecotronics_ml_predictions_total")
        self.ml_latency = Histogram("ecotronics_ml_latency_ms")
        self.ml_errors = Counter("ecotronics_ml_errors_total")
        self.anomalies_detected = Counter("ecotronics_anomalies_detected_total")

        # ── Alert Metrics ──
        self.alerts_fired = Counter("ecotronics_alerts_fired_total")
        self.alerts_acknowledged = Counter("ecotronics_alerts_acknowledged_total")
        self.alerts_active = Gauge("ecotronics_alerts_active")

        # ── API Metrics ──
        self.http_requests_total = Counter("ecotronics_http_requests_total")
        self.http_errors_total = Counter("ecotronics_http_errors_total")
        self.http_latency = Histogram("ecotronics_http_latency_ms")
        self.rate_limit_hits = Counter("ecotronics_rate_limit_hits_total")

        # ── System Metrics ──
        self.memory_usage_mb = Gauge("ecotronics_memory_usage_mb")
        self.cpu_usage_pct = Gauge("ecotronics_cpu_usage_pct")

        # ── Ingest rate tracking (sliding window) ──
        self._ingest_timestamps: deque = deque(maxlen=10000)

    def record_ingest(self, latency_ms: float, success: bool = True):
        """Record a device ingestion event"""
        self.ingest_total.inc()
        self._ingest_timestamps.append(time.time())
        if success:
            self.ingest_latency.observe(latency_ms)
        else:
            self.ingest_errors.inc()

        # Update rate (last 60s)
        now = time.time()
        recent = [t for t in self._ingest_timestamps if t > now - 60]
        self.ingest_rate.set(len(recent))

    def record_ml_prediction(self, latency_ms: float, success: bool = True):
        """Record an ML prediction event"""
        self.ml_predictions_total.inc()
        if success:
            self.ml_latency.observe(latency_ms)
        else:
            self.ml_errors.inc()

    def record_http_request(self, path: str, status_code: int, latency_ms: float):
        """Record an HTTP request"""
        self.http_requests_total.inc()
        self.http_latency.observe(latency_ms)
        if status_code >= 400:
            self.http_errors_total.inc()

    def update_system_metrics(self):
        """Update system resource metrics"""
        try:
            process = psutil.Process()
            self.memory_usage_mb.set(process.memory_info().rss / 1024 / 1024)
            self.cpu_usage_pct.set(process.cpu_percent(interval=0.1))
        except Exception:
            pass

    def update_device_metrics(self, total: int, online: int):
        """Update device online/offline metrics"""
        self.devices_total.set(total)
        self.devices_online.set(online)
        self.devices_offline.set(total - online)
        if total > 0:
            self.device_offline_rate.set(round((total - online) / total * 100, 1))

    def to_prometheus(self) -> str:
        """Export metrics in Prometheus text format"""
        lines = []
        uptime = time.time() - self._start_time

        def gauge_line(name, value, help_text=""):
            if help_text:
                lines.append(f"# HELP {name} {help_text}")
            lines.append(f"# TYPE {name} gauge")
            lines.append(f"{name} {value:.4f}")

        def counter_line(name, value, help_text=""):
            if help_text:
                lines.append(f"# HELP {name} {help_text}")
            lines.append(f"# TYPE {name} counter")
            lines.append(f"{name}_total {value:.0f}")

        self.update_system_metrics()

        gauge_line("ecotronics_uptime_seconds", uptime, "Service uptime in seconds")
        counter_line("ecotronics_ingest", self.ingest_total.value, "Total ingestion requests")
        counter_line("ecotronics_ingest_errors", self.ingest_errors.value, "Total ingestion errors")
        gauge_line("ecotronics_ingest_rate_per_minute", self.ingest_rate.value, "Ingestion rate per minute")
        gauge_line("ecotronics_ingest_latency_avg_ms", self.ingest_latency.avg, "Average ingestion latency ms")
        gauge_line("ecotronics_ingest_latency_p95_ms", self.ingest_latency.percentile(95), "P95 ingestion latency ms")
        gauge_line("ecotronics_devices_total", self.devices_total.value, "Total registered devices")
        gauge_line("ecotronics_devices_online", self.devices_online.value, "Devices online")
        gauge_line("ecotronics_device_offline_rate_pct", self.device_offline_rate.value, "Device offline rate %")
        counter_line("ecotronics_ml_predictions", self.ml_predictions_total.value, "Total ML predictions")
        gauge_line("ecotronics_ml_latency_avg_ms", self.ml_latency.avg, "Average ML latency ms")
        counter_line("ecotronics_anomalies_detected", self.anomalies_detected.value, "Total anomalies detected")
        counter_line("ecotronics_alerts_fired", self.alerts_fired.value, "Total alerts fired")
        gauge_line("ecotronics_alerts_active", self.alerts_active.value, "Currently active alerts")
        gauge_line("ecotronics_memory_usage_mb", self.memory_usage_mb.value, "Memory usage MB")
        gauge_line("ecotronics_cpu_usage_pct", self.cpu_usage_pct.value, "CPU usage %")

        return "\n".join(lines) + "\n"

    def to_dict(self) -> dict:
        """Export metrics as JSON-serializable dict"""
        self.update_system_metrics()
        return {
            "uptime_seconds": round(time.time() - self._start_time, 1),
            "ingestion": {
                "total": self.ingest_total.value,
                "errors": self.ingest_errors.value,
                "rate_per_minute": self.ingest_rate.value,
                "latency_avg_ms": round(self.ingest_latency.avg, 2),
                "latency_p95_ms": round(self.ingest_latency.percentile(95), 2),
                "latency_p99_ms": round(self.ingest_latency.percentile(99), 2),
            },
            "devices": {
                "total": self.devices_total.value,
                "online": self.devices_online.value,
                "offline": self.devices_offline.value,
                "offline_rate_pct": self.device_offline_rate.value,
            },
            "ml": {
                "predictions_total": self.ml_predictions_total.value,
                "latency_avg_ms": round(self.ml_latency.avg, 2),
                "latency_p95_ms": round(self.ml_latency.percentile(95), 2),
                "errors": self.ml_errors.value,
                "anomalies_detected": self.anomalies_detected.value,
            },
            "alerts": {
                "fired_total": self.alerts_fired.value,
                "acknowledged_total": self.alerts_acknowledged.value,
                "active": self.alerts_active.value,
            },
            "http": {
                "requests_total": self.http_requests_total.value,
                "errors_total": self.http_errors_total.value,
                "latency_avg_ms": round(self.http_latency.avg, 2),
                "rate_limit_hits": self.rate_limit_hits.value,
            },
            "system": {
                "memory_mb": round(self.memory_usage_mb.value, 1),
                "cpu_pct": round(self.cpu_usage_pct.value, 1),
            },
            "timestamp": datetime.utcnow().isoformat(),
        }


# ════════════════════════════════════════════
# HEALTH CHECK
# ════════════════════════════════════════════

class HealthChecker:
    """
    Structured health checks for all service dependencies.
    Returns detailed status for /health/detailed endpoint.
    """

    def __init__(self, service_name: str, version: str = "1.0.0"):
        self.service_name = service_name
        self.version = version
        self._start_time = datetime.utcnow()
        self._checks: Dict[str, callable] = {}

    def register_check(self, name: str, check_fn: callable):
        """Register a health check function"""
        self._checks[name] = check_fn

    async def run_checks(self) -> dict:
        """Run all registered health checks"""
        results = {}
        overall_healthy = True

        for name, check_fn in self._checks.items():
            try:
                start = time.perf_counter()
                result = await check_fn() if asyncio_check(check_fn) else check_fn()
                elapsed_ms = (time.perf_counter() - start) * 1000

                results[name] = {
                    "status": "healthy" if result else "unhealthy",
                    "latency_ms": round(elapsed_ms, 2),
                }
                if not result:
                    overall_healthy = False

            except Exception as e:
                results[name] = {
                    "status": "error",
                    "error": str(e),
                }
                overall_healthy = False

        uptime = datetime.utcnow() - self._start_time

        return {
            "service": self.service_name,
            "version": self.version,
            "status": "healthy" if overall_healthy else "degraded",
            "uptime_seconds": int(uptime.total_seconds()),
            "checks": results,
            "timestamp": datetime.utcnow().isoformat(),
        }

    def simple_health(self) -> dict:
        """Simple health check for load balancer probes"""
        return {
            "status": "healthy",
            "service": self.service_name,
            "version": self.version,
            "timestamp": datetime.utcnow().isoformat(),
        }


def asyncio_check(fn) -> bool:
    """Check if a function is async"""
    import asyncio
    return asyncio.iscoroutinefunction(fn)


# ════════════════════════════════════════════
# BUILT-IN HEALTH CHECKS
# ════════════════════════════════════════════

def check_disk_space(min_free_gb: float = 1.0) -> bool:
    """Check if disk has enough free space"""
    try:
        usage = psutil.disk_usage("/")
        free_gb = usage.free / (1024 ** 3)
        return free_gb >= min_free_gb
    except Exception:
        return True  # Non-critical


def check_memory(max_usage_pct: float = 90.0) -> bool:
    """Check if memory usage is within bounds"""
    try:
        mem = psutil.virtual_memory()
        return mem.percent < max_usage_pct
    except Exception:
        return True


def check_env_vars(required_vars: list) -> bool:
    """Check that required environment variables are set"""
    return all(os.environ.get(var) for var in required_vars)


# Singleton metrics registry
metrics = MetricsRegistry()
