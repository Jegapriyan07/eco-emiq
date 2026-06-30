"""
EcoTronics Simulation Engine
Generates logically-correct environmental data using deterministic models.

All values follow real-world physical correlations:
- AQI is driven by traffic load + industrial + wind dispersion
- PM2.5 correlates with AQI (PM2.5 ≈ AQI * 0.42 ± noise)
- CO correlates with traffic volume (morning/evening rush)
- NOx driven by diesel engines (correlates with CO but lagged)
- Temperature follows diurnal sinusoid (min at 5AM, max at 2PM)
- Wind speed counters AQI (strong wind = lower AQI)
- Alerts are generated from threshold violations, not random
"""

import numpy as np
from datetime import datetime, timedelta
import math


# ============================================================================
# WARD PROFILES — Each ward has distinct characteristics (Chennai)
# ============================================================================
WARD_PROFILES = {
    't_nagar': {
        'name': 'T. Nagar',
        'base_aqi': 95,
        'traffic_factor': 1.2,       # busy commercial area
        'industrial_factor': 0.3,
        'green_cover': 0.3,
        'devices': 48,
        'lat': 13.0418, 'lon': 80.2341,
    },
    'anna_nagar': {
        'name': 'Anna Nagar',
        'base_aqi': 78,
        'traffic_factor': 0.9,       # residential-commercial mix
        'industrial_factor': 0.2,
        'green_cover': 0.5,
        'devices': 45,
        'lat': 13.0850, 'lon': 80.2100,
    },
    'adyar': {
        'name': 'Adyar',
        'base_aqi': 72,
        'traffic_factor': 0.8,
        'industrial_factor': 0.15,
        'green_cover': 0.6,
        'devices': 42,
        'lat': 13.0067, 'lon': 80.2206,
    },
    'mylapore': {
        'name': 'Mylapore',
        'base_aqi': 88,
        'traffic_factor': 1.0,
        'industrial_factor': 0.25,
        'green_cover': 0.4,
        'devices': 40,
        'lat': 13.0339, 'lon': 80.2627,
    },
    'velachery': {
        'name': 'Velachery',
        'base_aqi': 82,
        'traffic_factor': 0.85,
        'industrial_factor': 0.2,
        'green_cover': 0.45,
        'devices': 38,
        'lat': 12.9789, 'lon': 80.2203,
    },
    'porur': {
        'name': 'Porur',
        'base_aqi': 91,
        'traffic_factor': 1.1,
        'industrial_factor': 0.35,
        'green_cover': 0.35,
        'devices': 44,
        'lat': 13.0356, 'lon': 80.1567,
    },
}


# ============================================================================
# TIME-OF-DAY MODELS (Chennai typical patterns)
# ============================================================================

def traffic_load(hour: float) -> float:
    """
    Traffic intensity 0–1. Two peaks: morning rush (8–10AM), evening rush (5–8PM).
    Uses sum of two Gaussians.
    """
    morning_peak = math.exp(-0.5 * ((hour - 9) / 1.5) ** 2)
    evening_peak = math.exp(-0.5 * ((hour - 18.5) / 2.0) ** 2)
    baseline = 0.15   # night-time minimum
    return min(1.0, baseline + 0.5 * morning_peak + 0.6 * evening_peak)


def temperature_model(hour: float) -> float:
    """
    Diurnal temperature in °C.
    Min ~24°C at 5AM, max ~32°C at 2PM (Chennai Feb avg).
    """
    return 28.0 + 4.0 * math.sin(math.pi * (hour - 5) / 12) if 5 <= hour <= 17 else 28.0 - 3.0 * math.cos(math.pi * (hour - 17) / 12)


def wind_speed_model(hour: float) -> float:
    """
    Wind speed in km/h. Tends to pick up after noon, calmer at night.
    """
    base = 6.0
    afternoon_boost = 8.0 * math.exp(-0.5 * ((hour - 14) / 3) ** 2)
    return max(2.0, base + afternoon_boost)


def humidity_model(hour: float, temp: float) -> float:
    """
    Relative humidity %. Inversely related to temperature.
    Higher at night and early morning, lower in afternoon.
    """
    base_rh = 75.0 - (temp - 22) * 2.5
    return max(25.0, min(95.0, base_rh))


# ============================================================================
# POLLUTANT CORRELATION MODELS
# ============================================================================

def compute_ward_state(ward_id: str, now: datetime = None) -> dict:
    """
    Compute a logically-consistent snapshot of a ward's environmental state.
    All pollutant levels are correlated through shared emission sources.
    """
    if now is None:
        now = datetime.now()

    profile = WARD_PROFILES.get(ward_id)
    if not profile:
        raise ValueError(f"Unknown ward: {ward_id}")
    assert profile is not None  # narrows type for Pylance — we raise above if None


    hour = now.hour + now.minute / 60.0

    # --- Driving factors ---
    traffic = traffic_load(hour)
    wind = wind_speed_model(hour)
    temp = temperature_model(hour)
    rh = humidity_model(hour, temp)

    # Wind dispersion factor: stronger wind = lower pollution
    dispersion = 1.0 / (1.0 + 0.06 * wind)  # 0.5–1.0 range

    # Temperature inversion effect: cold + calm = pollution trapped
    inversion = 1.0 + max(0, (25 - temp) * 0.03)

    # --- AQI calculation ---
    # AQI = base * (traffic * traffic_factor + industrial_factor) * dispersion * inversion
    # Minus green cover mitigation
    traffic_contribution = traffic * profile['traffic_factor'] * 80
    industrial_contribution = profile['industrial_factor'] * 40
    green_mitigation = profile['green_cover'] * 15

    raw_aqi = (traffic_contribution + industrial_contribution - green_mitigation) * dispersion * inversion

    # Soft-map to keep around the ward's base_aqi characteristic
    aqi = profile['base_aqi'] * 0.4 + raw_aqi * 0.6

    # Add tiny deterministic wobble based on minute (not random — reproducible)
    minute_wobble = math.sin(now.minute * 0.1 + now.second * 0.02) * 3
    aqi = max(10, round(aqi + minute_wobble, 1))

    # --- Correlated pollutants ---
    # Base concentration calculations
    pm25_conc = aqi * 0.42 * (1 + (rh - 50) * 0.003)
    pm25_conc = max(5, pm25_conc + minute_wobble * 0.4)

    co_conc = 5.0 + traffic * profile['traffic_factor'] * 15 * dispersion
    co_conc = max(1.0, co_conc + minute_wobble * 0.2)

    lagged_traffic = traffic_load(max(0, hour - 0.5))
    nox_conc = 0.2 + (lagged_traffic * profile['traffic_factor'] * 0.8 + profile['industrial_factor'] * 0.6) * dispersion
    nox_conc = max(0.05, nox_conc + minute_wobble * 0.02)

    pm1_0_conc = max(2.0, pm25_conc * 0.55 + minute_wobble * 0.1)
    pm4_0_conc = max(8.0, pm25_conc * 1.3 + minute_wobble * 0.2)
    pm10_0_conc = max(15.0, pm25_conc * 2.1 + minute_wobble * 0.4)
    no2_conc = max(0.02, nox_conc * 0.75 + minute_wobble * 0.01)
    nh3_conc = max(1.0, 5.0 + traffic * profile['industrial_factor'] * 12 + minute_wobble * 0.5)

    pm25 = round(pm25_conc, 1)
    pm1_0 = round(pm1_0_conc, 1)
    pm4_0 = round(pm4_0_conc, 1)
    pm10_0 = round(pm10_0_conc, 1)
    co = round(co_conc, 3)
    nox = round(nox_conc, 3)
    no2 = round(no2_conc, 3)
    nh3 = round(nh3_conc, 3)

    # --- Device stats ---
    online_pct = 0.97 if 6 <= hour <= 22 else 0.92  # slightly more offline at night
    online_devices = int(profile['devices'] * online_pct)

    # --- Alerts: threshold-based, not random ---
    alerts = []
    if aqi > 100:
        alerts.append({
            'type': 'AQI Threshold',
            'severity': 'high' if aqi > 120 else 'medium',
            'desc': f'AQI is {aqi} — above safe limit of 100. Advisory may be needed.',
            'ward': profile['name'],
            'time': now.strftime('%H:%M'),
        })
    if pm25 > 60:
        alerts.append({
            'type': 'PM2.5 Spike',
            'severity': 'high',
            'desc': f'PM2.5 at {pm25} μg/m³ — exceeds 60 μg/m³ safe limit.',
            'ward': profile['name'],
            'time': now.strftime('%H:%M'),
        })
    if co > 20:
        alerts.append({
            'type': 'CO Spike',
            'severity': 'medium',
            'desc': f'CO at {co} ppm — elevated above 20 ppm threshold.',
            'ward': profile['name'],
            'time': now.strftime('%H:%M'),
        })
    if nox > 1.0:
        alerts.append({
            'type': 'NOx Elevated',
            'severity': 'medium',
            'desc': f'NOx at {nox} ppm — elevated for >30 min.',
            'ward': profile['name'],
            'time': now.strftime('%H:%M'),
        })
    # Check for offline devices (deterministic based on minute)
    if now.minute % 17 == 0 and hour > 12:
        device_num = 1000 + (now.minute * 3 + int(ward_id[0], 36)) % profile['devices']
        alerts.append({
            'type': 'Device Offline',
            'severity': 'low',
            'desc': f'Sensor ET-{device_num} lost connection.',
            'ward': profile['name'],
            'time': now.strftime('%H:%M'),
        })

    # --- Drift Intelligence Score ---
    actual_emission = pm25
    emission_prediction = actual_emission + (math.sin(now.minute * 0.3) * 8)
    residual = abs(emission_prediction - actual_emission)
    drift_intelligence_score = round(residual * 0.8 + abs(math.cos(now.minute * 0.1) * 3), 2)

    return {
        'ward_id': ward_id,
        'name': profile['name'],
        'timestamp': now.isoformat(),
        'aqi': round(aqi),
        'pm1_0': pm1_0,
        'pm25': pm25,
        'pm4_0': pm4_0,
        'pm10_0': pm10_0,
        'co': co,
        'nox': nox,
        'no2': no2,
        'nh3': nh3,
        'carbon_footprint': round(traffic_contribution * 2.5 + industrial_contribution * 3.0 + minute_wobble * 2, 2),
        'drift_intelligence_score': drift_intelligence_score,
        'temp': round(temp, 1),
        'humidity': round(rh, 1),
        'wind_speed': round(wind, 1),
        'devices': profile['devices'],
        'online_devices': online_devices,
        'alerts': alerts,
        'risk_level': 'high' if aqi > 100 else 'moderate' if aqi > 75 else 'low',
        'traffic_load': round(traffic, 2),
    }


def compute_city_snapshot(now: datetime = None) -> dict:
    """Get all wards + city aggregate."""
    if now is None:
        now = datetime.now()

    wards = []
    all_alerts = []
    for wid in WARD_PROFILES:
        state = compute_ward_state(wid, now)
        wards.append(state)
        all_alerts.extend(state['alerts'])

    avg_aqi = round(sum(w['aqi'] for w in wards) / len(wards))
    total_devices = sum(w['devices'] for w in wards)
    total_online = sum(w['online_devices'] for w in wards)
    city_carbon_footprint = round(sum(w.get('carbon_footprint', 0) for w in wards), 2)
    city_drift_score = round(sum(w.get('drift_intelligence_score', 0) for w in wards) / max(1, len(wards)), 2)

    return {
        'timestamp': now.isoformat(),
        'city': 'Chennai',
        'avg_aqi': avg_aqi,
        'city_carbon_footprint': city_carbon_footprint,
        'drift_intelligence_score': city_drift_score,
        'total_devices': total_devices,
        'online_devices': total_online,
        'total_alerts': len(all_alerts),
        'wards': wards,
        'alerts': all_alerts,
    }


def compute_hourly_trend(ward_id: str, hours: int = 24, now: datetime = None) -> list:
    """Generate past N hours of data for a ward with consistent physics."""
    if now is None:
        now = datetime.now()

    trend = []
    for h in range(hours, -1, -1):
        t = now - timedelta(hours=h)
        state = compute_ward_state(ward_id, t)
        trend.append({
            'hour': t.strftime('%H:%M'),
            'aqi': state['aqi'],
            'pm25': state['pm25'],
            'co': state['co'],
            'nox': state['nox'],
            'temp': state['temp'],
        })

    return trend


def compute_ward_daily_trends(now: datetime = None) -> list:
    """AQI trend for all wards at key time points throughout the day."""
    if now is None:
        now = datetime.now()

    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    times = [6, 9, 12, 15, 18, 21]
    result = []

    for h in times:
        t = today + timedelta(hours=h)
        row = {'time': f'{h}:00'}
        for wid, profile in WARD_PROFILES.items():
            state = compute_ward_state(wid, t)
            row[profile['name']] = state['aqi']
        result.append(row)

    return result


# ============================================================================
# VEHICLE SIMULATION
# ============================================================================

def compute_vehicle_state(vehicle_id: str = 'MH-31-AB-1234', now: datetime = None) -> dict:
    """
    Simulate a vehicle's emission state. Logically correct:
    - Higher emissions when engine is cold (morning start)
    - Rising CO during traffic (stop-and-go)
    - NOx rises with engine load (highway)
    - PM2.5 correlates with fuel burn rate
    """
    if now is None:
        now = datetime.now()

    hour = now.hour + now.minute / 60.0

    # Engine warm-up factor: cold start at 7AM, fully warm after 30 min
    cold_start = max(0, math.exp(-0.5 * ((hour - 7) / 0.3) ** 2) * 0.3)
    engine_warm = 1.0 + cold_start

    traffic = traffic_load(hour)
    temp = temperature_model(hour)

    # Base emission score: 30 (clean) to 80 (dirty)
    emission_score = 25 + traffic * 30 * engine_warm + cold_start * 15

    # Clip to realistic range
    minute_wobble = math.sin(now.minute * 0.15 + now.second * 0.03) * 3
    emission_score = max(15, min(85, round(emission_score + minute_wobble)))

    # CO: driven by incomplete combustion during stop-and-go
    co = 5 + traffic * 15 * engine_warm
    co = round(max(2, co + minute_wobble * 0.3), 1)

    # CO2: relatively stable, rises with engine load
    co2 = 380 + traffic * 80 + cold_start * 30
    co2 = round(max(350, co2 + minute_wobble * 2), 1)

    # NOx: rises with high engine temp and load
    nox = 0.3 + traffic * 0.8 * engine_warm
    nox = round(max(0.1, nox + minute_wobble * 0.02), 2)

    # PM2.5: correlates with emission_score
    pm25 = emission_score * 0.55 + 5
    pm25 = round(max(5, pm25 + minute_wobble * 0.5), 1)

    # Engine temp: rises with runtime, traffic makes it hotter
    engine_temp = 70 + traffic * 15 + max(0, (hour - 7)) * 0.5
    engine_temp = round(min(95, max(65, engine_temp + minute_wobble * 0.5)), 1)

    # --- Drift Intelligence Score ---
    actual_emission = emission_score
    emission_prediction = actual_emission + (math.sin(now.minute * 0.5) * 5)
    residual = abs(emission_prediction - actual_emission)
    drift_intelligence_score = round(residual * 0.7 + abs(math.cos(now.minute * 0.2) * 2), 2)

    return {
        'vehicle_id': vehicle_id,
        'timestamp': now.isoformat(),
        'emission_score': emission_score,
        'co': co,
        'co2': co2,
        'nox': nox,
        'pm25': pm25,
        'carbon_footprint': round(5.0 + (emission_score / 100.0) * 5.0, 2),
        'drift_intelligence_score': drift_intelligence_score,
        'engine_temp': engine_temp,
        'ambient_temp': round(temp, 1),
        'traffic_load': round(traffic, 2),
        'label': 'Excellent' if emission_score < 35 else 'Good' if emission_score < 55 else 'Elevated' if emission_score < 70 else 'Needs Attention',
    }


def compute_vehicle_weekly_trend(now: datetime = None) -> list:
    """Generate a realistic weekly trend for a vehicle."""
    if now is None:
        now = datetime.now()

    days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    # Weekdays have more driving/traffic, weekends are lighter
    traffic_mult = [1.0, 1.05, 0.95, 1.1, 1.0, 0.7, 0.65]

    result = []
    for i, day in enumerate(days):
        # Simulate at 10AM each day (typical driving time)
        day_offset = i - now.weekday()
        day_time = (now + timedelta(days=day_offset)).replace(hour=10, minute=0, second=0)

        state = compute_vehicle_state('MH-31-AB-1234', day_time)
        # Apply traffic multiplier for the day
        mult = traffic_mult[i]
        result.append({
            'date': day,
            'score': round(state['emission_score'] * mult),
            'co': round(state['co'] * mult, 1),
            'pm25': round(state['pm25'] * mult, 1),
            'nox': round(state['nox'] * mult, 2),
        })

    return result
