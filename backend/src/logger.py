"""
Structured Logging Configuration
Sets up JSON-formatted logs for ELK/Grafana Loki ingestion.
"""

import logging
import json
import time
import sys
import os
from datetime import datetime
from typing import Any


class JSONFormatter(logging.Formatter):
    """
    Formats log records as structured JSON for ELK/Loki.
    Each log line is a single JSON object.
    """

    SERVICE_NAME = os.environ.get("SERVICE_NAME", "ecotronics")
    SERVICE_VERSION = os.environ.get("SERVICE_VERSION", "1.0.0")
    ENVIRONMENT = os.environ.get("ENVIRONMENT", "development")

    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "service": self.SERVICE_NAME,
            "version": self.SERVICE_VERSION,
            "environment": self.ENVIRONMENT,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        # Add exception info
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)

        # Add extra fields from log call
        extra_keys = {
            k: v for k, v in record.__dict__.items()
            if k not in {
                "name", "msg", "args", "levelname", "levelno", "pathname",
                "filename", "module", "exc_info", "exc_text", "stack_info",
                "lineno", "funcName", "created", "msecs", "relativeCreated",
                "thread", "threadName", "processName", "process", "message",
            }
        }
        if extra_keys:
            log_entry["extra"] = extra_keys

        return json.dumps(log_entry, default=str)


class RequestLogger:
    """Log HTTP requests in structured format"""

    def __init__(self, logger: logging.Logger):
        self.logger = logger

    def log_request(
        self,
        method: str,
        path: str,
        status_code: int,
        latency_ms: float,
        tenant_id: str = "",
        device_id: str = "",
        client_ip: str = "",
    ):
        level = logging.WARNING if status_code >= 400 else logging.INFO
        self.logger.log(
            level,
            f"{method} {path} {status_code}",
            extra={
                "http_method": method,
                "http_path": path,
                "http_status": status_code,
                "latency_ms": round(latency_ms, 2),
                "tenant_id": tenant_id,
                "device_id": device_id,
                "client_ip": client_ip,
                "log_type": "http_request",
            }
        )

    def log_ingest(
        self,
        device_id: str,
        tenant_id: str,
        pm25: float,
        aqi: float,
        latency_ms: float,
        anomaly: bool = False,
    ):
        self.logger.info(
            f"Ingest: device={device_id} pm25={pm25:.1f} aqi={aqi:.0f}",
            extra={
                "log_type": "device_ingest",
                "device_id": device_id,
                "tenant_id": tenant_id,
                "pm25": pm25,
                "aqi": aqi,
                "latency_ms": round(latency_ms, 2),
                "anomaly_detected": anomaly,
            }
        )

    def log_alert(
        self,
        alert_id: str,
        device_id: str,
        tenant_id: str,
        rule_id: str,
        severity: str,
    ):
        self.logger.warning(
            f"Alert fired: rule={rule_id} device={device_id} severity={severity}",
            extra={
                "log_type": "alert_fired",
                "alert_id": alert_id,
                "device_id": device_id,
                "tenant_id": tenant_id,
                "rule_id": rule_id,
                "severity": severity,
            }
        )

    def log_ml_prediction(
        self,
        device_id: str,
        prediction_type: str,
        result: Any,
        latency_ms: float,
        model_version: str = "unknown",
    ):
        self.logger.info(
            f"ML prediction: type={prediction_type} device={device_id}",
            extra={
                "log_type": "ml_prediction",
                "device_id": device_id,
                "prediction_type": prediction_type,
                "result": str(result),
                "latency_ms": round(latency_ms, 2),
                "model_version": model_version,
            }
        )

    def log_security_event(
        self,
        event_type: str,
        client_ip: str,
        detail: str,
        tenant_id: str = "",
    ):
        self.logger.warning(
            f"Security event: {event_type} from {client_ip}",
            extra={
                "log_type": "security_event",
                "event_type": event_type,
                "client_ip": client_ip,
                "tenant_id": tenant_id,
                "detail": detail,
            }
        )


def setup_logging(
    service_name: str = "ecotronics",
    level: str = "INFO",
    json_format: bool = True,
) -> logging.Logger:
    """
    Configure structured logging for the service.
    In development: human-readable format.
    In production: JSON for ELK/Loki.
    """
    os.environ["SERVICE_NAME"] = service_name

    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, level.upper(), logging.INFO))

    # Remove existing handlers
    root_logger.handlers.clear()

    handler = logging.StreamHandler(sys.stdout)

    if json_format or os.environ.get("ENVIRONMENT") == "production":
        handler.setFormatter(JSONFormatter())
    else:
        handler.setFormatter(logging.Formatter(
            "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        ))

    root_logger.addHandler(handler)

    # File handler for persistent logs
    log_dir = os.environ.get("LOG_DIR", "logs")
    os.makedirs(log_dir, exist_ok=True)
    file_handler = logging.FileHandler(f"{log_dir}/{service_name}.log")
    file_handler.setFormatter(JSONFormatter())
    root_logger.addHandler(file_handler)

    logger = logging.getLogger(service_name)
    logger.info(
        f"Logging initialized",
        extra={"service": service_name, "level": level, "json_format": json_format}
    )
    return logger
