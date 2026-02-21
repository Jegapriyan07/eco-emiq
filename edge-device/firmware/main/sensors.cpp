/**
 * EcoTronics Edge Device - Sensor Reading Implementation
 * Handles all sensor interfacing and raw data acquisition
 */

#include "config.h"
#include <DHT.h>

// External sensor objects (defined in main.ino)
extern DHT dht;
extern volatile uint16_t rpmPulseCount;
extern unsigned long lastRPMTime;

// ============================================================================
// SENSOR INITIALIZATION
// ============================================================================

void initSensors() {
  DEBUG_PRINTLN("Initializing sensors...");
  
  // Configure ADC pins
  pinMode(PIN_MQ7_CO, INPUT);
  pinMode(PIN_MQ135_MULTI, INPUT);
  
  // Configure ADC resolution (ESP32 supports 9-12 bits)
  analogReadResolution(12);  // 12-bit resolution (0-4095)
  analogSetAttenuation(ADC_11db);  // Full range: 0-3.3V
  
  // Initialize DHT22
  dht.begin();
  
  // Initialize PMS5003 (UART2)
  Serial2.begin(9600, SERIAL_8N1, PIN_PMS5003_RX, PIN_PMS5003_TX);
  
  // Initialize RPM sensor (interrupt-based)
  pinMode(PIN_RPM_SENSOR, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(PIN_RPM_SENSOR), rpmPulseISR, FALLING);
  
  // Warm-up period for gas sensors (30 seconds)
  DEBUG_PRINTLN("Warming up gas sensors (30s)...");
  for (int i = 0; i < 30; i++) {
    delay(1000);
    DEBUG_PRINT(".");
  }
  DEBUG_PRINTLN("\nSensors ready!");
}

// ============================================================================
// MAIN SENSOR READING FUNCTION
// ============================================================================

SensorReading readSensors() {
  SensorReading reading;
  
  // Read gas sensors
  reading.co = readMQ7_CO();
  reading.co2 = readMQ135_CO2();
  reading.nox = readMQ135_NOx();
  
  // Read particulate matter
  readPMS5003(reading.pm25, reading.pm10);
  
  // Read temperature and humidity
  readDHT22(reading.temperature, reading.humidity);
  
  // Read RPM
  reading.rpm = readRPM();
  
  return reading;
}

// ============================================================================
// MQ-7 CARBON MONOXIDE SENSOR
// ============================================================================

float readMQ7_CO() {
  // Read analog value
  int rawValue = analogRead(PIN_MQ7_CO);
  
  // Convert to voltage
  float voltage = (rawValue / ADC_RESOLUTION) * ADC_VOLTAGE;
  
  // Calculate sensor resistance
  // Rs = (Vc * RL) / (Vout) - RL
  float rs = ((ADC_VOLTAGE * MQ7_RL) / voltage) - MQ7_RL;
  
  // Calculate ratio Rs/Ro
  float ratio = rs / MQ7_RO_CLEAN_AIR;
  
  // Convert to CO concentration (ppm)
  // Based on MQ-7 datasheet curve: ppm = a * (Rs/Ro)^b
  // For CO: a = 100, b = -1.5 (approximate)
  float ppm = 100.0 * pow(ratio, -1.5);
  
  // Apply calibration
  ppm *= MQ7_CALIBRATION;
  
  // Clamp to reasonable range
  if (ppm < 0) ppm = 0;
  if (ppm > 1000) ppm = 1000;  // Max 1000 ppm
  
  return ppm;
}

// ============================================================================
// MQ-135 CARBON DIOXIDE SENSOR
// ============================================================================

float readMQ135_CO2() {
  // Read analog value
  int rawValue = analogRead(PIN_MQ135_MULTI);
  
  // Convert to voltage
  float voltage = (rawValue / ADC_RESOLUTION) * ADC_VOLTAGE;
  
  // Calculate sensor resistance
  float rs = ((ADC_VOLTAGE * MQ135_RL) / voltage) - MQ135_RL;
  
  // Calculate ratio Rs/Ro
  float ratio = rs / MQ135_RO_CLEAN_AIR;
  
  // Convert to CO2 concentration (ppm)
  // Based on MQ-135 datasheet: ppm = a * (Rs/Ro)^b
  // For CO2: a = 110, b = -2.8 (approximate)
  float ppm = 110.0 * pow(ratio, -2.8);
  
  // Apply calibration
  ppm *= MQ135_CALIBRATION;
  
  // Clamp to reasonable range (400-5000 ppm)
  if (ppm < 400) ppm = 400;    // Atmospheric CO2
  if (ppm > 5000) ppm = 5000;  // Max reading
  
  return ppm;
}

// ============================================================================
// MQ-135 NITROGEN OXIDES SENSOR
// ============================================================================

float readMQ135_NOx() {
  // Read analog value (same sensor as CO2)
  int rawValue = analogRead(PIN_MQ135_MULTI);
  
  // Convert to voltage
  float voltage = (rawValue / ADC_RESOLUTION) * ADC_VOLTAGE;
  
  // Calculate sensor resistance
  float rs = ((ADC_VOLTAGE * MQ135_RL) / voltage) - MQ135_RL;
  
  // Calculate ratio Rs/Ro
  float ratio = rs / MQ135_RO_CLEAN_AIR;
  
  // Convert to NOx concentration (ppm)
  // Based on MQ-135 sensitivity to NOx: a = 45, b = -2.5
  float ppm = 45.0 * pow(ratio, -2.5);
  
  // Apply calibration
  ppm *= MQ135_CALIBRATION;
  
  // Clamp to reasonable range
  if (ppm < 0) ppm = 0;
  if (ppm > 100) ppm = 100;  // Max 100 ppm
  
  return ppm;
}

// ============================================================================
// PMS5003 PARTICULATE MATTER SENSOR
// ============================================================================

void readPMS5003(float &pm25, float &pm10) {
  // PMS5003 data frame structure (32 bytes)
  uint8_t buffer[32];
  int index = 0;
  bool foundStart = false;
  
  // Clear serial buffer
  while (Serial2.available()) {
    Serial2.read();
  }
  
  // Wait for data (timeout 2 seconds)
  unsigned long startTime = millis();
  while (millis() - startTime < 2000) {
    if (Serial2.available()) {
      uint8_t byte = Serial2.read();
      
      // Look for start bytes (0x42 0x4D)
      if (!foundStart) {
        if (byte == 0x42) {
          buffer[0] = byte;
          foundStart = true;
          index = 1;
        }
      } else {
        buffer[index++] = byte;
        
        // Check if we have a complete frame
        if (index >= 32) {
          // Verify start bytes
          if (buffer[0] == 0x42 && buffer[1] == 0x4D) {
            // Extract PM2.5 (bytes 6-7, big-endian)
            pm25 = (buffer[6] << 8) | buffer[7];
            
            // Extract PM10 (bytes 8-9, big-endian)
            pm10 = (buffer[8] << 8) | buffer[9];
            
            return;  // Success
          }
          
          // Invalid frame, reset
          foundStart = false;
          index = 0;
        }
      }
    }
  }
  
  // Timeout or error - return last known values or defaults
  DEBUG_PRINTLN("PMS5003 read timeout!");
  pm25 = 0;
  pm10 = 0;
}

// ============================================================================
// DHT22 TEMPERATURE & HUMIDITY SENSOR
// ============================================================================

void readDHT22(float &temp, float &humidity) {
  // Read from DHT22
  temp = dht.readTemperature();
  humidity = dht.readHumidity();
  
  // Check if readings are valid
  if (isnan(temp) || isnan(humidity)) {
    DEBUG_PRINTLN("DHT22 read failed!");
    temp = 25.0;      // Default temperature
    humidity = 50.0;  // Default humidity
  }
  
  // Clamp to reasonable ranges
  if (temp < -40) temp = -40;
  if (temp > 80) temp = 80;
  if (humidity < 0) humidity = 0;
  if (humidity > 100) humidity = 100;
}

// ============================================================================
// RPM SENSOR (HALL EFFECT / OPTICAL)
// ============================================================================

uint16_t readRPM() {
  unsigned long currentTime = millis();
  unsigned long elapsedTime = currentTime - lastRPMTime;
  
  // Calculate RPM every second
  if (elapsedTime >= 1000) {
    // RPM = (pulses * 60) / (elapsed_seconds * pulses_per_revolution)
    // Assuming 1 pulse per revolution
    uint16_t rpm = (rpmPulseCount * 60000) / elapsedTime;
    
    // Reset counter
    rpmPulseCount = 0;
    lastRPMTime = currentTime;
    
    // Clamp to reasonable range
    if (rpm > 10000) rpm = 10000;  // Max 10,000 RPM
    
    return rpm;
  }
  
  // Return 0 if not enough time has elapsed
  return 0;
}

// ============================================================================
// SENSOR CALIBRATION FUNCTIONS
// ============================================================================

/**
 * Calibrate MQ-7 sensor in clean air
 * Call this function in a clean air environment to set Ro
 */
float calibrateMQ7() {
  DEBUG_PRINTLN("Calibrating MQ-7 (60 seconds in clean air)...");
  
  float rsSum = 0;
  int samples = 60;
  
  for (int i = 0; i < samples; i++) {
    int rawValue = analogRead(PIN_MQ7_CO);
    float voltage = (rawValue / ADC_RESOLUTION) * ADC_VOLTAGE;
    float rs = ((ADC_VOLTAGE * MQ7_RL) / voltage) - MQ7_RL;
    rsSum += rs;
    
    delay(1000);
    DEBUG_PRINT(".");
  }
  
  float ro = rsSum / samples;
  DEBUG_PRINTF("\nMQ-7 Ro = %.2f kOhms\n", ro);
  DEBUG_PRINTLN("Update MQ7_RO_CLEAN_AIR in config.h");
  
  return ro;
}

/**
 * Calibrate MQ-135 sensor in clean air
 */
float calibrateMQ135() {
  DEBUG_PRINTLN("Calibrating MQ-135 (60 seconds in clean air)...");
  
  float rsSum = 0;
  int samples = 60;
  
  for (int i = 0; i < samples; i++) {
    int rawValue = analogRead(PIN_MQ135_MULTI);
    float voltage = (rawValue / ADC_RESOLUTION) * ADC_VOLTAGE;
    float rs = ((ADC_VOLTAGE * MQ135_RL) / voltage) - MQ135_RL;
    rsSum += rs;
    
    delay(1000);
    DEBUG_PRINT(".");
  }
  
  float ro = rsSum / samples;
  DEBUG_PRINTF("\nMQ-135 Ro = %.2f kOhms\n", ro);
  DEBUG_PRINTLN("Update MQ135_RO_CLEAN_AIR in config.h");
  
  return ro;
}
