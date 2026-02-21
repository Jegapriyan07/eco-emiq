"""
AQI Forecast Model
Predicts ward-level AQI using Prophet (time series forecasting)
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import joblib
import logging
from typing import Dict, List

# Prophet will be imported conditionally
try:
    from prophet import Prophet
    PROPHET_AVAILABLE = True
except ImportError:
    PROPHET_AVAILABLE = False
    logging.warning("Prophet not available. Install with: pip install prophet")

logger = logging.getLogger(__name__)


class AQIForecaster:
    """
    Time series forecasting for ward-level AQI
    Uses Prophet for seasonality and trend detection
    """
    
    def __init__(self):
        self.model = None
        self.version = "v2.1.0"
        self.model_type = "prophet"
        self.ward_models = {}  # Store separate model per ward
    
    def train(self, ward_id: str, historical_data: pd.DataFrame):
        """
        Train Prophet model for a specific ward
        
        Args:
            ward_id: Ward identifier
            historical_data: DataFrame with 'ds' (datetime) and 'y' (AQI) columns
        """
        if not PROPHET_AVAILABLE:
            logger.error("Prophet not installed")
            return None
        
        logger.info(f"Training forecast model for ward: {ward_id}")
        
        # Prepare data for Prophet (requires 'ds' and 'y' columns)
        if 'ds' not in historical_data.columns or 'y' not in historical_data.columns:
            historical_data = historical_data.rename(columns={
                'timestamp': 'ds',
                'aqi': 'y'
            })
        
        # Initialize Prophet with custom parameters
        model = Prophet(
            daily_seasonality=True,
            weekly_seasonality=True,
            yearly_seasonality=False,  # Not enough data yet
            changepoint_prior_scale=0.05,
            seasonality_prior_scale=10.0,
            interval_width=0.8  # 80% confidence intervals
        )
        
        # Add custom regressors (if available)
        # model.add_regressor('temperature')
        # model.add_regressor('humidity')
        
        # Fit model
        model.fit(historical_data)
        
        # Store model for this ward
        self.ward_models[ward_id] = model
        
        logger.info(f"Model trained for ward {ward_id}")
        
        return model
    
    def predict(self, ward_id: str, horizon: int = 24) -> Dict:
        """
        Forecast AQI for the next N hours
        
        Args:
            ward_id: Ward identifier
            horizon: Hours to forecast (default 24)
            
        Returns:
            Dictionary with forecast results
        """
        # Demo mode if model not available
        if not PROPHET_AVAILABLE or ward_id not in self.ward_models:
            return self._demo_forecast(ward_id, horizon)
        
        model = self.ward_models[ward_id]
        
        # Create future dataframe
        future = model.make_future_dataframe(periods=horizon, freq='H')
        
        # Make predictions
        forecast = model.predict(future)
        
        # Extract latest predictions
        latest_forecast = forecast.tail(horizon)
        
        # Format results
        forecasts = []
        for idx, row in latest_forecast.iterrows():
            forecasts.append({
                'hour': int((row['ds'] - datetime.now()).total_seconds() / 3600),
                'aqi': round(float(row['yhat']), 1),
                'lower_bound': round(float(row['yhat_lower']), 1),
                'upper_bound': round(float(row['yhat_upper']), 1)
            })
        
        # Calculate confidence based on interval width
        interval_width = (latest_forecast['yhat_upper'] - latest_forecast['yhat_lower']).mean()
        confidence = float(np.clip(1.0 - (interval_width / 100.0), 0.5, 0.95))
        
        return {
            'current_aqi': 85.0,  # From database (placeholder)
            'forecasts': forecasts,
            'confidence': confidence
        }
    
    def _demo_forecast(self, ward_id: str, horizon: int) -> Dict:
        """
        Demo forecast using simple pattern
        """
        current_aqi = 85.0
        forecasts = []
        
        # Simulate daily pattern (pollution higher during day)
        current_hour = datetime.now().hour
        
        for h in range(1, min(horizon + 1, 73)):
            hour_of_day = (current_hour + h) % 24
            
            # Simple pattern: lower at night (0-6), higher during rush hours (8-10, 17-19)
            if 0 <= hour_of_day < 6:
                aqi_adjustment = -10
            elif 8 <= hour_of_day < 10 or 17 <= hour_of_day < 19:
                aqi_adjustment = 15
            else:
                aqi_adjustment = 5
            
            # Add some randomness
            noise = np.random.normal(0, 3)
            
            aqi_value = current_aqi + aqi_adjustment + noise
            
            # Only add specific checkpoints
            if h in [1, 6, 12, 18, 24, 48, 72]:
                forecasts.append({
                    'hour': h,
                    'aqi': round(aqi_value, 1),
                    'lower_bound': round(aqi_value - 8, 1),
                    'upper_bound': round(aqi_value + 8, 1)
                })
        
        return {
            'current_aqi': current_aqi,
            'forecasts': forecasts,
            'confidence': 0.80
        }
    
    def save_model(self, path: str):
        """Save all ward models to disk"""
        if not self.ward_models:
            raise ValueError("No models to save")
        
        joblib.dump({
            'ward_models': self.ward_models,
            'version': self.version,
            'model_type': self.model_type
        }, path)
        
        logger.info(f"Models saved to {path}")
    
    def load_model(self, path: str):
        """Load ward models from disk"""
        try:
            data = joblib.load(path)
            self.ward_models = data['ward_models']
            self.version = data.get('version', 'v1.0.0')
            self.model_type = data.get('model_type', 'prophet')
            
            logger.info(f"Models loaded from {path} (version {self.version})")
        except FileNotFoundError:
            logger.warning(f"Model file not found: {path}")
            raise
