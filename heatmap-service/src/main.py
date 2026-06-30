"""
Heatmap & City Aggregation Service
Aggregates device readings to ward-level AQI with spatial smoothing
"""

import sys
import os
import json
import math
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

from ward_data import NAGPUR_WARDS
from aggregator import WardAggregator
from aqi_calculator import AQICalculator

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

aggregator: Optional[WardAggregator] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global aggregator
    logger.info("Starting Heatmap Service...")
    aggregator = WardAggregator(wards=NAGPUR_WARDS)
    aggregator.seed_demo_data()
    logger.info(f"✓ Aggregator ready with {len(NAGPUR_WARDS)} wards")
    yield
    logger.info("Shutting down Heatmap Service...")


app = FastAPI(
    title="EcoTronics Heatmap Service",
    description="Ward-level AQI aggregation and heatmap API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────
# HEALTH
# ─────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "heatmap-service",
        "wards": len(NAGPUR_WARDS),
        "timestamp": datetime.utcnow().isoformat(),
    }


# ─────────────────────────────────────────────
# HEATMAP — GeoJSON with AQI per ward
# ─────────────────────────────────────────────

@app.get("/api/v1/map/heatmap")
async def get_heatmap(
    ts: Optional[str] = Query(None, description="ISO timestamp (default: now)"),
    metric: str = Query("aqi", description="Metric: aqi | pm25 | co | nox"),
):
    """
    Returns GeoJSON FeatureCollection with ward polygons coloured by AQI.
    Each feature has properties: ward_id, ward_name, aqi, pm25, co, nox, device_count, category
    """
    if not aggregator:
        raise HTTPException(status_code=503, detail="Aggregator not ready")

    target_ts = datetime.fromisoformat(ts) if ts else datetime.utcnow()
    geojson = aggregator.get_heatmap_geojson(target_ts=target_ts, metric=metric)
    return JSONResponse(content=geojson)


@app.get("/api/v1/map/heatmap/timeseries")
async def get_heatmap_timeseries(
    ward_id: str = Query(..., description="Ward identifier"),
    hours: int = Query(24, description="Hours of history (max 168)"),
    metric: str = Query("aqi"),
):
    """Returns time-series AQI data for a specific ward"""
    if not aggregator:
        raise HTTPException(status_code=503, detail="Aggregator not ready")

    hours = min(hours, 168)
    series = aggregator.get_ward_timeseries(ward_id=ward_id, hours=hours, metric=metric)
    return {"ward_id": ward_id, "metric": metric, "series": series}


@app.get("/api/v1/map/wards")
async def list_wards():
    """List all wards with metadata"""
    return {
        "wards": [
            {
                "id": w["id"],
                "name": w["name"],
                "zone": w["zone"],
                "center": w["center"],
            }
            for w in NAGPUR_WARDS
        ],
        "total": len(NAGPUR_WARDS),
    }


@app.get("/api/v1/map/wards/{ward_id}")
async def get_ward_detail(ward_id: str):
    """Get detailed stats for a specific ward"""
    if not aggregator:
        raise HTTPException(status_code=503, detail="Aggregator not ready")

    detail = aggregator.get_ward_detail(ward_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Ward not found")
    return detail


@app.get("/api/v1/map/city/summary")
async def get_city_summary():
    """City-wide AQI summary stats"""
    if not aggregator:
        raise HTTPException(status_code=503, detail="Aggregator not ready")

    return aggregator.get_city_summary()


# ─────────────────────────────────────────────
# INGEST — receive a device reading and update ward
# ─────────────────────────────────────────────

@app.post("/api/v1/map/ingest")
async def ingest_reading(payload: dict):
    """
    Ingest a device reading and update the ward aggregation.
    Called by the Data Ingestion Service on every new reading.
    """
    if not aggregator:
        raise HTTPException(status_code=503, detail="Aggregator not ready")

    device_id = payload.get("device_id")
    lat = payload.get("lat")
    lon = payload.get("lon")

    if not all([device_id, lat, lon]):
        raise HTTPException(status_code=400, detail="device_id, lat, lon required")

    ward_id = aggregator.assign_device_to_ward(device_id=device_id, lat=lat, lon=lon)
    aggregator.update_ward(ward_id=ward_id, reading=payload)

    return {
        "device_id": device_id,
        "assigned_ward": ward_id,
        "timestamp": datetime.utcnow().isoformat(),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
