"""
Audit Logger
In-memory audit log for alerts and system actions.
In production, this would persist to PostgreSQL.
"""

import logging
from datetime import datetime
from typing import List, Optional, Dict
from collections import deque

from models import Alert, AlertStatus, AuditEntry

logger = logging.getLogger(__name__)

# Max entries to keep in memory
MAX_ALERTS = 10_000
MAX_AUDIT_ENTRIES = 50_000


class AuditLogger:
    """
    Stores alerts and audit log entries.
    Uses in-memory deques for fast access.
    In production, swap out for PostgreSQL writes.
    """

    def __init__(self):
        self._alerts: Dict[str, Alert] = {}          # id → Alert
        self._alert_order: deque = deque(maxlen=MAX_ALERTS)   # ordered ids
        self._audit_log: deque = deque(maxlen=MAX_AUDIT_ENTRIES)

        logger.info("AuditLogger initialized (in-memory mode)")

    # --------------------------------------------------------
    # ALERTS
    # --------------------------------------------------------

    def store_alert(self, alert: Alert):
        """Store a new alert"""
        self._alerts[alert.id] = alert
        self._alert_order.append(alert.id)
        logger.info(
            f"Alert stored: [{alert.severity.upper()}] {alert.rule_name} "
            f"on device {alert.device_id} (id={alert.id})"
        )

    def get_alert(self, alert_id: str) -> Optional[dict]:
        """Get a single alert by ID"""
        alert = self._alerts.get(alert_id)
        return alert.to_dict() if alert else None

    def get_alerts(
        self,
        device_id: Optional[str] = None,
        severity: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 50,
    ) -> List[dict]:
        """Get alerts with optional filters, newest first"""
        results = []

        # Iterate in reverse (newest first)
        for alert_id in reversed(self._alert_order):
            alert = self._alerts.get(alert_id)
            if not alert:
                continue

            if device_id and alert.device_id != device_id:
                continue
            if severity and alert.severity != severity:
                continue
            if status and alert.status != status:
                continue

            results.append(alert.to_dict())

            if len(results) >= limit:
                break

        return results

    def acknowledge_alert(
        self,
        alert_id: str,
        acknowledged_by: str,
        note: str = "",
    ) -> bool:
        """Acknowledge an alert"""
        alert = self._alerts.get(alert_id)
        if not alert:
            return False

        alert.status = AlertStatus.ACKNOWLEDGED
        alert.acknowledged_by = acknowledged_by
        alert.acknowledged_at = datetime.utcnow().isoformat()
        alert.note = note

        logger.info(f"Alert {alert_id} acknowledged by {acknowledged_by}")
        return True

    def assign_alert(self, alert_id: str, assignee_id: str) -> bool:
        """Assign an alert to a user"""
        alert = self._alerts.get(alert_id)
        if not alert:
            return False

        alert.status = AlertStatus.ASSIGNED
        alert.assignee_id = assignee_id

        logger.info(f"Alert {alert_id} assigned to {assignee_id}")
        return True

    def resolve_alert(self, alert_id: str) -> bool:
        """Mark an alert as resolved"""
        alert = self._alerts.get(alert_id)
        if not alert:
            return False

        alert.status = AlertStatus.RESOLVED
        logger.info(f"Alert {alert_id} resolved")
        return True

    # --------------------------------------------------------
    # AUDIT LOG
    # --------------------------------------------------------

    def log_action(
        self,
        action: str,
        actor_id: str,
        actor_role: str,
        resource_type: str,
        resource_id: str,
        details: Optional[dict] = None,
    ):
        """Log an auditable action"""
        entry = AuditEntry(
            action=action,
            actor_id=actor_id,
            actor_role=actor_role,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details or {},
        )
        self._audit_log.append(entry)
        logger.debug(
            f"Audit: {action} by {actor_id} ({actor_role}) "
            f"on {resource_type}/{resource_id}"
        )

    def get_logs(
        self,
        actor_id: Optional[str] = None,
        action: Optional[str] = None,
        resource_type: Optional[str] = None,
        limit: int = 100,
    ) -> List[dict]:
        """Get audit log entries with optional filters, newest first"""
        results = []

        for entry in reversed(self._audit_log):
            if actor_id and entry.actor_id != actor_id:
                continue
            if action and entry.action != action:
                continue
            if resource_type and entry.resource_type != resource_type:
                continue

            results.append(entry.to_dict())

            if len(results) >= limit:
                break

        return results

    # --------------------------------------------------------
    # STATS
    # --------------------------------------------------------

    def get_stats(self) -> dict:
        """Get summary statistics"""
        total = len(self._alerts)
        by_severity = {}
        by_status = {}

        for alert in self._alerts.values():
            by_severity[alert.severity] = by_severity.get(alert.severity, 0) + 1
            by_status[alert.status] = by_status.get(alert.status, 0) + 1

        return {
            "total_alerts": total,
            "by_severity": by_severity,
            "by_status": by_status,
            "total_audit_entries": len(self._audit_log),
        }
