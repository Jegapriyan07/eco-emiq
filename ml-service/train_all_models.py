"""EcoTronics - Train All ML Models
Trains from seeded emission_readings (PostgreSQL) when available.
Falls back to in-memory synthetic data if DB is empty.

Run: python train_all_models.py
Requires DATABASE_URL pointing at PostgreSQL.
"""

import sys
import os
import warnings
warnings.filterwarnings('ignore')

current_dir = os.path.dirname(os.path.abspath(__file__))
src_dir = os.path.join(current_dir, "src")
sys.path.insert(0, src_dir)

from dotenv import load_dotenv
load_dotenv(os.path.join(current_dir, '.env'))
load_dotenv(os.path.join(os.path.dirname(current_dir), '.env'))

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score, accuracy_score
from sklearn.ensemble import IsolationForest, GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
import joblib
import logging
from datetime import datetime
from sqlalchemy import text

from db.connection import init_database, is_seeded, get_connection
from db.repository import EmissionRepository
from db.seed import seed_demo_database
from simulation import WARD_PROFILES

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

MODELS_DIR = os.path.join(current_dir, "models")
os.makedirs(MODELS_DIR, exist_ok=True)

repo = EmissionRepository()


def ensure_db():
    init_database()
    if not is_seeded():
        logger.info("📦 Seeding database before training...")
        seed_demo_database()


def train_maintenance_model():
    logger.info("=" * 60)
    logger.info("🔧 TRAINING: Maintenance Prediction Model")
    logger.info("   Algorithm: RandomForest Regressor (100 trees)")
    logger.info("   Data source: emission_readings + devices")
    logger.info("=" * 60)

    from models.maintenance import MaintenancePredictor

    df = repo.get_maintenance_training_frame()

    if len(df) < 3:
        logger.info("   ⚠ Insufficient DB rows — using synthetic fallback")
        np.random.seed(42)
        n = 5000
        df = pd.DataFrame({
            'runtime_hours': np.random.exponential(1000, n),
            'days_since_service': np.random.uniform(0, 180, n),
            'emission_score_mean': np.clip(np.random.normal(50, 20, n), 0, 100),
            'emission_score_std': np.random.exponential(10, n),
            'temperature_avg': np.clip(np.random.normal(75, 10, n), 40, 120),
            'rpm_variance': np.random.exponential(200, n),
        })
        df['days_until_service'] = np.clip(
            90 - df['days_since_service'] * 0.4 - df['emission_score_mean'] / 3
            - df['emission_score_std'] * 1.5 - df['runtime_hours'] / 500 + df['temperature_avg'] / 10,
            0, 180,
        ).astype(int)
    else:
        logger.info(f"   ✅ Loaded {len(df)} device aggregates from PostgreSQL")

    X = df.drop('days_until_service', axis=1)
    y = df['days_until_service']
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    predictor = MaintenancePredictor()
    predictor.train(X_train, y_train)

    y_pred = [
        predictor.predict({k: X_test.iloc[i][k] for k in predictor.feature_names})['days_until_service']
        for i in range(len(X_test))
    ]
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)

    logger.info(f"\n   📈 Results: MAE={mae:.2f} days, R²={r2:.4f}")
    predictor.save_model(os.path.join(MODELS_DIR, "maintenance_rf.pkl"))
    return r2


def train_anomaly_model():
    logger.info("\n" + "=" * 60)
    logger.info("🚨 TRAINING: Anomaly Detection Model")
    logger.info("   Algorithm: Isolation Forest")
    logger.info("   Data source: emission_readings time-series")
    logger.info("=" * 60)

    df = repo.get_anomaly_training_frame()

    if len(df) < 100:
        logger.info("   ⚠ Insufficient DB rows — using synthetic fallback")
        np.random.seed(42)
        n_normal, n_anomaly = 4500, 500
        df = pd.DataFrame({
            'emission_score': np.concatenate([
                np.clip(np.random.normal(45, 15, n_normal), 0, 100),
                np.clip(np.random.normal(85, 10, n_anomaly), 60, 100),
            ]),
            'pm25': np.concatenate([
                np.clip(np.random.normal(30, 10, n_normal), 0, 100),
                np.clip(np.random.normal(70, 15, n_anomaly), 50, 150),
            ]),
            'emission_delta': np.concatenate([np.random.normal(0, 3, n_normal), np.random.normal(20, 10, n_anomaly)]),
            'pm25_delta': np.concatenate([np.random.normal(0, 2, n_normal), np.random.normal(15, 8, n_anomaly)]),
        })
        labels = np.concatenate([np.ones(n_normal), -np.ones(n_anomaly)])
    else:
        logger.info(f"   ✅ Loaded {len(df)} reading pairs from PostgreSQL")
        labels = np.where(df['is_anomaly'] == 1, -1, 1)

    X = df[['emission_score', 'pm25', 'emission_delta', 'pm25_delta']]
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    model = IsolationForest(contamination=0.1, max_samples=256, random_state=42, n_jobs=-1)
    model.fit(X_scaled)
    accuracy = accuracy_score(labels, model.predict(X_scaled))

    logger.info(f"\n   📈 Results: Accuracy={accuracy:.2%}")
    joblib.dump({
        'model': model,
        'scaler': scaler,
        'version': 'v1.0.0',
        'z_threshold': 3.0,
        'feature_names': ['emission_score', 'pm25', 'emission_delta', 'pm25_delta'],
        'data_source': 'emission_readings',
    }, os.path.join(MODELS_DIR, "anomaly_if.pkl"))
    return accuracy


def train_forecast_model():
    logger.info("\n" + "=" * 60)
    logger.info("📈 TRAINING: AQI Forecast Model")
    logger.info("   Algorithm: Gradient Boosting Regressor")
    logger.info("   Data source: ward_sensor emission_readings")
    logger.info("=" * 60)

    df = repo.get_forecast_training_frame()
    ward_base_aqi = repo.get_ward_base_aqi_map()
    wards = list(WARD_PROFILES.keys())

    if len(df) < 100:
        logger.info("   ⚠ Insufficient DB rows — using synthetic fallback")
        np.random.seed(42)
        all_data = []
        hours = 60 * 24
        for ward in wards:
            base = ward_base_aqi[ward]
            for h in range(hours):
                hour_of_day = h % 24
                day_of_week = (h // 24) % 7
                daily_effect = 20 if 8 <= hour_of_day < 11 else 25 if 17 <= hour_of_day < 20 else -15 if hour_of_day < 6 else 10
                weekend_effect = -10 if day_of_week >= 5 else 0
                aqi = max(10, min(500, base + daily_effect + weekend_effect + np.random.normal(0, 5)))
                all_data.append({
                    'ward': ward, 'hour_of_day': hour_of_day, 'day_of_week': day_of_week,
                    'hour_sin': np.sin(2 * np.pi * hour_of_day / 24),
                    'hour_cos': np.cos(2 * np.pi * hour_of_day / 24),
                    'day_sin': np.sin(2 * np.pi * day_of_week / 7),
                    'day_cos': np.cos(2 * np.pi * day_of_week / 7),
                    'base_aqi': base, 'aqi': aqi,
                })
        df = pd.DataFrame(all_data)
    else:
        logger.info(f"   ✅ Loaded {len(df)} hourly ward readings from PostgreSQL")

    feature_cols = ['hour_of_day', 'day_of_week', 'hour_sin', 'hour_cos', 'day_sin', 'day_cos', 'base_aqi']
    X = df[feature_cols]
    y = df['aqi']
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    model = GradientBoostingRegressor(n_estimators=200, max_depth=5, learning_rate=0.1, random_state=42)
    model.fit(X_train_scaled, y_train)

    y_pred = model.predict(X_test_scaled)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)

    logger.info(f"\n   📈 Results: MAE={mae:.2f} AQI, R²={r2:.4f}")
    joblib.dump({
        'model': model,
        'scaler': scaler,
        'version': 'v2.1.0',
        'model_type': 'gradient_boosting',
        'feature_cols': feature_cols,
        'ward_base_aqi': ward_base_aqi,
        'wards': wards,
        'data_source': 'emission_readings',
    }, os.path.join(MODELS_DIR, "forecast_gbr.pkl"))
    return r2


def train_violation_classifier():
    logger.info("\n" + "=" * 60)
    logger.info("⚖️  TRAINING: Violation Classification Model")
    logger.info("   Algorithm: RandomForest Classifier (100 trees)")
    logger.info("   Labels: Compliant | Warning | Violation (CPCB/IEEE thresholds)")
    logger.info("=" * 60)

    from models.violation_classifier import ViolationClassifier, label_from_readings, FEATURE_NAMES

    np.random.seed(42)
    n = 8000
    df = pd.DataFrame({
        'co_ppm': np.clip(np.random.lognormal(2.0, 0.6, n), 0.1, 80),
        'no2_ppm': np.clip(np.random.lognormal(-0.5, 0.5, n), 0.01, 2.0),
        'nh3_ppm': np.clip(np.random.lognormal(2.5, 0.7, n), 0.1, 60),
        'pm25_ugm3': np.clip(np.random.lognormal(3.0, 0.5, n), 1, 120),
        'pm10_ugm3': np.clip(np.random.lognormal(3.5, 0.5, n), 2, 200),
        'exhaust_flow_rate': np.clip(np.random.normal(0.15, 0.05, n), 0.02, 0.5),
        'gas_density': np.clip(np.random.normal(1.2, 0.1, n), 0.8, 1.6),
    })
    df['label'] = df.apply(lambda r: label_from_readings(r.to_dict()), axis=1)

    # Enrich with DB readings when available
    try:
        with get_connection() as conn:
            rows = conn.execute(
                text(
                    """
                    SELECT co, nox AS no2_ppm, pm25 AS pm25_ugm3,
                           pm25 * 1.6 AS pm10_ugm3,
                           co * 0.3 AS nh3_ppm,
                           0.12 AS exhaust_flow_rate, 1.15 AS gas_density
                    FROM emission_readings WHERE co IS NOT NULL LIMIT 500
                    """
                )
            ).mappings().fetchall()
        if rows:
            db_df = pd.DataFrame([dict(r) for r in rows])
            db_df['label'] = db_df.apply(lambda r: label_from_readings(r.to_dict()), axis=1)
            df = pd.concat([df, db_df], ignore_index=True)
            logger.info(f"   ✅ Augmented with {len(db_df)} readings from PostgreSQL")
    except Exception as e:
        logger.info(f"   ⚠ DB augmentation skipped: {e}")

    X = df[FEATURE_NAMES]
    y = df['label']
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    classifier = ViolationClassifier()
    classifier.train(X_train, y_train)

    y_pred = classifier.model.predict(classifier.scaler.transform(X_test))
    accuracy = accuracy_score(y_test, y_pred)
    logger.info(f"\n   📈 Results: Accuracy={accuracy:.2%}")

    out_dir = os.path.join(MODELS_DIR, "violation-classifier")
    os.makedirs(out_dir, exist_ok=True)
    classifier.save_model(os.path.join(out_dir, "violation_rf.pkl"))
    return accuracy


if __name__ == "__main__":
    logger.info("\n🚀 EcoTronics ML Pipeline — train from emission_readings")
    logger.info(f"   Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    ensure_db()
    r2_maint = train_maintenance_model()
    acc_anom = train_anomaly_model()
    r2_forecast = train_forecast_model()
    acc_violation = train_violation_classifier()

    logger.info("\n" + "=" * 60)
    logger.info("✅ ALL MODELS TRAINED FROM DATABASE SCHEMA")
    logger.info("=" * 60)
    logger.info(
        f"   Maintenance R²={r2_maint:.4f} | Anomaly Acc={acc_anom:.2%} | "
        f"Forecast R²={r2_forecast:.4f} | Violation Acc={acc_violation:.2%}"
    )
    logger.info(f"   DB readings: {repo.reading_count()}")
    logger.info("")
