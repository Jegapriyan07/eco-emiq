/**
 * EcoTronics Edge Device - Output Devices Implementation
 * Buzzer, RGB LED, Relay control
 */

#include "config.h"

// ============================================================================
// OUTPUT INITIALIZATION
// ============================================================================

void initOutputs() {
  DEBUG_PRINTLN("Initializing output devices...");
  
  // Configure pins as outputs
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_RGB_LED, OUTPUT);
  pinMode(PIN_RELAY, OUTPUT);
  pinMode(PIN_STATUS_LED, OUTPUT);
  
  // Initialize to off state
  digitalWrite(PIN_BUZZER, LOW);
  digitalWrite(PIN_RELAY, RELAY_ACTIVE_HIGH ? LOW : HIGH);  // Relay off
  digitalWrite(PIN_STATUS_LED, LOW);
  
  // For RGB LED, you might use a library like FastLED or Adafruit_NeoPixel
  // For simplicity, we'll assume common cathode RGB LED
  setLED(LED_COLOR_OFF);
  
  DEBUG_PRINTLN("Output devices ready!");
}

// ============================================================================
// RGB LED CONTROL
// ============================================================================

void setLED(uint8_t r, uint8_t g, uint8_t b) {
  // For WS2812B (NeoPixel), you'd use a library
  // For common cathode RGB LED with PWM:
  
  // If using separate pins for R, G, B:
  // analogWrite(PIN_RGB_R, r);
  // analogWrite(PIN_RGB_G, g);
  // analogWrite(PIN_RGB_B, b);
  
  // For this example, we'll use the onboard LED as status indicator
  // and log the RGB values
  
  if (r == 0 && g == 0 && b == 0) {
    digitalWrite(PIN_STATUS_LED, LOW);  // Off
  } else {
    // Blink pattern based on color
    if (g > r && g > b) {
      // Green - solid on
      digitalWrite(PIN_STATUS_LED, HIGH);
    } else if (r > g && r > b) {
      // Red - fast blink
      digitalWrite(PIN_STATUS_LED, (millis() / 250) % 2);
    } else if (b > r && b > g) {
      // Blue - slow blink
      digitalWrite(PIN_STATUS_LED, (millis() / 1000) % 2);
    } else {
      // Other colors - medium blink
      digitalWrite(PIN_STATUS_LED, (millis() / 500) % 2);
    }
  }
  
  #if DEBUG_ENABLED
    static uint8_t lastR = 255, lastG = 255, lastB = 255;
    if (r != lastR || g != lastG || b != lastB) {
      DEBUG_PRINTF("LED: R=%d G=%d B=%d\n", r, g, b);
      lastR = r;
      lastG = g;
      lastB = b;
    }
  #endif
}

// ============================================================================
// BUZZER CONTROL
// ============================================================================

void playBuzzer(int duration) {
  digitalWrite(PIN_BUZZER, HIGH);
  delay(duration);
  digitalWrite(PIN_BUZZER, LOW);
}

void playBuzzerPattern(const char* pattern) {
  // Pattern format: "S" = short beep, "L" = long beep, "-" = pause
  // Example: "S-S-S" = three short beeps
  
  for (int i = 0; pattern[i] != '\0'; i++) {
    switch (pattern[i]) {
      case 'S':
        playBuzzer(BUZZER_BEEP_SHORT);
        break;
      case 'L':
        playBuzzer(BUZZER_BEEP_LONG);
        break;
      case '-':
        delay(BUZZER_PAUSE_SHORT);
        break;
      case '_':
        delay(BUZZER_PAUSE_LONG);
        break;
    }
  }
}

void playAlertSound(AlertLevel level) {
  switch (level) {
    case ALERT_INFO:
      playBuzzerPattern("S");  // Single short beep
      break;
    case ALERT_WARNING:
      playBuzzerPattern("S-S");  // Two short beeps
      break;
    case ALERT_CRITICAL:
      playBuzzerPattern("L-L-L");  // Three long beeps
      break;
    default:
      break;
  }
}

// ============================================================================
// RELAY CONTROL
// ============================================================================

void setRelay(bool state) {
  if (RELAY_ACTIVE_HIGH) {
    digitalWrite(PIN_RELAY, state ? HIGH : LOW);
  } else {
    digitalWrite(PIN_RELAY, state ? LOW : HIGH);
  }
  
  DEBUG_PRINTF("Relay: %s\n", state ? "ON (SHUTDOWN)" : "OFF (NORMAL)");
}

// ============================================================================
// STATUS INDICATOR UPDATE
// ============================================================================

void updateStatusIndicators(DeviceStatus status) {
  static DeviceStatus lastStatus = STATUS_INITIALIZING;
  
  // Only update if status changed
  if (status == lastStatus) {
    return;
  }
  
  lastStatus = status;
  
  switch (status) {
    case STATUS_INITIALIZING:
      setLED(LED_COLOR_BLUE);
      break;
      
    case STATUS_CONNECTING:
      setLED(LED_COLOR_BLUE);
      break;
      
    case STATUS_NORMAL:
      setLED(LED_COLOR_GREEN);
      break;
      
    case STATUS_WARNING:
      setLED(LED_COLOR_YELLOW);
      playAlertSound(ALERT_WARNING);
      break;
      
    case STATUS_CRITICAL:
      setLED(LED_COLOR_RED);
      playAlertSound(ALERT_CRITICAL);
      // Auto-shutdown for critical emissions (if enabled)
      #ifdef AUTO_SHUTDOWN_ENABLED
        setRelay(true);  // Activate shutdown relay
      #endif
      break;
      
    case STATUS_OFFLINE:
      setLED(LED_COLOR_PURPLE);
      break;
      
    case STATUS_ERROR:
      setLED(LED_COLOR_RED);
      playBuzzerPattern("S-S-S-S-S");  // Five short beeps
      break;
  }
}
