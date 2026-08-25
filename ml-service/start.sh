#!/usr/bin/env bash
# Render / production start for EcoTronics ML Service
set -euo pipefail
cd "$(dirname "$0")"
PORT="${PORT:-8000}"
exec uvicorn src.main:app --host 0.0.0.0 --port "$PORT"
