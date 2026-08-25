"""
Drift Forecast — time-to-violation extrapolation from Sensor Drift Intelligence outputs.
Uses linear trend on emission scores + confidence degradation to forecast days until violation.
"""

import logging
from typing import Dict, List, Optional

import numpy as np

logger = logging.getLogger(__name__)

VIOLATION_SCORE_THRESHOLD = 70  # emission_score above this = violation risk


class DriftForecaster:
    """Simple regression/trend model over drift intelligence signals."""

    def __init__(self):
        self.version = "v1.0.0"

    def forecast(
        self,
        emission_history: List[float],
        confidence_scores: List[float],
        baseline_shift: float = 0.0,
        current_emission_score: Optional[float] = None,
    ) -> Dict:
        """
        Forecast days until service/violation needed.

        Args:
            emission_history: Recent emission scores (oldest first)
            confidence_scores: Parallel confidence scores (0-1)
            baseline_shift: Detected baseline shift magnitude
            current_emission_score: Latest score (defaults to last in history)
        """
        if not emission_history:
            return self._default_response("insufficient_data")

        scores = np.array(emission_history, dtype=float)
        current = current_emission_score if current_emission_score is not None else float(scores[-1])

        # Linear trend: slope per day (assume hourly samples → scale)
        n = len(scores)
        if n >= 3:
            x = np.arange(n)
            slope_per_step = float(np.polyfit(x, scores, 1)[0])
            # Assume ~24 readings per day if hourly over multiple days
            slope_per_day = slope_per_step * max(1, n / 7)
        else:
            slope_per_day = baseline_shift * 0.5

        # Confidence degradation factor
        conf = confidence_scores[-1] if confidence_scores else 0.8
        conf_penalty = max(0, (0.85 - conf) * 30)  # Low confidence → sooner service

        if slope_per_day <= 0.01:
            days_to_violation = 90
            risk_trend = "stable"
        else:
            gap = max(0, VIOLATION_SCORE_THRESHOLD - current)
            days_to_violation = int(gap / slope_per_day) if gap > 0 else 0
            days_to_violation = max(0, min(180, days_to_violation - int(conf_penalty)))
            if days_to_violation < 14:
                risk_trend = "rising_fast"
            elif days_to_violation < 45:
                risk_trend = "rising"
            else:
                risk_trend = "stable"

        if current >= VIOLATION_SCORE_THRESHOLD:
            days_to_violation = 0
            risk_trend = "at_risk"

        severity = (
            "critical" if days_to_violation <= 7
            else "high" if days_to_violation <= 14
            else "medium" if days_to_violation <= 30
            else "low"
        )

        return {
            "days_until_violation": days_to_violation,
            "days_until_service_needed": days_to_violation,
            "risk_trend": risk_trend,
            "severity": severity,
            "current_emission_score": round(current, 2),
            "slope_per_day": round(slope_per_day, 4),
            "confidence_factor": round(conf, 4),
            "baseline_shift": round(baseline_shift, 4),
            "model_version": self.version,
            "method": "linear_trend_extrapolation",
        }

    def _default_response(self, reason: str) -> Dict:
        return {
            "days_until_violation": 60,
            "days_until_service_needed": 60,
            "risk_trend": "unknown",
            "severity": "medium",
            "current_emission_score": 0,
            "slope_per_day": 0,
            "confidence_factor": 0,
            "baseline_shift": 0,
            "model_version": self.version,
            "method": reason,
        }
