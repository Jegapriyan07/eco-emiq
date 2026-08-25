"""
Carbon Reduction Advisor Agent (B2)
Trigger: scheduled (daily/weekly) per device
Output: prioritized personalized reduction recommendations
"""

import json
from datetime import datetime
from typing import Dict, List, Optional

from .llm_client import call_llm


def _estimate_co2e_savings(pollutant: str, reduction_pct: float, device_type: str) -> float:
    """Simple transparent estimate (kg CO₂e/year) — assumptions documented in response."""
    base_annual_kg = {"vehicle": 450, "generator": 1200, "industrial": 8500}.get(device_type, 500)
    pollutant_weight = {"nox": 0.35, "co": 0.25, "pm25": 0.30, "pm10": 0.20}.get(pollutant, 0.2)
    return round(base_annual_kg * pollutant_weight * (reduction_pct / 100), 1)


def _template_recommendations(
    device_id: str,
    device_type: str,
    emission_history: List[Dict],
    maintenance_days: Optional[int],
    drift_forecast: Optional[Dict],
) -> Dict:
    recs: List[Dict] = []

    # Analyze trends from history
    if len(emission_history) >= 2:
        recent = emission_history[-1]
        older = emission_history[0]
        for key, label in [("nox", "NOx"), ("co", "CO"), ("pm25", "PM2.5")]:
            old_v = older.get(key, 0) or 0
            new_v = recent.get(key, 0) or 0
            if old_v > 0:
                pct_change = ((new_v - old_v) / old_v) * 100
                if pct_change > 5:
                    savings = _estimate_co2e_savings(key, min(pct_change, 25), device_type)
                    recs.append({
                        "priority": "high" if pct_change > 15 else "medium",
                        "title": f"{label} up {pct_change:.0f}% over monitoring period",
                        "recommendation": f"Service within {maintenance_days or 7} days — check filters and combustion tuning.",
                        "estimated_co2e_saved_kg_per_year": savings,
                        "pollutant": key,
                    })

    if drift_forecast and drift_forecast.get("risk_trend") in ("rising", "rising_fast", "at_risk"):
        days = drift_forecast.get("days_until_service_needed", 14)
        recs.insert(0, {
            "priority": "critical" if days <= 7 else "high",
            "title": f"Drift forecast: service needed in ~{days} days",
            "recommendation": "Proactive maintenance before violation threshold — highest ROI for carbon reduction.",
            "estimated_co2e_saved_kg_per_year": _estimate_co2e_savings("nox", 18, device_type),
            "pollutant": "drift",
        })

    if not recs:
        recs.append({
            "priority": "low",
            "title": "Emissions stable — maintain current schedule",
            "recommendation": "Continue eco-driving / load optimization. Next check in 30 days.",
            "estimated_co2e_saved_kg_per_year": 0,
            "pollutant": None,
        })

    recs.sort(key=lambda r: {"critical": 0, "high": 1, "medium": 2, "low": 3}.get(r["priority"], 4))

    total_savings = sum(r["estimated_co2e_saved_kg_per_year"] for r in recs)

    return {
        "device_id": device_id,
        "device_type": device_type,
        "generated_at": datetime.utcnow().isoformat(),
        "recommendations": recs[:5],
        "total_estimated_co2e_saved_kg_per_year": round(total_savings, 1),
        "assumptions": (
            "CO₂e savings estimated from device-type baseline annual footprint × pollutant weight × expected reduction %. "
            "Actual savings depend on maintenance quality and operating conditions."
        ),
        "source": "template",
    }


def advise_reduction(
    device_id: str,
    device_type: str,
    emission_history: List[Dict],
    maintenance_record: Optional[Dict] = None,
    drift_forecast: Optional[Dict] = None,
) -> Dict:
    """Carbon Reduction Advisor Agent entry point."""
    maintenance_days = None
    if maintenance_record:
        maintenance_days = maintenance_record.get("days_until_service")
    if drift_forecast:
        maintenance_days = drift_forecast.get("days_until_service_needed", maintenance_days)

    system = (
        "You are EMIQ Carbon Reduction Advisor. Given emission history and device context, "
        "return JSON: { recommendations: [{ priority, title, recommendation, estimated_co2e_saved_kg_per_year }], "
        "total_estimated_co2e_saved_kg_per_year, assumptions }."
    )
    user = json.dumps({
        "device_id": device_id,
        "device_type": device_type,
        "emission_history": emission_history[-14:],
        "maintenance_record": maintenance_record,
        "drift_forecast": drift_forecast,
    })

    llm_response = call_llm(system, user, json_mode=True)
    if llm_response:
        try:
            parsed = json.loads(llm_response)
            parsed["device_id"] = device_id
            parsed["device_type"] = device_type
            parsed["generated_at"] = datetime.utcnow().isoformat()
            parsed["source"] = "llm"
            return parsed
        except json.JSONDecodeError:
            pass

    return _template_recommendations(
        device_id, device_type, emission_history, maintenance_days, drift_forecast
    )
