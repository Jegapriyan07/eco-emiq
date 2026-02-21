"""
Quota Manager
Enforces per-tenant resource limits based on subscription plan.
"""

import logging
from typing import Tuple
from subscription_plans import PLANS

logger = logging.getLogger(__name__)


class QuotaManager:

    def __init__(self, store):
        self.store = store
        # In-memory counters (reset daily in production via cron)
        self._api_calls: dict = {}
        self._alerts: dict = {}
        self._ml_predictions: dict = {}

    def _get_limits(self, tenant_id: str) -> dict:
        tenant = self.store.get_tenant(tenant_id)
        if not tenant:
            return {}
        plan = PLANS.get(tenant["plan"], {})
        return plan.get("limits", {})

    def get_usage(self, tenant_id: str) -> dict:
        limits = self._get_limits(tenant_id)
        device_count = self.store.count_tenant_devices(tenant_id)

        return {
            "devices": {
                "used": device_count,
                "limit": limits.get("max_devices", 0),
                "pct": round(device_count / max(limits.get("max_devices", 1), 1) * 100, 1),
            },
            "api_calls_today": {
                "used": self._api_calls.get(tenant_id, 0),
                "limit": limits.get("api_calls_per_day", 0),
                "pct": round(
                    self._api_calls.get(tenant_id, 0) / max(limits.get("api_calls_per_day", 1), 1) * 100, 1
                ),
            },
            "alerts_this_month": {
                "used": self._alerts.get(tenant_id, 0),
                "limit": limits.get("alerts_per_month", 0),
                "pct": round(
                    self._alerts.get(tenant_id, 0) / max(limits.get("alerts_per_month", 1), 1) * 100, 1
                ),
            },
            "ml_predictions_today": {
                "used": self._ml_predictions.get(tenant_id, 0),
                "limit": limits.get("ml_predictions_per_day", 0),
                "pct": round(
                    self._ml_predictions.get(tenant_id, 0) / max(limits.get("ml_predictions_per_day", 1), 1) * 100, 1
                ),
            },
            "features": {
                "heatmap": limits.get("heatmap_access", False),
                "email_alerts": limits.get("email_notifications", False),
                "sms_alerts": limits.get("sms_notifications", False),
                "mqtt_relay": limits.get("mqtt_relay", False),
                "csv_export": limits.get("export_csv", False),
                "priority_support": limits.get("priority_support", False),
            },
        }

    def check_quota(self, tenant_id: str, resource: str) -> Tuple[bool, str]:
        limits = self._get_limits(tenant_id)
        if not limits:
            return False, "Tenant not found or no plan"

        if resource == "devices":
            return self.can_add_device(tenant_id)

        elif resource == "api_calls":
            used = self._api_calls.get(tenant_id, 0)
            limit = limits.get("api_calls_per_day", 0)
            if used >= limit:
                return False, f"Daily API call limit ({limit}) reached"
            self._api_calls[tenant_id] = used + 1
            return True, "ok"

        elif resource == "alerts":
            used = self._alerts.get(tenant_id, 0)
            limit = limits.get("alerts_per_month", 0)
            if used >= limit:
                return False, f"Monthly alert limit ({limit}) reached"
            self._alerts[tenant_id] = used + 1
            return True, "ok"

        elif resource == "ml_predictions":
            used = self._ml_predictions.get(tenant_id, 0)
            limit = limits.get("ml_predictions_per_day", 0)
            if used >= limit:
                return False, f"Daily ML prediction limit ({limit}) reached"
            self._ml_predictions[tenant_id] = used + 1
            return True, "ok"

        elif resource == "heatmap":
            if not limits.get("heatmap_access", False):
                return False, "Heatmap not available on current plan — upgrade to Starter or above"
            return True, "ok"

        elif resource == "mqtt_relay":
            if not limits.get("mqtt_relay", False):
                return False, "MQTT relay not available on current plan"
            return True, "ok"

        return True, "ok"

    def can_add_device(self, tenant_id: str) -> Tuple[bool, str]:
        limits = self._get_limits(tenant_id)
        current = self.store.count_tenant_devices(tenant_id)
        max_devices = limits.get("max_devices", 0)
        if current >= max_devices:
            return False, f"Device limit ({max_devices}) reached — upgrade your plan to add more"
        return True, "ok"

    def check_all_quotas(self, tenant_id: str) -> dict:
        resources = ["devices", "api_calls", "alerts", "ml_predictions", "heatmap", "mqtt_relay"]
        result = {}
        for r in resources:
            allowed, reason = self.check_quota(tenant_id, r)
            result[r] = {"allowed": allowed, "reason": reason}
        return result
