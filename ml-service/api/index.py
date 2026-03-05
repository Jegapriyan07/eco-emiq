"""
Vercel serverless entry point for EcoTronics ML Service.
This file bridges Vercel's Python runtime with the FastAPI app.
"""
import sys
import os

# Add parent directories to path so imports work
current_dir = os.path.dirname(os.path.abspath(__file__))
ml_service_dir = os.path.dirname(current_dir)
src_dir = os.path.join(ml_service_dir, "src")

for d in [ml_service_dir, src_dir]:
    if d not in sys.path:
        sys.path.insert(0, d)

# Import the FastAPI app
from src.main import app
