"""
Violation Classification Model
Random Forest classifier: Compliant | Warning | Violation
"""

import logging
from typing import Dict, List, Optional

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler

logger = logging.getLogger(__name__)

# IEEE / CPCB-inspired reference thresholds (used for labeling & explainability)
THRESHOLDS = {
    "co_ppm": {"warning": 15.0, "violation": 20.0},
    "no2_ppm": {"warning": 0.6, "violation": 0.8},
    "nh3_ppm": {"warning": 25.0, "violation": 35.0},
    "pm25_ugm3": {"warning": 40.0, "violation": 60.0},
    "pm10_ugm3": {"warning": 80.0, "violation": 100.0},
}

FEATURE_NAMES = [
    "co_ppm",
    "no2_ppm",
    "nh3_ppm",
    "pm25_ugm3",
    "pm10_ugm3",
    "exhaust_flow_rate",
    "gas_density",
]

CLASS_LABELS = ["Compliant", "Warning", "Violation"]


def label_from_readings(row: dict) -> str:
    """Rule-based label for synthetic training data (IEEE/CPCB thresholds)."""
    violations = 0
    warnings = 0
    for key, limits in THRESHOLDS.items():
        val = row.get(key, 0)
        if val >= limits["violation"]:
            violations += 1
        elif val >= limits["warning"]:
            warnings += 1
    if violations >= 1:
        return "Violation"
    if warnings >= 2:
        return "Violation"
    if warnings >= 1:
        return "Warning"
    return "Compliant"


class ViolationClassifier:
    """Random Forest classifier for emission compliance verdicts."""

    def __init__(self):
        self.model: Optional[RandomForestClassifier] = None
        self.scaler: Optional[StandardScaler] = None
        self.version = "v1.0.0"
        self.feature_names = FEATURE_NAMES
        self.class_labels = CLASS_LABELS

    def train(self, X_train: pd.DataFrame, y_train: pd.Series):
        logger.info("Training violation classifier (RandomForest)...")
        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X_train[self.feature_names])
        self.model = RandomForestClassifier(
            n_estimators=100,
            max_depth=12,
            min_samples_split=8,
            class_weight="balanced",
            random_state=42,
            n_jobs=-1,
        )
        self.model.fit(X_scaled, y_train)
        logger.info("Violation classifier trained.")
        return self.model

    def predict(self, features: Dict) -> Dict:
        if self.model is None or self.scaler is None:
            raise ValueError("Model not loaded. Call load_model() first.")

        X = pd.DataFrame([{k: features.get(k, 0) for k in self.feature_names}])
        X_scaled = self.scaler.transform(X)
        raw_pred = self.model.predict(X_scaled)[0]
        classes = list(self.model.classes_)

        # Model may be trained on string labels (Compliant/Warning/Violation)
        if isinstance(raw_pred, (str, np.str_)):
            verdict = str(raw_pred)
            verdict_idx = classes.index(verdict)
        else:
            verdict_idx = int(raw_pred)
            verdict = self.class_labels[verdict_idx] if verdict_idx < len(self.class_labels) else str(classes[verdict_idx])

        proba = self.model.predict_proba(X_scaled)[0]
        confidence = float(proba[verdict_idx])

        tree_preds = np.array([tree.predict(X_scaled)[0] for tree in self.model.estimators_])
        agreement = float(np.mean([str(p) == str(raw_pred) for p in tree_preds]))

        exceeded = []
        for key, limits in THRESHOLDS.items():
            val = features.get(key, 0)
            if val >= limits["violation"]:
                exceeded.append({"parameter": key, "value": val, "threshold": limits["violation"], "level": "violation"})
            elif val >= limits["warning"]:
                exceeded.append({"parameter": key, "value": val, "threshold": limits["warning"], "level": "warning"})

        return {
            "verdict": verdict,
            "confidence": round(confidence, 4),
            "model_agreement": round(agreement, 4),
            "probabilities": {
                str(label): round(float(p), 4)
                for label, p in zip(classes, proba)
            },
            "exceeded_thresholds": exceeded,
            "model_version": self.version,
        }

    def save_model(self, path: str):
        if self.model is None:
            raise ValueError("No model to save")
        joblib.dump(
            {
                "model": self.model,
                "scaler": self.scaler,
                "version": self.version,
                "feature_names": self.feature_names,
                "class_labels": self.class_labels,
                "thresholds": THRESHOLDS,
            },
            path,
        )
        logger.info(f"Violation classifier saved to {path}")

    def load_model(self, path: str):
        data = joblib.load(path)
        self.model = data["model"]
        self.scaler = data["scaler"]
        self.version = data.get("version", "v1.0.0")
        self.feature_names = data.get("feature_names", FEATURE_NAMES)
        self.class_labels = data.get("class_labels", CLASS_LABELS)
        logger.info(f"Violation classifier loaded from {path} (version {self.version})")
