"""Seed demo data into PostgreSQL from physics-based simulation."""

from __future__ import annotations

import json
import sys
from datetime import datetime, timedelta

from sqlalchemy import text
from sqlalchemy.engine import Connection

from simulation import WARD_PROFILES, compute_ward_state, compute_vehicle_state

from .connection import database_label, get_connection, init_database, is_seeded

SENSORS_PER_WARD = 3
DEMO_DAYS = 60
VEHICLE_ID = 'MH-31-AB-1234'


def _insert_device(conn: Connection, device: dict) -> None:
    conn.execute(
        text(
            """
            INSERT INTO devices
            (id, type, ward_id, name, runtime_hours, days_since_service, rpm_variance,
             latitude, longitude, metadata)
            VALUES
            (:id, :type, :ward_id, :name, :runtime_hours, :days_since_service, :rpm_variance,
             :latitude, :longitude, CAST(:metadata AS jsonb))
            ON CONFLICT (id) DO UPDATE SET
                type = EXCLUDED.type,
                ward_id = EXCLUDED.ward_id,
                name = EXCLUDED.name,
                runtime_hours = EXCLUDED.runtime_hours,
                days_since_service = EXCLUDED.days_since_service,
                rpm_variance = EXCLUDED.rpm_variance,
                latitude = EXCLUDED.latitude,
                longitude = EXCLUDED.longitude,
                metadata = EXCLUDED.metadata
            """
        ),
        {
            'id': device['id'],
            'type': device['type'],
            'ward_id': device.get('ward_id'),
            'name': device['name'],
            'runtime_hours': device.get('runtime_hours', 0),
            'days_since_service': device.get('days_since_service', 0),
            'rpm_variance': device.get('rpm_variance', 200),
            'latitude': device.get('latitude'),
            'longitude': device.get('longitude'),
            'metadata': json.dumps(device.get('metadata', {})),
        },
    )


def _insert_reading(conn: Connection, reading: dict) -> None:
    conn.execute(
        text(
            """
            INSERT INTO emission_readings
            (device_id, timestamp, co2, co, nox, pm25, pm10, temperature, humidity,
             latitude, longitude, engine_load, calculated_locally, metadata)
            VALUES
            (:device_id, :timestamp, :co2, :co, :nox, :pm25, :pm10, :temperature, :humidity,
             :latitude, :longitude, :engine_load, TRUE, CAST(:metadata AS jsonb))
            ON CONFLICT (device_id, timestamp) DO NOTHING
            """
        ),
        {
            'device_id': reading['device_id'],
            'timestamp': reading['timestamp'],
            'co2': reading['co2'],
            'co': reading['co'],
            'nox': reading['nox'],
            'pm25': reading['pm25'],
            'pm10': reading['pm10'],
            'temperature': reading['temperature'],
            'humidity': reading['humidity'],
            'latitude': reading.get('latitude'),
            'longitude': reading.get('longitude'),
            'engine_load': reading.get('engine_load'),
            'metadata': json.dumps(reading['metadata']),
        },
    )


def seed_devices(conn: Connection) -> None:
    for ward_id, profile in WARD_PROFILES.items():
        for i in range(SENSORS_PER_WARD):
            _insert_device(conn, {
                'id': f'{ward_id}-sensor-{i + 1}',
                'type': 'ward_sensor',
                'ward_id': ward_id,
                'name': f"{profile['name']} Sensor {i + 1}",
                'latitude': profile['lat'],
                'longitude': profile['lon'],
            })

    demo_fleet = [
        ('vehicle', f'vehicle-{VEHICLE_ID}', VEHICLE_ID, 1250, 75, 250),
        ('vehicle', 'vehicle-VH-002', 'VH-002', 800, 30, 150),
        ('generator', 'generator-GN-001', 'GN-001', 2200, 120, 400),
        ('generator', 'generator-GN-002', 'GN-002', 600, 15, 100),
        ('industrial', 'industrial-IN-001', 'IN-001', 3500, 150, 500),
    ]
    for dtype, did, name, runtime, days_svc, rpm in demo_fleet:
        _insert_device(conn, {
            'id': did,
            'type': dtype,
            'name': name,
            'runtime_hours': runtime,
            'days_since_service': days_svc,
            'rpm_variance': rpm,
        })


def seed_ward_readings(conn: Connection, now: datetime) -> int:
    count = 0
    start = now - timedelta(days=DEMO_DAYS)

    for ward_id, profile in WARD_PROFILES.items():
        for sensor_idx in range(SENSORS_PER_WARD):
            device_id = f'{ward_id}-sensor-{sensor_idx + 1}'
            t = start
            while t <= now:
                state = compute_ward_state(ward_id, t)
                wobble = (sensor_idx - 1) * 0.02
                _insert_reading(conn, {
                    'device_id': device_id,
                    'timestamp': t.isoformat(),
                    'co2': 400 + state['aqi'] * 0.5,
                    'co': state['co'] * (1 + wobble),
                    'nox': state['nox'] * (1 + wobble),
                    'pm25': state['pm25'] * (1 + wobble),
                    'pm10': state['pm10_0'] * (1 + wobble),
                    'temperature': state['temp'],
                    'humidity': state['humidity'],
                    'latitude': profile['lat'],
                    'longitude': profile['lon'],
                    'metadata': {
                        'aqi': state['aqi'],
                        'nh3': state['nh3'],
                        'no2': state['no2'],
                        'wind_speed': state['wind_speed'],
                        'traffic_load': state['traffic_load'],
                        'carbon_footprint': state['carbon_footprint'],
                        'drift_intelligence_score': state['drift_intelligence_score'],
                        'ward_id': ward_id,
                        'is_anomaly': 1 if state['aqi'] > 130 or state['pm25'] > 80 else 0,
                    },
                })
                count += 1
                t += timedelta(hours=1)
    return count


def seed_vehicle_readings(conn: Connection, now: datetime) -> int:
    count = 0
    start = now - timedelta(days=14)
    device_id = f'vehicle-{VEHICLE_ID}'
    t = start
    while t <= now:
        state = compute_vehicle_state(VEHICLE_ID, t)
        _insert_reading(conn, {
            'device_id': device_id,
            'timestamp': t.isoformat(),
            'co2': state['co2'],
            'co': state['co'],
            'nox': state['nox'],
            'pm25': state['pm25'],
            'pm10': state['pm25'] * 1.8,
            'temperature': state['ambient_temp'],
            'humidity': 55,
            'engine_load': min(100, state['emission_score']),
            'metadata': {
                'emission_score': state['emission_score'],
                'carbon_footprint': state['carbon_footprint'],
                'drift_intelligence_score': state['drift_intelligence_score'],
                'engine_temp': state['engine_temp'],
                'traffic_load': state['traffic_load'],
                'label': state['label'],
                'is_anomaly': 1 if state['emission_score'] > 70 else 0,
            },
        })
        count += 1
        t += timedelta(hours=1)
    return count


def seed_fleet_readings(conn: Connection, now: datetime) -> int:
    count = 0
    fleet_ids = ['vehicle-VH-002', 'generator-GN-001', 'generator-GN-002', 'industrial-IN-001']
    start = now - timedelta(days=30)

    for device_id in fleet_ids:
        t = start
        base_score = 35 + hash(device_id) % 40
        while t <= now:
            hour = t.hour
            score = base_score + (10 if 8 <= hour <= 10 else 5 if 17 <= hour <= 20 else 0)
            _insert_reading(conn, {
                'device_id': device_id,
                'timestamp': t.isoformat(),
                'co2': 380 + score * 2,
                'co': 5 + score * 0.15,
                'nox': 0.3 + score * 0.01,
                'pm25': score * 0.55,
                'pm10': score * 0.9,
                'temperature': 28 + (hour - 12) * 0.3,
                'humidity': 60,
                'engine_load': score,
                'metadata': {
                    'emission_score': score,
                    'is_anomaly': 1 if score > 75 else 0,
                },
            })
            count += 1
            t += timedelta(hours=6)
    return count


def seed_demo_database(force: bool = False) -> int:
    init_database()
    if is_seeded() and not force:
        return 0

    if force:
        with get_connection() as conn:
            conn.execute(text('DELETE FROM emission_readings'))
            conn.execute(text('DELETE FROM devices'))

    now = datetime.now()
    with get_connection() as conn:
        seed_devices(conn)
        n1 = seed_ward_readings(conn, now)
        n2 = seed_vehicle_readings(conn, now)
        n3 = seed_fleet_readings(conn, now)

    return n1 + n2 + n3


def main_cli() -> None:
    force = '--force' in sys.argv
    label = database_label()
    if is_seeded() and not force:
        print(f'Database already seeded: {label}')
        return
    total = seed_demo_database(force=force)
    print(f'Seeded {total} readings into {label}')
