"""
Rules Engine
Evaluates sensor readings against defined rules and triggers actions.
Rules are evaluated in priority order; multiple rules can fire per reading.
"""

import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from collections import defaultdict, deque

from models import Alert, AlertSeverity, AlertStatus

logger = logging.getLogger(__name__)


# ============================================================
# RULE DEFINITIONS
# ============================================================

RULES = [
    {
        "name": "high_emission_sustained",
        "description": "Emission score > 80 for > 30 seconds",
        "severity": AlertSeverity.HIGH,
        "check": lambda reading, history: (
            reading.get("emission_score", 0) > 80
            and _sustained_above(history, "emission_score", 80, seconds=30)
        ),
        "message": lambda r: (
            f"High emission score {r['emission_score']:.1f} sustained for >30s on device {r['device_id']}"
        ),
        "actions": ["create_alert", "notify_owner", "mqtt_warning_light"],
    },
    {
        "name": "critical_emission",
        "description": "Emission score > 95 — immediate danger",
        "severity": AlertSeverity.CRITICAL,
        "check": lambda reading, history: reading.get("emission_score", 0) > 95,
        "message": lambda r: (
            f"CRITICAL emission score {r['emission_score']:.1f} on device {r['device_id']} — immediate action required"
        ),
        "actions": ["create_alert", "notify_owner", "mqtt_warning_light", "mqtt_shutdown"],
    },
    {
        "name": "pm25_anomaly_spike",
        "description": "Anomaly detected with PM2.5 spike",
        "severity": AlertSeverity.HIGH,
        "check": lambda reading, history: (
            reading.get("pm25", 0) > 75
            and reading.get("emission_score", 0) > 70
        ),
        "message": lambda r: (
            f"PM2.5 spike ({r.get('pm25', 0):.1f} μg/m³) with high emission on device {r['device_id']}"
        ),
        "actions": ["create_alert", "notify_owner", "log_event"],
    },
    {
        "name": "co_threshold",
        "description": "CO level exceeds safe threshold",
        "severity": AlertSeverity.MEDIUM,
        "check": lambda reading, history: reading.get("co", 0) > 50,
        "message": lambda r: (
            f"CO level {r.get('co', 0):.1f} ppm exceeds threshold on device {r['device_id']}"
        ),
        "actions": ["create_alert", "notify_owner"],
    },
    {
        "name": "maintenance_due_soon",
        "description": "Maintenance predicted in < 7 days",
        "severity": AlertSeverity.MEDIUM,
        "check": lambda reading, history: (
            reading.get("predicted_service_in_days") is not None
            and reading.get("predicted_service_in_days", 999) < 7
        ),
        "message": lambda r: (
            f"Maintenance predicted in {r.get('predicted_service_in_days')} days for device {r['device_id']}"
        ),
        "actions": ["create_alert", "send_maintenance_email"],
    },
    {
        "name": "device_offline",
        "description": "Device has not reported for > 5 minutes",
        "severity": AlertSeverity.LOW,
        "check": lambda reading, history: reading.get("offline", False),
        "message": lambda r: f"Device {r['device_id']} appears to be offline",
        "actions": ["create_alert", "notify_owner"],
    },
]


# ============================================================
# RULES ENGINE
# ============================================================

class RulesEngine:
    """
    Lightweight rules engine that evaluates sensor readings
    and triggers notifications/actions.
    """

    def __init__(self, email_notifier, mqtt_notifier, audit_logger):
        self.email_notifier = email_notifier
        self.mqtt_notifier = mqtt_notifier
        self.audit_logger = audit_logger

        # In-memory sliding window per device (last 60 readings)
        self._history: Dict[str, deque] = defaultdict(lambda: deque(maxlen=60))

        # Cooldown tracker: prevent alert spam (rule_name + device_id → last_fired)
        self._cooldowns: Dict[str, datetime] = {}
        self._cooldown_seconds = 120  # 2 minutes between same rule on same device

        logger.info(f"Rules engine initialized with {len(RULES)} rules")

    async def evaluate(self, reading: dict) -> List[dict]:
        """
        Evaluate all rules against a new reading.
        Returns list of triggered rule names.
        """
        device_id = reading.get("device_id", "unknown")
        history = self._history[device_id]

        # Add to history
        history.append({**reading, "_ts": datetime.utcnow()})

        triggered = []

        for rule in RULES:
            rule_name = rule["name"]
            cooldown_key = f"{rule_name}:{device_id}"

            # Check cooldown
            if self._is_on_cooldown(cooldown_key):
                continue

            try:
                fired = rule["check"](reading, list(history))
            except Exception as e:
                logger.error(f"Rule '{rule_name}' check error: {e}")
                fired = False

            if fired:
                logger.info(f"Rule '{rule_name}' triggered for device {device_id}")

                # Build alert
                alert = Alert(
                    device_id=device_id,
                    rule_name=rule_name,
                    severity=rule["severity"],
                    message=rule["message"](reading),
                    details={
                        "reading": reading,
                        "rule": rule_name,
                    },
                )

                # Execute actions
                await self._execute_actions(rule["actions"], alert, reading)

                # Set cooldown
                self._cooldowns[cooldown_key] = datetime.utcnow()

                triggered.append({
                    "rule": rule_name,
                    "severity": rule["severity"],
                    "alert_id": alert.id,
                    "message": alert.message,
                })

        return triggered

    async def _execute_actions(self, actions: List[str], alert: Alert, reading: dict):
        """Execute all actions for a triggered rule"""

        for action in actions:
            try:
                if action == "create_alert":
                    self.audit_logger.store_alert(alert)

                elif action == "notify_owner":
                    owner_email = reading.get("owner_email")
                    if owner_email:
                        await self.email_notifier.send(
                            to=owner_email,
                            subject=f"[EcoTronics] {alert.severity.upper()} Alert: {alert.rule_name}",
                            template="alert",
                            context={
                                "alert": alert.to_dict(),
                                "device_id": alert.device_id,
                                "severity": alert.severity,
                                "message": alert.message,
                                "timestamp": alert.created_at,
                            },
                        )

                elif action == "send_maintenance_email":
                    owner_email = reading.get("owner_email")
                    if owner_email:
                        days = reading.get("predicted_service_in_days", "soon")
                        await self.email_notifier.send(
                            to=owner_email,
                            subject=f"[EcoTronics] Maintenance Due in {days} Days",
                            template="maintenance",
                            context={
                                "device_id": alert.device_id,
                                "days": days,
                                "timestamp": alert.created_at,
                            },
                        )

                elif action == "mqtt_warning_light":
                    if self.mqtt_notifier and self.mqtt_notifier.connected:
                        await self.mqtt_notifier.send_device_command(
                            device_id=alert.device_id,
                            command="warning_light_on",
                            issued_by="rules_engine",
                        )
                    else:
                        logger.info(f"[DEMO] MQTT warning_light_on → {alert.device_id}")

                elif action == "mqtt_shutdown":
                    if self.mqtt_notifier and self.mqtt_notifier.connected:
                        await self.mqtt_notifier.send_device_command(
                            device_id=alert.device_id,
                            command="shutdown",
                            issued_by="rules_engine",
                        )
                    else:
                        logger.info(f"[DEMO] MQTT shutdown → {alert.device_id}")

                elif action == "log_event":
                    self.audit_logger.log_action(
                        action="anomaly_detected",
                        actor_id="rules_engine",
                        actor_role="system",
                        resource_type="device",
                        resource_id=alert.device_id,
                        details=alert.to_dict(),
                    )

            except Exception as e:
                logger.error(f"Action '{action}' failed for rule '{alert.rule_name}': {e}")

    def _is_on_cooldown(self, key: str) -> bool:
        last_fired = self._cooldowns.get(key)
        if last_fired is None:
            return False
        return (datetime.utcnow() - last_fired).total_seconds() < self._cooldown_seconds


# ============================================================
# HELPER: Sustained threshold check
# ============================================================

def _sustained_above(
    history: list,
    field: str,
    threshold: float,
    seconds: int,
) -> bool:
    """
    Returns True if the given field has been above threshold
    for at least `seconds` seconds in the recent history.
    """
    if not history:
        return False

    cutoff = datetime.utcnow() - timedelta(seconds=seconds)
    relevant = [
        h for h in history
        if h.get("_ts", datetime.utcnow()) >= cutoff
    ]

    if not relevant:
        return False

    return all(r.get(field, 0) > threshold for r in relevant)
