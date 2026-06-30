/**
 * EcoTronics Edge Device - Configuration
 * ESP32-based emission monitoring device with local intelligence
 */

#ifndef CONFIG_H
#define CONFIG_H

// ============================================================================
// DEVICE CONFIGURATION
// ============================================================================

#define DEVICE_TYPE "vehicle"  // Options: vehicle, generator, industrial
#define FIRMWARE_VERSION "1.0.0"
#define HARDWARE_VERSION "1.0"

// ============================================================================
// PIN DEFINITIONS
// ============================================================================

// Analog Sensors (ADC)
#define PIN_MQ7_CO          34  // MQ-7 Carbon Monoxide
#define PIN_MQ135_MULTI     35  // MQ-135 CO2/NOx/NH3

// Digital Sensors
#define PIN_DHT22           4   // DHT22 Temperature & Humidity
#define PIN_PMS5003_RX      16  // PMS5003 Particulate Matter RX
#define PIN_PMS5003_TX      17  // PMS5003 Particulate Matter TX
#define PIN_RPM_SENSOR      5   // Hall effect / optical RPM sensor (interrupt)

// Output Devices
#define PIN_BUZZER          18  // Active buzzer
#define PIN_RGB_LED         19  // WS2812B RGB LED or common cathode
#define PIN_RELAY           21  // Relay for auto-shutdown
#define PIN_STATUS_LED      2   // Onboard LED

// ============================================================================
// SENSOR CONFIGURATION
// ============================================================================

// Sampling rates
#define SENSOR_READ_INTERVAL_MS     1000    // Read sensors every 1 second
#define MQTT_PUBLISH_INTERVAL_MS    10000   // Publish every 10 seconds
#define NTP_SYNC_INTERVAL_MS        3600000 // Sync time every hour

// MQ-7 CO Sensor
#define MQ7_RL              10.0    // Load resistance in kOhms
#define MQ7_RO_CLEAN_AIR    27.0    // Sensor resistance in clean air
#define MQ7_CALIBRATION     1.0     // Calibration factor

// MQ-135 Multi-gas Sensor
#define MQ135_RL            20.0    // Load resistance in kOhms
#define MQ135_RO_CLEAN_AIR  76.0    // Sensor resistance in clean air
#define MQ135_CALIBRATION   1.0     // Calibration factor

// ADC Configuration
#define ADC_RESOLUTION      4095.0  // 12-bit ADC
#define ADC_VOLTAGE         3.3     // Reference voltage

// ============================================================================
// PROCESSING CONFIGURATION
// ============================================================================

// Rolling mean filter
#define ROLLING_MEAN_WINDOW 10      // Window size for moving average

// Circular buffer
#define BUFFER_SIZE         100     // Store last 100 readings locally

// Anomaly detection
#define ANOMALY_WINDOW      30      // Window for z-score calculation
#define ANOMALY_THRESHOLD   3.0     // Z-score threshold for anomaly

// Emission score weights (sum to 1.0)
#define WEIGHT_CO           0.25
#define WEIGHT_CO2          0.20
#define WEIGHT_NOX          0.25
#define WEIGHT_PM25         0.30

// Threshold levels (for alerts)
#define THRESHOLD_CO_WARNING    50.0    // ppm
#define THRESHOLD_CO_CRITICAL   100.0   // ppm
#define THRESHOLD_CO2_WARNING   1000.0  // ppm
#define THRESHOLD_CO2_CRITICAL  2000.0  // ppm
#define THRESHOLD_PM25_WARNING  50.0    // μg/m³
#define THRESHOLD_PM25_CRITICAL 100.0   // μg/m³

// ============================================================================
// WIFI CONFIGURATION
// ============================================================================

#define WIFI_SSID           "YOUR_WIFI_SSID"
#define WIFI_PASSWORD       "YOUR_WIFI_PASSWORD"
#define WIFI_TIMEOUT_MS     30000   // 30 seconds
#define WIFI_RETRY_DELAY_MS 5000    // Retry every 5 seconds

// ============================================================================
// MQTT CONFIGURATION
// ============================================================================

#define MQTT_BROKER         "mqtt.ecotronics.local"
#define MQTT_PORT           1883
#define MQTT_USE_TLS        false   // Set true for production
#define MQTT_QOS            1       // QoS 1 for reliable delivery

// MQTT Topics
#define MQTT_TOPIC_READINGS "ecotronics/device/%s/readings"
#define MQTT_TOPIC_STATUS   "ecotronics/device/%s/status"
#define MQTT_TOPIC_ALERTS   "ecotronics/device/%s/alerts"
#define MQTT_TOPIC_COMMANDS "ecotronics/device/%s/commands"

// Last Will & Testament
#define MQTT_LWT_TOPIC      "ecotronics/device/%s/status"
#define MQTT_LWT_MESSAGE    "{\"status\":\"offline\"}"
#define MQTT_LWT_QOS        1
#define MQTT_LWT_RETAIN     true

// ============================================================================
// HTTP FALLBACK CONFIGURATION
// ============================================================================

#define HTTP_SERVER         "https://api.ecotronics.local"
#define HTTP_ENDPOINT       "/api/v1/readings"
#define HTTP_TIMEOUT_MS     5000
#define HTTP_MAX_RETRIES    3
#define HTTP_RETRY_DELAY_MS 2000

// ============================================================================
// NTP CONFIGURATION
// ============================================================================

#define NTP_SERVER          "pool.ntp.org"
#define NTP_TIMEZONE        "IST-5:30"  // India Standard Time
#define NTP_DAYLIGHT_OFFSET 0

// ============================================================================
// DEVICE PROVISIONING
// ============================================================================

#define EEPROM_SIZE         512
#define EEPROM_DEVICE_ID_ADDR   0
#define EEPROM_DEVICE_KEY_ADDR  64
#define DEVICE_KEY_LENGTH   32  // 256-bit key

// ============================================================================
// OUTPUT CONFIGURATION
// ============================================================================

// Buzzer patterns (in ms)
#define BUZZER_BEEP_SHORT   100
#define BUZZER_BEEP_LONG    500
#define BUZZER_PAUSE_SHORT  100
#define BUZZER_PAUSE_LONG   500

// RGB LED colors (R, G, B)
#define LED_COLOR_OFF       0, 0, 0
#define LED_COLOR_GREEN     0, 255, 0     // Normal operation
#define LED_COLOR_YELLOW    255, 255, 0   // Warning
#define LED_COLOR_RED       255, 0, 0     // Critical
#define LED_COLOR_BLUE      0, 0, 255     // Connecting
#define LED_COLOR_PURPLE    128, 0, 128   // Offline

// Relay
#define RELAY_ACTIVE_HIGH   true  // Set false if relay is active low

// ============================================================================
// DEBUG CONFIGURATION
// ============================================================================

#define DEBUG_ENABLED       true
#define DEBUG_SERIAL_BAUD   115200

#if DEBUG_ENABLED
  #define DEBUG_PRINT(x)    Serial.print(x)
  #define DEBUG_PRINTLN(x)  Serial.println(x)
  #define DEBUG_PRINTF(...) Serial.printf(__VA_ARGS__)
#else
  #define DEBUG_PRINT(x)
  #define DEBUG_PRINTLN(x)
  #define DEBUG_PRINTF(...)
#endif

// ============================================================================
// MEMORY CONFIGURATION
// ============================================================================

#define STACK_SIZE          8192    // Stack size for tasks
#define QUEUE_SIZE          10      // Size of message queues

// ============================================================================
// DATA STRUCTURES
// ============================================================================

struct SensorReading {
  float co;           // Carbon monoxide (ppm)
  float co2;          // Carbon dioxide (ppm)
  float nox;          // Nitrogen oxides (ppm)
  float pm25;         // Particulate matter 2.5 (μg/m³)
  float pm10;         // Particulate matter 10 (μg/m³)
  float temperature;  // Temperature (°C)
  float humidity;     // Humidity (%)
  uint16_t rpm;       // RPM (for vehicles/generators)
};

struct ProcessedData {
  SensorReading raw;
  SensorReading filtered;
  float emissionScore;
  bool anomalyDetected;
  unsigned long timestamp;
  unsigned long runtimeSeconds;
};

struct DeviceConfig {
  char deviceId[64];
  char deviceKey[DEVICE_KEY_LENGTH + 1];
  char deviceType[32];
  float latitude;
  float longitude;
  bool provisioned;
};

enum DeviceStatus {
  STATUS_INITIALIZING,
  STATUS_CONNECTING,
  STATUS_NORMAL,
  STATUS_WARNING,
  STATUS_CRITICAL,
  STATUS_OFFLINE,
  STATUS_ERROR
};

enum AlertLevel {
  ALERT_NONE,
  ALERT_INFO,
  ALERT_WARNING,
  ALERT_CRITICAL
};

// ============================================================================
// FUNCTION PROTOTYPES
// ============================================================================

// Main functions
void setup();
void loop();

// Sensors
void initSensors();
SensorReading readSensors();
float readMQ7_CO();
float readMQ135_CO2();
float readMQ135_NOx();
void readPMS5003(float &pm25, float &pm10);
void readDHT22(float &temp, float &humidity);
uint16_t readRPM();

// Processing
void initProcessing();
SensorReading applyRollingMean(SensorReading reading);
SensorReading applyCalibration(SensorReading reading);
SensorReading applyTempHumidityCorrection(SensorReading reading, float temp, float humidity);
SensorReading removeOutliers(SensorReading reading);

// Emission score
float calculateEmissionScore(SensorReading reading);

// Anomaly detection
bool detectAnomaly(SensorReading reading);
float calculateZScore(float value, float mean, float stddev);

// Storage
void initStorage();
void storeReading(ProcessedData data);
ProcessedData* getBufferedReadings(int &count);

// Connectivity
void initWiFi();
void connectWiFi();
bool isWiFiConnected();

void initMQTT();
void connectMQTT();
bool publishMQTT(const char* topic, const char* payload);
void mqttCallback(char* topic, byte* payload, unsigned int length);

void initHTTP();
bool publishHTTP(const char* payload);

// Provisioning
void initProvisioning();
bool isProvisioned();
void provisionDevice();
DeviceConfig getDeviceConfig();

// Outputs
void initOutputs();
void setLED(uint8_t r, uint8_t g, uint8_t b);
void playBuzzer(int duration);
void setRelay(bool state);
void updateStatusIndicators(DeviceStatus status);

// Utilities
String createDataPacket(ProcessedData data);
unsigned long getTimestamp();
void syncNTP();

#endif // CONFIG_H
