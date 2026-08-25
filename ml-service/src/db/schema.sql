-- EcoTronics ML service schema (PostgreSQL)
-- Core time-series table mirrors infrastructure/init-timescaledb.sql emission_readings

CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('vehicle', 'generator', 'ward_sensor', 'industrial')),
    ward_id TEXT,
    name TEXT NOT NULL,
    runtime_hours DOUBLE PRECISION NOT NULL DEFAULT 0,
    days_since_service INTEGER NOT NULL DEFAULT 0,
    rpm_variance DOUBLE PRECISION NOT NULL DEFAULT 200,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS emission_readings (
    id BIGSERIAL PRIMARY KEY,
    device_id TEXT NOT NULL REFERENCES devices(id),
    timestamp TIMESTAMPTZ NOT NULL,
    co2 DOUBLE PRECISION NOT NULL,
    co DOUBLE PRECISION,
    nox DOUBLE PRECISION,
    pm25 DOUBLE PRECISION,
    pm10 DOUBLE PRECISION,
    so2 DOUBLE PRECISION,
    voc DOUBLE PRECISION,
    fuel_amount DOUBLE PRECISION,
    fuel_type TEXT,
    fuel_cost DOUBLE PRECISION,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    speed DOUBLE PRECISION,
    engine_load DOUBLE PRECISION,
    temperature DOUBLE PRECISION,
    humidity DOUBLE PRECISION,
    calculated_locally BOOLEAN NOT NULL DEFAULT TRUE,
    synced_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (device_id, timestamp)
);

CREATE INDEX IF NOT EXISTS idx_emission_device_time
    ON emission_readings (device_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_emission_timestamp
    ON emission_readings (timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_devices_ward
    ON devices (ward_id);

CREATE INDEX IF NOT EXISTS idx_devices_type
    ON devices (type);
