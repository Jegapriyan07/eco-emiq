"""
EcoTronics - Train All ML Models
Generates synthetic but realistic data and trains 3 models:
  1. Maintenance Predictor (RandomForest Regressor)
  2. Anomaly Detector (Isolation Forest)
  3. AQI Forecaster (Gradient Boosting - simpler than Prophet, no extra deps)

Run: python train_all_models.py
"""

import sys
import os
import warnings
warnings.filterwarnings('ignore')

# Add src to path
current_dir = os.path.dirname(os.path.abspath(__file__))
src_dir = os.path.join(current_dir, "src")
sys.path.insert(0, src_dir)

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score, accuracy_score
from sklearn.ensemble import IsolationForest, GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
import joblib
import logging
from datetime import datetime, timedelta

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

# Ensure models directory exists
MODELS_DIR = os.path.join(current_dir, "models")
os.makedirs(MODELS_DIR, exist_ok=True)


# ============================================================================
# 1. MAINTENANCE PREDICTION MODEL
# ============================================================================

def train_maintenance_model():
    """Train RandomForest model to predict days until maintenance needed"""
    logger.info("=" * 60)
    logger.info("🔧 TRAINING: Maintenance Prediction Model")
    logger.info("   Algorithm: RandomForest Regressor (100 trees)")
    logger.info("=" * 60)

    from models.maintenance import MaintenancePredictor

    np.random.seed(42)
    n = 5000

    # Generate realistic synthetic sensor data
    runtime_hours = np.random.exponential(1000, n)
    days_since_service = np.random.uniform(0, 180, n)
    emission_score_mean = np.clip(np.random.normal(50, 20, n), 0, 100)
    emission_score_std = np.random.exponential(10, n)
    temperature_avg = np.clip(np.random.normal(75, 10, n), 40, 120)
    rpm_variance = np.random.exponential(200, n)

    # Target: days until maintenance (realistic formula)
    base_days = 90
    days_until = (
        base_days
        - (days_since_service * 0.4)     # longer since last service = sooner maintenance
        - (emission_score_mean / 3)       # higher emissions = sooner maintenance
        - (emission_score_std * 1.5)      # more variance = less stable
        - (runtime_hours / 500)           # more hours = sooner maintenance
        + (temperature_avg / 10)          # slight positive (normal temp is ok)
        + np.random.normal(0, 5, n)       # noise
    )
    days_until = np.clip(days_until, 0, 180).astype(int)

    df = pd.DataFrame({
        'runtime_hours': runtime_hours,
        'emission_score_mean': emission_score_mean,
        'emission_score_std': emission_score_std,
        'days_since_service': days_since_service,
        'temperature_avg': temperature_avg,
        'rpm_variance': rpm_variance,
        'days_until_service': days_until
    })

    logger.info(f"\n   📊 Dataset: {len(df)} samples")

    X = df.drop('days_until_service', axis=1)
    y = df['days_until_service']
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # Train
    predictor = MaintenancePredictor()
    predictor.train(X_train, y_train)

    # Evaluate
    y_pred = []
    for idx in range(len(X_test)):
        features = X_test.iloc[idx].to_dict()
        prediction = predictor.predict(features)
        y_pred.append(prediction['days_until_service'])

    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)

    logger.info(f"\n   📈 Results:")
    logger.info(f"      MAE:  {mae:.2f} days")
    logger.info(f"      R²:   {r2:.4f}")
    logger.info(f"      Accuracy: {'GOOD' if r2 > 0.7 else 'FAIR'}")

    # Save
    model_path = os.path.join(MODELS_DIR, "maintenance_rf.pkl")
    predictor.save_model(model_path)
    logger.info(f"\n   💾 Saved: {model_path}")

    # Demo prediction
    demo = predictor.predict({
        'runtime_hours': 1250.0,
        'emission_score_mean': 65.0,
        'emission_score_std': 15.0,
        'days_since_service': 75,
        'temperature_avg': 78.0,
        'rpm_variance': 250.0
    })
    logger.info(f"   🔮 Demo Prediction: {demo}")

    return r2


# ============================================================================
# 2. ANOMALY DETECTION MODEL
# ============================================================================

def train_anomaly_model():
    """Train Isolation Forest for emission anomaly detection"""
    logger.info("\n" + "=" * 60)
    logger.info("🚨 TRAINING: Anomaly Detection Model")
    logger.info("   Algorithm: Isolation Forest (unsupervised)")
    logger.info("=" * 60)

    np.random.seed(42)
    n_normal = 4500
    n_anomaly = 500

    # Normal readings
    normal_emission = np.clip(np.random.normal(45, 15, n_normal), 0, 100)
    normal_pm25 = np.clip(np.random.normal(30, 10, n_normal), 0, 100)
    normal_emission_delta = np.random.normal(0, 3, n_normal)
    normal_pm25_delta = np.random.normal(0, 2, n_normal)

    # Anomalous readings (spikes)
    anomaly_emission = np.clip(np.random.normal(85, 10, n_anomaly), 60, 100)
    anomaly_pm25 = np.clip(np.random.normal(70, 15, n_anomaly), 50, 150)
    anomaly_emission_delta = np.random.normal(20, 10, n_anomaly)
    anomaly_pm25_delta = np.random.normal(15, 8, n_anomaly)

    # Combine
    X = pd.DataFrame({
        'emission_score': np.concatenate([normal_emission, anomaly_emission]),
        'pm25': np.concatenate([normal_pm25, anomaly_pm25]),
        'emission_delta': np.concatenate([normal_emission_delta, anomaly_emission_delta]),
        'pm25_delta': np.concatenate([normal_pm25_delta, anomaly_pm25_delta]),
    })
    labels = np.concatenate([np.ones(n_normal), -np.ones(n_anomaly)])  # 1=normal, -1=anomaly

    logger.info(f"\n   📊 Dataset: {len(X)} samples ({n_normal} normal, {n_anomaly} anomalies)")

    # Scale
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Train Isolation Forest
    model = IsolationForest(
        contamination=0.1,
        max_samples=256,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_scaled)

    # Evaluate
    predictions = model.predict(X_scaled)
    accuracy = accuracy_score(labels, predictions)

    logger.info(f"\n   📈 Results:")
    logger.info(f"      Accuracy: {accuracy:.2%}")
    logger.info(f"      True Anomalies Found: {(predictions == -1).sum()}/{n_anomaly + n_normal}")

    # Save
    model_path = os.path.join(MODELS_DIR, "anomaly_if.pkl")
    joblib.dump({
        'model': model,
        'scaler': scaler,
        'version': 'v1.0.0',
        'z_threshold': 3.0,
        'feature_names': ['emission_score', 'pm25', 'emission_delta', 'pm25_delta']
    }, model_path)
    logger.info(f"\n   💾 Saved: {model_path}")

    return accuracy


# ============================================================================
# 3. AQI FORECAST MODEL
# ============================================================================

def train_forecast_model():
    """Train a GradientBoosting model for AQI forecasting (no Prophet dependency)"""
    logger.info("\n" + "=" * 60)
    logger.info("📈 TRAINING: AQI Forecast Model")
    logger.info("   Algorithm: Gradient Boosting Regressor")
    logger.info("   (Replacing Prophet to avoid heavy dependency)")
    logger.info("=" * 60)

    np.random.seed(42)

    # Generate 60 days of hourly AQI data for 5 wards
    wards = ['dharampeth', 'sadar', 'nehru_nagar', 'dhantoli', 'hanuman_nagar']
    ward_base_aqi = {'dharampeth': 87, 'sadar': 121, 'nehru_nagar': 64, 'dhantoli': 94, 'hanuman_nagar': 73}

    all_data = []
    hours = 60 * 24  # 60 days of hourly data

    for ward in wards:
        base = ward_base_aqi[ward]
        for h in range(hours):
            hour_of_day = h % 24
            day_of_week = (h // 24) % 7

            # Realistic daily pattern
            if 0 <= hour_of_day < 6:
                daily_effect = -15    # Low at night
            elif 8 <= hour_of_day < 11:
                daily_effect = 20     # Morning rush
            elif 11 <= hour_of_day < 16:
                daily_effect = 10     # Midday
            elif 17 <= hour_of_day < 20:
                daily_effect = 25     # Evening rush
            else:
                daily_effect = 0

            # Weekend effect (less traffic)
            weekend_effect = -10 if day_of_week >= 5 else 0

            # Random noise + slow trend
            noise = np.random.normal(0, 5)
            trend = h * 0.001  # very slight upward trend

            aqi = base + daily_effect + weekend_effect + noise + trend
            aqi = max(10, min(500, aqi))

            all_data.append({
                'ward': ward,
                'hour_of_day': hour_of_day,
                'day_of_week': day_of_week,
                'hour_sin': np.sin(2 * np.pi * hour_of_day / 24),
                'hour_cos': np.cos(2 * np.pi * hour_of_day / 24),
                'day_sin': np.sin(2 * np.pi * day_of_week / 7),
                'day_cos': np.cos(2 * np.pi * day_of_week / 7),
                'base_aqi': base,
                'aqi': aqi
            })

    df = pd.DataFrame(all_data)
    logger.info(f"\n   📊 Dataset: {len(df)} samples ({len(wards)} wards × {hours} hours)")

    # Features and target
    feature_cols = ['hour_of_day', 'day_of_week', 'hour_sin', 'hour_cos', 'day_sin', 'day_cos', 'base_aqi']
    X = df[feature_cols]
    y = df['aqi']

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # Scale
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # Train Gradient Boosting
    model = GradientBoostingRegressor(
        n_estimators=200,
        max_depth=5,
        learning_rate=0.1,
        random_state=42
    )
    model.fit(X_train_scaled, y_train)

    # Evaluate
    y_pred = model.predict(X_test_scaled)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)

    logger.info(f"\n   📈 Results:")
    logger.info(f"      MAE:  {mae:.2f} AQI points")
    logger.info(f"      R²:   {r2:.4f}")

    # Save
    model_path = os.path.join(MODELS_DIR, "forecast_gbr.pkl")
    joblib.dump({
        'model': model,
        'scaler': scaler,
        'version': 'v2.1.0',
        'model_type': 'gradient_boosting',
        'feature_cols': feature_cols,
        'ward_base_aqi': ward_base_aqi,
        'wards': wards
    }, model_path)
    logger.info(f"\n   💾 Saved: {model_path}")

    return r2


# ============================================================================
# MAIN
# ============================================================================

if __name__ == "__main__":
    logger.info("\n🚀 EcoTronics ML Pipeline - Training All Models")
    logger.info(f"   Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info(f"   Models dir: {MODELS_DIR}\n")

    r2_maint = train_maintenance_model()
    acc_anom = train_anomaly_model()
    r2_forecast = train_forecast_model()

    logger.info("\n" + "=" * 60)
    logger.info("✅ ALL MODELS TRAINED SUCCESSFULLY!")
    logger.info("=" * 60)
    logger.info(f"\n   📊 Summary:")
    logger.info(f"      Maintenance Model:  R²={r2_maint:.4f}")
    logger.info(f"      Anomaly Model:      Accuracy={acc_anom:.2%}")
    logger.info(f"      Forecast Model:     R²={r2_forecast:.4f}")
    logger.info(f"\n   📁 Model Files:")
    for f in os.listdir(MODELS_DIR):
        if f.endswith('.pkl'):
            size = os.path.getsize(os.path.join(MODELS_DIR, f))
            logger.info(f"      {f} ({size / 1024:.1f} KB)")
    logger.info(f"\n   🚀 Now start the ML API: python -m uvicorn src.main:app --port 8000")
    logger.info("")
