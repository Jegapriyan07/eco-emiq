/**
 * EcoTronics Edge Device - Main Sketch
 * ESP32-based emission monitoring with local intelligence
 * 
 * Features:
 * - Multi-sensor reading (CO, CO2, NOx, PM2.5, Temp, Humidity, RPM)
 * - Local preprocessing (rolling mean, calibration, outlier removal)
 * - Emission score calculation (0-100)
 * - Anomaly detection (threshold + z-score)
 * - MQTT publishing with HTTP fallback
 * - Local circular buffer
 * - Alert outputs (buzzer, LED, relay)
 */

#include <Wire.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <HTTPClient.h>
#include <EEPROM.h>
#include <time.h>
#include <DHT.h>
#include <ArduinoJson.h>

#include "config.h"

// ============================================================================
// GLOBAL VARIABLES
// ============================================================================

// Sensor objects
DHT dht(PIN_DHT22, DHT22);

// Network clients
WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);
HTTPClient httpClient;

// Device configuration
DeviceConfig deviceConfig;
DeviceStatus currentStatus = STATUS_INITIALIZING;

// Timing
unsigned long lastSensorRead = 0;
unsigned long lastMQTTPublish = 0;
unsigned long lastNTPSync = 0;
unsigned long deviceStartTime = 0;

// Data buffers
ProcessedData dataBuffer[BUFFER_SIZE];
int bufferIndex = 0;
int bufferCount = 0;

// Rolling mean buffers
float coBuffer[ROLLING_MEAN_WINDOW] = {0};
float co2Buffer[ROLLING_MEAN_WINDOW] = {0};
float noxBuffer[ROLLING_MEAN_WINDOW] = {0};
float pm25Buffer[ROLLING_MEAN_WINDOW] = {0};
int rollingIndex = 0;

// Anomaly detection buffers
float anomalyBuffer[ANOMALY_WINDOW] = {0};
int anomalyIndex = 0;

// RPM counter
volatile uint16_t rpmPulseCount = 0;
unsigned long lastRPMTime = 0;

// ============================================================================
// SETUP
// ============================================================================

void setup() {
  // Initialize serial for debugging
  #if DEBUG_ENABLED
    Serial.begin(DEBUG_SERIAL_BAUD);
    while (!Serial && millis() < 3000); // Wait up to 3 seconds
    DEBUG_PRINTLN("\n\n=================================");
    DEBUG_PRINTLN("EcoTronics Edge Device Starting");
    DEBUG_PRINTLN("=================================");
    DEBUG_PRINTF("Firmware: %s\n", FIRMWARE_VERSION);
    DEBUG_PRINTF("Hardware: %s\n", HARDWARE_VERSION);
  #endif

  // Initialize EEPROM
  EEPROM.begin(EEPROM_SIZE);
  
  // Initialize components
  initOutputs();
  setLED(LED_COLOR_BLUE);  // Blue = initializing
  
  initProvisioning();
  deviceConfig = getDeviceConfig();
  
  if (!deviceConfig.provisioned) {
    DEBUG_PRINTLN("Device not provisioned! Starting provisioning...");
    provisionDevice();
    deviceConfig = getDeviceConfig();
  }
  
  DEBUG_PRINTF("Device ID: %s\n", deviceConfig.deviceId);
  DEBUG_PRINTF("Device Type: %s\n", deviceConfig.deviceType);
  
  initSensors();
  initProcessing();
  initStorage();
  initWiFi();
  initMQTT();
  initHTTP();
  
  // Sync time
  syncNTP();
  
  deviceStartTime = millis();
  currentStatus = STATUS_NORMAL;
  setLED(LED_COLOR_GREEN);  // Green = normal
  
  DEBUG_PRINTLN("Setup complete!");
  playBuzzer(BUZZER_BEEP_SHORT);  // Startup beep
}

// ============================================================================
// MAIN LOOP
// ============================================================================

void loop() {
  unsigned long currentMillis = millis();
  
  // Maintain WiFi connection
  if (!isWiFiConnected()) {
    currentStatus = STATUS_OFFLINE;
    setLED(LED_COLOR_PURPLE);  // Purple = offline
    connectWiFi();
  }
  
  // Maintain MQTT connection
  if (isWiFiConnected() && !mqttClient.connected()) {
    connectMQTT();
  }
  mqttClient.loop();
  
  // Read sensors at configured interval
  if (currentMillis - lastSensorRead >= SENSOR_READ_INTERVAL_MS) {
    lastSensorRead = currentMillis;
    
    // Read raw sensor data
    SensorReading raw = readSensors();
    
    // Apply preprocessing
    SensorReading filtered = applyRollingMean(raw);
    filtered = applyCalibration(filtered);
    filtered = applyTempHumidityCorrection(filtered, raw.temperature, raw.humidity);
    filtered = removeOutliers(filtered);
    
    // Calculate emission score
    float emissionScore = calculateEmissionScore(filtered);
    
    // Detect anomalies
    bool anomaly = detectAnomaly(filtered);
    
    // Create processed data packet
    ProcessedData data;
    data.raw = raw;
    data.filtered = filtered;
    data.emissionScore = emissionScore;
    data.anomalyDetected = anomaly;
    data.timestamp = getTimestamp();
    data.runtimeSeconds = (currentMillis - deviceStartTime) / 1000;
    
    // Store in local buffer
    storeReading(data);
    
    // Update status based on readings
    if (anomaly || 
        filtered.co > THRESHOLD_CO_CRITICAL || 
        filtered.pm25 > THRESHOLD_PM25_CRITICAL) {
      currentStatus = STATUS_CRITICAL;
    } else if (filtered.co > THRESHOLD_CO_WARNING || 
               filtered.pm25 > THRESHOLD_PM25_WARNING) {
      currentStatus = STATUS_WARNING;
    } else {
      currentStatus = STATUS_NORMAL;
    }
    
    updateStatusIndicators(currentStatus);
    
    // Debug output
    #if DEBUG_ENABLED
      DEBUG_PRINTLN("\n--- Sensor Reading ---");
      DEBUG_PRINTF("CO: %.2f ppm\n", filtered.co);
      DEBUG_PRINTF("CO2: %.2f ppm\n", filtered.co2);
      DEBUG_PRINTF("NOx: %.2f ppm\n", filtered.nox);
      DEBUG_PRINTF("PM2.5: %.2f μg/m³\n", filtered.pm25);
      DEBUG_PRINTF("Temp: %.2f °C\n", filtered.temperature);
      DEBUG_PRINTF("Humidity: %.2f %%\n", filtered.humidity);
      DEBUG_PRINTF("RPM: %d\n", filtered.rpm);
      DEBUG_PRINTF("Emission Score: %.2f\n", emissionScore);
      DEBUG_PRINTF("Anomaly: %s\n", anomaly ? "YES" : "NO");
      DEBUG_PRINTF("Status: %d\n", currentStatus);
    #endif
  }
  
  // Publish to MQTT at configured interval
  if (currentMillis - lastMQTTPublish >= MQTT_PUBLISH_INTERVAL_MS) {
    lastMQTTPublish = currentMillis;
    
    if (bufferCount > 0) {
      // Get the latest reading
      int latestIndex = (bufferIndex - 1 + BUFFER_SIZE) % BUFFER_SIZE;
      ProcessedData latestData = dataBuffer[latestIndex];
      
      // Create JSON packet
      String packet = createDataPacket(latestData);
      
      // Try MQTT first
      char topic[128];
      snprintf(topic, sizeof(topic), MQTT_TOPIC_READINGS, deviceConfig.deviceId);
      
      bool published = false;
      if (mqttClient.connected()) {
        published = publishMQTT(topic, packet.c_str());
        DEBUG_PRINTLN(published ? "MQTT publish OK" : "MQTT publish FAILED");
      }
      
      // Fallback to HTTP if MQTT fails
      if (!published && isWiFiConnected()) {
        published = publishHTTP(packet.c_str());
        DEBUG_PRINTLN(published ? "HTTP publish OK" : "HTTP publish FAILED");
      }
      
      if (!published) {
        DEBUG_PRINTLN("WARNING: Failed to publish data!");
      }
    }
  }
  
  // Sync NTP periodically
  if (currentMillis - lastNTPSync >= NTP_SYNC_INTERVAL_MS) {
    lastNTPSync = currentMillis;
    syncNTP();
  }
  
  // Small delay to prevent watchdog issues
  delay(10);
}

// ============================================================================
// INTERRUPT HANDLERS
// ============================================================================

void IRAM_ATTR rpmPulseISR() {
  rpmPulseCount++;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

String createDataPacket(ProcessedData data) {
  StaticJsonDocument<1024> doc;
  
  doc["device_id"] = deviceConfig.deviceId;
  doc["device_key"] = deviceConfig.deviceKey;
  doc["timestamp"] = data.timestamp;
  doc["lat"] = deviceConfig.latitude;
  doc["lon"] = deviceConfig.longitude;
  
  JsonObject sensor = doc.createNestedObject("sensor");
  sensor["co"] = data.filtered.co;
  sensor["co2"] = data.filtered.co2;
  sensor["nox"] = data.filtered.nox;
  sensor["pm25"] = data.filtered.pm25;
  sensor["pm10"] = data.filtered.pm10;
  sensor["temp"] = data.filtered.temperature;
  sensor["humidity"] = data.filtered.humidity;
  sensor["rpm"] = data.filtered.rpm;
  
  doc["emission_score"] = data.emissionScore;
  doc["runtime_seconds"] = data.runtimeSeconds;
  doc["status"] = currentStatus == STATUS_NORMAL ? "ok" : 
                  currentStatus == STATUS_WARNING ? "warning" : "critical";
  doc["anomaly_detected"] = data.anomalyDetected;
  
  JsonArray alerts = doc.createNestedArray("local_alerts");
  if (data.filtered.co > THRESHOLD_CO_CRITICAL) {
    alerts.add("CO_CRITICAL");
  } else if (data.filtered.co > THRESHOLD_CO_WARNING) {
    alerts.add("CO_WARNING");
  }
  if (data.filtered.pm25 > THRESHOLD_PM25_CRITICAL) {
    alerts.add("PM25_CRITICAL");
  } else if (data.filtered.pm25 > THRESHOLD_PM25_WARNING) {
    alerts.add("PM25_WARNING");
  }
  if (data.anomalyDetected) {
    alerts.add("ANOMALY_DETECTED");
  }
  
  String output;
  serializeJson(doc, output);
  return output;
}

unsigned long getTimestamp() {
  time_t now;
  time(&now);
  return now;
}

void syncNTP() {
  DEBUG_PRINTLN("Syncing NTP...");
  configTime(0, 0, NTP_SERVER);
  setenv("TZ", NTP_TIMEZONE, 1);
  tzset();
  
  // Wait for time to be set
  int retry = 0;
  const int retry_count = 10;
  while (time(nullptr) < 100000 && retry < retry_count) {
    delay(500);
    DEBUG_PRINT(".");
    retry++;
  }
  
  if (retry < retry_count) {
    time_t now = time(nullptr);
    DEBUG_PRINTF("\nNTP synced: %s", ctime(&now));
  } else {
    DEBUG_PRINTLN("\nNTP sync failed!");
  }
}
