"""Query layer — reads emission_readings using production-aligned Postgres schema."""

from __future__ import annotations

import json
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Union

import numpy as np
from sqlalchemy import text

from simulation import WARD_PROFILES, compute_ward_state, compute_vehicle_state, compute_hourly_trend

from .connection import get_connection

DATA_SOURCE = 'postgresql:emission_readings'


def _parse_ts(value: Union[str, datetime]) -> datetime:
    if isinstance(value, datetime):
        return value
    if value.endswith('Z'):
        value = value[:-1] + '+00:00'
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return datetime.strptime(value[:19], '%Y-%m-%d %H:%M:%S')


def _as_meta(value: Any) -> dict:
    if value is None:
        return {}
    if isinstance(value, dict):
        return value
    if isinstance(value, (bytes, bytearray)):
        value = value.decode('utf-8')
    if isinstance(value, str):
        return json.loads(value or '{}')
    return dict(value)


class EmissionRepository:
    """DB-backed queries for dashboards and ML training."""

    def reading_count(self) -> int:
        with get_connection() as conn:
            row = conn.execute(text('SELECT COUNT(*) AS c FROM emission_readings')).mappings().fetchone()
            return int(row['c']) if row else 0

    def get_wards_list(self) -> List[dict]:
        return self.get_city_snapshot()['wards']

    def get_city_snapshot(self, now: Optional[datetime] = None) -> dict:
        if now is None:
            now = datetime.now()

        wards = []
        all_alerts = []
        for ward_id in WARD_PROFILES:
            state = self.get_ward_state(ward_id, now)
            if state:
                wards.append(state)
                all_alerts.extend(state.get('alerts', []))

        if not wards:
            from simulation import compute_city_snapshot
            return compute_city_snapshot(now)

        avg_aqi = round(sum(w['aqi'] for w in wards) / len(wards))
        return {
            'timestamp': now.isoformat(),
            'city': 'Chennai',
            'avg_aqi': avg_aqi,
            'city_carbon_footprint': round(sum(w.get('carbon_footprint', 0) for w in wards), 2),
            'drift_intelligence_score': round(
                sum(w.get('drift_intelligence_score', 0) for w in wards) / len(wards), 2
            ),
            'total_devices': sum(w['devices'] for w in wards),
            'online_devices': sum(w['online_devices'] for w in wards),
            'total_alerts': len(all_alerts),
            'wards': wards,
            'alerts': all_alerts,
            'data_source': DATA_SOURCE,
        }

    def get_ward_state(self, ward_id: str, now: Optional[datetime] = None) -> Optional[dict]:
        if ward_id not in WARD_PROFILES:
            return None
        if now is None:
            now = datetime.now()

        profile = WARD_PROFILES[ward_id]
        window_start = now - timedelta(hours=1)

        with get_connection() as conn:
            rows = conn.execute(
                text(
                    """
                    SELECT r.*, d.ward_id
                    FROM emission_readings r
                    JOIN devices d ON d.id = r.device_id
                    WHERE d.ward_id = :ward_id AND d.type = 'ward_sensor'
                      AND r.timestamp <= :now_ts AND r.timestamp >= :window_start
                    ORDER BY r.timestamp DESC
                    LIMIT 50
                    """
                ),
                {'ward_id': ward_id, 'now_ts': now, 'window_start': window_start},
            ).mappings().fetchall()

        if not rows:
            state = compute_ward_state(ward_id, now)
            state['data_source'] = 'simulation:fallback'
            return state

        return self._aggregate_ward_readings(ward_id, profile, rows, now)

    def _aggregate_ward_readings(self, ward_id: str, profile: dict, rows, now: datetime) -> dict:
        def avg_col(col):
            vals = [r[col] for r in rows if r[col] is not None]
            return sum(vals) / len(vals) if vals else 0

        pm25 = round(avg_col('pm25'), 1)
        co = round(avg_col('co'), 3)
        nox = round(avg_col('nox'), 3)
        temp = round(avg_col('temperature'), 1)
        rh = round(avg_col('humidity'), 1)

        metas = [_as_meta(r['metadata']) for r in rows]
        aqi = round(sum(m.get('aqi', pm25 * 2.4) for m in metas) / len(metas))
        nh3 = round(sum(m.get('nh3', 5) for m in metas) / len(metas), 3)
        no2 = round(sum(m.get('no2', nox * 0.75) for m in metas) / len(metas), 3)
        drift = round(sum(m.get('drift_intelligence_score', 0) for m in metas) / len(metas), 2)
        carbon = round(sum(m.get('carbon_footprint', 0) for m in metas) / len(metas), 2)

        hour = now.hour + now.minute / 60.0
        online_pct = 0.97 if 6 <= hour <= 22 else 0.92
        alerts = self._build_alerts(profile['name'], aqi, pm25, co, nox, now)

        return {
            'ward_id': ward_id,
            'name': profile['name'],
            'timestamp': now.isoformat(),
            'aqi': aqi,
            'pm1_0': round(pm25 * 0.55, 1),
            'pm25': pm25,
            'pm4_0': round(pm25 * 1.3, 1),
            'pm10_0': round(avg_col('pm10') or pm25 * 2.1, 1),
            'co': co,
            'nox': nox,
            'no2': no2,
            'nh3': nh3,
            'carbon_footprint': carbon,
            'drift_intelligence_score': drift,
            'temp': temp,
            'humidity': rh,
            'wind_speed': metas[0].get('wind_speed', 6.0),
            'devices': profile['devices'],
            'online_devices': int(profile['devices'] * online_pct),
            'alerts': alerts,
            'risk_level': 'high' if aqi > 100 else 'moderate' if aqi > 75 else 'low',
            'traffic_load': metas[0].get('traffic_load', 0.5),
            'data_source': DATA_SOURCE,
        }

    def _build_alerts(self, ward_name: str, aqi: float, pm25: float, co: float, nox: float, now: datetime) -> list:
        alerts = []
        if aqi > 100:
            alerts.append({
                'type': 'AQI Threshold',
                'severity': 'high' if aqi > 120 else 'medium',
                'desc': f'AQI is {aqi} — above safe limit of 100. Advisory may be needed.',
                'ward': ward_name,
                'time': now.strftime('%H:%M'),
            })
        if pm25 > 60:
            alerts.append({
                'type': 'PM2.5 Spike',
                'severity': 'high',
                'desc': f'PM2.5 at {pm25} μg/m³ — exceeds 60 μg/m³ safe limit.',
                'ward': ward_name,
                'time': now.strftime('%H:%M'),
            })
        if co > 20:
            alerts.append({
                'type': 'CO Spike',
                'severity': 'medium',
                'desc': f'CO at {co} ppm — elevated above 20 ppm threshold.',
                'ward': ward_name,
                'time': now.strftime('%H:%M'),
            })
        if nox > 1.0:
            alerts.append({
                'type': 'NOx Elevated',
                'severity': 'medium',
                'desc': f'NOx at {nox} ppm — elevated for >30 min.',
                'ward': ward_name,
                'time': now.strftime('%H:%M'),
            })
        return alerts

    def get_hourly_trend(self, ward_id: str, hours: int = 24, now: Optional[datetime] = None) -> List[dict]:
        if now is None:
            now = datetime.now()
        start = now - timedelta(hours=hours)

        with get_connection() as conn:
            rows = conn.execute(
                text(
                    """
                    SELECT
                        to_char(date_trunc('hour', r.timestamp), 'HH24:MI') AS hour,
                        AVG((r.metadata->>'aqi')::float) AS aqi,
                        AVG(r.pm25) AS pm25,
                        AVG(r.co) AS co,
                        AVG(r.nox) AS nox,
                        AVG(r.temperature) AS temp,
                        MIN(r.timestamp) AS ts
                    FROM emission_readings r
                    JOIN devices d ON d.id = r.device_id
                    WHERE d.ward_id = :ward_id AND d.type = 'ward_sensor'
                      AND r.timestamp BETWEEN :start_ts AND :end_ts
                    GROUP BY date_trunc('hour', r.timestamp)
                    ORDER BY ts ASC
                    """
                ),
                {'ward_id': ward_id, 'start_ts': start, 'end_ts': now},
            ).mappings().fetchall()

        if rows:
            return [
                {
                    'hour': r['hour'],
                    'aqi': round(r['aqi'] or 0),
                    'pm25': round(r['pm25'] or 0, 1),
                    'co': round(r['co'] or 0, 3),
                    'nox': round(r['nox'] or 0, 3),
                    'temp': round(r['temp'] or 0, 1),
                }
                for r in rows
            ]

        return compute_hourly_trend(ward_id, hours, now)

    def get_ward_daily_trends(self, now: Optional[datetime] = None) -> List[dict]:
        if now is None:
            now = datetime.now()
        today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        times = [6, 9, 12, 15, 18, 21]
        result = []

        for h in times:
            t = today + timedelta(hours=h)
            row = {'time': f'{h}:00'}
            for wid, profile in WARD_PROFILES.items():
                state = self.get_ward_state(wid, t)
                row[profile['name']] = state['aqi'] if state else 0
            result.append(row)
        return result

    def get_alerts(self, now: Optional[datetime] = None) -> List[dict]:
        return self.get_city_snapshot(now)['alerts']

    def get_vehicle_state(self, vehicle_id: str = 'MH-31-AB-1234', now: Optional[datetime] = None) -> dict:
        if now is None:
            now = datetime.now()
        device_id = f'vehicle-{vehicle_id}'

        with get_connection() as conn:
            row = conn.execute(
                text(
                    """
                    SELECT r.* FROM emission_readings r
                    WHERE r.device_id = :device_id AND r.timestamp <= :now_ts
                    ORDER BY r.timestamp DESC LIMIT 1
                    """
                ),
                {'device_id': device_id, 'now_ts': now},
            ).mappings().fetchone()

        if not row:
            state = compute_vehicle_state(vehicle_id, now)
            state['data_source'] = 'simulation:fallback'
            return state

        meta = _as_meta(row['metadata'])
        ts = row['timestamp']
        return {
            'vehicle_id': vehicle_id,
            'timestamp': ts.isoformat() if hasattr(ts, 'isoformat') else ts,
            'emission_score': meta.get('emission_score', 50),
            'co': row['co'],
            'co2': row['co2'],
            'nox': row['nox'],
            'pm25': row['pm25'],
            'carbon_footprint': meta.get('carbon_footprint', 0),
            'drift_intelligence_score': meta.get('drift_intelligence_score', 0),
            'engine_temp': meta.get('engine_temp', row['temperature']),
            'ambient_temp': row['temperature'],
            'traffic_load': meta.get('traffic_load', 0.5),
            'label': meta.get('label', 'Good'),
            'data_source': DATA_SOURCE,
        }

    def get_vehicle_weekly(self, now: Optional[datetime] = None) -> List[dict]:
        if now is None:
            now = datetime.now()
        days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        result = []

        for i, day in enumerate(days):
            day_offset = i - now.weekday()
            day_time = (now + timedelta(days=day_offset)).replace(hour=10, minute=0, second=0)
            state = self.get_vehicle_state('MH-31-AB-1234', day_time)
            result.append({
                'date': day,
                'score': state['emission_score'],
                'co': state['co'],
                'pm25': state['pm25'],
                'nox': state['nox'],
            })
        return result

    def get_maintenance_training_frame(self):
        import pandas as pd

        rows = []
        with get_connection() as conn:
            devices = conn.execute(
                text(
                    """
                    SELECT id, runtime_hours, days_since_service, rpm_variance
                    FROM devices WHERE type IN ('vehicle', 'generator', 'industrial')
                    """
                )
            ).mappings().fetchall()

            for dev in devices:
                score_rows = conn.execute(
                    text(
                        """
                        SELECT (metadata->>'emission_score')::float AS s, temperature
                        FROM emission_readings
                        WHERE device_id = :device_id
                          AND metadata->>'emission_score' IS NOT NULL
                        """
                    ),
                    {'device_id': dev['id']},
                ).mappings().fetchall()

                score_vals = [float(s['s']) for s in score_rows if s['s'] is not None]
                if len(score_vals) < 2:
                    continue

                temps = [float(s['temperature']) for s in score_rows if s['temperature'] is not None]
                emission_mean = float(np.mean(score_vals))
                emission_std = float(np.std(score_vals))
                temp_avg = float(np.mean(temps)) if temps else 75.0

                days_until = int(np.clip(
                    90
                    - (dev['days_since_service'] * 0.4)
                    - (emission_mean / 3)
                    - (emission_std * 1.5)
                    - (dev['runtime_hours'] / 500)
                    + (temp_avg / 10),
                    0,
                    180,
                ))

                rows.append({
                    'runtime_hours': dev['runtime_hours'],
                    'emission_score_mean': emission_mean,
                    'emission_score_std': emission_std,
                    'days_since_service': dev['days_since_service'],
                    'temperature_avg': temp_avg,
                    'rpm_variance': dev['rpm_variance'],
                    'days_until_service': days_until,
                })

        return pd.DataFrame(rows)

    def get_anomaly_training_frame(self):
        import pandas as pd

        records = []
        with get_connection() as conn:
            device_ids = [
                r['device_id']
                for r in conn.execute(
                    text('SELECT DISTINCT device_id FROM emission_readings')
                ).mappings().fetchall()
            ]

            for device_id in device_ids:
                readings = conn.execute(
                    text(
                        """
                        SELECT pm25,
                               (metadata->>'emission_score')::float AS emission_score,
                               COALESCE((metadata->>'is_anomaly')::int, 0) AS is_anomaly
                        FROM emission_readings
                        WHERE device_id = :device_id
                        ORDER BY timestamp ASC
                        """
                    ),
                    {'device_id': device_id},
                ).mappings().fetchall()

                prev_emission = None
                prev_pm25 = None
                for r in readings:
                    emission = float(r['emission_score'] or 0)
                    pm25 = float(r['pm25'] or 0)
                    if prev_emission is not None:
                        records.append({
                            'emission_score': emission,
                            'pm25': pm25,
                            'emission_delta': emission - prev_emission,
                            'pm25_delta': pm25 - prev_pm25,
                            'is_anomaly': int(r['is_anomaly'] or 0),
                        })
                    prev_emission = emission
                    prev_pm25 = pm25

        return pd.DataFrame(records)

    def get_forecast_training_frame(self):
        import pandas as pd

        with get_connection() as conn:
            rows = conn.execute(
                text(
                    """
                    SELECT d.ward_id, r.timestamp, (r.metadata->>'aqi')::float AS aqi
                    FROM emission_readings r
                    JOIN devices d ON d.id = r.device_id
                    WHERE d.type = 'ward_sensor'
                      AND r.metadata->>'aqi' IS NOT NULL
                    ORDER BY r.timestamp ASC
                    """
                )
            ).mappings().fetchall()

        if not rows:
            return pd.DataFrame()

        data = []
        for r in rows:
            ts = _parse_ts(r['timestamp'])
            ward_id = r['ward_id']
            base_aqi = WARD_PROFILES.get(ward_id, {}).get('base_aqi', 80)
            hour = ts.hour
            dow = ts.weekday()
            data.append({
                'ward': ward_id,
                'hour_of_day': hour,
                'day_of_week': dow,
                'hour_sin': np.sin(2 * np.pi * hour / 24),
                'hour_cos': np.cos(2 * np.pi * hour / 24),
                'day_sin': np.sin(2 * np.pi * dow / 7),
                'day_cos': np.cos(2 * np.pi * dow / 7),
                'base_aqi': base_aqi,
                'aqi': float(r['aqi']),
            })

        return pd.DataFrame(data)

    def get_ward_base_aqi_map(self) -> Dict[str, int]:
        return {wid: p['base_aqi'] for wid, p in WARD_PROFILES.items()}

    def get_device_emission_history(self, device_id: str, days: int = 14) -> List[dict]:
        """Daily emission aggregates for carbon advisor agent."""
        cutoff = datetime.now() - timedelta(days=days)
        with get_connection() as conn:
            rows = conn.execute(
                text(
                    """
                    SELECT (timestamp::date) AS day,
                           AVG(co) AS co,
                           AVG(nox) AS nox,
                           AVG(pm25) AS pm25,
                           AVG((metadata->>'emission_score')::float) AS emission_score
                    FROM emission_readings
                    WHERE device_id = :device_id AND timestamp >= :cutoff
                    GROUP BY timestamp::date
                    ORDER BY day ASC
                    """
                ),
                {'device_id': device_id, 'cutoff': cutoff},
            ).mappings().fetchall()

        if rows:
            return [
                {
                    "date": str(r["day"]),
                    "co": round(float(r["co"] or 0), 2),
                    "nox": round(float(r["nox"] or 0), 2),
                    "pm25": round(float(r["pm25"] or 0), 2),
                    "emission_score": round(float(r["emission_score"] or 0), 2),
                }
                for r in rows
            ]

        # Fallback synthetic trend for demo devices
        history = []
        for i in range(days):
            d = datetime.now() - timedelta(days=days - i - 1)
            history.append({
                "date": d.strftime("%Y-%m-%d"),
                "co": round(10 + i * 0.3 + np.random.normal(0, 1), 2),
                "nox": round(0.4 + i * 0.02, 2),
                "pm25": round(25 + i * 0.5, 2),
                "emission_score": round(40 + i * 1.2, 2),
            })
        return history
