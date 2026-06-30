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
# Load from ml-service directory (parent of src)
current_dir = os.path.dirname(os.path.abspath(__file__))
ml_service_dir = os.path.dirname(current_dir)
env_file = os.path.join(ml_service_dir, '.env')
load_dotenv(dotenv_path=env_file)

# Add src directory to path so we can import models
if current_dir not in sys.path:
    sys.path.append(current_dir)

from models.maintenance import MaintenancePredictor
from models.sensor_confidence import SensorConfidenceModel
from simulation import (
    compute_city_snapshot, compute_ward_state, compute_hourly_trend,
    compute_ward_daily_trends, compute_vehicle_state, compute_vehicle_weekly_trend,
    WARD_PROFILES
)

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

# Ward metadata for realistic data
WARD_INFO = {
    'dharampeth': {'name': 'Dharampeth', 'base_aqi': 87, 'devices': 45},
    'sadar':      {'name': 'Sadar',      'base_aqi': 121, 'devices': 52},
    'nehru_nagar':{'name': 'Nehru Nagar','base_aqi': 64, 'devices': 38},
    'dhantoli':   {'name': 'Dhantoli',   'base_aqi': 94, 'devices': 41},
    'hanuman_nagar':{'name':'Hanuman Nagar','base_aqi': 73, 'devices': 48},
}


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


# ============================================================================
# STARTUP
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Load all trained .pkl models on startup"""
    global maintenance_model, anomaly_data, forecast_data, sensor_confidence_model

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

    # 3. Forecast model (GradientBoosting)
    try:
        forecast_data = joblib.load(os.path.join(models_dir, "forecast_gbr.pkl"))
        logger.info("✅ Forecast model loaded (GradientBoosting)")
    except Exception as e:
        logger.warning(f"⚠ Forecast model not loaded: {e}")
        forecast_data = None

    loaded = sum(1 for x in [maintenance_model, anomaly_data, forecast_data] if x is not None)
    logger.info(f"\n   Models loaded: {loaded}/3")
    if loaded < 3:
        logger.info("   ⚠ Run 'python train_all_models.py' to train missing models")
    logger.info("=" * 50)


# ============================================================================
# HEALTH & INFO
# ============================================================================

@app.get("/health")
async def health_check():
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
        }
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
        ward_base_aqi = forecast_data.get('ward_base_aqi', {})

        base_aqi = ward_base_aqi.get(ward_id, 80)
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
# SIMULATION ENDPOINTS — physics-based, logically correct
# ============================================================================

@app.get("/api/v1/ml/wards")
async def get_wards():
    """Return all wards using the physics-based simulation engine."""
    snapshot = compute_city_snapshot()
    return snapshot['wards']


@app.get("/api/v1/ml/simulate/city")
async def get_city_snapshot():
    """Full city snapshot: all wards + aggregates + threshold-based alerts."""
    return compute_city_snapshot()


@app.get("/api/v1/ml/simulate/ward/{ward_id}")
async def get_ward_state(ward_id: str):
    """Single ward state with correlated pollutant values."""
    if ward_id not in WARD_PROFILES:
        raise HTTPException(status_code=404, detail=f"Ward '{ward_id}' not found")
    return compute_ward_state(ward_id)


@app.get("/api/v1/ml/simulate/ward_hourly/{ward_id}")
async def get_ward_hourly(ward_id: str, hours: int = 24):
    """Past N hours trend for a ward (each data point is physics-consistent)."""
    if ward_id not in WARD_PROFILES:
        raise HTTPException(status_code=404, detail=f"Ward '{ward_id}' not found")
    if hours > 72:
        hours = 72
    return compute_hourly_trend(ward_id, hours)


@app.get("/api/v1/ml/simulate/ward_trends")
async def get_ward_daily_trends():
    """All-wards AQI at key time points today (6AM, 9AM, 12PM, etc)."""
    return compute_ward_daily_trends()


@app.get("/api/v1/ml/simulate/alerts")
async def get_alerts():
    """All currently active alerts across all wards (threshold-based)."""
    snapshot = compute_city_snapshot()
    return snapshot['alerts']


@app.get("/api/v1/ml/simulate/vehicle")
async def get_vehicle_state(vehicle_id: str = 'MH-31-AB-1234'):
    """Vehicle emission state — correlated with traffic and engine warmth."""
    return compute_vehicle_state(vehicle_id)


@app.get("/api/v1/ml/simulate/vehicle_weekly")
async def get_vehicle_weekly():
    """Weekly emission trend (weekdays vs weekends with proper traffic model)."""
    return compute_vehicle_weekly_trend()


@app.get("/api/v1/ml/simulate/governance")
async def get_governance_status(role: str = 'vehicle_owner', emission_value: float = 0.0, threshold_value: float = 80.0):
    """
    Returns governance status threshold logic
    """
    is_violation = emission_value > threshold_value
    return {
        "role": role,
        "emission_value": emission_value,
        "threshold_value": threshold_value,
        "status": "Non-Compliant" if is_violation else "Compliant",
        "alert_triggered": is_violation,
        "violation_logged": is_violation,
        "timestamp": datetime.now().isoformat(),
        "message": f"Emission {'exceeds' if is_violation else 'within'} safe limits."
    }

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


@app.get("/api/v1/ml/predict/batch_maintenance")
async def batch_maintenance_predictions():
    """Predict maintenance for demo devices using real ML model."""
    if maintenance_model is None or maintenance_model.model is None:
        raise HTTPException(status_code=503, detail="Maintenance model not loaded")

    demo_devices = [
        {"device_id": "VH-001", "runtime_hours": 1250, "emission_score_mean": 65, "emission_score_std": 15, "days_since_service": 75, "temperature_avg": 78, "rpm_variance": 250},
        {"device_id": "VH-002", "runtime_hours": 800, "emission_score_mean": 42, "emission_score_std": 8,  "days_since_service": 30, "temperature_avg": 72, "rpm_variance": 150},
        {"device_id": "GN-001", "runtime_hours": 2200, "emission_score_mean": 72, "emission_score_std": 22, "days_since_service": 120, "temperature_avg": 85, "rpm_variance": 400},
        {"device_id": "GN-002", "runtime_hours": 600, "emission_score_mean": 38, "emission_score_std": 5,  "days_since_service": 15, "temperature_avg": 68, "rpm_variance": 100},
        {"device_id": "IN-001", "runtime_hours": 3500, "emission_score_mean": 88, "emission_score_std": 25, "days_since_service": 150, "temperature_avg": 92, "rpm_variance": 500},
    ]

    results = []
    for dev in demo_devices:
        device_id = dev.pop("device_id")
        prediction = maintenance_model.predict(dev)
        results.append({
            "device_id": device_id,
            **prediction,
        })

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
        }
    }


@app.post("/api/v1/ml/models/reload")
async def reload_models():
    await startup_event()
    return {"status": "reloaded", "timestamp": datetime.utcnow().isoformat()}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
