"""
MQTT Notifier
Sends control commands to devices via MQTT broker.
Falls back to console logging in demo mode.
"""

import json
import logging
import os
from datetime import datetime

logger = logging.getLogger(__name__)

try:
    import paho.mqtt.client as mqtt
    MQTT_AVAILABLE = True
except ImportError:
    MQTT_AVAILABLE = False
    logger.warning("paho-mqtt not available — MQTT will use demo mode")


class MQTTNotifier:
    """
    Publishes device control commands to MQTT broker.
    Topics follow the pattern: ecotronics/devices/{device_id}/command
    """

    def __init__(self):
        self.host = os.getenv("MQTT_BROKER_HOST", "localhost")
        self.port = int(os.getenv("MQTT_BROKER_PORT", "1883"))
        self.username = os.getenv("MQTT_USERNAME", "")
        self.password = os.getenv("MQTT_PASSWORD", "")
        self.connected = False
        self._client = None

        self.demo_mode = not MQTT_AVAILABLE

        if self.demo_mode:
            logger.info("MQTTNotifier: running in DEMO mode (paho-mqtt not installed)")

    async def connect(self):
        """Connect to MQTT broker"""
        if self.demo_mode:
            logger.info("[MQTT DEMO] Skipping connection")
            return

        self._client = mqtt.Client(client_id="ecotronics-notification-service")

        if self.username:
            self._client.username_pw_set(self.username, self.password)

        def on_connect(client, userdata, flags, rc):
            if rc == 0:
                self.connected = True
                logger.info(f"MQTT connected to {self.host}:{self.port}")
            else:
                logger.error(f"MQTT connection failed with code {rc}")

        def on_disconnect(client, userdata, rc):
            self.connected = False
            logger.warning("MQTT disconnected")

        self._client.on_connect = on_connect
        self._client.on_disconnect = on_disconnect

        self._client.connect(self.host, self.port, keepalive=60)
        self._client.loop_start()

    async def disconnect(self):
        """Disconnect from MQTT broker"""
        if self._client:
            self._client.loop_stop()
            self._client.disconnect()
            self.connected = False

    async def send_device_command(
        self,
        device_id: str,
        command: str,
        issued_by: str = "system",
    ):
        """
        Publish a command to a device.
        Topic: ecotronics/devices/{device_id}/command

        Payload:
        {
          "command": "shutdown",
          "issued_by": "rules_engine",
          "timestamp": "2026-02-18T13:30:00Z"
        }
        """
        topic = f"ecotronics/devices/{device_id}/command"
        payload = json.dumps({
            "command": command,
            "device_id": device_id,
            "issued_by": issued_by,
            "timestamp": datetime.utcnow().isoformat(),
        })

        if self.demo_mode or not self.connected:
            logger.info(
                f"[MQTT DEMO] Topic: {topic}\n"
                f"  Payload: {payload}"
            )
            return

        result = self._client.publish(topic, payload, qos=1)

        if result.rc == mqtt.MQTT_ERR_SUCCESS:
            logger.info(f"MQTT command sent: {command} → {device_id}")
        else:
            logger.error(f"MQTT publish failed: rc={result.rc}")
            raise RuntimeError(f"MQTT publish failed with rc={result.rc}")

    async def publish_alert(self, device_id: str, alert_data: dict):
        """
        Publish an alert event to the alert topic.
        Topic: ecotronics/devices/{device_id}/alert
        """
        topic = f"ecotronics/devices/{device_id}/alert"
        payload = json.dumps(alert_data)

        if self.demo_mode or not self.connected:
            logger.info(f"[MQTT DEMO] Alert published to {topic}")
            return

        self._client.publish(topic, payload, qos=1)
