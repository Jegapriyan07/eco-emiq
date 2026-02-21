"""
Train Sensor Confidence Model
Trains ML model to assess sensor reliability and detect hardware failures
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, classification_report
import joblib
import logging
from datetime import datetime
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from src.models.sensor_confidence import SensorConfidenceModel

def generate_training_data():
    """Generate synthetic training data for sensor confidence"""
    np.random.seed(42)
    n_samples = 5000
    
    # Healthy sensors (80% of data)
    n_healthy = int(n_samples * 0.8)
    healthy_data = {
        'value_consistency': np.random.beta(5, 2, n_healthy),  # High consistency
        'response_time': np.random.exponential(1.0, n_healthy),
        'value_range': np.random.gamma(2, 0.5, n_healthy),
        'spike_frequency': np.random.beta(1, 10, n_healthy),  # Low spikes
        'drift_rate': np.random.exponential(0.1, n_healthy),  # Low drift
        'correlation_with_others': np.random.beta(6, 2, n_healthy),  # High correlation
        'noise_level': np.random.beta(2, 5, n_healthy),  # Low noise
        'calibration_age': np.random.exponential(30, n_healthy),  # Recent calibration
    }
    
    # Faulty sensors (20% of data)
    n_faulty = n_samples - n_healthy
    faulty_data = {
        'value_consistency': np.random.beta(2, 5, n_faulty),  # Low consistency
        'response_time': np.random.exponential(3.0, n_faulty),  # Slow response
        'value_range': np.random.gamma(5, 2, n_faulty),  # High range
        'spike_frequency': np.random.beta(5, 2, n_faulty),  # High spikes
        'drift_rate': np.random.exponential(0.8, n_faulty),  # High drift
        'correlation_with_others': np.random.beta(2, 5, n_faulty),  # Low correlation
        'noise_level': np.random.beta(5, 2, n_faulty),  # High noise
        'calibration_age': np.random.exponential(90, n_faulty),  # Old calibration
    }
    
    # Combine
    X = pd.DataFrame({
        **{k: np.concatenate([healthy_data[k], faulty_data[k]]) for k in healthy_data.keys()}
    })
    
    # Labels: 1 = healthy, 0 = faulty
    y = pd.Series([1] * n_healthy + [0] * n_faulty)
    
    return X, y

def main():
    logger.info("=" * 60)
    logger.info("🤖 TRAINING: Sensor Confidence Model")
    logger.info("   Algorithm: RandomForestClassifier + IsolationForest")
    logger.info("=" * 60)
    
    # Generate training data
    logger.info("\n📊 Generating training data...")
    X_train, y_train = generate_training_data()
    logger.info(f"   Dataset: {len(X_train)} samples ({sum(y_train)} healthy, {len(y_train) - sum(y_train)} faulty)")
    
    # Initialize model
    model = SensorConfidenceModel()
    
    # Train model
    logger.info("\n🚀 Training model...")
    model.train(X_train, y_train)
    
    # Evaluate
    logger.info("\n📈 Evaluating model...")
    scaler = model.scaler
    X_scaled = scaler.transform(X_train)
    
    if model.confidence_model:
        predictions = model.confidence_model.predict(X_scaled)
        accuracy = accuracy_score(y_train, predictions)
        logger.info(f"   Accuracy: {accuracy:.4f}")
        logger.info("\n   Classification Report:")
        logger.info(classification_report(y_train, predictions, target_names=['Faulty', 'Healthy']))
    
    # Save model
    models_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")
    os.makedirs(models_dir, exist_ok=True)
    model_path = os.path.join(models_dir, "sensor_confidence.pkl")
    
    model.save_model(model_path)
    logger.info(f"\n✅ Model saved to {model_path}")
    
    logger.info("\n" + "=" * 60)
    logger.info("🎉 Sensor Confidence Model Training Complete!")
    logger.info("=" * 60)

if __name__ == "__main__":
    main()
