# Phase 3 - Monitoring Dashboards (UI for All Roles)

## 🎯 Goal
Build role-specific dashboards with stunning UIs and real-time data visualization for all four user types.

## 📋 Deliverables

### 1. Vehicle Owner Dashboard
**Home Screen**
- ✅ Real-time emission score gauge (0-100)
- ✅ Current readings display (CO, CO₂, PM2.5, NOx)
- ✅ Last reading timestamp with status indicator
- ✅ Weekly emission trend chart
- ✅ Comparison with similar vehicles

**Timeline View**
- ✅ Daily/weekly contribution graphs
- ✅ Normalized CO/emission curves
- ✅ Historical data comparison
- ✅ Peak emission times analysis

**Maintenance Center**
- ✅ Predicted service date (ML-based)
- ✅ Service history timeline
- ✅ Maintenance recommendations
- ✅ Parts replacement alerts

**Eco-Driving Tips**
- ✅ High-RPM alerts and suggestions
- ✅ Prolonged idle detection
- ✅ Fuel efficiency recommendations
- ✅ Driving behavior score

**Notifications**
- ✅ Real-time alerts center
- ✅ Critical emission warnings
- ✅ Maintenance reminders
- ✅ Compliance notifications

**Device Management**
- ✅ Device pairing interface
- ✅ Live device status
- ✅ Connection health monitoring
- ✅ Device settings

---

### 2. Generator Owner Dashboard
**Live Monitoring**
- ✅ Real-time emission gauge
- ✅ Runtime vs emission correlation graph
- ✅ Fuel efficiency metrics
- ✅ Operating hours tracker

**Performance Analytics**
- ✅ Fuel-efficiency hints
- ✅ Load vs emission analysis
- ✅ Optimal operating range
- ✅ Cost savings calculator

**Maintenance Hub**
- ✅ Predictive maintenance alerts
- ✅ Spare parts recommendations
- ✅ Service scheduling
- ✅ Maintenance cost tracking

**Control Panel**
- ✅ Silencer/afterburner relay control
- ✅ Auto-shutdown toggle (critical emissions)
- ✅ Remote start/stop (demo)
- ✅ Operating mode selection

**Data Export**
- ✅ Emission logs table
- ✅ CSV export functionality
- ✅ PDF report generation
- ✅ Custom date range selection

---

### 3. Industry Owner Dashboard
**Emission Chamber Overview**
- ✅ Multi-device monitoring
- ✅ Real-time emission heatmap
- ✅ Production line status
- ✅ Facility-wide statistics

**Compliance Center**
- ✅ Compliance widget (green/red status)
- ✅ Daily compliance reports
- ✅ PDF export functionality
- ✅ Regulatory threshold tracking

**Maintenance Scheduling**
- ✅ Organization-wide maintenance calendar
- ✅ Filter replacement schedule
- ✅ Equipment downtime planning
- ✅ Maintenance team assignment

**Anomaly Detection**
- ✅ Last 30 days anomaly list
- ✅ Anomaly severity classification
- ✅ Root cause analysis
- ✅ Corrective action tracker

**Organization Management**
- ✅ User management (employees)
- ✅ Device assignment
- ✅ Role & permissions
- ✅ Activity logs

---

### 4. City Admin Dashboard
**City Overview Heatmap**
- ✅ Interactive city map with ward overlays
- ✅ Real-time AQI color coding
- ✅ Device location markers
- ✅ Hotspot identification

**Ward Analytics**
- ✅ Ward selector dropdown
- ✅ Time-series AQI graphs
- ✅ Pollutant breakdown charts
- ✅ Historical trends

**Device Registry**
- ✅ City-wide device list
- ✅ Device status monitoring
- ✅ Owner information
- ✅ Compliance status

**Alert Management**
- ✅ City-wide alerts dashboard
- ✅ Alert acknowledgment system
- ✅ Assignment to field officers
- ✅ Alert resolution tracking

**Policy Tools**
- ✅ Fine/penalty estimator
- ✅ Compliance statistics
- ✅ Revenue projections
- ✅ Policy impact simulator

**Prediction Panel**
- ✅ 24-hour AQI forecast
- ✅ 72-hour trend prediction
- ✅ ML model confidence display
- ✅ Weather correlation

---

## 🛠️ Technology Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Frontend Framework** | React 18 | Component-based, large ecosystem |
| **Build Tool** | Vite 5 | Fast HMR, modern build |
| **Language** | TypeScript | Type safety, better DX |
| **Styling** | Tailwind CSS 3 | Utility-first, fast development |
| **UI Components** | shadcn/ui | Beautiful, accessible components |
| **Charts** | Recharts | React-native, declarative |
| **Maps** | Leaflet + React-Leaflet | Open-source, flexible |
| **State Management** | Zustand | Lightweight, simple API |
| **API Client** | Axios | Promise-based, interceptors |
| **Real-time** | Socket.io-client | WebSocket for live updates |
| **Forms** | React Hook Form | Performant, easy validation |
| **Routing** | React Router v6 | Standard routing library |
| **Date Handling** | date-fns | Modern, tree-shakeable |
| **Icons** | Lucide React | Beautiful, consistent icons |
| **Animations** | Framer Motion | Smooth, declarative animations |

---

## 📁 Project Structure

```
frontend/
├── public/
│   ├── favicon.ico
│   └── assets/
├── src/
│   ├── main.tsx                    # App entry point
│   ├── App.tsx                     # Root component
│   ├── routes/
│   │   ├── index.tsx               # Route configuration
│   │   ├── ProtectedRoute.tsx     # Auth guard
│   │   └── RoleRoute.tsx           # Role-based routing
│   ├── layouts/
│   │   ├── DashboardLayout.tsx    # Main dashboard layout
│   │   ├── AuthLayout.tsx         # Login/register layout
│   │   └── PublicLayout.tsx       # Landing pages
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   └── RegisterPage.tsx
│   │   ├── vehicle-owner/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Timeline.tsx
│   │   │   ├── Maintenance.tsx
│   │   │   ├── Tips.tsx
│   │   │   └── Devices.tsx
│   │   ├── generator-owner/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Performance.tsx
│   │   │   ├── Maintenance.tsx
│   │   │   ├── Control.tsx
│   │   │   └── Logs.tsx
│   │   ├── industry-owner/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Compliance.tsx
│   │   │   ├── Maintenance.tsx
│   │   │   ├── Anomalies.tsx
│   │   │   └── Organization.tsx
│   │   └── city-admin/
│   │       ├── Dashboard.tsx
│   │       ├── WardAnalytics.tsx
│   │       ├── Devices.tsx
│   │       ├── Alerts.tsx
│   │       ├── Policy.tsx
│   │       └── Predictions.tsx
│   ├── components/
│   │   ├── ui/                     # shadcn/ui components
│   │   ├── charts/
│   │   │   ├── EmissionGauge.tsx
│   │   │   ├── TrendChart.tsx
│   │   │   ├── BarChart.tsx
│   │   │   └── LineChart.tsx
│   │   ├── maps/
│   │   │   ├── CityMap.tsx
│   │   │   ├── DeviceMarker.tsx
│   │   │   └── WardOverlay.tsx
│   │   ├── widgets/
│   │   │   ├── StatCard.tsx
│   │   │   ├── AlertCard.tsx
│   │   │   ├── DeviceCard.tsx
│   │   │   └── ComplianceWidget.tsx
│   │   └── shared/
│   │       ├── Navbar.tsx
│   │       ├── Sidebar.tsx
│   │       ├── Footer.tsx
│   │       └── Loader.tsx
│   ├── store/
│   │   ├── authStore.ts           # Auth state
│   │   ├── deviceStore.ts         # Device state
│   │   ├── emissionStore.ts       # Real-time data
│   │   └── notificationStore.ts   # Notifications
│   ├── services/
│   │   ├── api.ts                 # Axios instance
│   │   ├── authService.ts         # Auth API calls
│   │   ├── deviceService.ts       # Device API calls
│   │   ├── emissionService.ts     # Emission data API
│   │   └── websocket.ts           # Socket.io connection
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useDevice.ts
│   │   ├── useRealtime.ts
│   │   └── usePermissions.ts
│   ├── utils/
│   │   ├── formatters.ts          # Data formatting
│   │   ├── validators.ts          # Form validation
│   │   ├── constants.ts           # App constants
│   │   └── helpers.ts             # Utility functions
│   └── types/
│       ├── auth.types.ts
│       ├── device.types.ts
│       ├── emission.types.ts
│       └── user.types.ts
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── .env.example
```

---

## 🎨 Design System

### Color Palette
```css
/* Primary Colors */
--primary-50: #e6f7ff;
--primary-100: #bae7ff;
--primary-500: #1890ff;
--primary-600: #096dd9;
--primary-700: #0050b3;

/* Success (Green) */
--success-500: #52c41a;
--success-600: #389e0d;

/* Warning (Yellow/Orange) */
--warning-500: #faad14;
--warning-600: #d48806;

/* Danger (Red) */
--danger-500: #ff4d4f;
--danger-600: #cf1322;

/* Neutral (Gray) */
--gray-50: #fafafa;
--gray-100: #f5f5f5;
--gray-200: #e8e8e8;
--gray-500: #8c8c8c;
--gray-700: #434343;
--gray-900: #141414;
```

### Typography
```css
/* Headings */
h1: 2.5rem (40px) - font-bold
h2: 2rem (32px) - font-semibold
h3: 1.5rem (24px) - font-semibold
h4: 1.25rem (20px) - font-medium

/* Body */
body: 1rem (16px) - font-normal
small: 0.875rem (14px) - font-normal
```

### Spacing
```css
/* Scale: 0.25rem (4px) increments */
0: 0px
1: 0.25rem (4px)
2: 0.5rem (8px)
3: 0.75rem (12px)
4: 1rem (16px)
6: 1.5rem (24px)
8: 2rem (32px)
12: 3rem (48px)
```

---

## 🚀 Implementation Timeline

### Week 1: Foundation & Auth (Days 1-7)
- [x] Phase 0: Architecture ✅
- [x] Phase 1: Edge Device ✅
- [x] Phase 2 Day 1: Auth System ✅
- [ ] Day 1-2: Frontend setup (Vite + React + Tailwind)
- [ ] Day 3-4: Auth pages (Login, Register)
- [ ] Day 5-6: Protected routing & role-based access
- [ ] Day 7: Design system & UI components

### Week 2: Vehicle & Generator Dashboards (Days 8-14)
- [ ] Day 8-10: Vehicle Owner dashboard
- [ ] Day 11-13: Generator Owner dashboard
- [ ] Day 14: Real-time updates integration

### Week 3: Industry & City Admin (Days 15-21)
- [ ] Day 15-17: Industry Owner dashboard
- [ ] Day 18-20: City Admin dashboard (with maps)
- [ ] Day 21: Polish, testing, documentation

---

## ✅ Success Metrics

### Performance
- First Contentful Paint: <1.5s
- Time to Interactive: <3s
- Lighthouse Score: >90
- Bundle Size: <500KB (gzipped)

### Responsiveness
- Desktop: 1920px+
- Tablet: 768px - 1024px
- Mobile: 375px - 767px
- All layouts tested on 3 breakpoints

### Accessibility
- WCAG 2.1 Level AA compliance
- Keyboard navigation support
- Screen reader compatibility
- Color contrast ratios >4.5:1

### User Experience
- Real-time updates: <1s latency
- Smooth animations: 60fps
- Intuitive navigation
- Loading states for all async operations

---

## 🎬 Demo Scenarios

### 1. Vehicle Owner Demo
1. Login as vehicle owner
2. View real-time emission gauge
3. Check maintenance predictions
4. Review eco-driving tips
5. Export emission report

### 2. Generator Owner Demo
1. Login as generator owner
2. Monitor live runtime/emission graph
3. Toggle auto-shutdown relay
4. Schedule maintenance
5. Export data to CSV

### 3. Industry Owner Demo
1. Login as industry owner
2. View facility-wide emissions
3. Check compliance status
4. Review anomalies
5. Generate compliance report (PDF)

### 4. City Admin Demo
1. Login as city admin
2. View interactive city heatmap
3. Select ward for detailed analysis
4. Manage city-wide alerts
5. View 72-hour AQI forecast

---

**Phase 3 Start Date**: 2026-02-17  
**Expected Completion**: 2026-03-10 (3 weeks)  
**Status**: 🚀 STARTING NOW
