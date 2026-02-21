"""
Security Middleware
Implements: rate limiting, TLS enforcement, security headers,
device key rotation, and secrets validation.
"""

import time
import hashlib
import secrets
import logging
import os
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, Tuple, Optional

from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


# ════════════════════════════════════════════
# RATE LIMITER (sliding window, in-memory)
# In production: use Redis with lua scripts
# ════════════════════════════════════════════

class RateLimiter:
    """
    Sliding window rate limiter.
    Tracks requests per (IP, endpoint) pair.
    """

    def __init__(self):
        # {key: [(timestamp, count), ...]}
        self._windows: Dict[str, list] = defaultdict(list)

    def is_allowed(
        self,
        key: str,
        limit: int,
        window_seconds: int,
    ) -> Tuple[bool, dict]:
        now = time.time()
        window_start = now - window_seconds

        # Clean old entries
        self._windows[key] = [
            (ts, count) for ts, count in self._windows[key]
            if ts > window_start
        ]

        # Count requests in window
        total = sum(count for _, count in self._windows[key])

        if total >= limit:
            oldest = self._windows[key][0][0] if self._windows[key] else now
            retry_after = int(oldest + window_seconds - now) + 1
            return False, {
                "limit": limit,
                "remaining": 0,
                "reset_in_seconds": retry_after,
            }

        # Add current request
        self._windows[key].append((now, 1))
        return True, {
            "limit": limit,
            "remaining": limit - total - 1,
            "reset_in_seconds": window_seconds,
        }


# Global rate limiter instance
_rate_limiter = RateLimiter()

# Rate limit tiers (requests per minute)
RATE_LIMITS = {
    "/api/v1/ingest": {"limit": 120, "window": 60},       # Device ingestion: 120/min
    "/api/v1/auth": {"limit": 10, "window": 60},           # Auth: 10/min (brute force protection)
    "/api/v1/ml": {"limit": 60, "window": 60},             # ML predictions: 60/min
    "/api/v1/saas/admin": {"limit": 30, "window": 60},     # Admin: 30/min
    "default": {"limit": 200, "window": 60},               # Default: 200/min
}


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Apply rate limiting to all API routes"""

    async def dispatch(self, request: Request, call_next):
        # Skip health checks
        if request.url.path in ("/health", "/", "/docs", "/openapi.json"):
            return await call_next(request)

        # Determine client key
        client_ip = request.client.host if request.client else "unknown"
        tenant_id = request.headers.get("X-Tenant-Id", "")
        key = f"{client_ip}:{tenant_id}:{request.url.path}"

        # Find applicable rate limit
        rate_config = RATE_LIMITS.get("default", {"limit": 200, "window": 60})
        for path_prefix, config in RATE_LIMITS.items():
            if path_prefix != "default" and request.url.path.startswith(path_prefix):
                rate_config = config
                break

        allowed, info = _rate_limiter.is_allowed(
            key=key,
            limit=rate_config["limit"],
            window_seconds=rate_config["window"],
        )

        if not allowed:
            logger.warning(f"Rate limit exceeded: {client_ip} on {request.url.path}")
            return JSONResponse(
                status_code=429,
                content={
                    "error": "rate_limit_exceeded",
                    "message": f"Too many requests. Retry after {info['reset_in_seconds']}s",
                    "retry_after": info["reset_in_seconds"],
                },
                headers={
                    "X-RateLimit-Limit": str(info["limit"]),
                    "X-RateLimit-Remaining": "0",
                    "Retry-After": str(info["reset_in_seconds"]),
                },
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(info["limit"])
        response.headers["X-RateLimit-Remaining"] = str(info["remaining"])
        return response


# ════════════════════════════════════════════
# SECURITY HEADERS MIDDLEWARE
# ════════════════════════════════════════════

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses"""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # OWASP recommended headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "connect-src 'self' https:;"
        )

        # Remove server fingerprinting
        response.headers.pop("Server", None)
        response.headers.pop("X-Powered-By", None)

        return response


# ════════════════════════════════════════════
# TLS ENFORCEMENT
# ════════════════════════════════════════════

class TLSEnforcementMiddleware(BaseHTTPMiddleware):
    """Redirect HTTP to HTTPS in production"""

    def __init__(self, app, enforce_tls: bool = False):
        super().__init__(app)
        self.enforce_tls = enforce_tls

    async def dispatch(self, request: Request, call_next):
        if self.enforce_tls:
            # Check if request came over HTTPS
            forwarded_proto = request.headers.get("X-Forwarded-Proto", "")
            if forwarded_proto == "http":
                https_url = str(request.url).replace("http://", "https://", 1)
                return JSONResponse(
                    status_code=301,
                    headers={"Location": https_url},
                    content={"redirect": https_url},
                )

            # Add HSTS header
            response = await call_next(request)
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )
            return response

        return await call_next(request)


# ════════════════════════════════════════════
# DEVICE KEY ROTATION
# ════════════════════════════════════════════

class DeviceKeyManager:
    """
    Manages device API key lifecycle:
    - Generation with cryptographic randomness
    - Rotation with grace period (old key valid for 24h after rotation)
    - Revocation
    """

    def __init__(self):
        # {device_id: {"current": key, "previous": key, "rotated_at": datetime}}
        self._keys: Dict[str, dict] = {}
        self.grace_period_hours = 24

    def generate_key(self) -> str:
        """Generate a cryptographically secure device API key"""
        raw = secrets.token_urlsafe(18)  # 24 chars after base64url
        return f"dk-{raw[:24]}"

    def register_device(self, device_id: str) -> str:
        """Register a new device and return its API key"""
        key = self.generate_key()
        self._keys[device_id] = {
            "current": key,
            "previous": None,
            "created_at": datetime.utcnow().isoformat(),
            "rotated_at": None,
            "revoked": False,
        }
        logger.info(f"Device registered: {device_id}")
        return key

    def rotate_key(self, device_id: str) -> Tuple[str, str]:
        """
        Rotate device API key.
        Returns (new_key, old_key).
        Old key remains valid for grace_period_hours.
        """
        if device_id not in self._keys:
            raise ValueError(f"Device {device_id} not found")

        old_key = self._keys[device_id]["current"]
        new_key = self.generate_key()

        self._keys[device_id]["previous"] = old_key
        self._keys[device_id]["current"] = new_key
        self._keys[device_id]["rotated_at"] = datetime.utcnow().isoformat()

        logger.info(f"Key rotated for device: {device_id}")
        return new_key, old_key

    def validate_key(self, device_id: str, api_key: str) -> Tuple[bool, str]:
        """
        Validate an API key for a device.
        Returns (is_valid, reason).
        """
        if device_id not in self._keys:
            return False, "Device not found"

        entry = self._keys[device_id]

        if entry.get("revoked"):
            return False, "Device key revoked"

        # Check current key
        if secrets.compare_digest(entry["current"], api_key):
            return True, "valid"

        # Check previous key (grace period)
        if entry.get("previous") and entry.get("rotated_at"):
            rotated_at = datetime.fromisoformat(entry["rotated_at"])
            grace_expires = rotated_at + timedelta(hours=self.grace_period_hours)
            if datetime.utcnow() < grace_expires:
                if secrets.compare_digest(entry["previous"], api_key):
                    logger.warning(
                        f"Device {device_id} using old key — "
                        f"grace period expires {grace_expires.isoformat()}"
                    )
                    return True, "valid_old_key_grace_period"

        return False, "Invalid API key"

    def revoke_key(self, device_id: str) -> bool:
        """Permanently revoke a device's API key"""
        if device_id not in self._keys:
            return False
        self._keys[device_id]["revoked"] = True
        self._keys[device_id]["revoked_at"] = datetime.utcnow().isoformat()
        logger.warning(f"Key revoked for device: {device_id}")
        return True

    def get_key_info(self, device_id: str) -> Optional[dict]:
        """Get key metadata (never returns the actual key)"""
        entry = self._keys.get(device_id)
        if not entry:
            return None
        return {
            "device_id": device_id,
            "has_current_key": bool(entry.get("current")),
            "has_previous_key": bool(entry.get("previous")),
            "created_at": entry.get("created_at"),
            "rotated_at": entry.get("rotated_at"),
            "revoked": entry.get("revoked", False),
            "grace_period_hours": self.grace_period_hours,
        }


# ════════════════════════════════════════════
# SECRETS VALIDATION
# ════════════════════════════════════════════

REQUIRED_SECRETS = [
    "SECRET_KEY",
    "DATABASE_URL",
]

OPTIONAL_SECRETS = [
    "SMTP_HOST",
    "SMTP_PASSWORD",
    "MQTT_BROKER_HOST",
    "STRIPE_SECRET_KEY",
    "TWILIO_ACCOUNT_SID",
    "REDIS_URL",
]


def validate_secrets(strict: bool = False) -> dict:
    """
    Validate that required secrets are set.
    Returns a report of missing/present secrets.
    """
    report = {"missing_required": [], "missing_optional": [], "present": []}

    for secret in REQUIRED_SECRETS:
        val = os.environ.get(secret)
        if not val:
            report["missing_required"].append(secret)
        else:
            report["present"].append(secret)

    for secret in OPTIONAL_SECRETS:
        val = os.environ.get(secret)
        if not val:
            report["missing_optional"].append(secret)
        else:
            report["present"].append(secret)

    if strict and report["missing_required"]:
        raise RuntimeError(
            f"Missing required secrets: {report['missing_required']}. "
            "Set these environment variables before starting the service."
        )

    return report


# Singleton instances
device_key_manager = DeviceKeyManager()
