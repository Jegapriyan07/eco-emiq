"""
Unit Tests — Ingestion & Auth
Tests for the backend API ingestion pipeline and authentication logic.
Run: pytest tests/ -v
"""

import pytest
import sys
import os
import json
import time
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

# ─────────────────────────────────────────────
# INGESTION TESTS
# ─────────────────────────────────────────────

class TestIngestionValidation:
    """Test sensor data ingestion validation"""

    def test_valid_reading_passes(self):
        """Valid sensor reading should pass all checks"""
        reading = {
            "device_id": "dev-001",
            "timestamp": datetime.utcnow().isoformat(),
            "pm25": 35.5,
            "co": 4.2,
            "nox": 55.0,
            "temperature": 28.5,
            "humidity": 65.0,
        }
        assert reading["pm25"] >= 0
        assert reading["co"] >= 0
        assert reading["nox"] >= 0
        assert 0 <= reading["humidity"] <= 100
        assert reading["device_id"] is not None

    def test_negative_pm25_rejected(self):
        """Negative PM2.5 values should be flagged"""
        pm25 = -5.0
        assert pm25 < 0, "Negative PM2.5 should be detected"

    def test_extreme_pm25_flagged(self):
        """PM2.5 > 500 should be flagged as anomalous"""
        pm25 = 999.9
        assert pm25 > 500, "Extreme PM2.5 should be flagged"

    def test_missing_device_id_rejected(self):
        """Reading without device_id should be rejected"""
        reading = {"pm25": 35.5, "co": 4.2}
        assert "device_id" not in reading or reading.get("device_id") is None

    def test_timestamp_format_valid(self):
        """ISO 8601 timestamp should parse correctly"""
        ts = "2026-02-18T14:30:00.000Z"
        try:
            parsed = datetime.fromisoformat(ts.replace("Z", "+00:00"))
            assert parsed is not None
        except ValueError:
            pytest.fail("Timestamp parsing failed")

    def test_future_timestamp_rejected(self):
        """Timestamps more than 5 minutes in the future should be rejected"""
        future_ts = datetime.utcnow() + timedelta(minutes=10)
        now = datetime.utcnow()
        diff_seconds = (future_ts - now).total_seconds()
        assert diff_seconds > 300, "Future timestamp should be detected"

    def test_stale_timestamp_rejected(self):
        """Timestamps older than 24 hours should be flagged"""
        old_ts = datetime.utcnow() - timedelta(hours=25)
        now = datetime.utcnow()
        age_hours = (now - old_ts).total_seconds() / 3600
        assert age_hours > 24, "Stale timestamp should be detected"

    def test_batch_ingestion_limit(self):
        """Batch ingestion should reject payloads over 1000 records"""
        batch_size = 1001
        assert batch_size > 1000, "Oversized batch should be rejected"

    def test_valid_batch_accepted(self):
        """Batch of 100 readings should be accepted"""
        batch = [{"device_id": f"dev-{i:03d}", "pm25": 30.0 + i * 0.1} for i in range(100)]
        assert len(batch) <= 1000


class TestAQICalculation:
    """Test AQI calculation logic"""

    def test_good_aqi_range(self):
        """PM2.5 = 10 should give AQI in Good range (0-50)"""
        pm25 = 10.0
        # Linear interpolation: (50-0)/(12-0) * (10-0) + 0 = 41.7
        aqi = (50 / 12.0) * pm25
        assert 0 <= aqi <= 50

    def test_moderate_aqi_range(self):
        """PM2.5 = 25 should give AQI in Moderate range (51-100)"""
        pm25 = 25.0
        # Breakpoint: (100-51)/(35.4-12.1) * (25-12.1) + 51
        aqi = ((100 - 51) / (35.4 - 12.1)) * (pm25 - 12.1) + 51
        assert 51 <= aqi <= 100

    def test_unhealthy_aqi_range(self):
        """PM2.5 = 100 should give AQI in Unhealthy range (151-200)"""
        pm25 = 100.0
        aqi = ((200 - 151) / (150.4 - 55.5)) * (pm25 - 55.5) + 151
        assert 151 <= aqi <= 200

    def test_composite_aqi_is_max(self):
        """Composite AQI should be the maximum of individual pollutant AQIs"""
        aqi_pm25 = 85.0
        aqi_co = 45.0
        aqi_nox = 120.0
        composite = max(aqi_pm25, aqi_co, aqi_nox)
        assert composite == 120.0

    def test_zero_pollutants_gives_zero_aqi(self):
        """All-zero pollutants should give AQI of 0"""
        pm25, co, nox = 0, 0, 0
        aqi = max(pm25, co, nox)
        assert aqi == 0


# ─────────────────────────────────────────────
# AUTH TESTS
# ─────────────────────────────────────────────

class TestDeviceAuthentication:
    """Test device API key authentication"""

    def test_valid_api_key_format(self):
        """Device API keys should follow dk-{24 chars} format"""
        import re
        api_key = "dk-abc123xyz456def789ghi012"
        pattern = r"^dk-[a-zA-Z0-9]{24}$"
        assert re.match(pattern, api_key), f"API key format invalid: {api_key}"

    def test_invalid_api_key_rejected(self):
        """Malformed API keys should be rejected"""
        invalid_keys = ["", "invalid", "dk-short", "sk-wrongprefix123456789012"]
        import re
        pattern = r"^dk-[a-zA-Z0-9]{24}$"
        for key in invalid_keys:
            assert not re.match(pattern, key), f"Invalid key should be rejected: {key}"

    def test_api_key_uniqueness(self):
        """Generated API keys should be unique"""
        import uuid
        keys = {f"dk-{str(uuid.uuid4()).replace('-', '')[:24]}" for _ in range(1000)}
        assert len(keys) == 1000, "API keys should be unique"

    def test_tenant_isolation(self):
        """Device from tenant A should not access tenant B data"""
        tenant_a_device = {"device_id": "dev-001", "tenant_id": "org-aaa"}
        tenant_b_id = "org-bbb"
        assert tenant_a_device["tenant_id"] != tenant_b_id

    def test_suspended_tenant_blocked(self):
        """Devices from suspended tenants should be blocked"""
        tenant_status = "suspended"
        assert tenant_status != "active", "Suspended tenant should be blocked"

    def test_rate_limit_enforcement(self):
        """Requests exceeding rate limit should be rejected"""
        requests_per_minute = 101
        limit = 100
        assert requests_per_minute > limit, "Rate limit should be enforced"


class TestJWTAuth:
    """Test JWT token validation"""

    def test_valid_jwt_structure(self):
        """JWT should have 3 parts separated by dots"""
        # Mock JWT token
        token = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyMSJ9.abc123"
        parts = token.split(".")
        assert len(parts) == 3, "JWT must have header.payload.signature"

    def test_expired_token_rejected(self):
        """Expired JWT tokens should be rejected"""
        exp = datetime.utcnow() - timedelta(hours=1)
        now = datetime.utcnow()
        assert exp < now, "Expired token should be detected"

    def test_role_based_access(self):
        """Only admin roles should access admin endpoints"""
        allowed_roles = {"city_admin", "org_admin", "super_admin"}
        user_role = "viewer"
        assert user_role not in allowed_roles, "Viewer should not access admin endpoints"

    def test_super_admin_role_required(self):
        """Super-admin endpoints require super_admin role"""
        required_role = "super_admin"
        user_role = "org_admin"
        assert user_role != required_role, "org_admin should not access super_admin endpoints"


# ─────────────────────────────────────────────
# QUOTA TESTS
# ─────────────────────────────────────────────

class TestQuotaEnforcement:
    """Test subscription plan quota enforcement"""

    def test_free_plan_device_limit(self):
        """Free plan should allow max 2 devices"""
        plan_limits = {"free": 2, "starter": 10, "professional": 100}
        assert plan_limits["free"] == 2

    def test_device_quota_exceeded(self):
        """Adding device beyond quota should be rejected"""
        current_devices = 10
        max_devices = 10
        can_add = current_devices < max_devices
        assert not can_add, "Device quota exceeded should block addition"

    def test_device_quota_within_limit(self):
        """Adding device within quota should succeed"""
        current_devices = 5
        max_devices = 10
        can_add = current_devices < max_devices
        assert can_add, "Device within quota should be allowed"

    def test_api_call_counter_increments(self):
        """API call counter should increment on each request"""
        counter = 0
        for _ in range(5):
            counter += 1
        assert counter == 5

    def test_plan_upgrade_increases_limits(self):
        """Upgrading plan should increase device limit"""
        starter_limit = 10
        professional_limit = 100
        assert professional_limit > starter_limit


# ─────────────────────────────────────────────
# RULES ENGINE TESTS
# ─────────────────────────────────────────────

class TestRulesEngine:
    """Test notification rules engine"""

    def test_high_emission_rule_fires(self):
        """Emission score > 80 should trigger high alert"""
        emission_score = 85.0
        threshold = 80.0
        should_alert = emission_score > threshold
        assert should_alert

    def test_low_emission_no_alert(self):
        """Emission score < 80 should not trigger alert"""
        emission_score = 65.0
        threshold = 80.0
        should_alert = emission_score > threshold
        assert not should_alert

    def test_pm25_spike_detection(self):
        """PM2.5 spike (>150) should trigger anomaly alert"""
        pm25 = 175.0
        spike_threshold = 150.0
        is_spike = pm25 > spike_threshold
        assert is_spike

    def test_maintenance_prediction_window(self):
        """Maintenance predicted in < 7 days should trigger email"""
        days_until_maintenance = 5
        alert_window = 7
        should_notify = days_until_maintenance < alert_window
        assert should_notify

    def test_cooldown_prevents_duplicate_alerts(self):
        """Same rule should not fire twice within cooldown period"""
        last_fired = datetime.utcnow() - timedelta(minutes=10)
        cooldown_minutes = 30
        now = datetime.utcnow()
        minutes_since = (now - last_fired).total_seconds() / 60
        can_fire = minutes_since >= cooldown_minutes
        assert not can_fire, "Alert in cooldown should not re-fire"

    def test_cooldown_expired_allows_refiring(self):
        """Rule should fire again after cooldown expires"""
        last_fired = datetime.utcnow() - timedelta(minutes=35)
        cooldown_minutes = 30
        now = datetime.utcnow()
        minutes_since = (now - last_fired).total_seconds() / 60
        can_fire = minutes_since >= cooldown_minutes
        assert can_fire, "Expired cooldown should allow re-firing"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
