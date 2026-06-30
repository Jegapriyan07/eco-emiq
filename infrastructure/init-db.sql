-- EcoTronics Database Schema
-- PostgreSQL 14+ with TimescaleDB extension
-- This schema supports all four user roles and local-first architecture

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE user_role AS ENUM (
  'vehicle_owner',
  'generator_owner',
  'industry_owner',
  'city_admin'
);

CREATE TYPE device_type AS ENUM (
  'vehicle',
  'generator',
  'industrial'
);

CREATE TYPE device_status AS ENUM (
  'active',
  'inactive',
  'maintenance',
  'decommissioned'
);

CREATE TYPE organization_type AS ENUM (
  'industry',
  'city_authority'
);

CREATE TYPE alert_severity AS ENUM (
  'info',
  'warning',
  'critical'
);

CREATE TYPE alert_type AS ENUM (
  'high_emission',
  'maintenance_due',
  'device_offline',
  'compliance_violation',
  'anomaly_detected'
);

CREATE TYPE report_type AS ENUM (
  'daily',
  'weekly',
  'monthly',
  'compliance',
  'custom'
);

CREATE TYPE report_format AS ENUM (
  'pdf',
  'csv',
  'json'
);

-- ============================================================================
-- ORGANIZATIONS TABLE
-- ============================================================================

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  type organization_type NOT NULL,
  description TEXT,
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100),
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(50),
  regulatory_id VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_organizations_type ON organizations(type);
CREATE INDEX idx_organizations_city ON organizations(city);

-- ============================================================================
-- USERS TABLE
-- ============================================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role user_role NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone_number VARCHAR(50),
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_organization ON users(organization_id);

-- ============================================================================
-- DEVICES TABLE
-- ============================================================================

CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type device_type NOT NULL,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status device_status DEFAULT 'active',
  metadata JSONB NOT NULL DEFAULT '{}',
  last_seen_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_devices_type ON devices(type);
CREATE INDEX idx_devices_owner ON devices(owner_id);
CREATE INDEX idx_devices_organization ON devices(organization_id);
CREATE INDEX idx_devices_status ON devices(status);
CREATE INDEX idx_devices_metadata ON devices USING GIN(metadata);

-- ============================================================================
-- REFRESH TOKENS TABLE (for JWT refresh mechanism)
-- ============================================================================

CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  revoked_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- ============================================================================
-- ALERTS TABLE
-- ============================================================================

CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  type alert_type NOT NULL,
  severity alert_severity NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  threshold NUMERIC,
  actual_value NUMERIC,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_alerts_device ON alerts(device_id);
CREATE INDEX idx_alerts_type ON alerts(type);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_created ON alerts(created_at DESC);
CREATE INDEX idx_alerts_unresolved ON alerts(resolved_at) WHERE resolved_at IS NULL;

-- ============================================================================
-- REPORTS TABLE
-- ============================================================================

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type report_type NOT NULL,
  format report_format NOT NULL,
  device_ids UUID[] NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  file_url TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_reports_user ON reports(user_id);
CREATE INDEX idx_reports_type ON reports(type);
CREATE INDEX idx_reports_generated ON reports(generated_at DESC);

-- ============================================================================
-- AUDIT LOG TABLE (for security and compliance)
-- ============================================================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id UUID,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_devices_updated_at
  BEFORE UPDATE ON devices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RBAC HELPER FUNCTIONS
-- ============================================================================

-- Check if user can access device
CREATE OR REPLACE FUNCTION user_can_access_device(
  p_user_id UUID,
  p_device_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role user_role;
  v_user_org_id UUID;
  v_device_owner_id UUID;
  v_device_org_id UUID;
BEGIN
  -- Get user info
  SELECT role, organization_id INTO v_user_role, v_user_org_id
  FROM users WHERE id = p_user_id;
  
  -- Get device info
  SELECT owner_id, organization_id INTO v_device_owner_id, v_device_org_id
  FROM devices WHERE id = p_device_id;
  
  -- City admin can access all devices
  IF v_user_role = 'city_admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Industry owner can access all devices in their organization
  IF v_user_role = 'industry_owner' AND v_user_org_id = v_device_org_id THEN
    RETURN TRUE;
  END IF;
  
  -- Vehicle/Generator owner can access their own devices
  IF v_device_owner_id = p_user_id THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SEED DATA (for development)
-- ============================================================================

-- Create a demo organization
INSERT INTO organizations (id, name, type, contact_email, city, country)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Demo Industries Inc.', 'industry', 'contact@demoindustries.com', 'Mumbai', 'India'),
  ('00000000-0000-0000-0000-000000000002', 'Mumbai City Authority', 'city_authority', 'admin@mumbai.gov.in', 'Mumbai', 'India');

-- Create demo users (password is 'password123' hashed with bcrypt)
INSERT INTO users (id, email, password_hash, role, first_name, last_name, email_verified, organization_id)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'vehicle@demo.com', '$2b$10$rKvVJvWvJvWvJvWvJvWvJeN0N0N0N0N0N0N0N0N0N0N0N0N0N0', 'vehicle_owner', 'John', 'Doe', TRUE, NULL),
  ('10000000-0000-0000-0000-000000000002', 'generator@demo.com', '$2b$10$rKvVJvWvJvWvJvWvJvWvJeN0N0N0N0N0N0N0N0N0N0N0N0N0N0', 'generator_owner', 'Jane', 'Smith', TRUE, NULL),
  ('10000000-0000-0000-0000-000000000003', 'industry@demo.com', '$2b$10$rKvVJvWvJvWvJvWvJvWvJeN0N0N0N0N0N0N0N0N0N0N0N0N0N0', 'industry_owner', 'Bob', 'Johnson', TRUE, '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000004', 'admin@demo.com', '$2b$10$rKvVJvWvJvWvJvWvJvWvJeN0N0N0N0N0N0N0N0N0N0N0N0N0N0', 'city_admin', 'Alice', 'Williams', TRUE, '00000000-0000-0000-0000-000000000002');

-- Grant appropriate permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ecotronics;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ecotronics;

-- ============================================================================
-- COMMENTS (for documentation)
-- ============================================================================

COMMENT ON TABLE users IS 'All users across four roles: vehicle_owner, generator_owner, industry_owner, city_admin';
COMMENT ON TABLE devices IS 'All devices (vehicles, generators, industrial equipment) with flexible JSONB metadata';
COMMENT ON TABLE organizations IS 'Organizations for industry and city authority roles';
COMMENT ON TABLE alerts IS 'System-generated alerts for high emissions, maintenance, etc.';
COMMENT ON TABLE reports IS 'Generated reports in PDF/CSV/JSON format';
COMMENT ON TABLE audit_logs IS 'Security audit trail for compliance';
COMMENT ON FUNCTION user_can_access_device IS 'RBAC helper: checks if user has permission to access a device';
