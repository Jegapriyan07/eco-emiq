# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- SQLite demo DB mirrors TimescaleDB `emission_readings`; dashboards query DB instead of in-memory simulation
- ML training reads from seeded database (`npm run db:seed`, `npm run ml:train`)
- Removed Docker dependency; local dev uses Node.js + Python only

### Phase 1 (In Progress)
- Auth Service implementation
- Device Service implementation
- Edge Device Simulator
- Frontend foundation

## [0.1.0] - 2026-02-17

### Added - Phase 0 Complete! 🎉

#### Documentation (31 pages)
- `README.md` - Project overview and quick start
- `PHASE_0_REQUIREMENTS.md` - Core principles and requirements (7 pages)
- `TECH_STACK.md` - Technology stack decisions (6 pages)
- `IMPLEMENTATION_PLAN.md` - 15-week development roadmap (8 pages)
- `PHASE_0_SUMMARY.md` - Phase 0 achievements summary
- `GETTING_STARTED.md` - Developer onboarding guide (7 pages)
- `docs/ARCHITECTURE.md` - System architecture documentation (10 pages)
- `LICENSE` - MIT License
- `CHANGELOG.md` - This file

#### Infrastructure
- `docker-compose.yml` - Complete service orchestration
  - PostgreSQL 14 for relational data
  - TimescaleDB for time-series data
  - Redis 7 for caching and sessions
  - MinIO for object storage
  - Mosquitto MQTT broker for device communication
  - Nginx API gateway with rate limiting
- `infrastructure/init-db.sql` - PostgreSQL schema (500+ lines)
  - Users table with 4 role types
  - Organizations table
  - Devices table with JSONB metadata
  - Alerts, reports, audit logs
  - RBAC helper functions
- `infrastructure/init-timescaledb.sql` - TimescaleDB schema (400+ lines)
  - Emission readings hypertable
  - Continuous aggregates (hourly, daily)
  - Compression and retention policies
  - Helper functions for analytics
- `infrastructure/mosquitto.conf` - MQTT broker configuration
- `infrastructure/nginx.conf` - API gateway configuration

#### Shared Library
- `shared/types/index.ts` - Complete TypeScript type definitions (400+ lines)
  - User and authentication types
  - Device types (vehicle, generator, industrial)
  - Emission data structures
  - Analytics and aggregation types
  - Alert and notification types
  - Report types
  - Organization types
  - API request/response types
  - WebSocket event types
  - Constants and emission factors
- `shared/package.json` - Shared library package config
- `shared/tsconfig.json` - TypeScript configuration

#### Configuration
- `package.json` - Root workspace configuration
- `tsconfig.json` - TypeScript configuration
- `.eslintrc.js` - ESLint configuration
- `.prettierrc` - Prettier configuration
- `.gitignore` - Git ignore rules
- `.env.example` - Environment variable template

#### Scripts
- `scripts/setup.js` - Automated development environment setup
  - Prerequisites checking
  - Environment configuration
  - Dependency installation
  - Database initialization

#### Architecture Decisions
- **Local-First**: Edge devices calculate emissions locally
- **Four Roles**: Vehicle Owner, Generator Owner, Industry Owner, City Admin
- **Microservices**: 6 independent services planned
- **Security**: JWT + RBAC from day 1
- **Scalability**: Horizontal scaling ready
- **Testing**: >80% coverage target

#### Technology Stack
- **Edge**: Node.js 18
- **Backend**: TypeScript + Express
- **Database**: PostgreSQL 14 + TimescaleDB
- **Cache**: Redis 7
- **Message Queue**: MQTT (Mosquitto)
- **Storage**: MinIO (S3-compatible)
- **Frontend**: React 18 + Vite (planned)
- **Styling**: Tailwind CSS (planned)
- **Testing**: Jest + Playwright (planned)

### Database Schema
- 7 PostgreSQL tables with full RBAC support
- 1 TimescaleDB hypertable with auto-partitioning
- 2 continuous aggregates for performance
- 10+ helper functions for common queries
- Comprehensive indexes for optimization

### Security Features
- JWT authentication with refresh tokens
- Role-based access control (RBAC)
- Password hashing with bcrypt
- Audit logging for compliance
- Rate limiting in API gateway
- SQL injection prevention
- Input validation architecture

### Development Experience
- Automated setup script
- Docker Compose for one-command startup
- Comprehensive documentation
- Code quality tools (ESLint, Prettier)
- Git hooks for pre-commit checks
- Conventional commit messages

### Metrics
- **Documentation**: 31 pages
- **Code**: 2000+ lines (schemas, types, configs)
- **Database Tables**: 7 relational + 1 time-series
- **Type Definitions**: 400+ lines
- **Services Defined**: 6 microservices
- **User Roles**: 4 complete personas
- **Time to Setup**: ~5 minutes (automated)

## [0.0.0] - 2026-02-17

### Project Initialized
- Repository created
- Initial project structure defined

---

## Legend

- **Added**: New features
- **Changed**: Changes to existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security improvements

---

**Note**: This project follows [Semantic Versioning](https://semver.org/):
- **MAJOR** version for incompatible API changes
- **MINOR** version for backwards-compatible functionality
- **PATCH** version for backwards-compatible bug fixes
