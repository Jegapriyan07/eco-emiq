"""
Training Script - Maintenance Prediction Model
Trains RandomForest model for predicting maintenance needs
"""

import sys
import os

# Add the 'src' directory to the Python path
# This ensures we can import from 'models' regardless of where the script is run from
current_dir = os.path.dirname(os.path.abspath(__file__))
src_dir = os.path.dirname(current_dir)
if src_dir not in sys.path:
    sys.path.append(src_dir)

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
from models.maintenance import MaintenancePredictor
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def generate_synthetic_data(n_samples=5000):
    """
    Generate synthetic training data
    (Replace with real data from database)
    """
    np.random.seed(42)
    
    # Features
    runtime_hours = np.random.exponential(1000, n_samples)
    days_since_service = np.random.uniform(0, 180, n_samples)
    emission_score_mean = np.random.normal(50, 20, n_samples)
    emission_score_std = np.random.exponential(10, n_samples)
    temperature_avg = np.random.normal(75, 10, n_samples)
    rpm_variance = np.random.exponential(200, n_samples)
    
    # Target: Days until maintenance (based on features)
    # Simplified model: maintenance needed when conditions degrade
    base_days = 90
    days_until = (
        base_days 
        - (days_since_service * 0.5)
        - (emission_score_mean / 2)
        - (emission_score_std * 2)
        + np.random.normal(0, 5, n_samples)
    )
    days_until = np.clip(days_until, 0, 180)
    
    df = pd.DataFrame({
        'runtime_hours': runtime_hours,
        'emission_score_mean': emission_score_mean,
        'emission_score_std': emission_score_std,
        'days_since_service': days_since_service,
        'temperature_avg': temperature_avg,
        'rpm_variance': rpm_variance,
        'days_until_service': days_until
    })
    
    return df


def main():
    """
    Main training pipeline
    """
    logger.info("=" * 60)
    logger.info("MAINTENANCE PREDICTION MODEL TRAINING")
    logger.info("=" * 60)
    
    # 1. Load/Generate Data
    logger.info("\n1. Loading data...")
    df = generate_synthetic_data(n_samples=5000)
    logger.info(f"   Loaded {len(df)} samples")
    logger.info(f"   Features: {df.columns.tolist()[:-1]}")
    
    # 2. Split data
    logger.info("\n2. Splitting data...")
    X = df.drop('days_until_service', axis=1)
    y = df['days_until_service']
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    logger.info(f"   Training: {len(X_train)} samples")
    logger.info(f"   Testing:  {len(X_test)} samples")
    
    # 3. Train model
    logger.info("\n3. Training model...")
    predictor = MaintenancePredictor()
    predictor.train(X_train, y_train)
    
    # 4. Evaluate
    logger.info("\n4. Evaluating model...")
    y_pred = []
    for idx in range(len(X_test)):
        features = X_test.iloc[idx].to_dict()
        prediction = predictor.predict(features)
        y_pred.append(prediction['days_until_service'])
    
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    logger.info(f"   MAE: {mae:.2f} days")
    logger.info(f"   R²:  {r2:.4f}")
    
    # 5. Save model
    logger.info("\n5. Saving model...")
    # Get models directory relative to src/training (where this script is)
    models_dir = os.path.join(os.path.dirname(src_dir), "models")
    os.makedirs(models_dir, exist_ok=True)
    model_path = os.path.join(models_dir, "maintenance_rf.pkl")
    
    predictor.save_model(model_path)
    logger.info(f"   Model saved to {model_path}")
    
    # 6. Test prediction
    logger.info("\n6. Testing prediction...")
    test_features = {
        'runtime_hours': 1250.0,
        'emission_score_mean': 55.0,
        'emission_score_std': 15.0,
        'days_since_service': 75,
        'temperature_avg': 78.0,
        'rpm_variance': 250.0
    }
    
    result = predictor.predict(test_features)
    logger.info(f"   Test Result: {result}")
    
    logger.info("\n" + "=" * 60)
    logger.info("TRAINING COMPLETE!")
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
