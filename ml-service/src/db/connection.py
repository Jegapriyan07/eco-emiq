"""PostgreSQL connection via SQLAlchemy + psycopg (DATABASE_URL)."""

from __future__ import annotations

import os
from contextlib import contextmanager
from pathlib import Path
from typing import Generator, Optional

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Connection, Engine

SCHEMA_FILE = Path(__file__).parent / 'schema.sql'

_engine: Optional[Engine] = None

# Load .env from ml-service and repo root (Render injects DATABASE_URL directly)
_ml_root = Path(__file__).resolve().parents[2]
_repo_root = _ml_root.parent
load_dotenv(_ml_root / '.env')
load_dotenv(_repo_root / '.env')


def normalize_database_url(url: str) -> str:
    """Normalize Render/Heroku-style URLs to SQLAlchemy + psycopg3."""
    url = url.strip()
    if url.startswith('postgres://'):
        url = 'postgresql+psycopg://' + url[len('postgres://'):]
    elif url.startswith('postgresql+psycopg2://'):
        url = 'postgresql+psycopg://' + url[len('postgresql+psycopg2://'):]
    elif url.startswith('postgresql://'):
        url = 'postgresql+psycopg://' + url[len('postgresql://'):]
    return url


def get_database_url() -> str:
    """Return DATABASE_URL (required)."""
    url = os.getenv('DATABASE_URL', '').strip()
    if not url:
        raise RuntimeError(
            'DATABASE_URL is not set. Add a PostgreSQL URL, e.g. '
            'postgresql://user:pass@localhost:5432/ecotronics'
        )
    if url.startswith('sqlite:'):
        raise RuntimeError(
            'SQLite is no longer supported. Set DATABASE_URL to a PostgreSQL connection string.'
        )
    return normalize_database_url(url)


def get_engine() -> Engine:
    global _engine
    if _engine is None:
        _engine = create_engine(
            get_database_url(),
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
        )
    return _engine


@contextmanager
def get_connection() -> Generator[Connection, None, None]:
    """Yield a SQLAlchemy connection inside a transaction."""
    with get_engine().begin() as conn:
        yield conn


def _split_sql_statements(script: str) -> list[str]:
    """Split a SQL script into statements (ignores empty / comment-only chunks)."""
    statements = []
    for part in script.split(';'):
        cleaned = '\n'.join(
            line for line in part.splitlines()
            if line.strip() and not line.strip().startswith('--')
        ).strip()
        if cleaned:
            statements.append(cleaned)
    return statements


def init_database() -> None:
    """Create demo tables if they do not exist."""
    schema = SCHEMA_FILE.read_text(encoding='utf-8')
    with get_connection() as conn:
        for statement in _split_sql_statements(schema):
            conn.execute(text(statement))


def is_seeded() -> bool:
    with get_connection() as conn:
        row = conn.execute(text('SELECT COUNT(*) AS c FROM emission_readings')).mappings().fetchone()
        return bool(row and row['c'] > 0)


def database_label() -> str:
    """Safe label for logs/health (host/db only, no credentials)."""
    try:
        url = get_database_url()
        # postgresql+psycopg://user:pass@host:port/dbname
        after_at = url.split('@', 1)[-1] if '@' in url else url
        return f'postgresql://{after_at}'
    except Exception:
        return 'postgresql://(unset)'
