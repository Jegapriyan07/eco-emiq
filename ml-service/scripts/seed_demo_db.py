#!/usr/bin/env python3
"""CLI wrapper — run: python scripts/seed_demo_db.py"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'src'))

from db.seed import main_cli  # noqa: E402

if __name__ == '__main__':
    main_cli()
