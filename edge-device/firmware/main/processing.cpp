/**
 * EcoTronics Edge Device - Edge Processing Implementation
 * Local intelligence: filtering, calibration, outlier removal, anomaly detection
 */

#include "config.h"
#include <math.h>

// External buffers (defined in main.ino)
extern float coBuffer[ROLLING_MEAN_WINDOW];
extern float co2Buffer[ROLLING_MEAN_WINDOW];
extern float noxBuffer[ROLLING_MEAN_WINDOW];
extern float pm25Buffer[ROLLING_MEAN_WINDOW];
extern int rollingIndex;

extern float anomalyBuffer[ANOMALY_WINDOW];
extern int anomalyIndex;

// Calibration offsets (can be updated via MQTT commands)
float calibrationOffsets[8] = {0, 0, 0, 0, 0, 0, 0, 0};  // CO, CO2, NOx, PM2.5, PM10, Temp, Humidity, RPM

// ============================================================================
// INITIALIZATION
// ============================================================================

void initProcessing() {
  DEBUG_PRINTLN("Initializing edge processing...");
  
  // Initialize rolling mean buffers with zeros
  for (int i = 0; i < ROLLING_MEAN_WINDOW; i++) {
    coBuffer[i] = 0;
    co2Buffer[i] = 0;
    noxBuffer[i] = 0;
    pm25Buffer[i] = 0;
  }
  
  // Initialize anomaly buffer
  for (int i = 0; i < ANOMALY_WINDOW; i++) {
    anomalyBuffer[i] = 0;
  }
  
  DEBUG_PRINTLN("Edge processing ready!");
}

// ============================================================================
// ROLLING MEAN FILTER
// ============================================================================

SensorReading applyRollingMean(SensorReading reading) {
  // Add new readings to circular buffers
  coBuffer[rollingIndex] = reading.co;
  co2Buffer[rollingIndex] = reading.co2;
  noxBuffer[rollingIndex] = reading.nox;
  pm25Buffer[rollingIndex] = reading.pm25;
  
  // Increment and wrap index
  rollingIndex = (rollingIndex + 1) % ROLLING_MEAN_WINDOW;
  
  // Calculate means
  SensorReading filtered = reading;  // Keep temp, humidity, RPM unchanged
  
  filtered.co = calculateMean(coBuffer, ROLLING_MEAN_WINDOW);
  filtered.co2 = calculateMean(co2Buffer, ROLLING_MEAN_WINDOW);
  filtered.nox = calculateMean(noxBuffer, ROLLING_MEAN_WINDOW);
  filtered.pm25 = calculateMean(pm25Buffer, ROLLING_MEAN_WINDOW);
  
  return filtered;
}

float calculateMean(float* buffer, int size) {
  float sum = 0;
  int count = 0;
  
  for (int i = 0; i < size; i++) {
    if (buffer[i] > 0) {  // Ignore zeros (uninitialized)
      sum += buffer[i];
      count++;
    }
  }
  
  return (count > 0) ? (sum / count) : 0;
}

// ============================================================================
// CALIBRATION
// ============================================================================

SensorReading applyCalibration(SensorReading reading) {
  SensorReading calibrated = reading;
  
  // Apply calibration offsets
  calibrated.co += calibrationOffsets[0];
  calibrated.co2 += calibrationOffsets[1];
  calibrated.nox += calibrationOffsets[2];
  calibrated.pm25 += calibrationOffsets[3];
  calibrated.pm10 += calibrationOffsets[4];
  calibrated.temperature += calibrationOffsets[5];
  calibrated.humidity += calibrationOffsets[6];
  
  // Ensure non-negative values
  if (calibrated.co < 0) calibrated.co = 0;
  if (calibrated.co2 < 400) calibrated.co2 = 400;  // Min atmospheric CO2
  if (calibrated.nox < 0) calibrated.nox = 0;
  if (calibrated.pm25 < 0) calibrated.pm25 = 0;
  if (calibrated.pm10 < 0) calibrated.pm10 = 0;
  
  return calibrated;
}

// ============================================================================
// TEMPERATURE & HUMIDITY CORRECTION
// ============================================================================

SensorReading applyTempHumidityCorrection(SensorReading reading, float temp, float humidity) {
  SensorReading corrected = reading;
  
  // Reference conditions: 25°C, 50% RH
  float refTemp = 25.0;
  float refHumidity = 50.0;
  
  // Temperature correction factor (±0.5% per °C)
  float tempFactor = 1.0 + 0.005 * (temp - refTemp);
  
  // Humidity correction factor (±0.3% per % RH)
  float humidityFactor = 1.0 + 0.003 * (humidity - refHumidity);
  
  // Apply corrections to gas sensors (more sensitive to temp/humidity)
  corrected.co /= tempFactor * humidityFactor;
  corrected.co2 /= tempFactor;
  corrected.nox /= tempFactor * humidityFactor;
  
  // PM sensors are less affected, but still apply minor correction
  corrected.pm25 /= (1.0 + 0.001 * (humidity - refHumidity));
  corrected.pm10 /= (1.0 + 0.001 * (humidity - refHumidity));
  
  return corrected;
}

// ============================================================================
// OUTLIER REMOVAL (IQR METHOD)
// ============================================================================

SensorReading removeOutliers(SensorReading reading) {
  // For simplicity, we'll use a simple threshold-based approach
  // In production, you might use IQR (Interquartile Range) method
  
  SensorReading cleaned = reading;
  
  // Define reasonable max values
  const float MAX_CO = 500.0;      // 500 ppm
  const float MAX_CO2 = 5000.0;    // 5000 ppm
  const float MAX_NOX = 100.0;     // 100 ppm
  const float MAX_PM25 = 500.0;    // 500 μg/m³
  const float MAX_PM10 = 1000.0;   // 1000 μg/m³
  
  // Clamp to max values
  if (cleaned.co > MAX_CO) {
    DEBUG_PRINTF("Outlier detected: CO = %.2f (max %.2f)\n", cleaned.co, MAX_CO);
    cleaned.co = MAX_CO;
  }
  if (cleaned.co2 > MAX_CO2) {
    DEBUG_PRINTF("Outlier detected: CO2 = %.2f (max %.2f)\n", cleaned.co2, MAX_CO2);
    cleaned.co2 = MAX_CO2;
  }
  if (cleaned.nox > MAX_NOX) {
    DEBUG_PRINTF("Outlier detected: NOx = %.2f (max %.2f)\n", cleaned.nox, MAX_NOX);
    cleaned.nox = MAX_NOX;
  }
  if (cleaned.pm25 > MAX_PM25) {
    DEBUG_PRINTF("Outlier detected: PM2.5 = %.2f (max %.2f)\n", cleaned.pm25, MAX_PM25);
    cleaned.pm25 = MAX_PM25;
  }
  if (cleaned.pm10 > MAX_PM10) {
    DEBUG_PRINTF("Outlier detected: PM10 = %.2f (max %.2f)\n", cleaned.pm10, MAX_PM10);
    cleaned.pm10 = MAX_PM10;
  }
  
  return cleaned;
}

// ============================================================================
// EMISSION SCORE CALCULATION (0-100)
// ============================================================================

float calculateEmissionScore(SensorReading reading) {
  // Normalize each pollutant to 0-100 scale
  // Higher score = worse emissions
  
  // CO: 0-100 ppm → 0-100 score
  float coScore = (reading.co / 100.0) * 100.0;
  if (coScore > 100) coScore = 100;
  
  // CO2: 400-2000 ppm → 0-100 score
  float co2Score = ((reading.co2 - 400.0) / 1600.0) * 100.0;
  if (co2Score < 0) co2Score = 0;
  if (co2Score > 100) co2Score = 100;
  
  // NOx: 0-50 ppm → 0-100 score
  float noxScore = (reading.nox / 50.0) * 100.0;
  if (noxScore > 100) noxScore = 100;
  
  // PM2.5: 0-100 μg/m³ → 0-100 score
  float pm25Score = (reading.pm25 / 100.0) * 100.0;
  if (pm25Score > 100) pm25Score = 100;
  
  // Weighted average
  float emissionScore = (WEIGHT_CO * coScore) +
                        (WEIGHT_CO2 * co2Score) +
                        (WEIGHT_NOX * noxScore) +
                        (WEIGHT_PM25 * pm25Score);
  
  return emissionScore;
}

// ============================================================================
// ANOMALY DETECTION (THRESHOLD + Z-SCORE)
// ============================================================================

bool detectAnomaly(SensorReading reading) {
  bool anomaly = false;
  
  // 1. Threshold-based detection (simple)
  if (reading.co > THRESHOLD_CO_CRITICAL ||
      reading.co2 > THRESHOLD_CO2_CRITICAL ||
      reading.pm25 > THRESHOLD_PM25_CRITICAL) {
    anomaly = true;
    DEBUG_PRINTLN("Anomaly: Threshold exceeded!");
  }
  
  // 2. Z-score based detection (statistical)
  float emissionScore = calculateEmissionScore(reading);
  
  // Add to anomaly buffer
  anomalyBuffer[anomalyIndex] = emissionScore;
  anomalyIndex = (anomalyIndex + 1) % ANOMALY_WINDOW;
  
  // Calculate mean and standard deviation
  float mean = 0;
  float stddev = 0;
  int count = 0;
  
  for (int i = 0; i < ANOMALY_WINDOW; i++) {
    if (anomalyBuffer[i] > 0) {
      mean += anomalyBuffer[i];
      count++;
    }
  }
  
  if (count > 5) {  // Need at least 5 samples
    mean /= count;
    
    // Calculate standard deviation
    for (int i = 0; i < ANOMALY_WINDOW; i++) {
      if (anomalyBuffer[i] > 0) {
        float diff = anomalyBuffer[i] - mean;
        stddev += diff * diff;
      }
    }
    stddev = sqrt(stddev / count);
    
    // Calculate z-score
    float zScore = (stddev > 0) ? ((emissionScore - mean) / stddev) : 0;
    
    if (abs(zScore) > ANOMALY_THRESHOLD) {
      anomaly = true;
      DEBUG_PRINTF("Anomaly: Z-score = %.2f (threshold %.2f)\n", zScore, ANOMALY_THRESHOLD);
    }
  }
  
  return anomaly;
}

float calculateZScore(float value, float mean, float stddev) {
  if (stddev == 0) return 0;
  return (value - mean) / stddev;
}

// ============================================================================
// UPDATE CALIBRATION OFFSETS (VIA MQTT COMMAND)
// ============================================================================

void updateCalibrationOffset(int sensorIndex, float offset) {
  if (sensorIndex >= 0 && sensorIndex < 8) {
    calibrationOffsets[sensorIndex] = offset;
    DEBUG_PRINTF("Updated calibration offset[%d] = %.2f\n", sensorIndex, offset);
  }
}

float getCalibrationOffset(int sensorIndex) {
  if (sensorIndex >= 0 && sensorIndex < 8) {
    return calibrationOffsets[sensorIndex];
  }
  return 0;
}
