"""
Notification Service - FastAPI Main Application
Handles alerts, notifications, relay control, and audit logging
"""

import sys
import os
import logging
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware

# Add src to path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

from models import Alert, AlertSeverity, AlertStatus, DeviceCommand, CommandType
from rules_engine import RulesEngine
from notifiers.email_notifier import EmailNotifier
from notifiers.mqtt_notifier import MQTTNotifier
from audit_log import AuditLogger

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global instances
rules_engine: Optional[RulesEngine] = None
email_notifier: Optional[EmailNotifier] = None
mqtt_notifier: Optional[MQTTNotifier] = None
audit_logger: Optional[AuditLogger] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle"""
    global rules_engine, email_notifier, mqtt_notifier, audit_logger

    logger.info("Starting Notification Service...")

    # Initialize components
    audit_logger = AuditLogger()
    email_notifier = EmailNotifier()
    mqtt_notifier = MQTTNotifier()
    rules_engine = RulesEngine(
        email_notifier=email_notifier,
        mqtt_notifier=mqtt_notifier,
        audit_logger=audit_logger,
    )

    # Connect MQTT
    try:
        await mqtt_notifier.connect()
        logger.info("✓ MQTT connected")
    except Exception as e:
        logger.warning(f"⚠ MQTT not connected (demo mode): {e}")

    logger.info("✓ Notification Service ready!")
    yield

    # Shutdown
    logger.info("Shutting down Notification Service...")
    if mqtt_notifier:
        await mqtt_notifier.disconnect()


app = FastAPI(
    title="EcoTronics Notification Service",
    description="Alert engine, relay control, and audit logging",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# HEALTH
# ============================================================

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "notification-service",
        "timestamp": datetime.utcnow().isoformat(),
        "components": {
            "rules_engine": rules_engine is not None,
            "email": email_notifier is not None,
            "mqtt": mqtt_notifier.connected if mqtt_notifier else False,
            "audit_log": audit_logger is not None,
        },
    }


@app.get("/")
async def root():
    return {
        "service": "EcoTronics Notification Service",
        "version": "1.0.0",
        "endpoints": [
            "/api/v1/notifications/alerts",
            "/api/v1/notifications/alerts/{id}/acknowledge",
            "/api/v1/devices/{id}/command",
            "/api/v1/audit/logs",
            "/api/v1/rules/evaluate",
            "/health",
            "/docs",
        ],
    }


# ============================================================
# RULES ENGINE — Evaluate incoming readings
# ============================================================

@app.post("/api/v1/rules/evaluate")
async def evaluate_rules(payload: dict):
    """
    Evaluate rules against a new sensor reading.
    Called by the data ingestion service on every reading.

    Body:
    {
      "device_id": "D001",
      "owner_id": "user-123",
      "owner_email": "owner@example.com",
      "emission_score": 85,
      "pm25": 78,
      "co": 45,
      "nox": 1.2,
      "timestamp": "2026-02-18T13:30:00Z"
    }
    """
    if not rules_engine:
        raise HTTPException(status_code=503, detail="Rules engine not ready")

    triggered = await rules_engine.evaluate(payload)
    return {
        "evaluated": True,
        "rules_triggered": len(triggered),
        "alerts_created": triggered,
        "timestamp": datetime.utcnow().isoformat(),
    }


# ============================================================
# ALERTS
# ============================================================

@app.get("/api/v1/notifications/alerts")
async def list_alerts(
    device_id: Optional[str] = None,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
):
    """List alerts with optional filters"""
    if not audit_logger:
        raise HTTPException(status_code=503, detail="Audit logger not ready")

    alerts = audit_logger.get_alerts(
        device_id=device_id,
        severity=severity,
        status=status,
        limit=limit,
    )
    return {"alerts": alerts, "total": len(alerts)}


@app.get("/api/v1/notifications/alerts/{alert_id}")
async def get_alert(alert_id: str):
    """Get a specific alert by ID"""
    if not audit_logger:
        raise HTTPException(status_code=503, detail="Audit logger not ready")

    alert = audit_logger.get_alert(alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@app.post("/api/v1/notifications/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: str,
    payload: dict,
    x_user_id: str = Header(..., alias="X-User-Id"),
    x_user_role: str = Header(..., alias="X-User-Role"),
):
    """
    Acknowledge an alert.
    Body: { "note": "Investigated and resolved" }
    """
    if not audit_logger:
        raise HTTPException(status_code=503, detail="Audit logger not ready")

    note = payload.get("note", "")
    success = audit_logger.acknowledge_alert(
        alert_id=alert_id,
        acknowledged_by=x_user_id,
        note=note,
    )

    if not success:
        raise HTTPException(status_code=404, detail="Alert not found")

    # Log the acknowledgement
    audit_logger.log_action(
        action="alert_acknowledged",
        actor_id=x_user_id,
        actor_role=x_user_role,
        resource_type="alert",
        resource_id=alert_id,
        details={"note": note},
    )

    return {
        "acknowledged": True,
        "alert_id": alert_id,
        "acknowledged_by": x_user_id,
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.post("/api/v1/notifications/alerts/{alert_id}/assign")
async def assign_alert(
    alert_id: str,
    payload: dict,
    x_user_id: str = Header(..., alias="X-User-Id"),
    x_user_role: str = Header(..., alias="X-User-Role"),
):
    """
    Assign alert to a user (city_admin only).
    Body: { "assignee_id": "user-456" }
    """
    if x_user_role not in ("city_admin",):
        raise HTTPException(status_code=403, detail="Only city admins can assign alerts")

    assignee_id = payload.get("assignee_id")
    if not assignee_id:
        raise HTTPException(status_code=400, detail="assignee_id required")

    success = audit_logger.assign_alert(alert_id=alert_id, assignee_id=assignee_id)
    if not success:
        raise HTTPException(status_code=404, detail="Alert not found")

    audit_logger.log_action(
        action="alert_assigned",
        actor_id=x_user_id,
        actor_role=x_user_role,
        resource_type="alert",
        resource_id=alert_id,
        details={"assignee_id": assignee_id},
    )

    return {"assigned": True, "alert_id": alert_id, "assignee_id": assignee_id}


# ============================================================
# RELAY CONTROL — POST /devices/:id/command
# ============================================================

@app.post("/api/v1/devices/{device_id}/command")
async def send_device_command(
    device_id: str,
    payload: dict,
    x_user_id: str = Header(..., alias="X-User-Id"),
    x_user_role: str = Header(..., alias="X-User-Role"),
):
    """
    Send a control command to a device via MQTT.
    Only admin and device owner roles can issue commands.

    Body:
    {
      "command": "shutdown" | "warning_light_on" | "warning_light_off" | "restart" | "reset_alert",
      "reason": "High emission detected"
    }
    """
    # RBAC check
    allowed_roles = ("city_admin", "vehicle_owner", "generator_owner", "industry_owner")
    if x_user_role not in allowed_roles:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    command = payload.get("command")
    reason = payload.get("reason", "Manual command")

    if not command:
        raise HTTPException(status_code=400, detail="command field required")

    valid_commands = ["shutdown", "warning_light_on", "warning_light_off", "restart", "reset_alert"]
    if command not in valid_commands:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid command. Must be one of: {valid_commands}",
        )

    # Send via MQTT
    mqtt_result = {"sent": False, "demo": True}
    if mqtt_notifier and mqtt_notifier.connected:
        try:
            await mqtt_notifier.send_device_command(
                device_id=device_id,
                command=command,
                issued_by=x_user_id,
            )
            mqtt_result = {"sent": True, "demo": False}
        except Exception as e:
            logger.error(f"MQTT command failed: {e}")
            mqtt_result = {"sent": False, "error": str(e)}
    else:
        logger.info(f"[DEMO] Command '{command}' → device '{device_id}' (MQTT not connected)")

    # Always audit log the command
    audit_logger.log_action(
        action="device_command_sent",
        actor_id=x_user_id,
        actor_role=x_user_role,
        resource_type="device",
        resource_id=device_id,
        details={"command": command, "reason": reason, "mqtt": mqtt_result},
    )

    return {
        "device_id": device_id,
        "command": command,
        "issued_by": x_user_id,
        "reason": reason,
        "mqtt": mqtt_result,
        "timestamp": datetime.utcnow().isoformat(),
    }


# ============================================================
# AUDIT LOG
# ============================================================

@app.get("/api/v1/audit/logs")
async def get_audit_logs(
    actor_id: Optional[str] = None,
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    limit: int = 100,
    x_user_role: str = Header("city_admin", alias="X-User-Role"),
):
    """Get audit logs (city_admin only)"""
    if x_user_role != "city_admin":
        raise HTTPException(status_code=403, detail="Only city admins can view audit logs")

    logs = audit_logger.get_logs(
        actor_id=actor_id,
        action=action,
        resource_type=resource_type,
        limit=limit,
    )
    return {"logs": logs, "total": len(logs)}


# ============================================================
# NOTIFICATION SEND (manual trigger)
# ============================================================

@app.post("/api/v1/notifications/send")
async def send_notification(payload: dict):
    """
    Manually send a notification.
    Body:
    {
      "type": "email",
      "to": "owner@example.com",
      "subject": "Alert: High Emission",
      "template": "alert",
      "context": { "device_id": "D001", "emission_score": 85 }
    }
    """
    notif_type = payload.get("type", "email")
    to = payload.get("to")
    subject = payload.get("subject", "EcoTronics Notification")
    template = payload.get("template", "generic")
    context = payload.get("context", {})

    if not to:
        raise HTTPException(status_code=400, detail="'to' field required")

    result = {"sent": False}

    if notif_type == "email" and email_notifier:
        try:
            await email_notifier.send(
                to=to,
                subject=subject,
                template=template,
                context=context,
            )
            result = {"sent": True, "type": "email", "to": to}
        except Exception as e:
            result = {"sent": False, "error": str(e)}
    else:
        # Demo mode
        logger.info(f"[DEMO] Email to {to}: {subject}")
        result = {"sent": True, "type": "email", "to": to, "demo": True}

    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
