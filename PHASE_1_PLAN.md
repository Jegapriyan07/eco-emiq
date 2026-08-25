# Phase 1 - Device + Edge Layer Implementation

## 🎯 Goal
Make robust hardware → software ingestion with local intelligence.

## 📋 Deliverables

### Hardware & Firmware
- ✅ ESP32/Arduino firmware prototype
- ✅ Local processing (edge): smoothing, outlier removal, local Emission Score
- ✅ Short-term storage (circular buffer)
- ✅ Device registration & secure provisioning (device key)
- ✅ MQTT (preferred) + HTTP fallback protocol

### Edge Intelligence
- ✅ Multi-sensor reading (CO, CO₂, NOx, PM2.5, Temp, Humidity, RPM)
- ✅ Edge preprocessing (rolling mean, calibration, corrections)
- ✅ Quick Emission Score calculation (0-100)
- ✅ Local anomaly detection (threshold + z-score)
- ✅ Circular buffer for last N readings

### Hardware Outputs
- ✅ Buzzer for alerts
- ✅ RGB LED status indicator
- ✅ Relay control (generator auto-shutdown)

### Testing
- ✅ Simulated gas spikes
- ✅ Device offline behavior
- ✅ Sensor calibration

## 📊 Data Packet Schema

```json
{
  "device_id": "dev-001",
  "device_key": "xxxx",
  "timestamp": "2026-02-17T10:15:00Z",
  "lat": 12.9,
  "lon": 80.2,
  "sensor": {
    "co": 12.3,
    "co2": 410,
    "pm25": 65,
    "nox": 0.9,
    "temp": 28.5,
    "humidity": 65.2,
    "rpm": 1500
  },
  "emission_score": 52.3,
  "runtime_seconds": 7200,
  "status": "ok",
  "anomaly_detected": false,
  "local_alerts": []
}
```

## 🔧 Hardware Components

### Recommended Sensors
1. **MQ-7** - Carbon Monoxide (CO)
2. **MQ-135** - CO₂, NOx, NH3
3. **PMS5003** - PM2.5, PM10 particulate matter
4. **DHT22** - Temperature & Humidity
5. **Hall Effect Sensor** - RPM (for generators/vehicles)

### Output Devices
1. **Buzzer** - Active buzzer for alerts
2. **RGB LED** - WS2812B or common cathode RGB
3. **Relay Module** - 5V relay for generator shutdown

### ESP32 Pin Configuration
```
Sensors:
- MQ-7 (CO):        GPIO 34 (ADC1_CH6)
- MQ-135 (CO2/NOx): GPIO 35 (ADC1_CH7)
- PMS5003 RX:       GPIO 16 (UART2_RX)
- PMS5003 TX:       GPIO 17 (UART2_TX)
- DHT22:            GPIO 4
- RPM Sensor:       GPIO 5 (Interrupt)

Outputs:
- Buzzer:           GPIO 18
- RGB LED:          GPIO 19
- Relay:            GPIO 21

Status:
- Onboard LED:      GPIO 2
```

## 📁 Project Structure

```
edge-device/
├── firmware/                    # ESP32/Arduino firmware
│   ├── main/
│   │   ├── main.ino            # Main Arduino sketch
│   │   ├── config.h            # Configuration & pins
│   │   ├── sensors.h/cpp       # Sensor reading
│   │   ├── processing.h/cpp    # Edge processing
│   │   ├── emission.h/cpp      # Emission score calculation
│   │   ├── anomaly.h/cpp       # Anomaly detection
│   │   ├── storage.h/cpp       # Circular buffer
│   │   ├── mqtt.h/cpp          # MQTT client
│   │   ├── http.h/cpp          # HTTP fallback
│   │   ├── outputs.h/cpp       # Buzzer, LED, Relay
│   │   └── provisioning.h/cpp  # Device key management
│   ├── libraries/              # External libraries
│   └── platformio.ini          # PlatformIO config
│
├── simulator/                   # Node.js simulator (for testing)
│   ├── src/
│   │   ├── index.ts            # Main simulator
│   │   ├── sensors.ts          # Sensor simulation
│   │   ├── processing.ts       # Edge processing (same logic)
│   │   └── mqtt-client.ts      # MQTT publisher
│   ├── package.json
│   └── tsconfig.json
│
├── tests/
│   ├── unit/                   # Unit tests
│   └── integration/            # Hardware integration tests
│
├── docs/
│   ├── HARDWARE_SETUP.md       # Hardware assembly guide
│   ├── CALIBRATION.md          # Sensor calibration guide
│   └── TROUBLESHOOTING.md      # Common issues
│
└── README.md
```

## 🚀 Implementation Tasks

### Week 1: Firmware Foundation (Days 1-7)

#### Day 1-2: Sensor Integration
- [ ] Set up ESP32 development environment (PlatformIO)
- [ ] Implement MQ-7 CO sensor reading
- [ ] Implement MQ-135 CO₂/NOx reading
- [ ] Implement PMS5003 PM2.5 reading
- [ ] Implement DHT22 temp/humidity reading
- [ ] Implement RPM sensor (interrupt-based)
- [ ] Test individual sensors

#### Day 3-4: Edge Processing
- [ ] Implement rolling mean filter (configurable window)
- [ ] Add calibration offset system
- [ ] Temperature/humidity correction formulas
- [ ] Outlier removal (IQR method)
- [ ] Circular buffer for last 100 readings
- [ ] Unit tests for processing functions

#### Day 5: Emission Score Calculation
- [ ] Define weighted emission score formula
- [ ] Normalize to 0-100 scale
- [ ] Add device-type specific weights
- [ ] Test with various sensor combinations

#### Day 6: Anomaly Detection
- [ ] Implement threshold-based detection
- [ ] Add moving z-score calculation
- [ ] Configure alert levels (warning, critical)
- [ ] Test with simulated spikes

#### Day 7: Output Devices
- [ ] Implement buzzer control (alert patterns)
- [ ] RGB LED status indicator (colors for states)
- [ ] Relay control for auto-shutdown
- [ ] Test all outputs

### Week 2: Connectivity & Security (Days 8-14)

#### Day 8-9: MQTT Integration
- [ ] Set up WiFi connection with auto-reconnect
- [ ] Implement MQTT client (PubSubClient)
- [ ] Secure connection (TLS/SSL)
- [ ] QoS 1 for reliable delivery
- [ ] Last Will & Testament (LWT) for offline detection
- [ ] Test MQTT publishing

#### Day 10: HTTP Fallback
- [ ] Implement HTTP POST client
- [ ] Retry logic with exponential backoff
- [ ] Queue failed requests
- [ ] Test HTTP fallback when MQTT fails

#### Day 11-12: Device Provisioning
- [ ] Generate unique device ID (MAC-based)
- [ ] Secure device key storage (EEPROM/SPIFFS)
- [ ] First-boot provisioning flow
- [ ] Device registration API call
- [ ] Test provisioning process

#### Day 13: Data Packet Assembly
- [ ] Create JSON packet builder
- [ ] Add timestamp (NTP sync)
- [ ] Include GPS coordinates (if available)
- [ ] Compress data for bandwidth
- [ ] Test packet format

#### Day 14: Testing & Optimization
- [ ] Memory optimization
- [ ] Power consumption testing
- [ ] Stress testing (24-hour run)
- [ ] Offline behavior testing
- [ ] Documentation

### Week 3: Simulator & Integration (Days 15-21)

#### Day 15-16: Node.js Simulator
- [ ] Port edge processing logic to TypeScript
- [ ] Realistic sensor data generation
- [ ] Simulate various scenarios (spikes, drift, offline)
- [ ] MQTT publishing
- [ ] CLI interface for testing

#### Day 17-18: Backend Integration
- [ ] Update data-ingestion service for new schema
- [ ] Device authentication middleware
- [ ] Store readings in TimescaleDB
- [ ] Real-time WebSocket broadcasting
- [ ] Test end-to-end flow

#### Day 19-20: Testing Scenarios
- [ ] Normal operation test
- [ ] Gas spike simulation
- [ ] Network failure recovery
- [ ] Device offline/online
- [ ] Multi-device stress test

#### Day 21: Demo Preparation
- [ ] Assemble demo hardware
- [ ] Create demo script
- [ ] Record demo video
- [ ] Update documentation

## 📊 Success Metrics

### Performance
- ✅ Sensor reading frequency: 1 Hz (1 reading/second)
- ✅ MQTT publish frequency: 0.1 Hz (1 packet/10 seconds)
- ✅ Processing latency: <100ms
- ✅ Memory usage: <50% of ESP32 RAM
- ✅ Power consumption: <500mA @ 5V

### Reliability
- ✅ Uptime: >99% (24-hour test)
- ✅ Data loss: <1% (with retry logic)
- ✅ WiFi reconnect: <30 seconds
- ✅ MQTT reconnect: <10 seconds
- ✅ Offline buffer: 1000 readings

### Accuracy
- ✅ CO sensor: ±10 ppm
- ✅ CO₂ sensor: ±50 ppm
- ✅ PM2.5 sensor: ±10 μg/m³
- ✅ Temperature: ±0.5°C
- ✅ Humidity: ±2%

## 🔐 Security Considerations

1. **Device Key**: 256-bit random key, stored securely
2. **MQTT TLS**: Certificate-based authentication
3. **HTTP HTTPS**: SSL/TLS for fallback
4. **Key Rotation**: Support for key updates
5. **Tamper Detection**: Alert on unauthorized access

## 🎬 Demo Scenarios

### Scenario 1: Normal Operation
1. Device boots, connects to WiFi
2. Reads sensors every second
3. Publishes to MQTT every 10 seconds
4. Green LED indicates normal operation
5. Dashboard shows real-time data

### Scenario 2: High Emission Alert
1. Simulate CO spike (>100 ppm)
2. Anomaly detector triggers
3. Buzzer sounds alert pattern
4. Red LED flashes
5. Alert sent to cloud
6. Dashboard shows critical alert

### Scenario 3: Offline Recovery
1. Disconnect WiFi
2. Device continues local processing
3. Yellow LED indicates offline
4. Buffer fills with readings
5. Reconnect WiFi
6. Buffered data syncs to cloud

### Scenario 4: Auto-Shutdown
1. Generator emits critical levels
2. Anomaly detector triggers
3. Relay activates (generator shutdown)
4. Alert sent to owner
5. Manual reset required

## 📝 Next Steps

After Phase 1 completion:
1. **Phase 2**: Backend services (Auth, Device, Analytics)
2. **Phase 3**: Frontend dashboard
3. **Phase 4**: Multi-role support
4. **Phase 5**: ML & advanced analytics

---

**Phase 1 Start Date**: 2026-02-17  
**Expected Completion**: 2026-03-10 (3 weeks)  
**Status**: 🚀 STARTING NOW
