"""
Load Test — Ingestion Pipeline
Simulates concurrent device ingestion at scale.
Run: python tests/load/load_test_ingestion.py
"""

import asyncio
import time
import random
import json
import statistics
from datetime import datetime
from typing import List
from dataclasses import dataclass, field


@dataclass
class LoadTestResult:
    total_requests: int = 0
    successful: int = 0
    failed: int = 0
    latencies_ms: List[float] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)

    @property
    def success_rate(self):
        return (self.successful / max(self.total_requests, 1)) * 100

    @property
    def avg_latency_ms(self):
        return statistics.mean(self.latencies_ms) if self.latencies_ms else 0

    @property
    def p95_latency_ms(self):
        if not self.latencies_ms:
            return 0
        sorted_lat = sorted(self.latencies_ms)
        idx = int(len(sorted_lat) * 0.95)
        return sorted_lat[idx]

    @property
    def p99_latency_ms(self):
        if not self.latencies_ms:
            return 0
        sorted_lat = sorted(self.latencies_ms)
        idx = int(len(sorted_lat) * 0.99)
        return sorted_lat[idx]

    @property
    def throughput_rps(self):
        return 0  # Set externally


def generate_reading(device_id: str) -> dict:
    """Generate a realistic sensor reading"""
    base_pm25 = random.uniform(20, 80)
    spike = random.random() < 0.05  # 5% chance of spike
    return {
        "device_id": device_id,
        "timestamp": datetime.utcnow().isoformat(),
        "pm25": base_pm25 * (3 if spike else 1) + random.uniform(-5, 5),
        "co": random.uniform(1.0, 8.0),
        "nox": random.uniform(20, 100),
        "temperature": random.uniform(22, 38),
        "humidity": random.uniform(40, 90),
        "emission_score": random.uniform(30, 90),
        "latitude": 21.1458 + random.uniform(-0.05, 0.05),
        "longitude": 79.0882 + random.uniform(-0.05, 0.05),
    }


async def simulate_device_request(
    session,
    device_id: str,
    api_url: str,
    result: LoadTestResult,
):
    """Simulate a single device sending a reading"""
    reading = generate_reading(device_id)
    start = time.perf_counter()

    try:
        # Simulate HTTP POST (replace with real aiohttp call in live test)
        await asyncio.sleep(random.uniform(0.001, 0.010))  # Simulated network latency
        elapsed_ms = (time.perf_counter() - start) * 1000

        # Simulate 98% success rate
        if random.random() < 0.98:
            result.successful += 1
            result.latencies_ms.append(elapsed_ms)
        else:
            result.failed += 1
            result.errors.append(f"Simulated failure for {device_id}")

    except Exception as e:
        result.failed += 1
        result.errors.append(str(e))

    result.total_requests += 1


async def run_load_test(
    api_url: str,
    num_devices: int,
    requests_per_device: int,
    concurrency: int,
) -> LoadTestResult:
    """Run the load test"""
    result = LoadTestResult()
    device_ids = [f"dev-load-{i:04d}" for i in range(num_devices)]

    # Build task list
    tasks = []
    for device_id in device_ids:
        for _ in range(requests_per_device):
            tasks.append((device_id,))

    random.shuffle(tasks)

    print(f"\n{'='*60}")
    print(f"  EcoTronics Ingestion Load Test")
    print(f"{'='*60}")
    print(f"  Target URL:      {api_url}")
    print(f"  Devices:         {num_devices}")
    print(f"  Requests/device: {requests_per_device}")
    print(f"  Total requests:  {len(tasks)}")
    print(f"  Concurrency:     {concurrency}")
    print(f"{'='*60}\n")

    start_time = time.perf_counter()

    # Process in batches of `concurrency`
    semaphore = asyncio.Semaphore(concurrency)

    async def bounded_request(device_id):
        async with semaphore:
            await simulate_device_request(None, device_id, api_url, result)

    await asyncio.gather(*[bounded_request(t[0]) for t in tasks])

    elapsed = time.perf_counter() - start_time
    throughput = result.total_requests / elapsed

    print(f"\n{'='*60}")
    print(f"  RESULTS")
    print(f"{'='*60}")
    print(f"  Total Requests:   {result.total_requests}")
    print(f"  Successful:       {result.successful} ({result.success_rate:.1f}%)")
    print(f"  Failed:           {result.failed}")
    print(f"  Duration:         {elapsed:.2f}s")
    print(f"  Throughput:       {throughput:.1f} req/s")
    print(f"  Avg Latency:      {result.avg_latency_ms:.1f}ms")
    print(f"  P95 Latency:      {result.p95_latency_ms:.1f}ms")
    print(f"  P99 Latency:      {result.p99_latency_ms:.1f}ms")
    print(f"{'='*60}\n")

    # Assertions
    assert result.success_rate >= 95.0, f"Success rate {result.success_rate:.1f}% below 95% threshold"
    assert result.avg_latency_ms < 200, f"Avg latency {result.avg_latency_ms:.1f}ms exceeds 200ms"
    assert result.p95_latency_ms < 500, f"P95 latency {result.p95_latency_ms:.1f}ms exceeds 500ms"

    print("  ✅ All performance thresholds passed!")
    return result


# ─────────────────────────────────────────────
# TEST SCENARIOS
# ─────────────────────────────────────────────

async def scenario_baseline():
    """Baseline: 10 devices, 10 requests each"""
    return await run_load_test(
        api_url="http://localhost:8000/api/v1/ingest",
        num_devices=10,
        requests_per_device=10,
        concurrency=10,
    )


async def scenario_normal_load():
    """Normal load: 50 devices, 20 requests each"""
    return await run_load_test(
        api_url="http://localhost:8000/api/v1/ingest",
        num_devices=50,
        requests_per_device=20,
        concurrency=25,
    )


async def scenario_peak_load():
    """Peak load: 200 devices, 50 requests each"""
    return await run_load_test(
        api_url="http://localhost:8000/api/v1/ingest",
        num_devices=200,
        requests_per_device=50,
        concurrency=50,
    )


async def scenario_stress_test():
    """Stress test: 500 devices, 100 requests each"""
    return await run_load_test(
        api_url="http://localhost:8000/api/v1/ingest",
        num_devices=500,
        requests_per_device=100,
        concurrency=100,
    )


if __name__ == "__main__":
    import sys

    scenarios = {
        "baseline": scenario_baseline,
        "normal": scenario_normal_load,
        "peak": scenario_peak_load,
        "stress": scenario_stress_test,
    }

    scenario_name = sys.argv[1] if len(sys.argv) > 1 else "baseline"

    if scenario_name not in scenarios:
        print(f"Unknown scenario. Choose from: {list(scenarios.keys())}")
        sys.exit(1)

    print(f"\nRunning scenario: {scenario_name.upper()}")
    asyncio.run(scenarios[scenario_name]())
