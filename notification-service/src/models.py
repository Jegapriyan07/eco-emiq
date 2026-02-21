"""
Data models for the Notification Service
"""

from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
import uuid


class AlertSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AlertStatus(str, Enum):
    OPEN = "open"
    ACKNOWLEDGED = "acknowledged"
    ASSIGNED = "assigned"
    RESOLVED = "resolved"


class CommandType(str, Enum):
    SHUTDOWN = "shutdown"
    WARNING_LIGHT_ON = "warning_light_on"
    WARNING_LIGHT_OFF = "warning_light_off"
    RESTART = "restart"
    RESET_ALERT = "reset_alert"


@dataclass
class Alert:
    device_id: str
    rule_name: str
    severity: AlertSeverity
    message: str
    details: dict = field(default_factory=dict)
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    status: AlertStatus = AlertStatus.OPEN
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    acknowledged_at: Optional[str] = None
    acknowledged_by: Optional[str] = None
    assignee_id: Optional[str] = None
    note: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "device_id": self.device_id,
            "rule_name": self.rule_name,
            "severity": self.severity,
            "message": self.message,
            "details": self.details,
            "status": self.status,
            "created_at": self.created_at,
            "acknowledged_at": self.acknowledged_at,
            "acknowledged_by": self.acknowledged_by,
            "assignee_id": self.assignee_id,
            "note": self.note,
        }


@dataclass
class DeviceCommand:
    device_id: str
    command: CommandType
    issued_by: str
    reason: str = ""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    issued_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "device_id": self.device_id,
            "command": self.command,
            "issued_by": self.issued_by,
            "reason": self.reason,
            "issued_at": self.issued_at,
        }


@dataclass
class AuditEntry:
    action: str
    actor_id: str
    actor_role: str
    resource_type: str
    resource_id: str
    details: dict = field(default_factory=dict)
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "action": self.action,
            "actor_id": self.actor_id,
            "actor_role": self.actor_role,
            "resource_type": self.resource_type,
            "resource_id": self.resource_id,
            "details": self.details,
            "timestamp": self.timestamp,
        }
