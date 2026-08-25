# Violation Classification Model

## Overview

EMIQ uses a **Random Forest classifier** to assign each device reading a compliance verdict:

| Output | Meaning |
|--------|---------|
| **Compliant** | All pollutants within safe limits |
| **Warning** | One or more parameters approaching regulatory thresholds |
| **Violation** | One or more parameters exceed CPCB/IEEE reference limits |

## Model Specification

| Property | Value |
|----------|-------|
| Algorithm | `RandomForestClassifier` (100 trees, max_depth=12) |
| Version | v1.0.0 |
| Artifact | `../violation_rf.pkl` |

### Inputs

| Feature | Unit | Description |
|---------|------|-------------|
| `co_ppm` | ppm | Carbon monoxide |
| `no2_ppm` | ppm | Nitrogen dioxide |
| `nh3_ppm` | ppm | Ammonia |
| `pm25_ugm3` | μg/m³ | Fine particulate matter |
| `pm10_ugm3` | μg/m³ | Coarse particulate matter |
| `exhaust_flow_rate` | m³/s | Estimated exhaust volumetric flow |
| `gas_density` | kg/m³ | Exhaust gas density |

### Output

```json
{
  "verdict": "Warning",
  "confidence": 0.87,
  "model_agreement": 0.92,
  "probabilities": {
    "Compliant": 0.05,
    "Warning": 0.87,
    "Violation": 0.08
  },
  "exceeded_thresholds": [...]
}
```

## Training Data Source

Training uses a **hybrid approach** (truthful):

1. **Synthetic labels from emission-rate formula + IEEE/CPCB thresholds** — rule-based labels derived from reference limits in `violation_classifier.py` (`THRESHOLDS` dict). Synthetic samples are generated with realistic pollutant distributions for vehicles, generators, and industrial stacks.

2. **Real pilot readings from `emission_readings` (PostgreSQL)** — when seeded demo/pilot data exists in the database, device readings are mapped to classifier features and labeled using the same threshold rules for consistency.

We do **not** claim a large proprietary labeled dataset. Validation is **qualitative against IEEE/CPCB reference thresholds** plus hold-out accuracy on the synthetic+DB combined set reported at train time.

## Validation Approach

- 80/20 train/test split on combined synthetic + DB-derived samples
- Metrics: accuracy, per-class precision/recall (logged during `train_all_models.py`)
- Production sanity check: verdict must align with exceeded threshold list for high-confidence predictions

## Retrain

```bash
cd ml-service
python train_all_models.py
```

## API

```
POST /api/v1/ml/predict/violation
POST /api/v1/ml/agents/compliance-explainer   (uses classifier output)
```

## Related

- **Sensor Drift Intelligence** — confidence scoring feeds drift forecast (A2)
- **Compliance Explainer Agent** — plain-language explanation on Warning/Violation (B1)
