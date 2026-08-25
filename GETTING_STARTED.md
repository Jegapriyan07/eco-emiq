# 🚀 Getting Started with EcoTronics

Welcome to EcoTronics! This guide will help you set up your development environment and understand the project structure.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

### Required Software

1. **Node.js 18+**
   ```bash
   node --version  # Should be v18.0.0 or higher
   ```
   Download: https://nodejs.org/

2. **npm 9+**
   ```bash
   npm --version  # Should be 9.0.0 or higher
   ```
   Comes with Node.js

3. **Python 3.10+**
   ```bash
   python --version  # Should be 3.10.0 or higher
   ```
   Download: https://python.org/

4. **Git**
   ```bash
   git --version
   ```
   Download: https://git-scm.com/

### Optional (Recommended)

- **VS Code** - https://code.visualstudio.com/
- **Postman** or **Thunder Client** - For API testing
- **pgAdmin** - PostgreSQL GUI (https://www.pgadmin.org/)

---

## 🎯 Quick Start (5 Minutes)

### Option 1: Automated Setup (Recommended)

```bash
# 1. Clone the repository (or navigate to the project)
cd ecotronics

# 2. Run the automated setup script
npm run setup
```

The setup script will:
- ✅ Check all prerequisites (Node.js, Python, Git)
- ✅ Create `.env` file from template
- ✅ Install all dependencies
- ✅ Build shared library
- ✅ Install ML service Python packages

### Option 2: Manual Setup

If the automated setup doesn't work, follow these steps:

```bash
# 1. Navigate to project directory
cd ecotronics

# 2. Copy environment variables
copy .env.example .env
# On Linux/Mac: cp .env.example .env

# 3. Install root dependencies
npm install

# 4. Build shared library
cd shared
npm install
npm run build
cd ..

# 5. Install ML service dependencies
cd ml-service
pip install -r requirements.txt
cd ..
```

---

## 🏃 Running the Application

Start frontend and ML service together:

```bash
npm run dev
```

Or in separate terminals:

```bash
# Terminal 1: ML service (port 8000)
npm run dev:ml

# Terminal 2: Frontend (port 5173)
npm run dev:frontend

# Terminal 3 (optional): Edge device simulator
npm run dev:edge
```

Then open http://localhost:5173 and sign in with a demo account.

---

## 📂 Project Structure Explained

```
ecotronics/
│
├── 📄 Core Documentation
│   ├── README.md                    # Project overview
│   ├── PHASE_0_REQUIREMENTS.md      # Core principles
│   ├── TECH_STACK.md                # Technology decisions
│   ├── IMPLEMENTATION_PLAN.md       # 15-week roadmap
│   ├── PHASE_0_SUMMARY.md           # What we've built
│   └── GETTING_STARTED.md           # This file!
│
├── 📂 docs/                         # Additional documentation
│   └── ARCHITECTURE.md              # System architecture
│
├── 📂 shared/                       # Shared TypeScript types
│   ├── types/
│   │   └── index.ts                 # All type definitions
│   ├── package.json
│   └── tsconfig.json
│
├── 📂 infrastructure/               # DevOps configuration
│   ├── init-db.sql                  # PostgreSQL schema
│   ├── init-timescaledb.sql         # TimescaleDB schema
│   ├── mosquitto.conf               # MQTT broker config
│   └── nginx.conf                   # API gateway config
│
├── 📂 scripts/                      # Utility scripts
│   └── setup.js                     # Automated setup
│
├── 📂 backend/ (Phase 1)            # Microservices
│   ├── auth-service/                # Authentication & JWT
│   ├── device-service/              # Device management
│   ├── data-ingestion-service/      # MQTT subscriber
│   ├── analytics-service/           # Data analytics
│   ├── alert-service/               # Notifications
│   └── reporting-service/           # PDF/CSV reports
│
├── 📂 frontend/ (Phase 1)           # React web application
│   └── src/
│       ├── components/              # Reusable UI components
│       ├── pages/                   # Role-based dashboards
│       │   ├── VehicleOwner/
│       │   ├── GeneratorOwner/
│       │   ├── IndustryOwner/
│       │   └── CityAdmin/
│       ├── hooks/                   # Custom React hooks
│       ├── services/                # API clients
│       └── utils/                   # Helper functions
│
└── 📂 edge-device/ (Phase 1)        # Edge processor
    └── src/
        ├── sensors/                 # Sensor drivers
        ├── processing/              # Emission calculations
        ├── storage/                 # Local buffer
        └── sync/                    # Cloud sync logic
```

---

## 🔧 Configuration

### Environment Variables

Edit `.env` file to configure your environment:

```bash
# Database
DATABASE_URL=postgresql://ecotronics:dev_password@localhost:5432/ecotronics
TIMESCALE_URL=postgresql://ecotronics:dev_password@localhost:5433/ecotronics_timeseries

# Redis
REDIS_URL=redis://localhost:6379

# JWT Secret (CHANGE IN PRODUCTION!)
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# CORS (Frontend URL)
CORS_ORIGIN=http://localhost:5173

# Logging
LOG_LEVEL=debug
```

**⚠️ IMPORTANT**: Never commit `.env` to Git! It's in `.gitignore`.

---

## 🧪 Testing

### Run All Tests
```bash
npm test
```

### Run Tests for Specific Service
```bash
cd backend/auth-service
npm test
```

### Run E2E Tests
```bash
npm run test:e2e
```

### Check Test Coverage
```bash
npm run test:coverage
```

---

## 🐛 Troubleshooting

### ML Service Won't Start

**Problem**: `npm run dev:ml` fails or port 8000 is refused

**Solutions**:
1. Install Python 3.10+ and ML dependencies:
   ```bash
   pip install -r ml-service/requirements.txt
   ```
2. Check port 8000 is free:
   ```bash
   netstat -ano | findstr :8000
   ```
3. Start ML service manually:
   ```bash
   cd ml-service
   uvicorn src.main:app --reload --port 8000
   ```

### Frontend API Errors (ECONNREFUSED)

**Problem**: Dashboard shows errors for `/ml-api` requests

**Solutions**:
1. Ensure ML service is running on http://localhost:8000
2. Check health: http://localhost:8000/health
3. Restart with `npm run dev`

### npm install Fails

**Problem**: Dependencies won't install

**Solutions**:
1. Clear npm cache:
   ```bash
   npm cache clean --force
   ```
2. Delete `node_modules` and `package-lock.json`:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```
3. Check Node.js version:
   ```bash
   node --version  # Should be 18+
   ```

### Port Already in Use

**Problem**: `Error: listen EADDRINUSE: address already in use :::3001`

**Solutions**:
1. Find and kill the process:
   ```bash
   # Windows
   netstat -ano | findstr :3001
   taskkill /PID <PID> /F
   
   # Linux/Mac
   lsof -ti:3001 | xargs kill -9
   ```
2. Change the port in `.env`:
   ```bash
   PORT=3011  # Use a different port
   ```

---

## 📚 Learning Resources

### Understanding the Architecture

1. **Start here**: `PHASE_0_REQUIREMENTS.md` - Core principles
2. **Then read**: `docs/ARCHITECTURE.md` - System design
3. **Finally**: `IMPLEMENTATION_PLAN.md` - Development roadmap

### Technology Documentation

- **TypeScript**: https://www.typescriptlang.org/docs/
- **Express.js**: https://expressjs.com/
- **React**: https://react.dev/
- **FastAPI**: https://fastapi.tiangolo.com/
- **Python**: https://docs.python.org/3/

### EcoTronics Concepts

- **Local-First**: Edge devices calculate emissions locally
- **RBAC**: Role-based access control (4 roles)
- **Time-Series**: Optimized for emission data storage
- **Microservices**: Independent, scalable services

---

## 🎯 Next Steps

### For Developers

1. **Explore the codebase**:
   ```bash
   # View shared types
   code shared/types/index.ts
   
   # View database schema
   code infrastructure/init-db.sql
   
   # View architecture
   code docs/ARCHITECTURE.md
   ```

2. **Set up your IDE**:
   - Install recommended VS Code extensions
   - Configure ESLint and Prettier
   - Set up debugging

3. **Start building** (Phase 1):
   - Week 1: Auth Service
   - Week 2: Edge Device Simulator
   - Week 3: Frontend Dashboard

### For Project Managers

1. **Review documentation**:
   - `PHASE_0_REQUIREMENTS.md` - What we're building
   - `IMPLEMENTATION_PLAN.md` - Timeline and milestones
   - `TECH_STACK.md` - Technology decisions

2. **Understand the roadmap**:
   - Phase 1 (3 weeks): Vehicle Owner role
   - Phase 2 (3 weeks): All 4 roles
   - Phase 3 (3 weeks): ML and advanced features

3. **Track progress**:
   - Use GitHub Issues for tasks
   - Weekly demos of working features
   - Incremental, demoable deliverables

---

## 🤝 Contributing

### Code Style

We use ESLint and Prettier for consistent code formatting:

```bash
# Lint code
npm run lint

# Format code
npm run format

# Both run automatically on git commit (Husky)
```

### Commit Messages

We follow Conventional Commits:

```bash
feat: add user registration endpoint
fix: resolve JWT expiration bug
docs: update API documentation
test: add unit tests for device service
refactor: extract RBAC middleware
```

### Pull Request Process

1. Create a feature branch: `git checkout -b feat/my-feature`
2. Make your changes
3. Run tests: `npm test`
4. Commit: `git commit -m "feat: my feature"`
5. Push: `git push origin feat/my-feature`
6. Create Pull Request on GitHub

---

## 📞 Getting Help

### Documentation

- **README.md** - Project overview
- **PHASE_0_REQUIREMENTS.md** - Core principles
- **TECH_STACK.md** - Technology stack
- **IMPLEMENTATION_PLAN.md** - Development roadmap
- **docs/ARCHITECTURE.md** - System architecture

### Support Channels

- **GitHub Issues** - Bug reports and feature requests
- **GitHub Discussions** - Questions and discussions
- **Email** - support@ecotronics.example.com

### Useful Commands

```bash
# View all npm scripts
npm run

# Start frontend + ML service
npm run dev

# Start ML service only
npm run dev:ml

# ML service health check
curl http://localhost:8000/health
```

---

## ✅ Checklist for New Developers

- [ ] Prerequisites installed (Node.js, Python 3.10+, Git)
- [ ] Repository cloned
- [ ] `.env` file created and configured
- [ ] Dependencies installed (`npm run setup`)
- [ ] Shared library built
- [ ] ML service dependencies installed (`pip install -r ml-service/requirements.txt`)
- [ ] App running (`npm run dev`)
- [ ] Read `PHASE_0_REQUIREMENTS.md`
- [ ] Read `docs/ARCHITECTURE.md`
- [ ] Explored shared types (`shared/types/index.ts`)
- [ ] Reviewed database schema (`infrastructure/init-db.sql`)
- [ ] Set up IDE (VS Code + extensions)
- [ ] Ran tests (`npm test`)
- [ ] Understood the 4 user roles
- [ ] Ready to start Phase 1! 🚀

---

## 🎉 Welcome to the Team!

You're now ready to start building EcoTronics - a platform that will help reduce carbon emissions and create a more sustainable future!

**Questions?** Check the documentation or ask in GitHub Discussions.

**Ready to code?** See `IMPLEMENTATION_PLAN.md` for what to build next.

---

**Last Updated**: 2026-02-17  
**Version**: 0.1.0  
**Phase**: 0 Complete, Phase 1 Starting
