# EMIQ Practical Business Model

**Positioning:** Compliance + Carbon Reduction as a Service — not sensors.

Hardware (calibrated edge kits over WiFi) is the distribution wedge. Recurring **device SaaS + city licenses + calibration/service contracts** fund scale. Primary paying customer: **MSME / industry**. B2C freemium builds density. B2G buys city-wide decision intelligence.

Continuous calibrated monitoring that turns into enforceable compliance and measurable carbon cuts — not a one-time PUC reading.

---

## Value chain

```
Calibrated sensors (MQ-7, MQ-135, PMS5003, DHT22)
  → ESP32 WiFi / MQTT (10s publish, offline buffer)
  → Sensor Drift Intelligence (confidence, spike rejection, calibration age)
  → Decision Intelligence (violation RF, compliance explainer, carbon advisor, maintenance / drift forecast)
  → Outcomes (CPCB audit exports, kg CO₂e reduction, ward policy heatmaps)
```

| Layer | Product name | What exists |
|-------|--------------|-------------|
| Sense | EMIQ Edge Kit | ESP32 + MQ/PMS/DHT, ~$35–40 BOM (`edge-device/`) |
| Connect | Always-on telemetry | 2.4 GHz WiFi → MQTT; HTTP fallback; 100-reading buffer |
| Trust | Sensor Drift Intelligence | Confidence scoring, calibration age, spike rejection |
| Decide | Decision Intelligence | Violation classifier, explainer + carbon advisor agents, maintenance RF, drift forecast |
| Act | Compliance + Reduction Outcomes | Role dashboards, disputes, city impact calculator, CPCB PDF/CSV |

---

## SDG alignment

Report impact as: **devices active × compliance rate × estimated tCO₂e avoided / year** (~2.1 t/device/year in the city impact calculator).

| Goal | How EMIQ delivers |
|------|-------------------|
| **SDG 13** Climate Action | Carbon Advisor + city CO₂e impact (`/carbon-impact`) |
| **SDG 11** Sustainable Cities | Ward heatmaps, policy thresholds, AQI forecast |
| **SDG 9** Industry & Innovation | MSME multi-chamber CPCB compliance |
| **SDG 3** Good Health | Early PM/NOx violation + maintenance reduces exposure |

---

## Revenue model

Razor-and-blades: hardware near-cost; SaaS is the margin.

### 1. Hardware (low / zero margin — acquisition)

Price near landed cost + thin margin so MSMEs say yes. **No perpetual free hardware** without 12-month SaaS prepay.

| SKU | Indicative sell | Purpose |
|-----|-----------------|--------|
| Vehicle / generator kit | ₹4,999–7,999 one-time | Land devices; WiFi install in <1 hour |
| Industrial chamber kit | ₹12,000–25,000 (multi-sensor / enclosure) | Higher ASP; still not primary margin |
| City ward node | Bundled into B2G contract | Density for municipal product |

### 2. SaaS (primary margin)

| Segment | Price | What they buy | Why they pay |
|---------|-------|---------------|--------------|
| **B2B MSME / Industry** (primary) | **₹2,499 / device / month** | CPCB tracking, anomalies, violations, PDF/CSV, multi-chamber, priority support | Fines, audit readiness, downtime avoidance |
| **B2C Vehicle / Generator** | Free → **₹99–199 / month** | Free: live score. Pro: Carbon Advisor, drift forecast, WhatsApp | Coaching + maintenance timing |
| **B2G Municipal / SPCB** | Custom / zone (anchor **₹15–40L / year** per city zone) | Heatmaps, prioritization drafts, policy, impact calculator, SLA | Enforcement efficiency + climate reporting |

**Device packs (B2B, headline price unchanged):** 1–5 devices ₹2,499; 6–20 ₹1,999; 21+ custom.

### 3. Services (trust + cash as you scale)

| Service | Price | Role |
|---------|-------|------|
| Calibration & sensor health SLA | ₹499–999 / device / quarter | Monetize the confidence / calibration loop |
| Onboarding / install | One-time | Industrial and city fleets |
| Audit pack | Annual upsell on B2B | Compliance report bundle for MSMEs |

### 4. Later revenue (Phase 4 — not active)

- Carbon credit facilitation fee
- Anonymized zone data licensing (research / insurers)

---

## Unit economics (Tamil Nadu pilot targets)

Assumptions: BOM ~$35–40; B2B ARPU ₹2,499 / device / month.

- **Gross margin on B2B SaaS:** >75% after cloud / ML / Twilio (exclude hardware)
- **Payback:** hardware subsidy recovered in **≤3 months** of SaaS if kits are discounted
- **Example cluster:** 50 industrial devices × ₹2,499 = **₹1.25L MRR**; + 200 B2C Pro @ ₹149 ≈ ₹30k MRR; + 1 ward B2G pilot retainer
- **Churn lever:** Drift Intelligence + maintenance history (recalibration, dispute trail, chamber baselines)

---

## Ideal customer profile

1. **Primary:** Tamil Nadu MSME clusters (metal, textile, food processing) needing CPCB/SPCB-ready continuous evidence
2. **Density:** Generator-heavy sites and fleet operators (Generator / Vehicle Pro)
3. **Proof buyer:** One Chennai ward / municipal environment cell (City Admin + Carbon Impact Calculator)
4. **Not first:** National carbon markets, pure B2C consumer apps

---

## Go-to-market

**Sales motion:** on-site hardware demo → 30-day SaaS trial → annual prepaid (10–15% discount) → calibration subscription attached.

| Phase | Focus | Success metric |
|-------|--------|----------------|
| **0–6 mo Pilot** | 1–2 MSME clusters + 1 municipal ward (TSM incubation) | ≥40 devices online; ≥1 audit-ready export used in a real inspection; measured tCO₂e narrative |
| **6–18 mo B2B** | Industrial estates across TN; consultants / OEMs as channel | 500+ paid devices; calibration renewals >60% |
| **18–36 mo B2G** | Chennai wards → other TN cities → SPCB tooling | 2+ city contracts; human-in-the-loop enforcement adopted |
| **36 mo+ National** | Multi-state + optional carbon credit rail | Data licensing / credit fee only after trust and density |

---

## Competitive moat

Do not compete on “cheapest CEMS.” Compete on **compliance outcome per rupee** and **proven kg CO₂e avoided**.

1. Affordable continuous edge vs infrequent PUC
2. Sensor Drift Intelligence vs dumb IoT dashboards (trust is the product)
3. Decision agents (explain + reduce) vs raw charts
4. One platform: vehicle + generator + industry + city (network effects for B2G)

---

## Operating rules

- Edge: WiFi MQTT reliability + offline buffer (as designed)
- Trust: sell calibration SLA as a product line; sensor confidence must reflect real health before SLA is sold
- Decision: human-in-the-loop for enforcement (B2G liability)
- Impact: publish SDG 13 metrics on every city / MSME account
