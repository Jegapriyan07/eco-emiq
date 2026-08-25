"""
Compliance Explainer Agent (B1)
Trigger: classifier returns Warning or Violation
Output: plain-language explanation + one immediate corrective action
"""

import json
from typing import Dict, List, Optional

from .llm_client import call_llm


def _template_explanation(
    verdict: str,
    exceeded: List[Dict],
    confidence: float,
    device_type: str,
) -> Dict:
    if verdict == "Compliant":
        return {
            "explanation": "All monitored pollutants are within CPCB/IEEE reference limits. No action required.",
            "corrective_action": "Continue regular maintenance schedule.",
            "confidence_note": f"Classifier confidence: {confidence:.0%}",
            "source": "template",
        }

    parts = []
    for e in exceeded:
        param = e["parameter"].replace("_", " ").upper()
        parts.append(f"{param} at {e['value']:.1f} (limit: {e['threshold']:.1f})")

    pollutant_text = ", ".join(parts) if parts else "elevated emission levels"

    if verdict == "Violation":
        explanation = (
            f"Your {device_type} was flagged because {pollutant_text} exceed regulatory limits. "
            f"This indicates incomplete combustion or worn emission-control components."
        )
        action = "Schedule a certified emission inspection and service within 48 hours."
    else:
        explanation = (
            f"Your {device_type} is approaching limits: {pollutant_text}. "
            f"Early intervention prevents a formal violation."
        )
        action = "Reduce idle time, check air filters, and plan service within 5–7 days."

    if confidence < 0.7:
        explanation += " Note: this flag has lower model confidence — a human review is recommended before enforcement."

    return {
        "explanation": explanation,
        "corrective_action": action,
        "confidence_note": f"Classifier confidence: {confidence:.0%}" + (" (low — dispute eligible)" if confidence < 0.7 else ""),
        "source": "template",
    }


def explain_compliance(
    verdict: str,
    confidence: float,
    exceeded_thresholds: List[Dict],
    sensor_deltas: Optional[Dict] = None,
    device_type: str = "vehicle",
) -> Dict:
    """
    Compliance Explainer Agent entry point.
    """
    if verdict == "Compliant":
        return _template_explanation(verdict, exceeded_thresholds, confidence, device_type)

    system = (
        "You are EMIQ Compliance Explainer, an AI agent for emission monitoring. "
        "Respond in JSON with keys: explanation (2-3 sentences), corrective_action (one sentence), confidence_note."
    )
    user = json.dumps({
        "verdict": verdict,
        "confidence": confidence,
        "exceeded_thresholds": exceeded_thresholds,
        "sensor_deltas": sensor_deltas or {},
        "device_type": device_type,
    })

    llm_response = call_llm(system, user, json_mode=True)
    if llm_response:
        try:
            parsed = json.loads(llm_response)
            parsed["source"] = "llm"
            return parsed
        except json.JSONDecodeError:
            pass

    return _template_explanation(verdict, exceeded_thresholds, confidence, device_type)
