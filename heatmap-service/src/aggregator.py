"""
Ward Aggregator
- Point-in-polygon device assignment
- Hourly AQI aggregation per ward
- Inverse-distance weighting (IDW) spatial smoothing
- In-memory time-series store
"""

import math
import random
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from collections import defaultdict, deque

from aqi_calculator import AQICalculator

logger = logging.getLogger(__name__)

# Keep 7 days of hourly snapshots per ward
MAX_HISTORY_HOURS = 168


class WardAggregator:

    def __init__(self, wards: List[dict]):
        self.wards = {w["id"]: w for w in wards}

        # Current live readings per ward: ward_id → list of recent readings
        self._live: Dict[str, deque] = {
            wid: deque(maxlen=100) for wid in self.wards
        }

        # Device → ward mapping cache
        self._device_ward: Dict[str, str] = {}

        # Hourly snapshots: ward_id → deque of {ts, aqi, pm25, co, nox}
        self._history: Dict[str, deque] = {
            wid: deque(maxlen=MAX_HISTORY_HOURS) for wid in self.wards
        }

        # Current aggregated values per ward
        self._current: Dict[str, dict] = {}

        logger.info(f"WardAggregator initialized with {len(wards)} wards")

    # ──────────────────────────────────────────────
    # POINT-IN-POLYGON (ray casting)
    # ──────────────────────────────────────────────

    def _point_in_polygon(self, lat: float, lon: float, polygon: List[List[float]]) -> bool:
        """Ray casting algorithm for point-in-polygon test"""
        n = len(polygon)
        inside = False
        j = n - 1
        for i in range(n):
            xi, yi = polygon[i]
            xj, yj = polygon[j]
            if ((yi > lat) != (yj > lat)) and (lon < (xj - xi) * (lat - yi) / (yj - yi + 1e-10) + xi):
                inside = not inside
            j = i
        return inside

    def _nearest_ward(self, lat: float, lon: float) -> str:
        """Find nearest ward center as fallback"""
        best_id = list(self.wards.keys())[0]
        best_dist = float("inf")
        for wid, ward in self.wards.items():
            cx, cy = ward["center"]
            dist = math.sqrt((lon - cx) ** 2 + (lat - cy) ** 2)
            if dist < best_dist:
                best_dist = dist
                best_id = wid
        return best_id

    def assign_device_to_ward(self, device_id: str, lat: float, lon: float) -> str:
        """Assign a device to a ward using point-in-polygon, with nearest fallback"""
        if device_id in self._device_ward:
            return self._device_ward[device_id]

        for wid, ward in self.wards.items():
            if self._point_in_polygon(lat, lon, ward["polygon"]):
                self._device_ward[device_id] = wid
                logger.info(f"Device {device_id} assigned to ward {wid}")
                return wid

        # Fallback: nearest ward center
        wid = self._nearest_ward(lat, lon)
        self._device_ward[device_id] = wid
        logger.info(f"Device {device_id} assigned to nearest ward {wid} (fallback)")
        return wid

    # ──────────────────────────────────────────────
    # INGESTION & AGGREGATION
    # ──────────────────────────────────────────────

    def update_ward(self, ward_id: str, reading: dict):
        """Add a new reading to the ward's live buffer and recompute aggregation"""
        if ward_id not in self._live:
            logger.warning(f"Unknown ward: {ward_id}")
            return

        self._live[ward_id].append({
            "ts": datetime.utcnow().isoformat(),
            "pm25": float(reading.get("pm25", 0)),
            "co": float(reading.get("co", 0)),
            "nox": float(reading.get("nox", 0)),
            "emission_score": float(reading.get("emission_score", 0)),
        })

        self._recompute_ward(ward_id)

    def _recompute_ward(self, ward_id: str):
        """Recompute aggregated AQI for a ward from live readings"""
        readings = list(self._live[ward_id])
        if not readings:
            return

        avg_pm25 = sum(r["pm25"] for r in readings) / len(readings)
        avg_co = sum(r["co"] for r in readings) / len(readings)
        avg_nox = sum(r["nox"] for r in readings) / len(readings)
        aqi = AQICalculator.composite_aqi(pm25=avg_pm25, co=avg_co, nox=avg_nox)
        category = AQICalculator.get_category(aqi)

        self._current[ward_id] = {
            "ward_id": ward_id,
            "aqi": round(aqi, 1),
            "pm25": round(avg_pm25, 1),
            "co": round(avg_co, 1),
            "nox": round(avg_nox, 1),
            "device_count": len(readings),
            "category": category["label"],
            "color": category["color"],
            "updated_at": datetime.utcnow().isoformat(),
        }

    # ──────────────────────────────────────────────
    # SPATIAL SMOOTHING (IDW)
    # ──────────────────────────────────────────────

    def _idw_smooth(self, ward_id: str, metric: str, power: float = 2.0) -> float:
        """
        Inverse-Distance Weighting smoothing.
        Wards with no devices borrow from nearby wards weighted by 1/d^power.
        """
        if ward_id in self._current and self._current[ward_id]["device_count"] > 0:
            return self._current[ward_id].get(metric, 0)

        # Collect all wards that have data
        cx, cy = self.wards[ward_id]["center"]
        total_weight = 0.0
        weighted_sum = 0.0

        for wid, data in self._current.items():
            if wid == ward_id or data.get("device_count", 0) == 0:
                continue
            wx, wy = self.wards[wid]["center"]
            dist = math.sqrt((cx - wx) ** 2 + (cy - wy) ** 2)
            if dist < 1e-6:
                return data.get(metric, 0)
            weight = 1.0 / (dist ** power)
            weighted_sum += weight * data.get(metric, 0)
            total_weight += weight

        if total_weight == 0:
            return 0.0
        return round(weighted_sum / total_weight, 1)

    # ──────────────────────────────────────────────
    # GEOJSON OUTPUT
    # ──────────────────────────────────────────────

    def get_heatmap_geojson(self, target_ts: datetime, metric: str = "aqi") -> dict:
        """Build GeoJSON FeatureCollection for all wards"""
        features = []

        for wid, ward in self.wards.items():
            data = self._current.get(wid, {})

            # Apply IDW smoothing for wards without devices
            aqi = self._idw_smooth(wid, "aqi") if not data else data.get("aqi", 0)
            pm25 = self._idw_smooth(wid, "pm25") if not data else data.get("pm25", 0)
            co = self._idw_smooth(wid, "co") if not data else data.get("co", 0)
            nox = self._idw_smooth(wid, "nox") if not data else data.get("nox", 0)

            category = AQICalculator.get_category(aqi)
            metric_value = {"aqi": aqi, "pm25": pm25, "co": co, "nox": nox}.get(metric, aqi)

            feature = {
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[[p[0], p[1]] for p in ward["polygon"]]],
                },
                "properties": {
                    "ward_id": wid,
                    "ward_name": ward["name"],
                    "zone": ward["zone"],
                    "aqi": aqi,
                    "pm25": pm25,
                    "co": co,
                    "nox": nox,
                    "metric_value": metric_value,
                    "device_count": data.get("device_count", 0),
                    "category": category["label"],
                    "color": category["color"],
                    "population": ward.get("population", 0),
                    "updated_at": data.get("updated_at", target_ts.isoformat()),
                },
            }
            features.append(feature)

        return {
            "type": "FeatureCollection",
            "features": features,
            "metadata": {
                "timestamp": target_ts.isoformat(),
                "metric": metric,
                "ward_count": len(features),
                "generated_at": datetime.utcnow().isoformat(),
            },
        }

    # ──────────────────────────────────────────────
    # TIME-SERIES
    # ──────────────────────────────────────────────

    def get_ward_timeseries(self, ward_id: str, hours: int, metric: str) -> List[dict]:
        """Get historical time-series for a ward"""
        if ward_id not in self._history:
            return []

        history = list(self._history[ward_id])
        cutoff = datetime.utcnow() - timedelta(hours=hours)

        return [
            {"ts": h["ts"], "value": h.get(metric, 0)}
            for h in history
            if datetime.fromisoformat(h["ts"]) >= cutoff
        ]

    def get_ward_detail(self, ward_id: str) -> Optional[dict]:
        """Get detailed stats for a ward"""
        if ward_id not in self.wards:
            return None

        ward = self.wards[ward_id]
        current = self._current.get(ward_id, {})
        history = list(self._history[ward_id])

        return {
            **ward,
            "current": current,
            "history_24h": history[-24:] if history else [],
            "device_ids": [
                did for did, wid in self._device_ward.items() if wid == ward_id
            ],
        }

    def get_city_summary(self) -> dict:
        """City-wide summary statistics"""
        if not self._current:
            return {"status": "no_data"}

        aqis = [v["aqi"] for v in self._current.values() if "aqi" in v]
        if not aqis:
            return {"status": "no_data"}

        city_aqi = round(sum(aqis) / len(aqis), 1)
        category = AQICalculator.get_category(city_aqi)

        worst_ward = max(self._current.items(), key=lambda x: x[1].get("aqi", 0))
        best_ward = min(self._current.items(), key=lambda x: x[1].get("aqi", 0))

        return {
            "city_aqi": city_aqi,
            "category": category["label"],
            "color": category["color"],
            "wards_monitored": len(self._current),
            "total_devices": sum(v.get("device_count", 0) for v in self._current.values()),
            "worst_ward": {"id": worst_ward[0], "aqi": worst_ward[1].get("aqi", 0)},
            "best_ward": {"id": best_ward[0], "aqi": best_ward[1].get("aqi", 0)},
            "timestamp": datetime.utcnow().isoformat(),
        }

    # ──────────────────────────────────────────────
    # DEMO DATA SEEDING
    # ──────────────────────────────────────────────

    def seed_demo_data(self):
        """Seed realistic demo data for all wards"""
        random.seed(42)

        # Base AQI values per zone (industrial areas higher)
        zone_base = {
            "Central": 95, "East": 110, "West": 75,
            "North": 80, "South": 85, "North-East": 105,
            "South-West": 70, "South-East": 90,
        }

        now = datetime.utcnow()

        for wid, ward in self.wards.items():
            base = zone_base.get(ward["zone"], 85)

            # Seed current reading
            hour = now.hour
            # Daily pattern: higher during rush hours
            if 7 <= hour <= 10 or 17 <= hour <= 20:
                time_factor = 1.25
            elif 0 <= hour <= 5:
                time_factor = 0.75
            else:
                time_factor = 1.0

            aqi = base * time_factor + random.uniform(-10, 10)
            pm25 = aqi * 0.4 + random.uniform(-5, 5)
            co = aqi * 0.05 + random.uniform(-1, 1)
            nox = aqi * 0.6 + random.uniform(-10, 10)

            category = AQICalculator.get_category(aqi)

            self._current[wid] = {
                "ward_id": wid,
                "aqi": round(aqi, 1),
                "pm25": round(max(pm25, 0), 1),
                "co": round(max(co, 0), 1),
                "nox": round(max(nox, 0), 1),
                "device_count": ward.get("device_count", 2),
                "category": category["label"],
                "color": category["color"],
                "updated_at": now.isoformat(),
            }

            # Seed 48 hours of history
            for h in range(48, 0, -1):
                ts = now - timedelta(hours=h)
                hour_h = ts.hour
                if 7 <= hour_h <= 10 or 17 <= hour_h <= 20:
                    tf = 1.25
                elif 0 <= hour_h <= 5:
                    tf = 0.75
                else:
                    tf = 1.0

                hist_aqi = base * tf + random.uniform(-15, 15)
                hist_pm25 = hist_aqi * 0.4 + random.uniform(-5, 5)

                self._history[wid].append({
                    "ts": ts.isoformat(),
                    "aqi": round(hist_aqi, 1),
                    "pm25": round(max(hist_pm25, 0), 1),
                    "co": round(max(hist_aqi * 0.05, 0), 1),
                    "nox": round(max(hist_aqi * 0.6, 0), 1),
                })

        logger.info(f"Demo data seeded for {len(self.wards)} wards")
