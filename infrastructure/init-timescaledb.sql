-- TimescaleDB Schema for Emission Readings
-- Optimized for time-series data storage and queries

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- EMISSION READINGS TABLE (Hypertable)
-- ============================================================================

CREATE TABLE emission_readings (
  id UUID DEFAULT uuid_generate_v4(),
  device_id UUID NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  
  -- Emission data
  co2 NUMERIC(10, 2) NOT NULL,           -- grams
  co NUMERIC(10, 2),                     -- ppm
  nox NUMERIC(10, 2),                    -- ppm
  pm25 NUMERIC(10, 2),                   -- μg/m³
  pm10 NUMERIC(10, 2),                   -- μg/m³
  so2 NUMERIC(10, 2),                    -- ppm
  voc NUMERIC(10, 2),                    -- ppm
  
  -- Fuel consumption
  fuel_amount NUMERIC(10, 2),            -- liters or kWh
  fuel_type VARCHAR(50),
  fuel_cost NUMERIC(10, 2),
  
  -- Location (for vehicles)
  latitude NUMERIC(10, 6),
  longitude NUMERIC(10, 6),
  
  -- Vehicle/Generator specific
  speed NUMERIC(6, 2),                   -- km/h
  engine_load NUMERIC(5, 2),             -- percentage
  temperature NUMERIC(5, 2),             -- Celsius
  humidity NUMERIC(5, 2),                -- percentage
  
  -- Metadata
  calculated_locally BOOLEAN DEFAULT TRUE,
  synced_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  
  -- Constraints
  PRIMARY KEY (device_id, timestamp)
);

-- Convert to hypertable (partitioned by time)
SELECT create_hypertable('emission_readings', 'timestamp', 
  chunk_time_interval => INTERVAL '1 day',
  if_not_exists => TRUE
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Device-based queries
CREATE INDEX idx_emission_readings_device_time 
  ON emission_readings (device_id, timestamp DESC);

-- Location-based queries (for city admin heatmaps)
CREATE INDEX idx_emission_readings_location 
  ON emission_readings (latitude, longitude, timestamp DESC)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- High emission queries
CREATE INDEX idx_emission_readings_high_co2 
  ON emission_readings (timestamp DESC)
  WHERE co2 > 200;

-- Metadata queries
CREATE INDEX idx_emission_readings_metadata 
  ON emission_readings USING GIN(metadata);

-- ============================================================================
-- CONTINUOUS AGGREGATES (Pre-computed summaries)
-- ============================================================================

-- Hourly aggregates
CREATE MATERIALIZED VIEW emission_hourly
WITH (timescaledb.continuous) AS
SELECT
  device_id,
  time_bucket('1 hour', timestamp) AS bucket,
  COUNT(*) AS reading_count,
  AVG(co2) AS avg_co2,
  MAX(co2) AS max_co2,
  MIN(co2) AS min_co2,
  SUM(co2) AS total_co2,
  AVG(nox) AS avg_nox,
  AVG(pm25) AS avg_pm25,
  SUM(fuel_amount) AS total_fuel,
  AVG(speed) AS avg_speed,
  AVG(engine_load) AS avg_engine_load
FROM emission_readings
GROUP BY device_id, bucket
WITH NO DATA;

-- Refresh policy: update every hour for last 2 days
SELECT add_continuous_aggregate_policy('emission_hourly',
  start_offset => INTERVAL '2 days',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour'
);

-- Daily aggregates
CREATE MATERIALIZED VIEW emission_daily
WITH (timescaledb.continuous) AS
SELECT
  device_id,
  time_bucket('1 day', timestamp) AS bucket,
  COUNT(*) AS reading_count,
  AVG(co2) AS avg_co2,
  MAX(co2) AS max_co2,
  MIN(co2) AS min_co2,
  SUM(co2) AS total_co2,
  AVG(nox) AS avg_nox,
  AVG(pm25) AS avg_pm25,
  SUM(fuel_amount) AS total_fuel,
  AVG(speed) AS avg_speed,
  AVG(engine_load) AS avg_engine_load
FROM emission_readings
GROUP BY device_id, bucket
WITH NO DATA;

-- Refresh policy: update daily
SELECT add_continuous_aggregate_policy('emission_daily',
  start_offset => INTERVAL '7 days',
  end_offset => INTERVAL '1 day',
  schedule_interval => INTERVAL '1 day'
);

-- ============================================================================
-- RETENTION POLICY (Auto-delete old data)
-- ============================================================================

-- Keep raw data for 90 days, then delete
SELECT add_retention_policy('emission_readings', INTERVAL '90 days');

-- Keep hourly aggregates for 1 year
SELECT add_retention_policy('emission_hourly', INTERVAL '1 year');

-- Keep daily aggregates forever (or set a longer period)
-- SELECT add_retention_policy('emission_daily', INTERVAL '5 years');

-- ============================================================================
-- COMPRESSION POLICY (Save storage)
-- ============================================================================

-- Compress data older than 7 days
ALTER TABLE emission_readings SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'device_id',
  timescaledb.compress_orderby = 'timestamp DESC'
);

SELECT add_compression_policy('emission_readings', INTERVAL '7 days');

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get latest reading for a device
CREATE OR REPLACE FUNCTION get_latest_reading(p_device_id UUID)
RETURNS TABLE (
  timestamp TIMESTAMPTZ,
  co2 NUMERIC,
  nox NUMERIC,
  pm25 NUMERIC,
  fuel_amount NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    er.timestamp,
    er.co2,
    er.nox,
    er.pm25,
    er.fuel_amount
  FROM emission_readings er
  WHERE er.device_id = p_device_id
  ORDER BY er.timestamp DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Get device summary for a date range
CREATE OR REPLACE FUNCTION get_device_summary(
  p_device_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  total_co2 NUMERIC,
  avg_co2 NUMERIC,
  max_co2 NUMERIC,
  total_fuel NUMERIC,
  reading_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    SUM(er.co2) AS total_co2,
    AVG(er.co2) AS avg_co2,
    MAX(er.co2) AS max_co2,
    SUM(er.fuel_amount) AS total_fuel,
    COUNT(*) AS reading_count
  FROM emission_readings er
  WHERE er.device_id = p_device_id
    AND er.timestamp >= p_start_date
    AND er.timestamp <= p_end_date;
END;
$$ LANGUAGE plpgsql;

-- Get city-wide emissions for a time bucket
CREATE OR REPLACE FUNCTION get_city_emissions(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_bucket_size INTERVAL DEFAULT '1 hour'
)
RETURNS TABLE (
  bucket TIMESTAMPTZ,
  total_co2 NUMERIC,
  avg_co2 NUMERIC,
  device_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    time_bucket(p_bucket_size, er.timestamp) AS bucket,
    SUM(er.co2) AS total_co2,
    AVG(er.co2) AS avg_co2,
    COUNT(DISTINCT er.device_id) AS device_count
  FROM emission_readings er
  WHERE er.timestamp >= p_start_date
    AND er.timestamp <= p_end_date
  GROUP BY bucket
  ORDER BY bucket;
END;
$$ LANGUAGE plpgsql;

-- Get emission hotspots (for city admin map)
CREATE OR REPLACE FUNCTION get_emission_hotspots(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_min_co2 NUMERIC DEFAULT 200
)
RETURNS TABLE (
  latitude NUMERIC,
  longitude NUMERIC,
  avg_co2 NUMERIC,
  max_co2 NUMERIC,
  reading_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    er.latitude,
    er.longitude,
    AVG(er.co2) AS avg_co2,
    MAX(er.co2) AS max_co2,
    COUNT(*) AS reading_count
  FROM emission_readings er
  WHERE er.timestamp >= p_start_date
    AND er.timestamp <= p_end_date
    AND er.latitude IS NOT NULL
    AND er.longitude IS NOT NULL
    AND er.co2 >= p_min_co2
  GROUP BY er.latitude, er.longitude
  HAVING COUNT(*) >= 5  -- At least 5 readings
  ORDER BY avg_co2 DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SAMPLE DATA (for development/testing)
-- ============================================================================

-- Insert sample readings for demo devices
-- This will be populated by the data-ingestion service in real usage

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE emission_readings IS 'Time-series emission data from all devices (hypertable)';
COMMENT ON MATERIALIZED VIEW emission_hourly IS 'Pre-computed hourly aggregates for faster queries';
COMMENT ON MATERIALIZED VIEW emission_daily IS 'Pre-computed daily aggregates for reports';
COMMENT ON FUNCTION get_latest_reading IS 'Get the most recent reading for a device';
COMMENT ON FUNCTION get_device_summary IS 'Get aggregated stats for a device over a date range';
COMMENT ON FUNCTION get_city_emissions IS 'Get city-wide emission trends over time';
COMMENT ON FUNCTION get_emission_hotspots IS 'Identify high-emission locations for city admin';

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ecotronics;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ecotronics;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO ecotronics;
