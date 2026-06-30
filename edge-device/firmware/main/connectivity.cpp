/**
 * EcoTronics Edge Device - Connectivity Implementation
 * WiFi, MQTT, and HTTP fallback
 */

#include "config.h"
#include <WiFi.h>
#include <PubSubClient.h>
#include <HTTPClient.h>

// External clients (defined in main.ino)
extern WiFiClient wifiClient;
extern PubSubClient mqttClient;
extern HTTPClient httpClient;
extern DeviceConfig deviceConfig;

// ============================================================================
// WIFI INITIALIZATION & CONNECTION
// ============================================================================

void initWiFi() {
  DEBUG_PRINTLN("Initializing WiFi...");
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
}

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    return;  // Already connected
  }
  
  DEBUG_PRINTF("Connecting to WiFi: %s\n", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  unsigned long startTime = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startTime < WIFI_TIMEOUT_MS) {
    delay(500);
    DEBUG_PRINT(".");
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    DEBUG_PRINTLN("\nWiFi connected!");
    DEBUG_PRINTF("IP Address: %s\n", WiFi.localIP().toString().c_str());
    DEBUG_PRINTF("Signal Strength: %d dBm\n", WiFi.RSSI());
  } else {
    DEBUG_PRINTLN("\nWiFi connection failed!");
  }
}

bool isWiFiConnected() {
  return WiFi.status() == WL_CONNECTED;
}

// ============================================================================
// MQTT INITIALIZATION & CONNECTION
// ============================================================================

void initMQTT() {
  DEBUG_PRINTLN("Initializing MQTT...");
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  mqttClient.setBufferSize(1024);  // Increase buffer for larger messages
}

void connectMQTT() {
  if (mqttClient.connected()) {
    return;  // Already connected
  }
  
  if (!isWiFiConnected()) {
    return;  // Can't connect without WiFi
  }
  
  DEBUG_PRINTF("Connecting to MQTT broker: %s:%d\n", MQTT_BROKER, MQTT_PORT);
  
  // Prepare Last Will & Testament
  char lwtTopic[128];
  snprintf(lwtTopic, sizeof(lwtTopic), MQTT_LWT_TOPIC, deviceConfig.deviceId);
  
  // Attempt connection
  bool connected = mqttClient.connect(
    deviceConfig.deviceId,           // Client ID
    NULL,                             // Username (NULL for no auth)
    NULL,                             // Password
    lwtTopic,                         // LWT topic
    MQTT_LWT_QOS,                     // LWT QoS
    MQTT_LWT_RETAIN,                  // LWT retain
    MQTT_LWT_MESSAGE                  // LWT message
  );
  
  if (connected) {
    DEBUG_PRINTLN("MQTT connected!");
    
    // Subscribe to command topic
    char commandTopic[128];
    snprintf(commandTopic, sizeof(commandTopic), MQTT_TOPIC_COMMANDS, deviceConfig.deviceId);
    mqttClient.subscribe(commandTopic, MQTT_QOS);
    DEBUG_PRINTF("Subscribed to: %s\n", commandTopic);
    
    // Publish online status
    char statusTopic[128];
    snprintf(statusTopic, sizeof(statusTopic), MQTT_TOPIC_STATUS, deviceConfig.deviceId);
    mqttClient.publish(statusTopic, "{\"status\":\"online\"}", true);
    
  } else {
    DEBUG_PRINTF("MQTT connection failed! State: %d\n", mqttClient.state());
  }
}

bool publishMQTT(const char* topic, const char* payload) {
  if (!mqttClient.connected()) {
    connectMQTT();
  }
  
  if (mqttClient.connected()) {
    bool success = mqttClient.publish(topic, payload, false);  // QoS 0 for readings
    if (success) {
      DEBUG_PRINTF("MQTT published to %s\n", topic);
    } else {
      DEBUG_PRINTF("MQTT publish failed to %s\n", topic);
    }
    return success;
  }
  
  return false;
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  DEBUG_PRINTF("MQTT message received on %s\n", topic);
  
  // Convert payload to string
  char message[length + 1];
  memcpy(message, payload, length);
  message[length] = '\0';
  
  DEBUG_PRINTF("Payload: %s\n", message);
  
  // Parse JSON command
  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, message);
  
  if (error) {
    DEBUG_PRINTF("JSON parse error: %s\n", error.c_str());
    return;
  }
  
  // Handle commands
  const char* command = doc["command"];
  
  if (strcmp(command, "calibrate") == 0) {
    int sensor = doc["sensor"];
    float offset = doc["offset"];
    updateCalibrationOffset(sensor, offset);
    DEBUG_PRINTF("Calibration updated: sensor %d, offset %.2f\n", sensor, offset);
    
  } else if (strcmp(command, "restart") == 0) {
    DEBUG_PRINTLN("Restart command received!");
    delay(1000);
    ESP.restart();
    
  } else if (strcmp(command, "shutdown_relay") == 0) {
    bool state = doc["state"];
    setRelay(state);
    DEBUG_PRINTF("Relay set to: %s\n", state ? "ON" : "OFF");
    
  } else if (strcmp(command, "update_location") == 0) {
    deviceConfig.latitude = doc["lat"];
    deviceConfig.longitude = doc["lon"];
    DEBUG_PRINTF("Location updated: %.6f, %.6f\n", deviceConfig.latitude, deviceConfig.longitude);
    
  } else {
    DEBUG_PRINTF("Unknown command: %s\n", command);
  }
}

// ============================================================================
// HTTP FALLBACK IMPLEMENTATION
// ============================================================================

void initHTTP() {
  DEBUG_PRINTLN("HTTP fallback initialized");
}

bool publishHTTP(const char* payload) {
  if (!isWiFiConnected()) {
    return false;
  }
  
  DEBUG_PRINTLN("Attempting HTTP POST...");
  
  httpClient.begin(HTTP_SERVER HTTP_ENDPOINT);
  httpClient.addHeader("Content-Type", "application/json");
  httpClient.addHeader("X-Device-ID", deviceConfig.deviceId);
  httpClient.addHeader("X-Device-Key", deviceConfig.deviceKey);
  httpClient.setTimeout(HTTP_TIMEOUT_MS);
  
  int httpCode = httpClient.POST(payload);
  
  if (httpCode > 0) {
    DEBUG_PRINTF("HTTP response code: %d\n", httpCode);
    
    if (httpCode == HTTP_CODE_OK || httpCode == HTTP_CODE_CREATED) {
      String response = httpClient.getString();
      DEBUG_PRINTF("HTTP response: %s\n", response.c_str());
      httpClient.end();
      return true;
    }
  } else {
    DEBUG_PRINTF("HTTP POST failed: %s\n", httpClient.errorToString(httpCode).c_str());
  }
  
  httpClient.end();
  return false;
}
