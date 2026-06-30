"""
Anomaly Detection Model
Detects emission spikes using IsolationForest + Z-score
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import joblib
import logging
from typing import List, Dict
from datetime import datetime

logger = logging.getLogger(__name__)


class AnomalyDetector:
    """
    Multi-method anomaly detection for emission spikes
    """
    
    def __init__(self):
        self.model = None
        self.scaler = None
        self.version = "v1.0.0"
        self.z_threshold = 3.0  # Z-score threshold
        self.feature_names = [
            'emission_score',
            'pm25',
            'emission_delta',  # Change from previous reading
            'pm25_delta'
        ]
    
    def train(self, X_train: pd.DataFrame):
        """
        Train the anomaly detection model (unsupervised)
        """
        logger.info("Training anomaly model...")
        
        # Scale features
        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X_train)
        
        # Train Isolation Forest
        self.model = IsolationForest(
            contamination=0.1,  # Expect 10% anomalies
            max_samples=256,
            random_state=42,
            n_jobs=-1
        )
        
        self.model.fit(X_scaled)
        
        logger.info("Anomaly model trained successfully!")
        
        return self.model
    
    def _extract_features(self, readings: List) -> pd.DataFrame:
        """
        Extract features from reading sequence
        """
        df = pd.DataFrame([{
            'timestamp': r.timestamp,
            'emission_score': r.emission_score,
            'pm25': r.pm25,
            'co': r.co if hasattr(r, 'co') else None,
            'nox': r.nox if hasattr(r, 'nox') else None
        } for r in readings])
        
        # Calculate deltas (rate of change)
        df['emission_delta'] = df['emission_score'].diff().fillna(0)
        df['pm25_delta'] = df['pm25'].diff().fillna(0)
        
        return df
    
    def _zscore_method(self, readings: List) -> Dict:
        """
        Fast z-score based anomaly detection
        """
        df = self._extract_features(readings)
        
        # Calculate z-scores
        emission_zscore = np.abs((df['emission_score'].iloc[-1] - df['emission_score'].mean()) / 
                                   (df['emission_score'].std() + 1e-6))
        
        pm25_zscore = np.abs((df['pm25'].iloc[-1] - df['pm25'].mean()) / 
                              (df['pm25'].std() + 1e-6))
        
        max_zscore = max(emission_zscore, pm25_zscore)
        
        is_anomaly = max_zscore > self.z_threshold
        
        return {
            'is_anomaly': bool(is_anomaly),
            'score': float(min(max_zscore / 5.0, 1.0)),  # Normalize to 0-1
            'method': 'zscore',
            'features': {
                'emission_zscore': float(emission_zscore),
                'pm25_zscore': float(pm25_zscore)
            }
        }
    
    def _isolation_forest_method(self, readings: List) -> Dict:
        """
        Isolation Forest based anomaly detection
        """
        if self.model is None or self.scaler is None:
            raise ValueError("Model not loaded")
        
        df = self._extract_features(readings)
        
        # Use only the latest reading for prediction
        latest_features = df[self.feature_names].iloc[[-1]]
        X_scaled = self.scaler.transform(latest_features)
        
        # Predict (-1 = anomaly, 1 = normal)
        prediction = self.model.predict(X_scaled)[0]
        
        # Get anomaly score (lower = more anomalous)
        score = self.model.score_samples(X_scaled)[0]
        
        # Normalize score to 0-1 (0 = normal, 1 = highly anomalous)
        # Typical Isolation Forest scores range from -0.5 to 0.5
        normalized_score = float(np.clip(-score, 0, 1))
        
        is_anomaly = prediction == -1
        
        return {
            'is_anomaly': bool(is_anomaly),
            'score': normalized_score,
            'method': 'isolation_forest',
            'features': {
                'emission_score': float(latest_features['emission_score'].iloc[0]),
                'pm25': float(latest_features['pm25'].iloc[0]),
                'emission_delta': float(latest_features['emission_delta'].iloc[0])
            }
        }
    
    def predict(self, readings: List) -> Dict:
        """
        Detect anomalies using multiple methods
        
        Args:
            readings: List of readings (each with timestamp, emission_score, pm25)
        
        Returns:
            Dictionary with anomaly detection results
        """
        if len(readings) < 2:
            return {
                'is_anomaly': False,
                'score': 0.0,
                'severity': 'low',
                'method': 'insufficient_data'
            }
        
        # Try Isolation Forest if model is loaded
        if self.model is not None and self.scaler is not None:
            try:
                result = self._isolation_forest_method(readings)
            except Exception as e:
                logger.warning(f"Isolation Forest failed: {e}, falling back to z-score")
                result = self._zscore_method(readings)
        else:
            # Fall back to z-score method
            result = self._zscore_method(readings)
        
        # Determine severity
        score = result['score']
        if score > 0.8:
            severity = "critical"
        elif score > 0.6:
            severity = "high"
        elif score > 0.4:
            severity = "medium"
        else:
            severity = "low"
        
        result['severity'] = severity
        
        # Add timestamp if anomaly detected
        if result['is_anomaly']:
            result['timestamp'] = readings[-1].timestamp
        
        return result
    
    def save_model(self, path: str):
        """Save model to disk"""
        if self.model is None:
            raise ValueError("No model to save")
        
        joblib.dump({
            'model': self.model,
            'scaler': self.scaler,
            'version': self.version,
            'z_threshold': self.z_threshold,
            'feature_names': self.feature_names
        }, path)
        
        logger.info(f"Model saved to {path}")
    
    def load_model(self, path: str):
        """Load model from disk"""
        try:
            data = joblib.load(path)
            self.model = data['model']
            self.scaler = data['scaler']
            self.version = data.get('version', 'v1.0.0')
            self.z_threshold = data.get('z_threshold', 3.0)
            self.feature_names = data.get('feature_names', self.feature_names)
            
            logger.info(f"Model loaded from {path} (version {self.version})")
        except FileNotFoundError:
            logger.warning(f"Model file not found: {path}")
            raise
