# Technology Stack

## 📚 Overview
This document defines the technology choices for the EcoTronics platform, aligned with Phase 0 principles.

## 🎯 Selection Criteria
- **Proven**: Battle-tested in production
- **Scalable**: Handles growth from prototype to production
- **Developer-Friendly**: Good DX, strong community
- **Cost-Effective**: Open-source preferred
- **Aligned**: Fits local-first, modular architecture

---

## 🖥️ Edge Device Stack

### Primary Language: **JavaScript/Node.js**
**Why**: 
- Runs on Raspberry Pi, ESP32 (with IoT.js)
- Same language as backend (code reuse)
- Rich sensor library ecosystem

**Alternatives Considered**:
- Python: Slower startup, higher memory
- C++: Harder to maintain, longer dev time

### Local Processing Engine
- **Node.js 18 LTS**: Runtime
- **SQLite**: Local data buffer
- **node-obd**: OBD-II communication
- **serialport**: Sensor communication
- **mqtt.js**: Cloud sync protocol

### Deployment
- **Docker**: Containerized deployment
- **Balena**: For fleet management (optional)

---

## ☁️ Backend Stack

### Primary Language: **Node.js + TypeScript**
**Why**:
- Type safety for large codebase
- Excellent async I/O for real-time data
- Shared types with frontend

### Framework: **Express.js**
**Why**:
- Lightweight, flexible
- Huge middleware ecosystem
- Easy to test

**Alternatives Considered**:
- NestJS: Too opinionated for microservices
- Fastify: Considered for performance-critical services

### Microservices Architecture

#### Auth Service
```
Tech: Express + Passport + JWT
Database: PostgreSQL (users, roles)
Cache: Redis (sessions, tokens)
```

#### Device Service
```
Tech: Express + TypeORM
Database: PostgreSQL (device metadata)
```

#### Data Ingestion Service
```
Tech: Express + MQTT Broker (Mosquitto)
Database: TimescaleDB (time-series data)
Queue: Redis (buffering)
```

#### Analytics Service
```
Tech: Express + Python (ML models via REST)
Database: TimescaleDB (read-only)
Cache: Redis (aggregations)
```

#### Alert Service
```
Tech: Express + Bull (job queue)
Notifications: SendGrid, Twilio
```

#### Reporting Service
```
Tech: Express + Puppeteer (PDF generation)
Storage: MinIO/S3 (report files)
```

### API Layer
- **REST**: Primary API pattern
- **WebSocket** (Socket.io): Real-time updates
- **OpenAPI 3.0**: API documentation
- **Swagger UI**: Interactive API explorer

### Authentication & Authorization
- **JWT**: Stateless authentication
- **bcrypt**: Password hashing
- **Passport.js**: Auth middleware
- **CASL**: RBAC implementation

---

## 🗄️ Database Stack

### Primary Database: **PostgreSQL 14**
**Why**:
- ACID compliance
- JSON support for flexible schemas
- Excellent performance
- Strong TypeORM support

**Schema**:
- Users, organizations
- Devices, device metadata
- Roles, permissions

### Time-Series Database: **TimescaleDB**
**Why**:
- PostgreSQL extension (familiar SQL)
- Optimized for time-series data
- Automatic partitioning
- Compression

**Schema**:
- Emission readings
- Sensor data
- Aggregated metrics

### Cache: **Redis 7**
**Why**:
- In-memory speed
- Pub/Sub for real-time
- Session storage
- Job queues (Bull)

**Use Cases**:
- Session management
- API response caching
- Real-time data pub/sub
- Background job queues

### Object Storage: **MinIO**
**Why**:
- S3-compatible
- Self-hosted option
- Cost-effective

**Use Cases**:
- PDF reports
- CSV exports
- Log archives

---

## 🎨 Frontend Stack

### Framework: **React 18**
**Why**:
- Component-based architecture
- Huge ecosystem
- Excellent developer tools
- Strong TypeScript support

### Build Tool: **Vite**
**Why**:
- Lightning-fast HMR
- Optimized production builds
- Better than Create React App

### State Management: **Zustand**
**Why**:
- Simpler than Redux
- Less boilerplate
- TypeScript-first

**Alternatives Considered**:
- Redux Toolkit: Too complex for our needs
- Jotai: Less mature

### UI Framework: **Tailwind CSS**
**Why**:
- Utility-first (rapid development)
- Consistent design system
- Small bundle size (purged)

### Component Library: **shadcn/ui**
**Why**:
- Copy-paste components (no dependency)
- Built on Radix UI (accessible)
- Tailwind-based

### Charts: **Recharts**
**Why**:
- React-native
- Composable
- Good documentation

**Alternatives Considered**:
- Chart.js: Not React-native
- Victory: Heavier bundle

### Maps: **Leaflet + React-Leaflet**
**Why**:
- Open-source (no API keys)
- Lightweight
- Customizable

### Real-Time: **Socket.io-client**
**Why**:
- Matches backend
- Auto-reconnection
- Fallback to polling

### Forms: **React Hook Form + Zod**
**Why**:
- Performant (uncontrolled)
- TypeScript validation
- Small bundle

### Routing: **React Router v6**
**Why**:
- Standard for React
- Nested routes
- Code splitting

---

## 🧪 Testing Stack

### Unit Testing
- **Jest**: Test runner
- **React Testing Library**: Component tests
- **Supertest**: API endpoint tests

### Integration Testing
- **Testcontainers**: Spin up real databases
- **Docker Compose**: Service integration

### E2E Testing
- **Playwright**: Cross-browser testing
- **MSW**: API mocking

### Load Testing
- **k6**: Performance testing
- **Artillery**: Alternative option

### Code Quality
- **ESLint**: Linting
- **Prettier**: Code formatting
- **Husky**: Git hooks
- **lint-staged**: Pre-commit checks

---

## 🚀 DevOps Stack

### Containerization
- **Docker**: Container runtime
- **Docker Compose**: Local development

### CI/CD
- **GitHub Actions**: Primary CI/CD
- **Alternatives**: GitLab CI, CircleCI

### Monitoring
- **Prometheus**: Metrics collection
- **Grafana**: Visualization
- **Loki**: Log aggregation
- **Jaeger**: Distributed tracing (optional)

### Logging
- **Winston**: Node.js logging
- **Pino**: Alternative (faster)
- **ELK Stack**: Centralized logging (production)

### Infrastructure as Code
- **Docker Compose**: Local/dev
- **Kubernetes**: Production (optional)
- **Terraform**: Cloud provisioning (if needed)

---

## 📱 Mobile (Future Phase)

### Framework: **React Native**
**Why**:
- Code reuse with web (React)
- Single codebase for iOS/Android
- Strong community

**Alternatives Considered**:
- Flutter: Different language (Dart)
- Native: Double development effort

---

## 🔧 Development Tools

### IDE
- **VS Code**: Recommended
- **Extensions**:
  - ESLint
  - Prettier
  - Docker
  - Thunder Client (API testing)

### API Testing
- **Postman**: Team collaboration
- **Thunder Client**: VS Code extension
- **curl**: CLI testing

### Database Tools
- **pgAdmin**: PostgreSQL GUI
- **DBeaver**: Universal DB tool
- **Redis Commander**: Redis GUI

### Version Control
- **Git**: VCS
- **GitHub**: Repository hosting
- **Conventional Commits**: Commit message format

---

## 📦 Package Management

### Node.js: **npm**
**Why**:
- Default, widely supported
- Workspaces for monorepo

**Alternatives Considered**:
- pnpm: Faster, but less common
- yarn: Similar to npm

---

## 🌐 Deployment Options

### Prototype/Demo
- **Docker Compose**: Single-server deployment
- **DigitalOcean Droplet**: $10/month
- **Render**: Free tier for demos

### Production (Future)
- **AWS**: ECS/EKS for containers
- **Google Cloud**: Cloud Run
- **Azure**: Container Instances
- **Self-Hosted**: On-premise for data sovereignty

---

## 📊 Technology Matrix

| Component          | Technology      | Version | License    |
|--------------------|-----------------|---------|------------|
| Edge Runtime       | Node.js         | 18 LTS  | MIT        |
| Backend Language   | TypeScript      | 5.0+    | Apache 2.0 |
| Backend Framework  | Express         | 4.18+   | MIT        |
| Primary Database   | PostgreSQL      | 14+     | PostgreSQL |
| Time-Series DB     | TimescaleDB     | 2.10+   | Apache 2.0 |
| Cache              | Redis           | 7+      | BSD        |
| Object Storage     | MinIO           | Latest  | AGPL       |
| Frontend Framework | React           | 18+     | MIT        |
| Build Tool         | Vite            | 4+      | MIT        |
| CSS Framework      | Tailwind CSS    | 3+      | MIT        |
| State Management   | Zustand         | 4+      | MIT        |
| Charts             | Recharts        | 2+      | MIT        |
| Maps               | Leaflet         | 1.9+    | BSD        |
| Testing            | Jest            | 29+     | MIT        |
| E2E Testing        | Playwright      | 1.30+   | Apache 2.0 |
| Containerization   | Docker          | 20+     | Apache 2.0 |
| CI/CD              | GitHub Actions  | N/A     | Free       |
| Monitoring         | Prometheus      | 2.40+   | Apache 2.0 |

---

## 🔄 Version Management

### Semantic Versioning
All packages follow semver: `MAJOR.MINOR.PATCH`

### Dependency Updates
- **Renovate Bot**: Automated dependency updates
- **Monthly Review**: Manual review of major updates

### Node.js Version
- **Development**: 18 LTS
- **Production**: 18 LTS (upgrade to 20 LTS in 2024)

---

## 🎓 Learning Resources

### For Team Onboarding
- **TypeScript**: [Official Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- **React**: [React.dev](https://react.dev)
- **PostgreSQL**: [PostgreSQL Tutorial](https://www.postgresqltutorial.com/)
- **Docker**: [Docker Getting Started](https://docs.docker.com/get-started/)

---

## ✅ Decision Log

| Date       | Decision                  | Rationale                          |
|------------|---------------------------|------------------------------------|
| 2026-02-17 | Node.js for edge          | JavaScript everywhere, sensor libs |
| 2026-02-17 | TypeScript for backend    | Type safety, better DX             |
| 2026-02-17 | PostgreSQL + TimescaleDB  | Relational + time-series in one    |
| 2026-02-17 | React + Vite              | Modern, fast, great DX             |
| 2026-02-17 | Tailwind CSS              | Rapid UI development               |
| 2026-02-17 | Zustand over Redux        | Simpler state management           |

---

**All technology choices support the Phase 0 principles: local-first, modular, testable, and demo-ready.**
