/**
 * EcoTronics Edge Device - Local Storage Implementation
 * Circular buffer for offline data storage
 */

#include "config.h"

// External buffer (defined in main.ino)
extern ProcessedData dataBuffer[BUFFER_SIZE];
extern int bufferIndex;
extern int bufferCount;

// ============================================================================
// STORAGE INITIALIZATION
// ============================================================================

void initStorage() {
  DEBUG_PRINTLN("Initializing local storage...");
  
  // Initialize buffer
  bufferIndex = 0;
  bufferCount = 0;
  
  DEBUG_PRINTF("Circular buffer size: %d readings\n", BUFFER_SIZE);
  DEBUG_PRINTLN("Local storage ready!");
}

// ============================================================================
// STORE READING IN CIRCULAR BUFFER
// ============================================================================

void storeReading(ProcessedData data) {
  // Store data at current index
  dataBuffer[bufferIndex] = data;
  
  // Increment index (circular)
  bufferIndex = (bufferIndex + 1) % BUFFER_SIZE;
  
  // Update count (max = BUFFER_SIZE)
  if (bufferCount < BUFFER_SIZE) {
    bufferCount++;
  }
  
  #if DEBUG_ENABLED
    static int lastLoggedCount = 0;
    if (bufferCount != lastLoggedCount && bufferCount % 10 == 0) {
      DEBUG_PRINTF("Buffer: %d/%d readings stored\n", bufferCount, BUFFER_SIZE);
      lastLoggedCount = bufferCount;
    }
  #endif
}

// ============================================================================
// GET BUFFERED READINGS
// ============================================================================

ProcessedData* getBufferedReadings(int &count) {
  count = bufferCount;
  return dataBuffer;
}

// ============================================================================
// GET LATEST READING
// ============================================================================

ProcessedData getLatestReading() {
  if (bufferCount == 0) {
    // Return empty reading if buffer is empty
    ProcessedData empty;
    memset(&empty, 0, sizeof(ProcessedData));
    return empty;
  }
  
  // Get the most recent reading
  int latestIndex = (bufferIndex - 1 + BUFFER_SIZE) % BUFFER_SIZE;
  return dataBuffer[latestIndex];
}

// ============================================================================
// GET READING BY INDEX
// ============================================================================

ProcessedData getReadingByIndex(int index) {
  if (index < 0 || index >= bufferCount) {
    ProcessedData empty;
    memset(&empty, 0, sizeof(ProcessedData));
    return empty;
  }
  
  // Calculate actual buffer index
  int actualIndex = (bufferIndex - bufferCount + index + BUFFER_SIZE) % BUFFER_SIZE;
  return dataBuffer[actualIndex];
}

// ============================================================================
// CLEAR BUFFER
// ============================================================================

void clearBuffer() {
  bufferIndex = 0;
  bufferCount = 0;
  DEBUG_PRINTLN("Buffer cleared!");
}

// ============================================================================
// GET BUFFER STATISTICS
// ============================================================================

void getBufferStats(int &count, int &capacity, float &fillPercent) {
  count = bufferCount;
  capacity = BUFFER_SIZE;
  fillPercent = (float)bufferCount / (float)BUFFER_SIZE * 100.0;
}

// ============================================================================
// EXPORT BUFFER TO JSON (FOR BATCH UPLOAD)
// ============================================================================

String exportBufferToJSON(int maxReadings) {
  if (bufferCount == 0) {
    return "[]";
  }
  
  // Limit to maxReadings or bufferCount, whichever is smaller
  int readingsToExport = min(maxReadings, bufferCount);
  
  StaticJsonDocument<4096> doc;
  JsonArray readings = doc.to<JsonArray>();
  
  // Export the most recent N readings
  for (int i = bufferCount - readingsToExport; i < bufferCount; i++) {
    ProcessedData data = getReadingByIndex(i);
    
    JsonObject reading = readings.createNestedObject();
    reading["timestamp"] = data.timestamp;
    reading["emission_score"] = data.emissionScore;
    reading["anomaly"] = data.anomalyDetected;
    
    JsonObject sensor = reading.createNestedObject("sensor");
    sensor["co"] = data.filtered.co;
    sensor["co2"] = data.filtered.co2;
    sensor["nox"] = data.filtered.nox;
    sensor["pm25"] = data.filtered.pm25;
    sensor["temp"] = data.filtered.temperature;
    sensor["humidity"] = data.filtered.humidity;
    sensor["rpm"] = data.filtered.rpm;
  }
  
  String output;
  serializeJson(doc, output);
  return output;
}

// ============================================================================
// CALCULATE BUFFER SUMMARY STATISTICS
// ============================================================================

void calculateBufferSummary(float &avgEmissionScore, float &maxCO, float &maxPM25) {
  if (bufferCount == 0) {
    avgEmissionScore = 0;
    maxCO = 0;
    maxPM25 = 0;
    return;
  }
  
  float sumEmissionScore = 0;
  maxCO = 0;
  maxPM25 = 0;
  
  for (int i = 0; i < bufferCount; i++) {
    ProcessedData data = getReadingByIndex(i);
    sumEmissionScore += data.emissionScore;
    
    if (data.filtered.co > maxCO) {
      maxCO = data.filtered.co;
    }
    if (data.filtered.pm25 > maxPM25) {
      maxPM25 = data.filtered.pm25;
    }
  }
  
  avgEmissionScore = sumEmissionScore / bufferCount;
}
