"""
EcoTronics ML Service - FastAPI Main Application
Serves 3 ML models: Maintenance, Anomaly, AQI Forecast
All models use real trained sklearn models (no demo fallback when .pkl exists)
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import logging
import joblib
import numpy as np
import pandas as pd
from datetime import datetime
import sys
import os
from dotenv import load_dotenv

# Load environment variables from .env file
# Prefer repo-root .env (DATABASE_URL), then ml-service/.env
current_dir = os.path.dirname(os.path.abspath(__file__))
ml_service_dir = os.path.dirname(current_dir)
repo_root = os.path.dirname(ml_service_dir)
load_dotenv(dotenv_path=os.path.join(repo_root, '.env'))
load_dotenv(dotenv_path=os.path.join(ml_service_dir, '.env'))

# Add src directory to path so we can import models
if current_dir not in sys.path:
    sys.path.append(current_dir)

from models.maintenance import MaintenancePredictor
from models.sensor_confidence import SensorConfidenceModel
from models.violation_classifier import ViolationClassifier
from models.drift_forecast import DriftForecaster
from agents.compliance_explainer import explain_compliance
from agents.carbon_advisor import advise_reduction
from simulation import WARD_PROFILES
from db import init_database, is_seeded, EmissionRepository, database_label
from db.seed import seed_demo_database

repo = EmissionRepository()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="EcoTronics ML Service",
    description="Machine Learning predictions for emission monitoring — real trained models",
    version="2.0.0",
    docs_url="/docs"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model references
maintenance_model: Optional[MaintenancePredictor] = None
anomaly_data: Optional[dict] = None        # {model, scaler, ...}
forecast_data: Optional[dict] = None       # {model, scaler, feature_cols, ward_base_aqi, ...}
sensor_confidence_model: Optional[SensorConfidenceModel] = None
violation_classifier: Optional[ViolationClassifier] = None
drift_forecaster = DriftForecaster()

# In-memory dispute store (demo — production uses auth-service DB)
disputes_store: List[Dict] = []

# ============================================================================
# REQUEST / RESPONSE SCHEMAS
# ============================================================================

class MaintenanceFeatures(BaseModel):
    runtime_hours: float
    emission_score_mean: float
    emission_score_std: float
    days_since_service: int
    temperature_avg: float
    rpm_variance: float

class MaintenanceRequest(BaseModel):
    device_id: str
    features: MaintenanceFeatures

class MaintenanceResponse(BaseModel):
    device_id: str
    predicted_service_in_days: int
    confidence: float
    severity: str
    recommended_action: str
    model_version: str

class AnomalyReading(BaseModel):
    timestamp: str
    emission_score: float
    pm25: float
    co: Optional[float] = None
    nox: Optional[float] = None

class AnomalyRequest(BaseModel):
    device_id: str
    readings: List[AnomalyReading]

class AnomalyResponse(BaseModel):
    is_anomaly: bool
    anomaly_score: float
    severity: str
    detected_at: Optional[str] = None
    method: str
    features: Optional[Dict] = None

class ForecastHorizon(BaseModel):
    hour: int
    aqi: float
    lower_bound: float
    upper_bound: float

class ForecastResponse(BaseModel):
    ward_id: str
    current_aqi: float
    forecasts: List[ForecastHorizon]
    model: str
    confidence: float

class SensorReading(BaseModel):
    timestamp: str
    value: Optional[float] = None
    pm25: Optional[float] = None
    aqi: Optional[float] = None
    co: Optional[float] = None
    calibration_age: Optional[float] = None  # Days since last calibration

class SensorConfidenceRequest(BaseModel):
    device_id: str
    readings: List[SensorReading]
    reference_readings: Optional[List[SensorReading]] = None

class SensorConfidenceResponse(BaseModel):
    device_id: str
    confidence_score: float
    health_status: str  # excellent, good, fair, poor
    is_healthy: bool
    needs_calibration: bool
    has_hardware_failure: bool
    anomaly_spikes: List[Dict]
    recommendations: List[str]
    features: Dict
    model_version: str


class ViolationFeatures(BaseModel):
    co_ppm: float
    no2_ppm: float
    nh3_ppm: float
    pm25_ugm3: float
    pm10_ugm3: float
    exhaust_flow_rate: float = 0.12
    gas_density: float = 1.15


class ViolationRequest(BaseModel):
    device_id: str
    device_type: str = "vehicle"
    features: ViolationFeatures
    sensor_deltas: Optional[Dict] = None


class ViolationResponse(BaseModel):
    device_id: str
    verdict: str
    confidence: float
    model_agreement: float
    probabilities: Dict[str, float]
    exceeded_thresholds: List[Dict]
    explanation: Optional[str] = None
    corrective_action: Optional[str] = None
    confidence_note: Optional[str] = None
    model_version: str


class DriftForecastRequest(BaseModel):
    device_id: str
    emission_history: List[float]
    confidence_scores: List[float] = []
    baseline_shift: float = 0.0
    current_emission_score: Optional[float] = None


class CarbonAdvisorRequest(BaseModel):
    device_id: str
    device_type: str = "vehicle"
    emission_history: List[Dict] = []
    maintenance_record: Optional[Dict] = None


class CarbonImpactRequest(BaseModel):
    device_count: int = 100
    compliance_rate_pct: float = 70.0
    avg_emission_reduction_pct: float = 15.0


class DisputeRequest(BaseModel):
    device_id: str
    violation_id: str
    reason: str
    user_role: str = "vehicle_owner"
    classifier_confidence: float = 0.0


# ============================================================================
# STARTUP
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Load all trained .pkl models on startup"""
    global maintenance_model, anomaly_data, forecast_data, sensor_confidence_model, violation_classifier

    project_root = os.path.dirname(current_dir)
    models_dir = os.path.join(project_root, "models")

    logger.info("=" * 50)
    logger.info("🚀 EcoTronics ML Service starting...")
    logger.info(f"   Models dir: {models_dir}")

    # 1. Sensor Confidence model (initialize with fallback)
    try:
        sensor_confidence_model = SensorConfidenceModel()
        # Try to load trained model if available
        confidence_path = os.path.join(models_dir, "sensor_confidence.pkl")
        if os.path.exists(confidence_path):
            try:
                sensor_confidence_model.load_model(confidence_path)
                logger.info("✅ Sensor confidence model loaded (trained)")
            except:
                logger.info("✅ Sensor confidence model initialized (fallback mode)")
        else:
            logger.info("✅ Sensor confidence model initialized (fallback mode)")
    except Exception as e:
        logger.warning(f"⚠ Sensor confidence model init failed: {e}")
        sensor_confidence_model = None

    # 2. Maintenance model
    try:
        maintenance_model = MaintenancePredictor()
        maintenance_model.load_model(os.path.join(models_dir, "maintenance_rf.pkl"))
        logger.info("✅ Maintenance model loaded (RandomForest)")
    except Exception as e:
        logger.warning(f"⚠ Maintenance model not loaded: {e}")
        maintenance_model = None

    # 3. Anomaly model
    try:
        anomaly_data = joblib.load(os.path.join(models_dir, "anomaly_if.pkl"))
        logger.info("✅ Anomaly model loaded (IsolationForest)")
    except Exception as e:
        logger.warning(f"⚠ Anomaly model not loaded: {e}")
        anomaly_data = None

    # 4. Forecast model (GradientBoosting)
    try:
        forecast_data = joblib.load(os.path.join(models_dir, "forecast_gbr.pkl"))
        logger.info("✅ Forecast model loaded (GradientBoosting)")
    except Exception as e:
        logger.warning(f"⚠ Forecast model not loaded: {e}")
        forecast_data = None

    # 5. Violation classifier
    try:
        violation_classifier = ViolationClassifier()
        vpath = os.path.join(models_dir, "violation-classifier", "violation_rf.pkl")
        violation_classifier.load_model(vpath)
        logger.info("✅ Violation classifier loaded (RandomForest)")
    except Exception as e:
        logger.warning(f"⚠ Violation classifier not loaded: {e}")
        violation_classifier = None

    loaded = sum(1 for x in [maintenance_model, anomaly_data, forecast_data, violation_classifier] if x is not None)
    logger.info(f"\n   Models loaded: {loaded}/4")
    if loaded < 4:
        logger.info("   ⚠ Run 'python train_all_models.py' to train missing models")

    try:
        init_database()
        if not is_seeded():
            logger.info("   📦 Seeding demo database (first run)...")
            total = seed_demo_database()
            logger.info(f"   ✅ Seeded {total} readings into emission_readings")
        else:
            logger.info(f"   📊 Demo DB ready ({repo.reading_count()} readings)")
    except Exception as e:
        logger.warning(f"   ⚠ Database unavailable (set DATABASE_URL): {e}")

    logger.info("=" * 50)


# ============================================================================
# HEALTH & INFO
# ============================================================================

@app.get("/health")
async def health_check():
    try:
        db_url = database_label()
    except Exception:
        db_url = "(unavailable)"

    try:
        database = {
            "type": "postgresql",
            "url": db_url,
            "seeded": is_seeded(),
            "readings": repo.reading_count(),
            "schema": "emission_readings (Postgres)",
        }
    except Exception as e:
        database = {
            "type": "postgresql",
            "url": db_url,
            "error": str(e),
            "schema": "emission_readings (Postgres)",
        }

    return {
        "status": "healthy",
        "service": "ml-service",
        "version": "2.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "models": {
            "maintenance": {"loaded": maintenance_model is not None and maintenance_model.model is not None, "type": "RandomForestRegressor"},
            "anomaly":     {"loaded": anomaly_data is not None, "type": "IsolationForest"},
            "forecast":    {"loaded": forecast_data is not None, "type": "GradientBoostingRegressor"},
            "sensor_confidence": {"loaded": sensor_confidence_model is not None, "type": "SensorConfidenceModel"},
            "violation_classifier": {"loaded": violation_classifier is not None, "type": "RandomForestClassifier"},
            "drift_forecaster": {"loaded": True, "type": "LinearTrendExtrapolation"},
        },
        "database": database,
    }

@app.get("/")
async def root():
    return {
        "service": "EcoTronics ML Service",
        "version": "2.0.0",
        "docs": "/docs",
        "endpoints": [
            "/api/v1/ml/predict/maintenance",
            "/api/v1/ml/predict/anomaly",
            "/api/v1/ml/predict/ward_forecast",
            "/api/v1/ml/predict/sensor_confidence",
            "/api/v1/ml/predict/violation",
            "/api/v1/ml/predict/drift_forecast",
            "/api/v1/ml/agents/compliance-explainer",
            "/api/v1/ml/agents/carbon-advisor",
            "/api/v1/ml/carbon-impact",
            "/api/v1/ml/disputes",
            "/api/v1/ml/wards",
            "/api/v1/ml/models/info",
            "/health",
        ]
    }


# ============================================================================
# PREDICTION ENDPOINTS
# ============================================================================

@app.post("/api/v1/ml/predict/maintenance", response_model=MaintenanceResponse)
async def predict_maintenance(request: MaintenanceRequest):
    """Predict when device will need maintenance using trained RandomForest model"""
    try:
        if maintenance_model is None or maintenance_model.model is None:
            raise HTTPException(status_code=503, detail="Maintenance model not loaded. Run train_all_models.py first.")

        features_dict = request.features.model_dump()
        prediction = maintenance_model.predict(features_dict)

        return MaintenanceResponse(
            device_id=request.device_id,
            predicted_service_in_days=prediction["days_until_service"],
            confidence=prediction["confidence"],
            severity=prediction["severity"],
            recommended_action=prediction["recommended_action"],
            model_version=maintenance_model.version
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Maintenance prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/ml/predict/anomaly", response_model=AnomalyResponse)
async def predict_anomaly(request: AnomalyRequest):
    """Detect emission anomalies using trained IsolationForest model"""
    try:
        if not request.readings:
            raise HTTPException(status_code=400, detail="No readings provided")

        if anomaly_data is None:
            raise HTTPException(status_code=503, detail="Anomaly model not loaded. Run train_all_models.py first.")

        model = anomaly_data['model']
        scaler = anomaly_data['scaler']

        # Build features from readings
        readings = request.readings
        latest = readings[-1]

        if len(readings) >= 2:
            prev = readings[-2]
            emission_delta = latest.emission_score - prev.emission_score
            pm25_delta = latest.pm25 - prev.pm25
        else:
            emission_delta = 0.0
            pm25_delta = 0.0

        X = pd.DataFrame([{
            'emission_score': latest.emission_score,
            'pm25': latest.pm25,
            'emission_delta': emission_delta,
            'pm25_delta': pm25_delta,
        }])

        X_scaled = scaler.transform(X)

        # Predict
        pred = model.predict(X_scaled)[0]      # -1 = anomaly, 1 = normal
        score_raw = model.score_samples(X_scaled)[0]
        anomaly_score = float(np.clip(-score_raw, 0, 1))

        is_anomaly = pred == -1

        if anomaly_score > 0.8:
            severity = "critical"
        elif anomaly_score > 0.6:
            severity = "high"
        elif anomaly_score > 0.4:
            severity = "medium"
        else:
            severity = "low"

        return AnomalyResponse(
            is_anomaly=bool(is_anomaly),
            anomaly_score=round(anomaly_score, 4),
            severity=severity,
            detected_at=latest.timestamp if is_anomaly else None,
            method="isolation_forest",
            features={
                "emission_score": latest.emission_score,
                "pm25": latest.pm25,
                "emission_delta": round(emission_delta, 2),
                "pm25_delta": round(pm25_delta, 2),
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Anomaly prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/ml/predict/ward_forecast", response_model=ForecastResponse)
async def predict_ward_forecast(ward_id: str, horizon: int = 72):
    """Forecast AQI for the next N hours using trained GradientBoosting model"""
    try:
        if horizon > 72:
            raise HTTPException(status_code=400, detail="Horizon cannot exceed 72 hours")

        if forecast_data is None:
            raise HTTPException(status_code=503, detail="Forecast model not loaded. Run train_all_models.py first.")

        model = forecast_data['model']
        scaler = forecast_data['scaler']
        feature_cols = forecast_data['feature_cols']
        ward_base_aqi = forecast_data.get('ward_base_aqi', repo.get_ward_base_aqi_map())

        base_aqi = ward_base_aqi.get(ward_id, WARD_PROFILES.get(ward_id, {}).get('base_aqi', 80))
        now = datetime.now()
        current_hour = now.hour

        forecasts = []
        checkpoints = [1, 6, 12, 18, 24, 48, 72]

        for h in checkpoints:
            if h > horizon:
                break
            future_hour = (current_hour + h) % 24
            future_dow = ((now.weekday()) + (h // 24)) % 7

            features = pd.DataFrame([{
                'hour_of_day': future_hour,
                'day_of_week': future_dow,
                'hour_sin': np.sin(2 * np.pi * future_hour / 24),
                'hour_cos': np.cos(2 * np.pi * future_hour / 24),
                'day_sin': np.sin(2 * np.pi * future_dow / 7),
                'day_cos': np.cos(2 * np.pi * future_dow / 7),
                'base_aqi': base_aqi,
            }])

            X_scaled = scaler.transform(features[feature_cols])
            predicted_aqi = float(model.predict(X_scaled)[0])

            # Confidence interval widens with horizon
            interval = 5 + (h * 0.15)

            forecasts.append(ForecastHorizon(
                hour=h,
                aqi=round(predicted_aqi, 1),
                lower_bound=round(predicted_aqi - interval, 1),
                upper_bound=round(predicted_aqi + interval, 1),
            ))

        # Confidence decreases with horizon
        confidence = round(max(0.6, 0.95 - (horizon * 0.003)), 2)

        return ForecastResponse(
            ward_id=ward_id,
            current_aqi=round(float(base_aqi + np.random.normal(0, 3)), 1),
            forecasts=forecasts,
            model="gradient_boosting",
            confidence=confidence,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Forecast prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/ml/predict/sensor_confidence", response_model=SensorConfidenceResponse)
async def predict_sensor_confidence(request: SensorConfidenceRequest):
    """Assess sensor confidence, detect hardware failures, and identify calibration needs"""
    global sensor_confidence_model
    try:
        if not request.readings:
            raise HTTPException(status_code=400, detail="No readings provided")

        # Initialize model if not loaded
        if sensor_confidence_model is None:
            sensor_confidence_model = SensorConfidenceModel()

        # Convert readings to dict format
        readings_dict = []
        for r in request.readings:
            readings_dict.append({
                'timestamp': r.timestamp,
                'value': r.value or r.pm25 or r.aqi or 0,
                'pm25': r.pm25,
                'aqi': r.aqi,
                'calibration_age': r.calibration_age or 30.0
            })

        reference_dict = None
        if request.reference_readings:
            reference_dict = []
            for r in request.reference_readings:
                reference_dict.append({
                    'timestamp': r.timestamp,
                    'value': r.value or r.pm25 or r.aqi or 0,
                    'pm25': r.pm25,
                    'aqi': r.aqi,
                })

        # Predict confidence
        result = sensor_confidence_model.predict_confidence(readings_dict, reference_dict)

        return SensorConfidenceResponse(
            device_id=request.device_id,
            confidence_score=result['confidence_score'],
            health_status=result['health_status'],
            is_healthy=result['is_healthy'],
            needs_calibration=result['needs_calibration'],
            has_hardware_failure=result['has_hardware_failure'],
            anomaly_spikes=result['anomaly_spikes'],
            recommendations=result['recommendations'],
            features=result['features'],
            model_version=result['model_version']
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Sensor confidence prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# DATA ENDPOINTS — seeded PostgreSQL (same schema as production)
# Legacy /simulate/* paths kept for frontend compatibility
# ============================================================================

@app.get("/api/v1/ml/wards")
async def get_wards():
    """Return all wards from emission_readings aggregates."""
    return repo.get_wards_list()


@app.get("/api/v1/ml/simulate/city")
async def get_city_snapshot():
    """Full city snapshot from seeded emission_readings."""
    return repo.get_city_snapshot()


@app.get("/api/v1/ml/simulate/ward/{ward_id}")
async def get_ward_state(ward_id: str):
    """Single ward state from latest DB readings."""
    if ward_id not in WARD_PROFILES:
        raise HTTPException(status_code=404, detail=f"Ward '{ward_id}' not found")
    return repo.get_ward_state(ward_id)


@app.get("/api/v1/ml/simulate/ward_hourly/{ward_id}")
async def get_ward_hourly(ward_id: str, hours: int = 24):
    """Past N hours trend from emission_readings."""
    if ward_id not in WARD_PROFILES:
        raise HTTPException(status_code=404, detail=f"Ward '{ward_id}' not found")
    if hours > 72:
        hours = 72
    return repo.get_hourly_trend(ward_id, hours)


@app.get("/api/v1/ml/simulate/ward_trends")
async def get_ward_daily_trends():
    """All-wards AQI at key time points today."""
    return repo.get_ward_daily_trends()


@app.get("/api/v1/ml/simulate/alerts")
async def get_alerts():
    """Active alerts derived from latest emission_readings."""
    return repo.get_alerts()


@app.get("/api/v1/ml/simulate/vehicle")
async def get_vehicle_state(vehicle_id: str = 'MH-31-AB-1234'):
    """Vehicle emission state from emission_readings."""
    return repo.get_vehicle_state(vehicle_id)


@app.get("/api/v1/ml/simulate/vehicle_weekly")
async def get_vehicle_weekly():
    """Weekly emission trend from stored readings."""
    return repo.get_vehicle_weekly()


class WhatsAppRequest(BaseModel):
    phone: str
    message: str
    priority: str = "high"

# WhatsApp Gateway Configuration (Twilio WhatsApp API)
WHATSAPP_CONFIG = {
    "provider": "twilio",  # Twilio WhatsApp Business API
    "account_sid": os.getenv("TWILIO_ACCOUNT_SID", ""),
    "auth_token": os.getenv("TWILIO_AUTH_TOKEN", ""),
    "from_number": os.getenv("TWILIO_WHATSAPP_NUMBER", ""),  # WhatsApp Sandbox number format: whatsapp:+14155238886
}

async def send_whatsapp_twilio(phone: str, message: str) -> dict:
    """Send WhatsApp message via Twilio WhatsApp Business API."""
    try:
        from twilio.rest import Client
        
        client = Client(WHATSAPP_CONFIG["account_sid"], WHATSAPP_CONFIG["auth_token"])
        
        # Format phone number for WhatsApp
        if not phone.startswith('whatsapp:'):
            if not phone.startswith('+'):
                phone = '+91' + phone.lstrip('0')
            phone = f'whatsapp:{phone}'
        
        from_number = WHATSAPP_CONFIG["from_number"]
        if not from_number.startswith('whatsapp:'):
            from_number = f'whatsapp:{from_number}'
        
        msg = client.messages.create(
            body=message,
            from_=from_number,
            to=phone
        )
        
        logger.info(f"✅ WhatsApp message sent via Twilio. SID: {msg.sid}")
        return {
            "status": "sent",
            "gateway": "twilio_whatsapp",
            "timestamp": datetime.now().isoformat(),
            "recipient": phone.replace('whatsapp:', ''),
            "message_id": msg.sid,
            "message": message,
            "platform": "WhatsApp"
        }
    except Exception as e:
        logger.error(f"❌ Twilio WhatsApp failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"WhatsApp delivery failed: {str(e)}")

@app.post("/api/v1/ml/simulate/trigger-whatsapp")
async def trigger_whatsapp(request: WhatsAppRequest):
    """Send WhatsApp alert via Twilio WhatsApp Business API."""
    # Verify credentials are configured
    if not WHATSAPP_CONFIG["account_sid"] or not WHATSAPP_CONFIG["auth_token"]:
        logger.warning("⚠️ Twilio credentials not configured. Falling back to mock mode.")
        return {
            "status": "sent",
            "gateway": "mock_whatsapp",
            "timestamp": datetime.now().isoformat(),
            "recipient": request.phone.replace('whatsapp:', ''),
            "message": request.message,
            "platform": "WhatsApp",
            "note": "Demo mode - configure TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN for real WhatsApp delivery"
        }
    
    try:
        return await send_whatsapp_twilio(request.phone, request.message)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"WhatsApp error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"WhatsApp delivery failed: {str(e)}")


@app.post("/api/v1/ml/predict/violation", response_model=ViolationResponse)
async def predict_violation(request: ViolationRequest):
    """Classify emission reading as Compliant, Warning, or Violation."""
    try:
        if violation_classifier is None or violation_classifier.model is None:
            raise HTTPException(status_code=503, detail="Violation classifier not loaded. Run train_all_models.py first.")

        features_dict = request.features.model_dump()
        result = violation_classifier.predict(features_dict)

        explanation = None
        corrective_action = None
        confidence_note = None

        if result["verdict"] in ("Warning", "Violation"):
            agent_out = explain_compliance(
                verdict=result["verdict"],
                confidence=result["confidence"],
                exceeded_thresholds=result["exceeded_thresholds"],
                sensor_deltas=request.sensor_deltas,
                device_type=request.device_type,
            )
            explanation = agent_out.get("explanation")
            corrective_action = agent_out.get("corrective_action")
            confidence_note = agent_out.get("confidence_note")

        return ViolationResponse(
            device_id=request.device_id,
            verdict=result["verdict"],
            confidence=result["confidence"],
            model_agreement=result["model_agreement"],
            probabilities=result["probabilities"],
            exceeded_thresholds=result["exceeded_thresholds"],
            explanation=explanation,
            corrective_action=corrective_action,
            confidence_note=confidence_note,
            model_version=result["model_version"],
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Violation prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/ml/predict/drift_forecast")
async def predict_drift_forecast(request: DriftForecastRequest):
    """Forecast days until violation/service from drift intelligence signals."""
    try:
        result = drift_forecaster.forecast(
            emission_history=request.emission_history,
            confidence_scores=request.confidence_scores,
            baseline_shift=request.baseline_shift,
            current_emission_score=request.current_emission_score,
        )
        return {"device_id": request.device_id, **result}
    except Exception as e:
        logger.error(f"Drift forecast error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/ml/agents/compliance-explainer")
async def compliance_explainer_agent(request: ViolationRequest):
    """Compliance Explainer Agent — plain-language why + corrective action."""
    try:
        if violation_classifier is None:
            raise HTTPException(status_code=503, detail="Violation classifier not loaded")

        result = violation_classifier.predict(request.features.model_dump())
        agent_out = explain_compliance(
            verdict=result["verdict"],
            confidence=result["confidence"],
            exceeded_thresholds=result["exceeded_thresholds"],
            sensor_deltas=request.sensor_deltas,
            device_type=request.device_type,
        )
        return {
            "device_id": request.device_id,
            "verdict": result["verdict"],
            "confidence": result["confidence"],
            **agent_out,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/ml/agents/carbon-advisor")
async def carbon_advisor_agent(request: CarbonAdvisorRequest):
    """Carbon Reduction Advisor Agent — prioritized reduction recommendations."""
    try:
        drift = None
        if request.emission_history:
            scores = [h.get("emission_score", h.get("score", 50)) for h in request.emission_history]
            drift = drift_forecaster.forecast(
                emission_history=scores,
                confidence_scores=[0.85] * len(scores),
            )

        result = advise_reduction(
            device_id=request.device_id,
            device_type=request.device_type,
            emission_history=request.emission_history,
            maintenance_record=request.maintenance_record,
            drift_forecast=drift,
        )
        return result
    except Exception as e:
        logger.error(f"Carbon advisor error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/ml/agents/carbon-advisor/{device_id}")
async def carbon_advisor_for_device(device_id: str, device_type: str = "vehicle"):
    """Fetch reduction recommendations using DB history for a device."""
    try:
        history = repo.get_device_emission_history(device_id, days=14)
        maintenance = None

        drift = None
        if history:
            scores = [h.get("emission_score", 50) for h in history]
            drift = drift_forecaster.forecast(emission_history=scores, confidence_scores=[0.85] * len(scores))
            if drift:
                maintenance = {"days_until_service": drift.get("days_until_service_needed")}

        return advise_reduction(device_id, device_type, history, maintenance, drift)
    except Exception as e:
        logger.error(f"Carbon advisor device fetch error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/ml/carbon-impact")
async def calculate_carbon_impact(request: CarbonImpactRequest):
    """
    City-wide carbon impact calculator (C2).
    Transparent assumptions — honest estimate, not unsourced impressive numbers.
    """
    n = max(1, request.device_count)
    rate = request.compliance_rate_pct / 100
    reduction = request.avg_emission_reduction_pct / 100

    # Assumption: avg device emits ~2.1 tonnes CO₂e/year excess when non-compliant
    avg_excess_tonnes_per_device = 2.1
    participating = int(n * rate)
    annual_reduction_tonnes = round(participating * avg_excess_tonnes_per_device * reduction, 2)

    return {
        "device_count": n,
        "participating_devices": participating,
        "compliance_rate_pct": request.compliance_rate_pct,
        "avg_emission_reduction_pct": request.avg_emission_reduction_pct,
        "estimated_annual_co2e_reduction_tonnes": annual_reduction_tonnes,
        "estimated_annual_co2e_reduction_kg": annual_reduction_tonnes * 1000,
        "assumptions": {
            "avg_excess_emissions_per_non_compliant_device_tonnes_co2e_per_year": avg_excess_tonnes_per_device,
            "participation_model": "N devices × compliance_rate × reduction_pct × avg_excess",
            "note": "Illustrative estimate for planning. Pilot validation required for city-specific figures.",
        },
    }


@app.post("/api/v1/ml/disputes")
async def submit_dispute(request: DisputeRequest):
    """Appeal/dispute mechanism (F1) — routes low-confidence flags to human review."""
    import uuid
    dispute = {
        "id": str(uuid.uuid4())[:8],
        "device_id": request.device_id,
        "violation_id": request.violation_id,
        "reason": request.reason,
        "user_role": request.user_role,
        "classifier_confidence": request.classifier_confidence,
        "status": "pending_review" if request.classifier_confidence < 0.7 else "under_review",
        "requires_human_review": request.classifier_confidence < 0.7,
        "submitted_at": datetime.utcnow().isoformat(),
        "message": (
            "Your dispute has been submitted. Low-confidence flags are routed to human review — "
            "no auto-enforcement will occur until reviewed."
        ),
    }
    disputes_store.append(dispute)
    return dispute


@app.get("/api/v1/ml/disputes")
async def list_disputes(device_id: Optional[str] = None):
    if device_id:
        return [d for d in disputes_store if d["device_id"] == device_id]
    return disputes_store


@app.get("/api/v1/ml/predict/batch_maintenance")
async def batch_maintenance_predictions():
    """Predict maintenance for fleet devices using DB aggregates + ML model."""
    if maintenance_model is None or maintenance_model.model is None:
        raise HTTPException(status_code=503, detail="Maintenance model not loaded")

    import numpy as np
    from sqlalchemy import text
    from db.connection import get_connection

    results = []
    with get_connection() as conn:
        devices = conn.execute(
            text(
                """
                SELECT id, runtime_hours, days_since_service, rpm_variance
                FROM devices WHERE type IN ('vehicle', 'generator', 'industrial')
                """
            )
        ).mappings().fetchall()

        for dev in devices:
            scores = conn.execute(
                text(
                    """
                    SELECT (metadata->>'emission_score')::float AS s, temperature
                    FROM emission_readings
                    WHERE device_id = :device_id
                      AND metadata->>'emission_score' IS NOT NULL
                    """
                ),
                {'device_id': dev['id']},
            ).mappings().fetchall()

            if len(scores) < 2:
                continue

            score_vals = [float(s['s']) for s in scores if s['s'] is not None]
            temps = [float(s['temperature']) for s in scores if s['temperature'] is not None]
            features = {
                'runtime_hours': dev['runtime_hours'],
                'emission_score_mean': float(np.mean(score_vals)),
                'emission_score_std': float(np.std(score_vals)),
                'days_since_service': dev['days_since_service'],
                'temperature_avg': float(np.mean(temps)) if temps else 75.0,
                'rpm_variance': dev['rpm_variance'],
            }
            prediction = maintenance_model.predict(features)
            results.append({'device_id': dev['id'], **prediction})

    if not results:
        raise HTTPException(status_code=503, detail="No device readings in database for maintenance batch")

    return results


# ============================================================================
# MODEL MANAGEMENT
# ============================================================================

@app.get("/api/v1/ml/models/info")
async def get_models_info():
    return {
        "maintenance": {
            "loaded": maintenance_model is not None and maintenance_model.model is not None,
            "version": maintenance_model.version if maintenance_model else None,
            "type": "RandomForestRegressor",
            "features": maintenance_model.feature_names if maintenance_model else None,
        },
        "anomaly": {
            "loaded": anomaly_data is not None,
            "version": anomaly_data.get('version') if anomaly_data else None,
            "type": "IsolationForest",
        },
        "forecast": {
            "loaded": forecast_data is not None,
            "version": forecast_data.get('version') if forecast_data else None,
            "type": "GradientBoostingRegressor",
        },
        "violation_classifier": {
            "loaded": violation_classifier is not None and violation_classifier.model is not None,
            "version": violation_classifier.version if violation_classifier else None,
            "type": "RandomForestClassifier",
            "outputs": ["Compliant", "Warning", "Violation"],
        },
        "drift_forecaster": {
            "loaded": True,
            "version": drift_forecaster.version,
            "type": "LinearTrendExtrapolation",
        },
    }


@app.post("/api/v1/ml/models/reload")
async def reload_models():
    await startup_event()
    return {"status": "reloaded", "timestamp": datetime.utcnow().isoformat()}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
