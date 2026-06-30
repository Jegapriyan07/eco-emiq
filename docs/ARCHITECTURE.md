# EcoTronics Architecture

## 🏗️ System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         EDGE LAYER (Local-First)                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   Vehicle    │  │  Generator   │  │  Industrial  │              │
│  │   OBD-II     │  │   Monitor    │  │   Sensors    │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                  │                  │                       │
│         └──────────────────┴──────────────────┘                      │
│                            │                                          │
│                  ┌─────────▼─────────┐                               │
│                  │  Edge Processor   │                               │
│                  ├───────────────────┤                               │
│                  │ • Sensor Reading  │                               │
│                  │ • CO2 Calculation │                               │
│                  │ • Local Buffer    │                               │
│                  │ • Spike Detection │                               │
│                  │ • Offline Queue   │                               │
│                  └─────────┬─────────┘                               │
│                            │                                          │
│                  ┌─────────▼─────────┐                               │
│                  │  Local Storage    │                               │
│                  │   (SQLite/IDB)    │                               │
│                  │  24-48h Buffer    │                               │
│                  └───────────────────┘                               │
│                                                                       │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ MQTT/HTTPS (when online)
                            │
┌───────────────────────────▼─────────────────────────────────────────┐
│                      CLOUD LAYER (Aggregation)                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                     API Gateway (Nginx)                        │  │
│  │  • Rate Limiting  • JWT Validation  • Request Routing         │  │
│  └───────────────────────────┬───────────────────────────────────┘  │
│                              │                                        │
│         ┌────────────────────┼────────────────────┐                  │
│         │                    │                    │                  │
│  ┌──────▼──────┐  ┌─────────▼────────┐  ┌───────▼────────┐         │
│  │    Auth     │  │     Device       │  │  Data Ingest   │         │
│  │   Service   │  │    Service       │  │    Service     │         │
│  ├─────────────┤  ├──────────────────┤  ├────────────────┤         │
│  │ • Register  │  │ • CRUD Devices   │  │ • MQTT Sub     │         │
│  │ • Login     │  │ • Ownership      │  │ • Validation   │         │
│  │ • JWT       │  │ • Metadata       │  │ • TimescaleDB  │         │
│  │ • RBAC      │  │ • Status         │  │ • WebSocket    │         │
│  └─────────────┘  └──────────────────┘  └────────────────┘         │
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  Analytics   │  │    Alert     │  │  Reporting   │              │
│  │   Service    │  │   Service    │  │   Service    │              │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤              │
│  │ • Aggregates │  │ • Thresholds │  │ • PDF Gen    │              │
│  │ • Trends     │  │ • Notify     │  │ • CSV Export │              │
│  │ • Compare    │  │ • ML Anomaly │  │ • Compliance │              │
│  │ • ML Models  │  │ • Ack/Resolve│  │ • Scheduling │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                      Data Layer                                │  │
│  ├───────────────────────────────────────────────────────────────┤  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────┐  ┌──────────────────┐  │  │
│  │  │PostgreSQL│  │Timescale │  │Redis │  │  MinIO (S3)      │  │  │
│  │  ├──────────┤  ├──────────┤  ├──────┤  ├──────────────────┤  │  │
│  │  │• Users   │  │• Readings│  │•Cache│  │• Reports         │  │  │
│  │  │• Devices │  │• Hourly  │  │•Queue│  │• Exports         │  │  │
│  │  │• Orgs    │  │• Daily   │  │•Sess │  │• Logs            │  │  │
│  │  └──────────┘  └──────────┘  └──────┘  └──────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                       │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ WebSocket/REST
                            │
┌───────────────────────────▼─────────────────────────────────────────┐
│                    PRESENTATION LAYER (Web)                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                  React Web Application                         │  │
│  ├───────────────────────────────────────────────────────────────┤  │
│  │                                                                 │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌─────────┐ │  │
│  │  │  Vehicle   │  │ Generator  │  │ Industry   │  │  City   │ │  │
│  │  │   Owner    │  │   Owner    │  │   Owner    │  │  Admin  │ │  │
│  │  │ Dashboard  │  │ Dashboard  │  │ Dashboard  │  │Dashboard│ │  │
│  │  └────────────┘  └────────────┘  └────────────┘  └─────────┘ │  │
│  │                                                                 │  │
│  │  ┌──────────────────────────────────────────────────────────┐ │  │
│  │  │           Shared Components & Design System              │ │  │
│  │  │  • Auth  • Charts  • Maps  • Forms  • Notifications     │ │  │
│  │  └──────────────────────────────────────────────────────────┘ │  │
│  │                                                                 │  │
│  │  ┌──────────────────────────────────────────────────────────┐ │  │
│  │  │              State Management (Zustand)                  │ │  │
│  │  │  • User  • Devices  • Readings  • Alerts  • UI          │ │  │
│  │  └──────────────────────────────────────────────────────────┘ │  │
│  │                                                                 │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## 🔄 Data Flow

### 1. Emission Reading Flow (Local-First)

```
┌──────────┐
│  Sensor  │ (OBD-II, Air Quality)
└────┬─────┘
     │ Raw Data
     ▼
┌──────────────────┐
│ Edge Processor   │
│ ┌──────────────┐ │
│ │ Read Sensor  │ │
│ └──────┬───────┘ │
│        │         │
│ ┌──────▼───────┐ │
│ │ Calculate    │ │ CO2 = fuel × factor
│ │ Emissions    │ │ NOx = from lookup table
│ └──────┬───────┘ │
│        │         │
│ ┌──────▼───────┐ │
│ │ Store Local  │ │ SQLite buffer (24-48h)
│ └──────┬───────┘ │
│        │         │
│ ┌──────▼───────┐ │
│ │ Display UI   │ │ Real-time to user
│ └──────────────┘ │
└──────┬───────────┘
       │ When online
       ▼
┌──────────────────┐
│ MQTT Publish     │ Topic: ecotronics/device/{id}/readings
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Data Ingestion   │
│ Service          │
│ ┌──────────────┐ │
│ │ Validate     │ │
│ └──────┬───────┘ │
│        │         │
│ ┌──────▼───────┐ │
│ │ Store        │ │ TimescaleDB
│ │ TimescaleDB  │ │
│ └──────┬───────┘ │
│        │         │
│ ┌──────▼───────┐ │
│ │ Broadcast    │ │ WebSocket to connected clients
│ │ WebSocket    │ │
│ └──────────────┘ │
└──────────────────┘
```

### 2. Authentication Flow (JWT + RBAC)

```
┌──────────┐
│ Frontend │
└────┬─────┘
     │ POST /api/v1/auth/login
     │ { email, password }
     ▼
┌──────────────────┐
│ API Gateway      │ Rate limit: 5 req/s
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│ Auth Service     │
│ ┌──────────────┐ │
│ │ Validate     │ │ Check email format
│ └──────┬───────┘ │
│        │         │
│ ┌──────▼───────┐ │
│ │ Verify       │ │ bcrypt.compare(password, hash)
│ │ Password     │ │
│ └──────┬───────┘ │
│        │         │
│ ┌──────▼───────┐ │
│ │ Generate     │ │ JWT with { userId, role, orgId }
│ │ JWT          │ │ Expires in 7 days
│ └──────┬───────┘ │
│        │         │
│ ┌──────▼───────┐ │
│ │ Store        │ │ Refresh token in DB
│ │ Refresh Token│ │
│ └──────┬───────┘ │
└────────┼─────────┘
         │
         ▼
┌──────────────────┐
│ Frontend         │ Store in memory + httpOnly cookie
│ ┌──────────────┐ │
│ │ Save Tokens  │ │
│ └──────┬───────┘ │
│        │         │
│ ┌──────▼───────┐ │
│ │ Redirect to  │ │ Based on role
│ │ Dashboard    │ │
│ └──────────────┘ │
└──────────────────┘
```

### 3. RBAC Authorization Flow

```
┌──────────┐
│ Frontend │ GET /api/v1/devices/123
└────┬─────┘ Headers: { Authorization: Bearer <JWT> }
     │
     ▼
┌──────────────────┐
│ API Gateway      │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│ Device Service   │
│ ┌──────────────┐ │
│ │ Auth         │ │ Verify JWT signature
│ │ Middleware   │ │ Extract { userId, role, orgId }
│ └──────┬───────┘ │
│        │         │
│ ┌──────▼───────┐ │
│ │ RBAC Check   │ │ Can user access device 123?
│ │              │ │
│ │ IF role =    │ │
│ │ city_admin   │ │ → Allow (can see all)
│ │              │ │
│ │ ELSE IF      │ │
│ │ industry_    │ │ → Check device.orgId == user.orgId
│ │ owner        │ │
│ │              │ │
│ │ ELSE         │ │ → Check device.ownerId == user.id
│ └──────┬───────┘ │
│        │         │
│        │ Authorized
│        ▼         │
│ ┌──────────────┐ │
│ │ Fetch Device │ │ SELECT * FROM devices WHERE id = 123
│ └──────┬───────┘ │
└────────┼─────────┘
         │
         ▼
┌──────────────────┐
│ Frontend         │ Display device data
└──────────────────┘
```

## 🗄️ Database Schema Design

### PostgreSQL (Relational Data)

**Key Design Decisions**:
- UUID primary keys for distributed systems
- JSONB for flexible device metadata
- Enum types for type safety
- Indexes on foreign keys and query columns
- Audit logging for compliance

**Tables**:
1. `users` - All user accounts
2. `organizations` - Industry/City entities
3. `devices` - All devices (vehicles, generators, industrial)
4. `refresh_tokens` - JWT refresh mechanism
5. `alerts` - System alerts
6. `reports` - Generated reports
7. `audit_logs` - Security audit trail

### TimescaleDB (Time-Series Data)

**Key Design Decisions**:
- Hypertable partitioned by time (1-day chunks)
- Continuous aggregates for hourly/daily summaries
- Compression after 7 days
- Retention policy: 90 days raw, 1 year aggregates
- Indexes on device_id + timestamp

**Tables**:
1. `emission_readings` (hypertable) - Raw sensor data
2. `emission_hourly` (materialized view) - Hourly aggregates
3. `emission_daily` (materialized view) - Daily aggregates

## 🔐 Security Architecture

### Defense in Depth

```
Layer 1: Network
├─ HTTPS/TLS 1.3
├─ Rate limiting (Nginx)
└─ CORS policy

Layer 2: Authentication
├─ JWT with RS256 (asymmetric)
├─ Refresh token rotation
├─ Password hashing (bcrypt, 10 rounds)
└─ Email verification

Layer 3: Authorization
├─ Role-based access control (RBAC)
├─ Resource-level permissions
├─ Organization scoping
└─ Audit logging

Layer 4: Data
├─ SQL injection prevention (parameterized queries)
├─ Input validation (Zod schemas)
├─ XSS protection (CSP headers)
└─ Secrets management (env vars)

Layer 5: Monitoring
├─ Failed login tracking
├─ Anomaly detection
├─ Security audit logs
└─ Alerting on suspicious activity
```

## 📊 Scalability Considerations

### Horizontal Scaling

**Stateless Services**: All backend services are stateless and can be scaled horizontally
- Auth Service: 2-10 instances behind load balancer
- Device Service: 2-10 instances
- Data Ingestion: 5-20 instances (high throughput)
- Analytics Service: 2-10 instances

**Database Scaling**:
- PostgreSQL: Read replicas for analytics queries
- TimescaleDB: Distributed hypertables for massive scale
- Redis: Redis Cluster for high availability

**MQTT Broker**:
- Mosquitto cluster with bridge configuration
- Sticky sessions for client connections

### Caching Strategy

```
L1: Browser Cache
├─ Static assets (1 year)
└─ API responses (5 minutes)

L2: Redis Cache
├─ User sessions (7 days)
├─ Device metadata (1 hour)
├─ Aggregated stats (15 minutes)
└─ API responses (5 minutes)

L3: Database Query Cache
├─ PostgreSQL shared_buffers
└─ TimescaleDB chunk cache
```

## 🔄 Deployment Architecture

### Development
```
Developer Machine
├─ Docker Compose
│  ├─ All services
│  └─ All databases
└─ Local frontend (Vite dev server)
```

### Production (AWS Example)
```
Route 53 (DNS)
    │
    ▼
CloudFront (CDN)
    │
    ├─ Static Assets (S3)
    │
    └─ API (ALB)
        │
        ├─ ECS Cluster
        │  ├─ Auth Service (2-10 tasks)
        │  ├─ Device Service (2-10 tasks)
        │  ├─ Data Ingestion (5-20 tasks)
        │  └─ Analytics Service (2-10 tasks)
        │
        ├─ RDS PostgreSQL (Multi-AZ)
        ├─ RDS TimescaleDB (Multi-AZ)
        ├─ ElastiCache Redis (Cluster mode)
        └─ S3 (Reports, Logs)
```

---

**Last Updated**: 2026-02-17  
**Version**: 0.1.0
