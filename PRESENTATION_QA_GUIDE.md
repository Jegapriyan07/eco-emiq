# 🌿 EcoTronics — Full Presentation Q&A Guide
> Everything you need to know, organized as questions & clear answers.
> Easy to memorize, easy to present!

---

## 📌 SECTION 1 — PROJECT OVERVIEW

**Q1. What is EcoTronics / ECO-emiq?**
> A **Carbon Emission & Air Quality Monitoring Platform** that tracks pollution from vehicles, generators, industries, and city-wide sensors. It gives each user role their own dashboard and uses Machine Learning to predict problems before they happen.

**Q2. Who are the target users?**
> There are **4 user roles**:
> 1. 🚗 **Vehicle Owner** — tracks personal vehicle emissions, gets eco-driving tips
> 2. ⚡ **Generator Owner** — monitors backup generator usage & efficiency
> 3. 🏭 **Industry Owner** — manages fleet/factory emissions, compliance reports
> 4. 🏙️ **City Admin** — sees city-wide data, heatmaps, policies, alerts

**Q3. What problem does it solve?**
> Pollution monitoring is fragmented — vehicle owners, factory managers, and city authorities all use separate tools. EcoTronics unifies all of them in **one platform** with real-time data, ML predictions, and automated alerts.

**Q4. What is "local-first architecture"?**
> The **edge device** (sensor/OBD reader) processes data locally first — no internet required for core functionality. It stores the last 24–48 hours of data on-device and syncs to the cloud when online.  
> **Memory trick:** Think of a phone working offline — same concept!

---

## 📌 SECTION 2 — SYSTEM ARCHITECTURE

**Q5. What are the main layers of the system?**
> Three layers:
> 1. **Edge Devices** — Sensors (OBD-II, air quality stations) that collect and process data locally
> 2. **Backend Services (Cloud)** — FastAPI microservices that handle auth, ML, notifications, heatmaps, SaaS
> 3. **Frontend (React)** — Role-based web dashboards built with TypeScript + Vite

**Q6. How do the layers communicate?**
> - Edge → Cloud: **HTTPS or MQTT** (a lightweight IoT messaging protocol)
> - Backend → Frontend: **REST API + WebSockets** for real-time updates

**Q7. What is MQTT and why is it used?**
> **MQTT** (Message Queuing Telemetry Transport) is a lightweight publish-subscribe messaging protocol designed for IoT devices. It uses very little bandwidth, perfect for sensors sending frequent small readings.

**Q8. Name all the backend microservices.**
> | Service | Port | Purpose |
> |---|---|---|
> | **backend** (Auth + Ingestion) | 8000 | JWT auth, device management, data ingestion |
> | **ml-service** | 8000 (internal) | ML predictions: maintenance, anomaly, AQI forecast |
> | **notification-service** | 8001 | Alerts, email, MQTT relay, audit logs |
> | **heatmap-service** | 8002 | City AQI heatmap generation |
> | **saas-service** | 8003 | Subscription plans, tenant management |

---

## 📌 SECTION 3 — BACKEND & AUTHENTICATION

**Q9. What framework is used for the backend?**
> **FastAPI** (Python) — chosen for its async support, automatic API documentation (`/docs`), and Pydantic data validation.

**Q10. How does authentication work?**
> - **JWT (JSON Web Tokens)** — users log in and receive a token
> - The token is sent with every request in the Authorization header
> - **RBAC (Role-Based Access Control)** — each endpoint checks the user's role
> - Example: `city_admin` can view audit logs; `vehicle_owner` cannot

**Q11. What database is used?**
> - **PostgreSQL** — for users, devices, and metadata (structured data)
> - **TimescaleDB** — for time-series emission readings (optimized for timestamp queries)
> - **Redis** — for caching and session management
> - **SQLite** — used during local development/setup for simplicity

**Q12. What security measures are in place?**
> - JWT tokens with refresh mechanism
> - Role-based access control (RBAC)
> - TLS 1.3 encryption in transit
> - AES-256 encryption at rest
> - Rate limiting on APIs
> - Input validation via Pydantic
> - Audit logging of all sensitive actions

---

## 📌 SECTION 4 — ML SERVICE (Machine Learning)

**Q13. What ML models does the system use?**
> **4 ML Models**, all trained with scikit-learn:
> 1. 🔧 **Maintenance Predictor** — `RandomForestRegressor` — predicts *how many days* until a device needs service
> 2. 🚨 **Anomaly Detector** — `IsolationForest` — detects unusual emission spikes (outlier detection)
> 3. 📈 **AQI Forecaster** — `GradientBoostingRegressor` — predicts Air Quality Index for the next 1–72 hours
> 4. 📡 **Sensor Confidence Model** — custom model — assesses if a sensor is healthy, needs calibration, or has hardware failure

**Q14. How does the Anomaly Detector work?**
> It uses **IsolationForest** — an unsupervised ML algorithm that isolates outliers.  
> It scores each reading from 0.0 (normal) to 1.0 (critical anomaly).  
> - Score > 0.8 → **Critical**
> - Score > 0.6 → **High**
> - Score > 0.4 → **Medium**
> - Below 0.4 → **Low**

**Q15. How does the AQI Forecaster work?**
> - Uses `GradientBoostingRegressor` with **time features**: hour of day, day of week, sine/cosine encoding (to capture cyclical patterns like morning rush hour)
> - Forecasts at checkpoints: 1h, 6h, 12h, 18h, 24h, 48h, 72h
> - Confidence decreases as horizon increases (natural uncertainty)
> - Maximum forecast horizon: **72 hours**

**Q16. What is "sine/cosine encoding" for time features?**
> Hours are cyclic (23:00 and 00:00 are close), so we convert them to:  
> `hour_sin = sin(2π × hour / 24)` and `hour_cos = cos(2π × hour / 24)`  
> This tells the model that midnight and 11 PM are "close" — plain numbers don't do this.

**Q17. How does the Sensor Confidence Model work?**
> It analyzes sensor readings and outputs:
> - `confidence_score` (0–1)
> - `health_status`: excellent / good / fair / poor
> - `needs_calibration` (bool)
> - `has_hardware_failure` (bool)
> - `anomaly_spikes` list
> - actionable `recommendations`

**Q18. How are models loaded on startup?**
> At service startup, each `.pkl` file (trained model) is loaded using `joblib.load()`. If a model file is missing, a warning is logged and the endpoint returns HTTP 503 until `train_all_models.py` is run.

---

## 📌 SECTION 5 — NOTIFICATION SERVICE

**Q19. What does the Notification Service do?**
> It handles **5 things**:
> 1. **Rules Engine** — evaluates every sensor reading against threshold rules
> 2. **Alert Management** — create, list, acknowledge, assign alerts
> 3. **Device Commands** — sends commands (shutdown, restart, warning_light_on/off) via MQTT
> 4. **Email Notifications** — sends email alerts to device owners
> 5. **Audit Logging** — logs every sensitive action for compliance (city_admin only can view)

**Q20. What device commands can be sent?**
> `shutdown` | `warning_light_on` | `warning_light_off` | `restart` | `reset_alert`  
> Commands are sent via **MQTT** to the physical device. All commands are **audit logged**.

**Q21. What is the Rules Engine?**
> On every new sensor reading, the Rules Engine checks if emission values exceed thresholds.  
> If breached → creates an Alert + sends notification (email/MQTT).  
> Example rule: *"If emission_score > 80, trigger HIGH severity alert"*

**Q22. What is WhatsApp alerting?**
> The ML service has a **Twilio WhatsApp Business API** integration.  
> When a critical alert triggers, it sends a WhatsApp message to the device owner's phone via Twilio.  
> Falls back to "demo/mock mode" if Twilio credentials are not configured via `.env`.

---

## 📌 SECTION 6 — HEATMAP SERVICE

**Q23. What does the Heatmap Service do?**
> It generates a **city-wide AQI heatmap** showing pollution levels across different city wards.  
> Uses color-coded intensity maps so the City Admin can visually identify polluted zones.

**Q24. What data powers the heatmap?**
> Uses an **AQI calculator** (`aqi_calculator.py`) that processes ward-level pollution data from an `aggregator.py` module and renders it as a visual heat overlay on a city map.

**Q25. What wards are tracked in the simulation?**
> 5 wards (Nagpur city):
> | Ward | Base AQI | Devices |
> |---|---|---|
> | Dharampeth | 87 | 45 |
> | Sadar | 121 | 52 |
> | Nehru Nagar | 64 | 38 |
> | Dhantoli | 94 | 41 |
> | Hanuman Nagar | 73 | 48 |

---

## 📌 SECTION 7 — SAAS SERVICE

**Q26. What is the SaaS Service?**
> It manages **multi-tenancy** (multiple organizations using the platform) and **subscription plans**.  
> Each organization is a "tenant" with their own quota limits.

**Q27. What are the subscription plans?**
> | Plan | Price | Devices | Users | Key Features |
> |---|---|---|---|---|
> | **Free** | ₹0 | 2 | 1 | 7-day history, basic dashboard |
> | **Starter** | ₹1,999/mo | 10 | 5 | 30-day history, email alerts, heatmap, CSV export |
> | **Professional** | ₹7,999/mo | 100 | 25 | 180-day history, SMS alerts, ML predictions, priority support |
> | **Enterprise** | Custom | Unlimited | Unlimited | 10-year retention, custom ML, white-label, SLA |

**Q28. What is a "tenant" in SaaS context?**
> A **tenant** is one organization (company, city authority, fleet owner) using the platform.  
> Each tenant has their own isolated data and resource quotas based on their subscription plan.

**Q29. What is quota management?**
> The `quota_manager.py` module tracks usage per tenant per day:
> - API calls per day
> - ML prediction requests per day
> - Number of active devices
> - Alert count per month  
> When a tenant exceeds their quota, further requests are blocked.

---

## 📌 SECTION 8 — FRONTEND

**Q30. What tech stack is the frontend built with?**
> - **React + TypeScript** (with Vite as the bundler)
> - **React Router** for navigation
> - **Zustand** for state management (auth store)
> - **i18n** for multilingual support (English, Tamil, Hindi)
> - **TailwindCSS** for styling

**Q31. What are the frontend routes/pages?**
> **Vehicle Owner:** Dashboard, Timeline, Maintenance, EcoTips, Devices, Governance  
> **Generator Owner:** Dashboard, Performance, Maintenance, Logs, Governance  
> **Industry Owner:** Dashboard, Compliance, Anomalies, Organization, Governance  
> **City Admin:** Dashboard, Ward Analytics, Alerts, Policy, Predictions, Governance

**Q32. How does the frontend handle role-based access?**
> Two custom Route components:
> - `ProtectedRoute` — ensures the user is logged in
> - `RoleRoute` — ensures the user has the correct role for the page  
> If a vehicle_owner tries to access `/city-admin`, they are redirected.

**Q33. What languages does the app support?**
> **3 languages**: English, Tamil (தமிழ்), Hindi (हिन्दी)  
> Implemented using the `i18n` module with a `useLanguage` hook.  
> A `LanguageSwitcher` component is available on the login page and throughout the app.

**Q34. What is the Accessibility Widget?**
> A global `AccessibilityWidget` component rendered on every page that provides accessibility features (font size adjustment, high contrast, etc.) for users with disabilities.

---

## 📌 SECTION 9 — CI/CD PIPELINE

**Q35. What is the CI/CD pipeline?**
> A **GitHub Actions** pipeline (`.github/workflows/ci-cd.yml`) with **8 jobs**:
> 1. **Unit Tests** — runs `pytest tests/unit/` with coverage report
> 2. **Integration Tests** — runs `pytest tests/integration/` (needs unit tests to pass first)
> 3. **Security Scan** — runs Bandit (SAST), Safety, pip-audit
> 4. **Lint & Code Quality** — runs flake8, black, isort, mypy
> 5. **Build Docker Images** — builds 5 Docker images (backend, ml, notification, heatmap, saas)
> 6. **Deploy to Dev** — auto-deploys when code is pushed to `develop` branch
> 7. **Deploy to Staging** — auto-deploys when code is pushed to `main` branch
> 8. **Load Test** — runs performance tests against staging

**Q36. What is Bandit and why is it used?**
> **Bandit** is a Python Static Application Security Testing (SAST) tool.  
> It scans source code for common security vulnerabilities (SQL injection patterns, hardcoded passwords, unsafe function calls, etc.) without running the code.

**Q37. What testing frameworks are used?**
> | Type | Tool |
> |---|---|
> | Unit Tests | `pytest` + `pytest-cov` |
> | Integration Tests | `pytest` + `pytest-asyncio` |
> | Security Tests | Bandit + Safety + pip-audit |
> | Load Tests | Custom Python script (via `k6` structure) |
> | E2E Tests | Playwright (planned) |

**Q38. What branches trigger what deployments?**
> - `develop` branch → **Dev environment** (https://dev.ecotronics.io)
> - `main` branch → **Staging environment** (https://staging.ecotronics.io)
> - Docker images are tagged with branch name, commit SHA, and `latest` (for main)

---

## 📌 SECTION 10 — EDGE DEVICE

**Q39. What is the edge device module?**
> The `edge-device/` folder contains firmware/software that runs on the **physical IoT device** (like a Raspberry Pi connected to vehicle OBD-II or air quality sensors).

**Q40. What does the edge device do locally?**
> - Reads sensor data (OBD-II for vehicles, air quality sensors)
> - Runs **local emission calculations**
> - Detects spikes without needing cloud
> - Stores last **24–48 hours** in local buffer
> - Syncs to cloud via HTTPS/MQTT when online
> - Works **offline** — queues data and syncs when connection restores

**Q41. What is OBD-II?**
> **OBD-II** (On-Board Diagnostics II) is a standardized port in every car (since 1996) that provides real-time engine data — RPM, speed, fuel consumption, and emission-related codes. EcoTronics reads this to compute actual vehicle emission scores.

---

## 📌 SECTION 11 — SIMULATION ENGINE

**Q42. Why does the system have a simulation engine?**
> Because physical sensors aren't always available during development and demos. The simulation engine generates **physics-based, realistic sensor readings** so the dashboard always has meaningful data to display.

**Q43. What does the simulation engine simulate?**
> - **City snapshot** — all 5 wards' current AQI with correlated pollutants
> - **Ward hourly trend** — AQI changes over past N hours (up to 72)
> - **Vehicle state** — emission readings correlated with traffic and engine temperature
> - **Vehicle weekly trend** — weekday vs. weekend emission patterns
> - **Active alerts** — threshold-based alerts across all wards

**Q44. What parameters were tuned in the simulation?**
> - `noise_sigma` — controls random noise in readings (reduced to avoid "Degraded" status)
> - `drift_rate` — how fast sensor readings drift over time (lowered for realism)
> - `spike_probability` — how often pollution spikes occur (lowered to make events rarer)
> - ML drift classifier thresholds were made less sensitive to normal variations

---

## 📌 SECTION 12 — INFRASTRUCTURE & DEVOPS

**Q45. What containerization is used?**
> **Docker** — each service has its own `Dockerfile`.  
> **Docker Compose** — orchestrates all services locally with one `docker-compose.yml`.  
> **Docker Compose Prod** — separate production configuration (`docker-compose.prod.yml`).

**Q46. What is in the infrastructure/ folder?**
> - **Kubernetes** configs — for scaling services in production
> - **Terraform** — Infrastructure as Code (IaC) for provisioning cloud resources
> - **Monitoring** — Prometheus + Grafana dashboards for metrics

**Q47. What monitoring tools are planned?**
> - **Prometheus** — collects metrics (request counts, latency, error rates)
> - **Grafana** — visualizes Prometheus metrics in dashboards
> - **OpenTelemetry** — distributed tracing across microservices
> - **PagerDuty/Slack** — alerting when services go down

---

## 📌 SECTION 13 — KEY CONCEPTS FOR VIVA

**Q48. What is AQI?**
> **Air Quality Index** — a number from 0–500 that represents how safe the air is.
> - 0–50: Good (Green)
> - 51–100: Moderate (Yellow)
> - 101–150: Unhealthy for sensitive groups (Orange)
> - 151–200: Unhealthy (Red)
> - 201–300: Very Unhealthy (Purple)
> - 301+: Hazardous (Maroon)

**Q49. What is IsolationForest and why is it used for anomaly detection?**
> IsolationForest is an unsupervised ML algorithm that **isolates anomalies** instead of profiling normal data. Anomalies are "isolated" with fewer splits in a random decision tree. It works well when you don't have labeled "anomaly" examples — perfect for our use case where we don't know in advance what an anomaly looks like.

**Q50. What is the difference between REST API and WebSocket?**
> - **REST API** — request/response — client asks, server answers. Good for CRUD operations.
> - **WebSocket** — full-duplex, persistent connection — server can push updates to client anytime. Used for real-time dashboard updates (live emission readings).

**Q51. What is RBAC?**
> **Role-Based Access Control** — users are assigned roles, and each role has specific permissions. Instead of checking per-user, you check per-role.  
> Example: `city_admin` can view all wards, `vehicle_owner` can only see their own device.

**Q52. What is the Governance page?**
> Each role has a **Governance** page that shows:
> - Whether the device/system is **Compliant** or **Non-Compliant** with emission limits
> - Violation history
> - Regulatory thresholds
> - Actions taken (like remote shutdown command)

**Q53. What is the Pricing/SaaS page?**
> The `/pricing` page shows all 4 subscription plans (Free, Starter, Professional, Enterprise) with feature comparison. Accessible before login. Powered by the SaaS service's `subscription_plans.py`.

**Q54. What is the project's roadmap?**
> - **Phase 1** ✅ Core edge processing + Vehicle Owner role
> - **Phase 2** ✅ Multi-role support + RBAC
> - **Phase 3** ✅ Advanced analytics + ML models
> - **Phase 4** 🔜 Mobile apps + deeper IoT integration
> - **Phase 5** 🔜 Blockchain for carbon credit trading

---

## 🧠 QUICK MEMORY TRICKS

| Concept | Memory Trick |
|---|---|
| 4 User Roles | **V**ehicle + **G**enerator + **I**ndustry + **C**ity = **VGIC** = "Very Green In City" |
| 4 ML Models | **M**aintenance + **A**nomaly + **F**orecast + **S**ensor = **MAFS** = "ML Always Finds Stuff" |
| 5 Microservices | **B**ackend + **M**L + **N**otification + **H**eatmap + **S**aaS = **BMNHS** = "Big Machines Never Hide Secrets" |
| 4 SaaS Plans | **F**ree + **S**tarter + **P**ro + **E**nterprise = **FSPE** = "For Small Paths Everywhere" |
| 8 CI/CD Jobs | Unit → Integration → Security → Lint → Build → Dev → Staging → Load |
| AQI Scale | Good → Moderate → Sensitive → Unhealthy → Very Unhealthy → Hazardous |
| 3 Languages | English + Tamil + Hindi |
| 5 City Wards | Dharampeth, Sadar, Nehru Nagar, Dhantoli, Hanuman Nagar (all Nagpur) |

---

## 🎯 LIKELY INTERVIEW/VIVA QUESTIONS

1. **"Why microservices instead of monolith?"**  
   → Each service scales independently. If ML predictions spike in load, only the ml-service needs more resources — not the entire app. Also easier to maintain separate teams.

2. **"What happens if the cloud goes down?"**  
   → The edge device continues working offline. It stores data locally for 24–48 hours and syncs automatically when connectivity restores (offline queue).

3. **"How do you handle security?"**  
   → JWT + RBAC at API layer, TLS 1.3 in transit, AES-256 at rest, Bandit SAST in CI/CD, input validation via Pydantic, rate limiting, and full audit logging.

4. **"Why Random Forest for maintenance prediction?"**  
   → Random Forest handles non-linear relationships well, is robust to outliers, and provides feature importance — telling us WHICH sensor parameters matter most for maintenance.

5. **"How is AQI forecasting made more accurate over time?"**  
   → The model uses cyclical time encoding (sin/cos), confidence intervals widen with horizon, and models can be retrained via `train_all_models.py` as more real data accumulates.

6. **"Why Twilio for WhatsApp alerts?"**  
   → Twilio provides an official WhatsApp Business API. It's reliable, has delivery receipts, and works at scale without needing to host your own WhatsApp gateway.

7. **"What is TimescaleDB and why use it over PostgreSQL for time-series?"**  
   → TimescaleDB is a PostgreSQL extension optimized for time-series. It uses "hypertables" that automatically partition data by time, making queries like "last 30 days of readings" 10–100x faster than plain PostgreSQL.

---

*Last updated: February 22, 2026 | ECO-emiq-1 Project*
