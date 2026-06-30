# EcoTronics Edge Device Firmware

## 🎯 Overview

ESP32-based emission monitoring device with **local intelligence**:
- Multi-sensor reading (CO, CO₂, NOx, PM2.5, Temperature, Humidity, RPM)
- Edge preprocessing (rolling mean, calibration, outlier removal)
- Local emission score calculation (0-100)
- Anomaly detection (threshold + z-score)
- MQTT publishing with HTTP fallback
- Offline data buffering (100 readings)
- Alert outputs (buzzer, LED, relay)

## 🔧 Hardware Requirements

### Microcontroller
- **ESP32 DevKit** (or compatible)
- 4MB Flash minimum
- WiFi capability

### Sensors
| Sensor | Purpose | Interface | Price (approx) |
|--------|---------|-----------|----------------|
| MQ-7 | Carbon Monoxide (CO) | Analog | $5 |
| MQ-135 | CO₂, NOx, NH3 | Analog | $5 |
| PMS5003 | PM2.5, PM10 | UART | $15 |
| DHT22 | Temperature & Humidity | Digital | $5 |
| Hall Effect | RPM (optional) | Digital | $2 |

### Output Devices
| Device | Purpose | Interface | Price (approx) |
|--------|---------|-----------|----------------|
| Active Buzzer | Alerts | Digital | $1 |
| RGB LED | Status indicator | Digital/PWM | $1 |
| 5V Relay | Auto-shutdown | Digital | $2 |

### Total Cost: ~$35-40

## 📐 Wiring Diagram

```
ESP32 DevKit Pinout:
┌─────────────────────────────────────┐
│  3V3  GND  D34  D35  D4   D5   D18  │  Sensors
│   │    │    │    │    │    │    │   │
│   │    │    │    │    │    │    │   │
│   │    │    │    │    │    │    └───┼─ Buzzer
│   │    │    │    │    │    └────────┼─ RPM Sensor
│   │    │    │    │    └─────────────┼─ DHT22
│   │    │    │    └──────────────────┼─ MQ-135 (CO2/NOx)
│   │    │    └───────────────────────┼─ MQ-7 (CO)
│   │    └────────────────────────────┼─ GND (All)
│   └─────────────────────────────────┼─ VCC (3.3V sensors)
│                                      │
│  D19  D21  D16  D17  5V   GND       │  Outputs & Power
│   │    │    │    │    │    │        │
│   │    │    │    │    │    │        │
│   │    │    │    │    │    └────────┼─ GND (All)
│   │    │    │    │    └─────────────┼─ VCC (5V sensors)
│   │    │    │    └──────────────────┼─ PMS5003 TX
│   │    │    └───────────────────────┼─ PMS5003 RX
│   │    └────────────────────────────┼─ Relay
│   └─────────────────────────────────┼─ RGB LED
└─────────────────────────────────────┘
```

### Detailed Connections

**MQ-7 (CO Sensor)**
- VCC → 5V
- GND → GND
- AOUT → GPIO 34

**MQ-135 (Multi-gas Sensor)**
- VCC → 5V
- GND → GND
- AOUT → GPIO 35

**PMS5003 (Particulate Matter)**
- VCC → 5V
- GND → GND
- TX → GPIO 16 (ESP32 RX)
- RX → GPIO 17 (ESP32 TX)

**DHT22 (Temperature & Humidity)**
- VCC → 3.3V
- GND → GND
- DATA → GPIO 4
- Pull-up resistor (4.7kΩ) between VCC and DATA

**RPM Sensor (Hall Effect)**
- VCC → 3.3V
- GND → GND
- OUT → GPIO 5

**Buzzer**
- VCC → GPIO 18
- GND → GND

**RGB LED (Common Cathode)**
- R → GPIO 19 (via 220Ω resistor)
- G → GPIO 19 (via 220Ω resistor)
- B → GPIO 19 (via 220Ω resistor)
- GND → GND

**Relay Module**
- VCC → 5V
- GND → GND
- IN → GPIO 21

## 🚀 Quick Start

### 1. Install PlatformIO

```bash
# Install PlatformIO Core
pip install platformio

# Or use PlatformIO IDE (VS Code extension)
```

### 2. Configure WiFi

Edit `main/config.h`:

```cpp
#define WIFI_SSID           "YOUR_WIFI_SSID"
#define WIFI_PASSWORD       "YOUR_WIFI_PASSWORD"
#define MQTT_BROKER         "mqtt.ecotronics.local"
```

### 3. Build and Upload

```bash
# Navigate to firmware directory
cd edge-device/firmware

# Build
platformio run

# Upload to ESP32
platformio run --target upload

# Monitor serial output
platformio device monitor
```

### 4. First Boot

On first boot, the device will:
1. Generate unique device ID (based on MAC address)
2. Generate random 256-bit device key
3. Save to EEPROM
4. Attempt to register with backend
5. Start sensor readings

## 📊 Data Flow

```
┌─────────────┐
│   Sensors   │
│  (Raw Data) │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  Rolling Mean       │
│  (10-sample window) │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Calibration        │
│  (Offsets applied)  │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Temp/Humidity      │
│  Correction         │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Outlier Removal    │
│  (IQR method)       │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Emission Score     │
│  (0-100)            │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Anomaly Detection  │
│  (Threshold+ZScore) │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Local Buffer       │
│  (100 readings)     │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  MQTT Publish       │
│  (Every 10 seconds) │
└─────────────────────┘
```

## 🧪 Testing

### Sensor Calibration

```cpp
// In setup(), add:
float ro_mq7 = calibrateMQ7();    // 60 seconds in clean air
float ro_mq135 = calibrateMQ135(); // 60 seconds in clean air

// Update config.h with the values
```

### Simulate Gas Spike

```cpp
// Temporarily modify readMQ7_CO():
float readMQ7_CO() {
  // Simulate spike
  if (millis() % 60000 < 5000) {
    return 150.0;  // Critical CO level
  }
  // Normal reading...
}
```

### Test Offline Mode

1. Disconnect WiFi
2. Device continues local processing
3. Buffer fills with readings
4. LED turns purple (offline)
5. Reconnect WiFi
6. Buffered data syncs

## 📡 MQTT Topics

### Publishing

- `ecotronics/device/{device_id}/readings` - Sensor readings (every 10s)
- `ecotronics/device/{device_id}/status` - Device status
- `ecotronics/device/{device_id}/alerts` - Critical alerts

### Subscribing

- `ecotronics/device/{device_id}/commands` - Remote commands

### Commands

**Calibrate Sensor**
```json
{
  "command": "calibrate",
  "sensor": 0,
  "offset": -2.5
}
```

**Restart Device**
```json
{
  "command": "restart"
}
```

**Control Relay**
```json
{
  "command": "shutdown_relay",
  "state": true
}
```

**Update Location**
```json
{
  "command": "update_location",
  "lat": 12.9716,
  "lon": 77.5946
}
```

## 🎨 LED Status Indicators

| Color | Status | Meaning |
|-------|--------|---------|
| 🔵 Blue | Initializing | Device starting up |
| 🟢 Green | Normal | All systems OK |
| 🟡 Yellow | Warning | Elevated emissions |
| 🔴 Red | Critical | Dangerous levels |
| 🟣 Purple | Offline | No WiFi connection |

## 🔊 Buzzer Patterns

| Pattern | Alert Level |
|---------|-------------|
| 1 short beep | Info |
| 2 short beeps | Warning |
| 3 long beeps | Critical |
| 5 short beeps | Error |

## 🔧 Troubleshooting

### Sensors Not Reading

1. Check wiring connections
2. Verify power supply (5V for MQ sensors)
3. Wait for warm-up period (30 seconds for gas sensors)
4. Check serial monitor for error messages

### WiFi Won't Connect

1. Verify SSID and password in `config.h`
2. Check WiFi signal strength
3. Ensure 2.4GHz network (ESP32 doesn't support 5GHz)
4. Check router firewall settings

### MQTT Connection Fails

1. Verify MQTT broker address
2. Check network connectivity
3. Ensure broker allows anonymous connections (dev mode)
4. Check serial monitor for error codes

### High Memory Usage

1. Reduce `BUFFER_SIZE` in `config.h`
2. Reduce `ROLLING_MEAN_WINDOW`
3. Disable debug output in production

## 📈 Performance

- **CPU Usage**: ~15% (ESP32 dual-core)
- **Memory Usage**: ~40KB RAM
- **Power Consumption**: ~400mA @ 5V
- **Sensor Read Frequency**: 1 Hz
- **MQTT Publish Frequency**: 0.1 Hz (every 10s)
- **Processing Latency**: <100ms

## 🔐 Security

- **Device Key**: 256-bit random key
- **MQTT TLS**: Supported (enable in config)
- **HTTP HTTPS**: Supported for fallback
- **EEPROM Storage**: Secure key storage
- **MAC-based ID**: Unique device identification

## 📝 License

MIT License - See LICENSE file

## 🤝 Contributing

See CONTRIBUTING.md

---

**Built with ❤️ for a sustainable future**
