# Phase 0 - Core Requirements & Principles

## 📋 Overview
This document defines the foundational principles and requirements that guide ALL phases of the EcoTronics platform development.

## 🎯 Core Principles

### 1. Local-First Architecture

**Principle**: Edge devices are intelligent and autonomous.

**Requirements**:
- ✅ Devices MUST calculate emission scores locally
- ✅ Devices MUST store recent data buffer (minimum 24 hours)
- ✅ Cloud/backend is ONLY for:
  - Multi-device aggregation
  - Advanced ML model serving
  - Long-term historical storage
  - Cross-device analytics
- ✅ Core functionality MUST work offline
- ✅ Data sync happens opportunistically when online

**Technical Implementation**:
```javascript
// Edge Device Processing Flow
1. Read sensor data (OBD-II, air quality, fuel consumption)
2. Calculate emissions locally using standard formulas
3. Store in local buffer (SQLite/IndexedDB)
4. Display real-time results to user
5. Queue for cloud sync when online
6. Sync only aggregated/summary data to cloud
```

**Benefits**:
- Privacy: Raw sensor data stays on device
- Performance: No network latency for real-time display
- Reliability: Works without internet
- Cost: Reduced cloud bandwidth/storage

---

### 2. Four Distinct User Roles

**Principle**: Different stakeholders have different needs and permissions.

#### Role 1: Vehicle Owner 🚗
**Persona**: Individual car owner tracking personal emissions

**Capabilities**:
- Register and manage personal vehicle(s)
- View real-time emission data
- Track daily/weekly/monthly trends
- Receive eco-driving tips
- Compare with similar vehicles
- Generate personal carbon reports

**Data Scope**: Own vehicle(s) only

**UI Focus**: Simple, consumer-friendly, gamified

---

#### Role 2: Generator Owner ⚡
**Persona**: Home/business owner with backup generator

**Capabilities**:
- Monitor generator runtime and emissions
- Track fuel efficiency
- Schedule maintenance based on usage
- Compare grid vs generator carbon footprint
- Receive alerts for excessive usage
- Optimize generator usage patterns

**Data Scope**: Own generator(s) only

**UI Focus**: Efficiency metrics, cost savings

---

#### Role 3: Industry Owner 🏭
**Persona**: Fleet manager or facility operator

**Capabilities**:
- Manage multiple vehicles/generators/facilities
- Fleet-wide emission analytics
- Compliance reporting (EPA, local regulations)
- Set emission targets and track progress
- Identify high-emission assets
- Predictive maintenance scheduling
- Export data for audits

**Data Scope**: All assets under their organization

**UI Focus**: Compliance, cost optimization, fleet management

---

#### Role 4: City/Authority Admin 🏛️
**Persona**: Environmental agency or city planner

**Capabilities**:
- View aggregated city-wide emission data
- Identify pollution hotspots
- Monitor compliance across industries
- Generate policy insights
- Set city-wide emission targets
- Public reporting and transparency
- Alert on air quality emergencies

**Data Scope**: All devices in their jurisdiction (anonymized)

**UI Focus**: Maps, heatmaps, policy dashboards

---

### 3. Unified Architecture

**Principle**: Every phase builds on previous work. No rewrites.

**Requirements**:
- ✅ Modular design from day one
- ✅ Clear interfaces between components
- ✅ Database schema supports all roles from start
- ✅ API design is extensible
- ✅ Frontend components are reusable across roles
- ✅ Shared libraries for common logic

**Anti-Patterns to Avoid**:
- ❌ Building separate apps for each role
- ❌ Hardcoding role-specific logic in core services
- ❌ Tight coupling between frontend and backend
- ❌ Monolithic database schema

**Implementation Strategy**:
```
Phase 1: Build core + Vehicle Owner role
  ├─ Core edge processing engine (reusable)
  ├─ Core backend services (extensible)
  ├─ Auth system with RBAC (all roles defined)
  └─ Vehicle Owner UI (first role implementation)

Phase 2: Add Generator Owner + Industry Owner
  ├─ Extend device types (generator, industrial)
  ├─ Add role-specific UI pages
  ├─ Reuse core services (no changes needed)
  └─ Add role-specific analytics

Phase 3: Add City Admin + Advanced Features
  ├─ Aggregation service for city-wide data
  ├─ City Admin UI with maps
  ├─ ML models for predictions
  └─ Advanced reporting
```

---

### 4. Security, Testability, Modularity

#### Security 🔐

**Requirements**:
- ✅ JWT-based authentication
- ✅ Role-based access control (RBAC)
- ✅ API rate limiting
- ✅ Input validation and sanitization
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS protection
- ✅ HTTPS/TLS for all communications
- ✅ Secrets management (environment variables, vaults)
- ✅ Audit logging for sensitive operations

**RBAC Matrix**:
```
Resource              | Vehicle | Generator | Industry | City Admin
------------------------------------------------------------------
Own Device Data       |   RW    |    RW     |    RW    |     R
Org Device Data       |   -     |     -     |    RW    |     R
City Aggregated Data  |   -     |     -     |     -    |    RW
User Management       |   R     |     R     |    RW    |    RW
System Config         |   -     |     -     |     -    |    RW
```

#### Testability 🧪

**Requirements**:
- ✅ Unit tests for all business logic (>80% coverage)
- ✅ Integration tests for API endpoints
- ✅ E2E tests for critical user flows
- ✅ Mock external dependencies
- ✅ CI/CD pipeline runs tests automatically
- ✅ Test data generators for realistic scenarios

**Testing Stack**:
- Unit: Jest (Node.js), Pytest (Python)
- Integration: Supertest, Testcontainers
- E2E: Playwright
- Load: k6, Artillery

#### Modularity 🧩

**Requirements**:
- ✅ Microservices architecture
- ✅ Clear service boundaries
- ✅ API-first design (OpenAPI specs)
- ✅ Shared libraries for common code
- ✅ Docker containers for each service
- ✅ Independent deployment of services

**Service Boundaries**:
```
auth-service          → Authentication, JWT, RBAC
device-service        → Device registration, metadata
data-ingestion        → Receive and validate sensor data
analytics-service     → Aggregations, trends, insights
alert-service         → Threshold monitoring, notifications
reporting-service     → PDF/CSV generation, compliance
```

---

### 5. Demo-First Approach

**Principle**: Each phase must produce a working, demoable artifact.

**Requirements**:
- ✅ End-to-end user flow works
- ✅ UI is polished (not prototype quality)
- ✅ Sample data is realistic
- ✅ Demo script provided
- ✅ Can run locally without complex setup

**Demo Checklist for Each Phase**:
- [ ] Docker Compose starts all services
- [ ] Seed data script populates realistic data
- [ ] Demo user accounts pre-created
- [ ] Demo script (step-by-step walkthrough)
- [ ] Screenshots/video recording
- [ ] README with "Quick Demo" section

---

## 🔄 Cross-Phase Consistency

### Data Models
All phases use consistent data models:

```typescript
// Device (supports all types)
interface Device {
  id: string;
  type: 'vehicle' | 'generator' | 'industrial';
  ownerId: string;
  metadata: {
    // Vehicle-specific
    make?: string;
    model?: string;
    year?: number;
    // Generator-specific
    capacity?: number;
    fuelType?: string;
    // Industrial-specific
    facilityType?: string;
    location?: GeoPoint;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Emission Reading (universal)
interface EmissionReading {
  id: string;
  deviceId: string;
  timestamp: Date;
  data: {
    co2: number;        // grams
    co: number;         // ppm
    nox: number;        // ppm
    pm25: number;       // μg/m³
    fuelConsumed: number; // liters or kWh
  };
  location?: GeoPoint;
  calculatedLocally: boolean;
  syncedAt?: Date;
}

// User (all roles)
interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: 'vehicle_owner' | 'generator_owner' | 'industry_owner' | 'city_admin';
  organizationId?: string; // For industry/city roles
  createdAt: Date;
}
```

### API Conventions
- REST for CRUD operations
- WebSocket for real-time updates
- GraphQL for complex queries (optional, later phases)
- Versioned endpoints: `/api/v1/...`
- Consistent error responses:
  ```json
  {
    "error": {
      "code": "INVALID_INPUT",
      "message": "Device ID is required",
      "details": { "field": "deviceId" }
    }
  }
  ```

### UI/UX Patterns
- Consistent navigation structure
- Shared component library (buttons, cards, charts)
- Dark mode support
- Responsive design (mobile-first)
- Accessibility (WCAG 2.1 AA)

---

## ✅ Phase 0 Deliverables

Before starting Phase 1, ensure:

- [x] This requirements document
- [ ] Architecture diagrams (system, data flow, deployment)
- [ ] Technology stack decisions documented
- [ ] Development environment setup guide
- [ ] Git repository structure
- [ ] CI/CD pipeline skeleton
- [ ] Docker Compose for local development
- [ ] Database schema (initial version)
- [ ] API specification (OpenAPI) for core endpoints
- [ ] Frontend component library foundation

---

## 🎓 Key Takeaways

1. **Local-First**: Devices are smart, cloud is for aggregation
2. **Four Roles**: Vehicle, Generator, Industry, City Admin
3. **Unified**: Build once, extend incrementally
4. **Secure**: JWT, RBAC, encryption, auditing
5. **Testable**: >80% coverage, CI/CD, automated tests
6. **Modular**: Microservices, clear boundaries, Docker
7. **Demoable**: Each phase has a working prototype

---

**This document is the north star for all development decisions.**
