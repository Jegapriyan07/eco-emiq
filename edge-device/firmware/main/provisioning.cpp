/**
 * EcoTronics Edge Device - Device Provisioning Implementation
 * Secure device registration and key management
 */

#include "config.h"
#include <EEPROM.h>
#include <esp_system.h>

// External device config (defined in main.ino)
extern DeviceConfig deviceConfig;

// ============================================================================
// PROVISIONING INITIALIZATION
// ============================================================================

void initProvisioning() {
  DEBUG_PRINTLN("Initializing device provisioning...");
  
  // Read device config from EEPROM
  EEPROM.get(EEPROM_DEVICE_ID_ADDR, deviceConfig.deviceId);
  EEPROM.get(EEPROM_DEVICE_KEY_ADDR, deviceConfig.deviceKey);
  
  // Check if device is provisioned (device ID starts with "dev-")
  if (strncmp(deviceConfig.deviceId, "dev-", 4) == 0) {
    deviceConfig.provisioned = true;
    DEBUG_PRINTLN("Device is provisioned");
  } else {
    deviceConfig.provisioned = false;
    DEBUG_PRINTLN("Device is NOT provisioned");
  }
  
  // Set device type from config
  strncpy(deviceConfig.deviceType, DEVICE_TYPE, sizeof(deviceConfig.deviceType));
  
  // Default location (can be updated via MQTT)
  deviceConfig.latitude = 0.0;
  deviceConfig.longitude = 0.0;
}

// ============================================================================
// CHECK IF DEVICE IS PROVISIONED
// ============================================================================

bool isProvisioned() {
  return deviceConfig.provisioned;
}

// ============================================================================
// PROVISION DEVICE
// ============================================================================

void provisionDevice() {
  DEBUG_PRINTLN("\n=================================");
  DEBUG_PRINTLN("DEVICE PROVISIONING");
  DEBUG_PRINTLN("=================================");
  
  // Generate unique device ID based on MAC address
  uint8_t mac[6];
  esp_read_mac(mac, ESP_MAC_WIFI_STA);
  
  snprintf(deviceConfig.deviceId, sizeof(deviceConfig.deviceId),
           "dev-%02x%02x%02x%02x%02x%02x",
           mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
  
  DEBUG_PRINTF("Generated Device ID: %s\n", deviceConfig.deviceId);
  
  // Generate random device key (256-bit)
  generateDeviceKey(deviceConfig.deviceKey, DEVICE_KEY_LENGTH);
  
  DEBUG_PRINTLN("Generated Device Key: [REDACTED]");
  
  // Set device type
  strncpy(deviceConfig.deviceType, DEVICE_TYPE, sizeof(deviceConfig.deviceType));
  
  // Save to EEPROM
  EEPROM.put(EEPROM_DEVICE_ID_ADDR, deviceConfig.deviceId);
  EEPROM.put(EEPROM_DEVICE_KEY_ADDR, deviceConfig.deviceKey);
  EEPROM.commit();
  
  deviceConfig.provisioned = true;
  
  DEBUG_PRINTLN("Device provisioned successfully!");
  DEBUG_PRINTLN("=================================\n");
  
  // Play success sound
  playBuzzerPattern("S-S-S");
}

// ============================================================================
// GENERATE RANDOM DEVICE KEY
// ============================================================================

void generateDeviceKey(char* key, int length) {
  const char charset[] = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  
  // Use ESP32 hardware RNG
  for (int i = 0; i < length; i++) {
    key[i] = charset[esp_random() % (sizeof(charset) - 1)];
  }
  key[length] = '\0';
}

// ============================================================================
// GET DEVICE CONFIGURATION
// ============================================================================

DeviceConfig getDeviceConfig() {
  return deviceConfig;
}

// ============================================================================
// UPDATE DEVICE LOCATION
// ============================================================================

void updateDeviceLocation(float lat, float lon) {
  deviceConfig.latitude = lat;
  deviceConfig.longitude = lon;
  DEBUG_PRINTF("Location updated: %.6f, %.6f\n", lat, lon);
}

// ============================================================================
// RESET DEVICE (CLEAR PROVISIONING)
// ============================================================================

void resetDevice() {
  DEBUG_PRINTLN("Resetting device...");
  
  // Clear EEPROM
  for (int i = 0; i < EEPROM_SIZE; i++) {
    EEPROM.write(i, 0);
  }
  EEPROM.commit();
  
  deviceConfig.provisioned = false;
  
  DEBUG_PRINTLN("Device reset complete!");
  DEBUG_PRINTLN("Restarting in 3 seconds...");
  
  delay(3000);
  ESP.restart();
}

// ============================================================================
// REGISTER DEVICE WITH BACKEND (FIRST BOOT)
// ============================================================================

bool registerDeviceWithBackend() {
  if (!isWiFiConnected()) {
    DEBUG_PRINTLN("Cannot register: No WiFi connection");
    return false;
  }
  
  DEBUG_PRINTLN("Registering device with backend...");
  
  // Create registration payload
  StaticJsonDocument<512> doc;
  doc["device_id"] = deviceConfig.deviceId;
  doc["device_key"] = deviceConfig.deviceKey;
  doc["device_type"] = deviceConfig.deviceType;
  doc["firmware_version"] = FIRMWARE_VERSION;
  doc["hardware_version"] = HARDWARE_VERSION;
  
  // Get MAC address
  uint8_t mac[6];
  esp_read_mac(mac, ESP_MAC_WIFI_STA);
  char macStr[18];
  snprintf(macStr, sizeof(macStr), "%02X:%02X:%02X:%02X:%02X:%02X",
           mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
  doc["mac_address"] = macStr;
  
  String payload;
  serializeJson(doc, payload);
  
  // Send HTTP POST to registration endpoint
  HTTPClient http;
  http.begin(HTTP_SERVER "/api/v1/devices/register");
  http.addHeader("Content-Type", "application/json");
  
  int httpCode = http.POST(payload);
  
  if (httpCode == HTTP_CODE_OK || httpCode == HTTP_CODE_CREATED) {
    String response = http.getString();
    DEBUG_PRINTLN("Device registered successfully!");
    DEBUG_PRINTF("Response: %s\n", response.c_str());
    http.end();
    return true;
  } else {
    DEBUG_PRINTF("Registration failed! HTTP code: %d\n", httpCode);
    http.end();
    return false;
  }
}

// ============================================================================
// PRINT DEVICE INFO (FOR DEBUGGING)
// ============================================================================

void printDeviceInfo() {
  DEBUG_PRINTLN("\n=================================");
  DEBUG_PRINTLN("DEVICE INFORMATION");
  DEBUG_PRINTLN("=================================");
  DEBUG_PRINTF("Device ID: %s\n", deviceConfig.deviceId);
  DEBUG_PRINTF("Device Type: %s\n", deviceConfig.deviceType);
  DEBUG_PRINTF("Firmware: %s\n", FIRMWARE_VERSION);
  DEBUG_PRINTF("Hardware: %s\n", HARDWARE_VERSION);
  DEBUG_PRINTF("Provisioned: %s\n", deviceConfig.provisioned ? "YES" : "NO");
  DEBUG_PRINTF("Location: %.6f, %.6f\n", deviceConfig.latitude, deviceConfig.longitude);
  
  // MAC address
  uint8_t mac[6];
  esp_read_mac(mac, ESP_MAC_WIFI_STA);
  DEBUG_PRINTF("MAC Address: %02X:%02X:%02X:%02X:%02X:%02X\n",
               mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
  
  // WiFi info
  if (isWiFiConnected()) {
    DEBUG_PRINTF("WiFi SSID: %s\n", WiFi.SSID().c_str());
    DEBUG_PRINTF("IP Address: %s\n", WiFi.localIP().toString().c_str());
    DEBUG_PRINTF("Signal: %d dBm\n", WiFi.RSSI());
  } else {
    DEBUG_PRINTLN("WiFi: Not connected");
  }
  
  // Memory info
  DEBUG_PRINTF("Free Heap: %d bytes\n", ESP.getFreeHeap());
  DEBUG_PRINTF("Heap Size: %d bytes\n", ESP.getHeapSize());
  DEBUG_PRINTF("Uptime: %lu seconds\n", millis() / 1000);
  
  DEBUG_PRINTLN("=================================\n");
}
