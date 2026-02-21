# Phase 2 - Backend Foundation & Auth

## 🎯 Goal
Central API + auth + storage for all devices & users - the core SaaS engine.

## 📋 Deliverables

### Core Services
- ✅ REST API (Node.js + Express + TypeScript)
- ✅ JWT + RBAC authentication
- ✅ Endpoints for 4 user types (Vehicle Owner, Generator Owner, Industry Owner, City Admin)
- ✅ Device authentication & management
- ✅ MQTT ingestion consumer
- ✅ PostgreSQL + TimescaleDB integration

### API Documentation
- ✅ Swagger/OpenAPI auto-generated docs
- ✅ Postman collection
- ✅ API versioning (v1)

### Testing & Deployment
- ✅ Unit tests (Jest) - >80% coverage
- ✅ Integration tests (Supertest)
- ✅ Dockerfile + docker-compose
- ✅ Environment configuration

## 🛠️ Technology Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Runtime** | Node.js 18 | Async I/O, large ecosystem |
| **Framework** | Express.js | Lightweight, flexible |
| **Language** | TypeScript | Type safety, better DX |
| **Database** | PostgreSQL 14 | ACID, relational integrity |
| **Time-Series** | TimescaleDB | Optimized for emission logs |
| **Cache** | Redis 7 | Session storage, rate limiting |
| **Message Broker** | Mosquitto (MQTT) | Device communication |
| **Validation** | Zod | Runtime type validation |
| **ORM** | Prisma | Type-safe database access |
| **Auth** | jsonwebtoken + bcrypt | JWT + password hashing |
| **API Docs** | Swagger (swagger-jsdoc) | Auto-generated OpenAPI |
| **Testing** | Jest + Supertest | Unit + integration tests |

## 📊 Database Schema

### Core Tables

#### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('vehicle_owner', 'generator_owner', 'industry_owner', 'city_admin')),
  org_id UUID REFERENCES orgs(id),
  phone VARCHAR(20),
  email_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### orgs (organizations)
```sql
CREATE TABLE orgs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('industry', 'city', 'individual')),
  plan VARCHAR(50) DEFAULT 'free' CHECK (plan IN ('free', 'basic', 'pro', 'enterprise')),
  billing_email VARCHAR(255),
  billing_address TEXT,
  tax_id VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### devices
```sql
CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id VARCHAR(100) UNIQUE NOT NULL,
  device_key VARCHAR(255) NOT NULL,
  org_id UUID REFERENCES orgs(id),
  owner_id UUID REFERENCES users(id) NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('vehicle', 'generator', 'industrial')),
  lat DECIMAL(10, 8),
  lon DECIMAL(11, 8),
  metadata JSONB,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance', 'offline')),
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### emission_logs (TimescaleDB hypertable)
```sql
CREATE TABLE emission_logs (
  id BIGSERIAL,
  device_id VARCHAR(100) NOT NULL,
  ts TIMESTAMPTZ NOT NULL,
  co DECIMAL(10, 2),
  co2 DECIMAL(10, 2),
  nox DECIMAL(10, 2),
  pm25 DECIMAL(10, 2),
  pm10 DECIMAL(10, 2),
  temp DECIMAL(5, 2),
  humidity DECIMAL(5, 2),
  rpm INTEGER,
  emission_score DECIMAL(5, 2),
  anomaly_detected BOOLEAN DEFAULT FALSE,
  status VARCHAR(50),
  PRIMARY KEY (ts, device_id)
);

SELECT create_hypertable('emission_logs', 'ts');
```

#### maintenance_events
```sql
CREATE TABLE maintenance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id VARCHAR(100) NOT NULL REFERENCES devices(device_id),
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('scheduled', 'unscheduled', 'predicted')),
  predicted_due TIMESTAMPTZ,
  last_service_date TIMESTAMPTZ,
  notes TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### predictions
```sql
CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id VARCHAR(100) NOT NULL REFERENCES devices(device_id),
  ts TIMESTAMPTZ NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('emission_forecast', 'maintenance', 'anomaly')),
  value DECIMAL(10, 2),
  confidence DECIMAL(5, 4),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### wards (for city admin)
```sql
CREATE TABLE wards (
  ward_id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  polygon JSONB NOT NULL,
  population INTEGER,
  area_km2 DECIMAL(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### ward_aqi (aggregated air quality)
```sql
CREATE TABLE ward_aqi (
  id BIGSERIAL,
  ward_id VARCHAR(50) NOT NULL REFERENCES wards(ward_id),
  ts TIMESTAMPTZ NOT NULL,
  aqi INTEGER NOT NULL,
  components JSONB,
  device_count INTEGER,
  PRIMARY KEY (ts, ward_id)
);

SELECT create_hypertable('ward_aqi', 'ts');
```

## 🔌 Core API Endpoints

### Authentication
```
POST   /api/v1/auth/register          - Register new user
POST   /api/v1/auth/login             - Login (returns JWT)
POST   /api/v1/auth/refresh           - Refresh access token
POST   /api/v1/auth/logout            - Logout (invalidate token)
GET    /api/v1/auth/me                - Get current user
PUT    /api/v1/auth/password          - Change password
POST   /api/v1/auth/forgot-password   - Request password reset
POST   /api/v1/auth/reset-password    - Reset password
```

### Users (RBAC protected)
```
GET    /api/v1/users                  - List users (admin only)
GET    /api/v1/users/:id              - Get user by ID
PUT    /api/v1/users/:id              - Update user
DELETE /api/v1/users/:id              - Delete user (admin only)
```

### Organizations
```
POST   /api/v1/orgs                   - Create organization
GET    /api/v1/orgs/:id               - Get organization
PUT    /api/v1/orgs/:id               - Update organization
GET    /api/v1/orgs/:id/users         - List org users
GET    /api/v1/orgs/:id/devices       - List org devices
```

### Devices
```
POST   /api/v1/devices/register       - Register new device
GET    /api/v1/devices                - List user's devices
GET    /api/v1/devices/:id            - Get device details
PUT    /api/v1/devices/:id            - Update device
DELETE /api/v1/devices/:id            - Delete device
GET    /api/v1/devices/:id/status     - Get device status
POST   /api/v1/devices/:id/command    - Send command to device
```

### Data Ingestion
```
POST   /api/v1/ingest                 - HTTP ingestion endpoint
MQTT   emiq/ingest/{device_id}        - MQTT ingestion topic
```

### Emission Logs
```
GET    /api/v1/devices/:id/logs       - Get emission logs
GET    /api/v1/devices/:id/logs/latest - Get latest reading
GET    /api/v1/devices/:id/logs/summary - Get summary stats
GET    /api/v1/devices/:id/logs/export - Export to CSV
```

### Analytics
```
GET    /api/v1/analytics/device/:id/trends    - Device trends
GET    /api/v1/analytics/device/:id/compare   - Compare with similar
GET    /api/v1/analytics/org/:id/summary      - Organization summary
GET    /api/v1/analytics/city/:id/aqi         - City-wide AQI
```

### Wards (City Admin)
```
GET    /api/v1/wards                  - List wards
GET    /api/v1/wards/:id              - Get ward details
GET    /api/v1/wards/:id/aqi          - Get ward AQI
GET    /api/v1/wards/:id/devices      - List ward devices
```

### Maintenance
```
GET    /api/v1/devices/:id/maintenance - Get maintenance events
POST   /api/v1/devices/:id/maintenance - Create maintenance event
PUT    /api/v1/maintenance/:id         - Update maintenance event
```

### Predictions
```
GET    /api/v1/devices/:id/predictions - Get predictions
POST   /api/v1/predictions             - Create prediction (ML service)
```

### Health & Monitoring
```
GET    /api/v1/health                 - Health check
GET    /api/v1/metrics                - Prometheus metrics
```

## 🔐 RBAC Matrix

| Endpoint | Vehicle Owner | Generator Owner | Industry Owner | City Admin |
|----------|---------------|-----------------|----------------|------------|
| Own devices | ✅ | ✅ | ✅ | ✅ |
| Org devices | ❌ | ❌ | ✅ | ✅ |
| All devices | ❌ | ❌ | ❌ | ✅ |
| Ward data | ❌ | ❌ | ❌ | ✅ |
| User management | ❌ | ❌ | ✅ (org only) | ✅ |
| Analytics | Own | Own | Org | City-wide |

## 📁 Project Structure

```
backend/
├── auth-service/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   └── user.controller.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── rbac.middleware.ts
│   │   │   └── validation.middleware.ts
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── jwt.service.ts
│   │   │   └── user.service.ts
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   └── user.routes.ts
│   │   ├── models/
│   │   │   └── user.model.ts
│   │   ├── utils/
│   │   │   ├── bcrypt.util.ts
│   │   │   └── validation.util.ts
│   │   ├── config/
│   │   │   └── database.config.ts
│   │   └── index.ts
│   ├── tests/
│   │   ├── unit/
│   │   └── integration/
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
│
├── device-service/
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── routes/
│   │   └── index.ts
│   └── tests/
│
├── data-ingestion-service/
│   ├── src/
│   │   ├── mqtt/
│   │   │   └── mqtt.consumer.ts
│   │   ├── http/
│   │   │   └── ingest.controller.ts
│   │   ├── services/
│   │   │   └── storage.service.ts
│   │   └── index.ts
│   └── tests/
│
├── analytics-service/
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   └── index.ts
│   └── tests/
│
└── shared/
    ├── database/
    │   ├── prisma/
    │   │   └── schema.prisma
    │   └── migrations/
    ├── middleware/
    ├── types/
    └── utils/
```

## 🚀 Implementation Timeline

### Week 1: Auth Service (Days 1-7)
- [x] Day 1-2: Project setup, database schema
- [ ] Day 3-4: Auth endpoints (register, login, refresh)
- [ ] Day 5: RBAC middleware
- [ ] Day 6: Unit tests
- [ ] Day 7: Integration tests, Swagger docs

### Week 2: Device & Ingestion Services (Days 8-14)
- [ ] Day 8-9: Device management endpoints
- [ ] Day 10-11: MQTT consumer for ingestion
- [ ] Day 12: HTTP ingestion endpoint
- [ ] Day 13: TimescaleDB integration
- [ ] Day 14: Testing & optimization

### Week 3: Analytics & Polish (Days 15-21)
- [ ] Day 15-16: Analytics endpoints
- [ ] Day 17: Ward management (city admin)
- [ ] Day 18-19: Performance optimization
- [ ] Day 20: Documentation
- [ ] Day 21: Demo preparation

## ✅ Success Metrics

### Performance
- API response time (p95): <200ms
- Database query time: <50ms
- MQTT message processing: <100ms
- Concurrent connections: >1000

### Reliability
- Uptime: >99.9%
- Error rate: <0.1%
- Data loss: 0%

### Security
- All endpoints authenticated
- RBAC enforced
- Rate limiting active
- Input validation on all endpoints

### Testing
- Unit test coverage: >80%
- Integration test coverage: >70%
- All critical paths tested

---

**Phase 2 Start Date**: 2026-02-17  
**Expected Completion**: 2026-03-10 (3 weeks)  
**Status**: 🚀 STARTING NOW
