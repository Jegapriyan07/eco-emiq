"""
Maintenance Prediction Model
Predicts when a device will need maintenance using RandomForest
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
import joblib
import logging
from typing import Dict

logger = logging.getLogger(__name__)


class MaintenancePredictor:
    """
    Predicts days until maintenance needed
    """
    
    def __init__(self):
        self.model = None
        self.scaler = None
        self.version = "v1.2.0"
        self.feature_names = [
            'runtime_hours',
            'emission_score_mean',
            'emission_score_std',
            'days_since_service',
            'temperature_avg',
            'rpm_variance'
        ]
    
    def train(self, X_train: pd.DataFrame, y_train: pd.Series):
        """
        Train the maintenance prediction model
        """
        logger.info("Training maintenance model...")
        
        # Scale features
        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X_train)
        
        # Train Random Forest
        self.model = RandomForestRegressor(
            n_estimators=100,
            max_depth=10,
            min_samples_split=10,
            random_state=42,
            n_jobs=-1
        )
        
        self.model.fit(X_scaled, y_train)
        
        # Calculate feature importance
        importance = pd.DataFrame({
            'feature': self.feature_names,
            'importance': self.model.feature_importances_
        }).sort_values('importance', ascending=False)
        
        logger.info(f"Feature Importance:\n{importance}")
        logger.info("Model trained successfully!")
        
        return self.model
    
    def predict(self, features: Dict) -> Dict:
        """
        Predict maintenance for a single device
        
        Args:
            features: Dictionary with feature values
            
        Returns:
            Dictionary with prediction results
        """
        if self.model is None or self.scaler is None:
            raise ValueError("Model not loaded. Call load_model() first.")
        
        # Convert to DataFrame
        X = pd.DataFrame([features])[self.feature_names]
        
        # Scale
        X_scaled = self.scaler.transform(X)
        
        # Predict
        days_until = int(self.model.predict(X_scaled)[0])
        
        # Get prediction uncertainty (std of tree predictions)
        tree_predictions = np.array([tree.predict(X_scaled)[0] for tree in self.model.estimators_])
        confidence = 1.0 - (tree_predictions.std() / max(tree_predictions.mean(), 1))
        confidence = np.clip(confidence, 0.5, 0.99)
        
        # Determine severity
        if days_until < 7:
            severity = "critical"
            action = "Schedule maintenance immediately"
        elif days_until < 15:
            severity = "high"
            action = "Schedule maintenance within 1 week"
        elif days_until < 30:
            severity = "medium"
            action = f"Schedule maintenance within {days_until} days"
        else:
            severity = "low"
            action = f"Maintenance recommended in {days_until} days"
        
        return {
            "days_until_service": max(0, days_until),
            "confidence": float(confidence),
            "severity": severity,
            "recommended_action": action
        }
    
    def save_model(self, path: str):
        """Save model to disk"""
        if self.model is None:
            raise ValueError("No model to save")
        
        joblib.dump({
            'model': self.model,
            'scaler': self.scaler,
            'version': self.version,
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
            self.feature_names = data.get('feature_names', self.feature_names)
            
            logger.info(f"Model loaded from {path} (version {self.version})")
        except FileNotFoundError:
            logger.warning(f"Model file not found: {path}")
            raise
