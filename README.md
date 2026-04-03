WEBSITE LINK - https://eco-emiq.vercel.app/login

# EcoTronics - Carbon Emission Monitoring Platform

## 🌍 Vision
A local-first, multi-role carbon emission monitoring and management platform that empowers vehicles, generators, industries, and city authorities to track, analyze, and reduce their carbon footprint.

## 🎯 Phase 0 - Core Principles

### Local-First Architecture
- **Edge Processing**: Devices perform real-time emission calculations locally
- **Local Storage**: Recent data buffered on device (last 24-48 hours)
- **Cloud Aggregation**: Backend only for multi-device analytics and ML insights
- **Offline Capable**: Core functionality works without internet connectivity

### Four User Roles
1. **Vehicle Owner** - Track personal vehicle emissions, get eco-driving tips
2. **Generator Owner** - Monitor backup generator usage and efficiency
3. **Industry Owner** - Manage fleet/facility emissions, compliance reporting
4. **City/Authority Admin** - Aggregate city-wide data, policy insights, alerts

### Technical Pillars
- **Security**: JWT authentication, role-based access control (RBAC)
- **Testability**: Unit tests for all core modules, integration tests
- **Modularity**: Microservices architecture, clear separation of concerns
- **Observability**: Structured logging, health checks, metrics

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    EDGE DEVICES (Local-First)                │
├─────────────────────────────────────────────────────────────┤
│  • Vehicle OBD-II Reader    • Generator Monitor              │
│  • Industrial Sensor Array  • Air Quality Stations           │
│                                                               │
│  [Local Processing Engine]                                   │
│  ├─ Emission Calculation                                     │
│  ├─ Local Buffer (24-48h)                                    │
│  ├─ Spike Detection                                          │
│  └─ Offline Queue                                            │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTPS/MQTT
┌─────────────────────────────────────────────────────────────┐
│                     BACKEND SERVICES (Cloud)                 │
├─────────────────────────────────────────────────────────────┤
│  API Gateway (Kong/Nginx)                                    │
│  ├─ Rate Limiting                                            │
│  ├─ JWT Validation                                           │
│  └─ Request Routing                                          │
│                                                               │
│  Microservices:                                              │
│  ├─ Auth Service (JWT, RBAC)                                 │
│  ├─ Device Service (Registration, Management)                │
│  ├─ Data Ingestion Service (Time-series DB)                  │
│  ├─ Analytics Service (Aggregation, ML)                      │
│  ├─ Alert Service (Threshold monitoring)                     │
│  └─ Reporting Service (Compliance, Insights)                 │
│                                                               │
│  Data Layer:                                                 │
│  ├─ PostgreSQL (Users, Devices, Metadata)                    │
│  ├─ TimescaleDB (Time-series emission data)                  │
│  ├─ Redis (Cache, Sessions)                                  │
│  └─ S3/MinIO (Reports, Logs)                                 │
└─────────────────────────────────────────────────────────────┘
                            ↕ WebSocket/REST
┌─────────────────────────────────────────────────────────────┐
│                    WEB DASHBOARD (React)                     │
├─────────────────────────────────────────────────────────────┤
│  Role-Based Interfaces:                                      │
│  ├─ Vehicle Owner Dashboard                                  │
│  ├─ Generator Owner Dashboard                                │
│  ├─ Industry Owner Dashboard                                 │
│  └─ City Admin Dashboard                                     │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
ecotronics/
├── edge-device/              # Local-first device firmware/software
│   ├── src/
│   │   ├── sensors/          # Sensor drivers (OBD-II, air quality)
│   │   ├── processing/       # Local emission calculation engine
│   │   ├── storage/          # Local buffer management
│   │   └── sync/             # Cloud sync when online
│   └── tests/
│
├── backend/                  # Cloud microservices
│   ├── auth-service/
│   │   ├── src/
│   │   └── tests/
│   ├── device-service/
│   ├── data-ingestion-service/
│   ├── analytics-service/
│   ├── alert-service/
│   └── reporting-service/
│
├── frontend/                 # React web dashboard
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   │   ├── VehicleOwner/
│   │   │   ├── GeneratorOwner/
│   │   │   ├── IndustryOwner/
│   │   │   └── CityAdmin/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── utils/
│   ├── public/
│   └── public/
│
├── shared/                   # Shared libraries and types
│   ├── types/
│   ├── constants/
│   └── utils/
│
├── infrastructure/           # DevOps and deployment
│   ├── kubernetes/
│   ├── terraform/
│   └── monitoring/
│
├── docs/                     # Documentation
│   ├── architecture/
│   ├── api/
│   └── deployment/
│
└── scripts/                  # Utility scripts
    ├── setup.sh
    └── demo.sh
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 7+

### Development Setup

```bash
# Clone repository
git clone <repo-url>
cd ecotronics

# Install dependencies
npm install

# Start backend
cd backend
npm install
npm run dev

# Start frontend (in a new terminal)
cd ../frontend
npm install
npm run dev

# Run tests
npm test
```

## 🎭 Demo Scenarios

Each phase will include demoable artifacts:

### Phase 1 Demo: Single Vehicle Owner
- Register device (simulated OBD-II)
- View real-time emissions
- See local vs cloud data sync
- Generate daily report

### Phase 2 Demo: Multi-Role
- Vehicle owner tracks personal car
- Generator owner monitors backup power
- Industry owner manages fleet
- City admin views aggregated data

### Phase 3 Demo: Advanced Analytics
- ML-based anomaly detection
- Predictive maintenance alerts
- Compliance reporting
- City-wide heatmaps

## 🔐 Security

- **Authentication**: JWT tokens with refresh mechanism
- **Authorization**: Role-based access control (RBAC)
- **Data Encryption**: TLS 1.3 in transit, AES-256 at rest
- **API Security**: Rate limiting, input validation, CORS
- **Audit Logging**: All sensitive operations logged

## 📊 Testing Strategy

- **Unit Tests**: Jest for all business logic (>80% coverage)
- **Integration Tests**: Supertest for API endpoints
- **E2E Tests**: Playwright for critical user flows
- **Load Tests**: k6 for performance validation
- **Security Tests**: OWASP ZAP for vulnerability scanning

## 📈 Monitoring & Observability

- **Logging**: Structured JSON logs (Winston/Pino)
- **Metrics**: Prometheus + Grafana
- **Tracing**: OpenTelemetry
- **Alerting**: PagerDuty/Slack integration

## 🌱 Roadmap

- **Phase 1**: Core edge processing + single role (Vehicle Owner)
- **Phase 2**: Multi-role support + RBAC
- **Phase 3**: Advanced analytics + ML models
- **Phase 4**: Mobile apps + IoT integration
- **Phase 5**: Blockchain for carbon credits

## 📄 License

MIT License - See LICENSE file for details

## 🤝 Contributing

See CONTRIBUTING.md for development guidelines

---

**Built with ❤️ for a sustainable future**
