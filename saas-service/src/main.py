"""
EcoTronics SaaS Multi-Tenancy Service
Handles: tenants, subscriptions, device quotas, billing placeholders
"""

import sys
import os
import logging
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import Optional

from fastapi import FastAPI, HTTPException, Header, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

from tenant_store import TenantStore
from subscription_plans import PLANS, PlanName
from quota_manager import QuotaManager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

store: Optional[TenantStore] = None
quota: Optional[QuotaManager] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global store, quota
    logger.info("Starting SaaS Service...")
    store = TenantStore()
    store.seed_demo_data()
    quota = QuotaManager(store)
    logger.info(f"✓ SaaS Service ready — {len(store.tenants)} demo tenants loaded")
    yield
    logger.info("Shutting down SaaS Service...")


app = FastAPI(
    title="EcoTronics SaaS Service",
    description="Multi-tenancy, subscriptions, device quotas, billing",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ════════════════════════════════════════════
# TENANT-AWARE MIDDLEWARE
# ════════════════════════════════════════════

@app.middleware("http")
async def tenant_middleware(request: Request, call_next):
    """
    Injects tenant context into every request.
    Reads X-Tenant-Id header; validates tenant exists and is active.
    Super-admin routes bypass tenant check.
    """
    path = request.url.path
    bypass_paths = ["/health", "/docs", "/openapi.json", "/api/v1/saas/admin", "/api/v1/saas/plans"]

    if any(path.startswith(p) for p in bypass_paths):
        return await call_next(request)

    tenant_id = request.headers.get("X-Tenant-Id")
    if tenant_id and store:
        tenant = store.get_tenant(tenant_id)
        if tenant and tenant["status"] == "active":
            request.state.tenant = tenant
        else:
            request.state.tenant = None
    else:
        request.state.tenant = None

    return await call_next(request)


# ════════════════════════════════════════════
# HEALTH
# ════════════════════════════════════════════

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "saas-service",
        "tenants": len(store.tenants) if store else 0,
        "timestamp": datetime.utcnow().isoformat(),
    }


# ════════════════════════════════════════════
# SUBSCRIPTION PLANS (public)
# ════════════════════════════════════════════

@app.get("/api/v1/saas/plans")
async def list_plans():
    """List all available subscription plans"""
    return {"plans": list(PLANS.values())}


@app.get("/api/v1/saas/plans/{plan_name}")
async def get_plan(plan_name: str):
    if plan_name not in PLANS:
        raise HTTPException(status_code=404, detail="Plan not found")
    return PLANS[plan_name]


# ════════════════════════════════════════════
# SUPER-ADMIN — Platform-level management
# ════════════════════════════════════════════

def require_super_admin(x_user_role: str = Header(..., alias="X-User-Role")):
    if x_user_role != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    return x_user_role


@app.get("/api/v1/saas/admin/tenants")
async def admin_list_tenants(
    status: Optional[str] = None,
    plan: Optional[str] = None,
    _: str = Depends(require_super_admin),
):
    """Super-admin: list all tenants"""
    tenants = list(store.tenants.values())
    if status:
        tenants = [t for t in tenants if t["status"] == status]
    if plan:
        tenants = [t for t in tenants if t["plan"] == plan]
    return {
        "tenants": tenants,
        "total": len(tenants),
        "summary": store.get_platform_summary(),
    }


@app.post("/api/v1/saas/admin/tenants")
async def admin_create_tenant(
    payload: dict,
    _: str = Depends(require_super_admin),
):
    """Super-admin: onboard a new customer"""
    required = ["org_name", "owner_email", "plan"]
    for field in required:
        if field not in payload:
            raise HTTPException(status_code=400, detail=f"'{field}' required")

    plan_name = payload["plan"]
    if plan_name not in PLANS:
        raise HTTPException(status_code=400, detail=f"Invalid plan. Choose: {list(PLANS.keys())}")

    tenant = store.create_tenant(
        org_name=payload["org_name"],
        owner_email=payload["owner_email"],
        plan=plan_name,
        city=payload.get("city", ""),
        contact_phone=payload.get("contact_phone", ""),
    )

    logger.info(f"New tenant onboarded: {tenant['org_name']} ({tenant['id']}) on {plan_name} plan")
    return {"created": True, "tenant": tenant}


@app.patch("/api/v1/saas/admin/tenants/{tenant_id}")
async def admin_update_tenant(
    tenant_id: str,
    payload: dict,
    _: str = Depends(require_super_admin),
):
    """Super-admin: update tenant (plan, status, limits)"""
    tenant = store.get_tenant(tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    updated = store.update_tenant(tenant_id, payload)
    return {"updated": True, "tenant": updated}


@app.delete("/api/v1/saas/admin/tenants/{tenant_id}")
async def admin_suspend_tenant(
    tenant_id: str,
    _: str = Depends(require_super_admin),
):
    """Super-admin: suspend a tenant"""
    tenant = store.get_tenant(tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    store.update_tenant(tenant_id, {"status": "suspended"})
    return {"suspended": True, "tenant_id": tenant_id}


@app.get("/api/v1/saas/admin/platform/summary")
async def admin_platform_summary(_: str = Depends(require_super_admin)):
    """Super-admin: platform-wide metrics"""
    return store.get_platform_summary()


@app.get("/api/v1/saas/admin/platform/revenue")
async def admin_revenue(_: str = Depends(require_super_admin)):
    """Super-admin: MRR and revenue breakdown"""
    return store.get_revenue_summary()


# ════════════════════════════════════════════
# ORG DASHBOARD — Tenant-level
# ════════════════════════════════════════════

@app.get("/api/v1/saas/org/profile")
async def org_profile(
    x_tenant_id: str = Header(..., alias="X-Tenant-Id"),
    x_user_role: str = Header(..., alias="X-User-Role"),
):
    """Get org profile and subscription details"""
    if x_user_role not in ("city_admin", "org_admin"):
        raise HTTPException(status_code=403, detail="Org admin access required")

    tenant = store.get_tenant(x_tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    plan = PLANS.get(tenant["plan"], {})
    usage = quota.get_usage(x_tenant_id)

    return {
        "tenant": tenant,
        "plan": plan,
        "usage": usage,
        "quota_status": quota.check_all_quotas(x_tenant_id),
    }


@app.get("/api/v1/saas/org/usage")
async def org_usage(
    x_tenant_id: str = Header(..., alias="X-Tenant-Id"),
    x_user_role: str = Header(..., alias="X-User-Role"),
):
    """Get org usage metrics"""
    if x_user_role not in ("city_admin", "org_admin"):
        raise HTTPException(status_code=403, detail="Org admin access required")

    return quota.get_usage(x_tenant_id)


@app.get("/api/v1/saas/org/devices")
async def org_devices(
    x_tenant_id: str = Header(..., alias="X-Tenant-Id"),
):
    """List devices belonging to this org"""
    devices = store.get_tenant_devices(x_tenant_id)
    tenant = store.get_tenant(x_tenant_id)
    plan = PLANS.get(tenant["plan"], {}) if tenant else {}

    return {
        "devices": devices,
        "count": len(devices),
        "quota": plan.get("limits", {}).get("max_devices", 0),
        "quota_used_pct": round(len(devices) / max(plan.get("limits", {}).get("max_devices", 1), 1) * 100, 1),
    }


@app.post("/api/v1/saas/org/devices")
async def org_register_device(
    payload: dict,
    x_tenant_id: str = Header(..., alias="X-Tenant-Id"),
    x_user_role: str = Header(..., alias="X-User-Role"),
):
    """Register a new device under this org"""
    if x_user_role not in ("city_admin", "org_admin"):
        raise HTTPException(status_code=403, detail="Org admin access required")

    # Check device quota
    can_add, reason = quota.can_add_device(x_tenant_id)
    if not can_add:
        raise HTTPException(status_code=402, detail=f"Device quota exceeded: {reason}")

    device_id = payload.get("device_id") or f"dev-{str(uuid.uuid4())[:8]}"
    device = store.register_device(
        tenant_id=x_tenant_id,
        device_id=device_id,
        device_name=payload.get("device_name", "New Device"),
        device_type=payload.get("device_type", "generator"),
        location=payload.get("location", {}),
    )

    return {"registered": True, "device": device}


@app.delete("/api/v1/saas/org/devices/{device_id}")
async def org_remove_device(
    device_id: str,
    x_tenant_id: str = Header(..., alias="X-Tenant-Id"),
    x_user_role: str = Header(..., alias="X-User-Role"),
):
    """Remove a device from this org"""
    if x_user_role not in ("city_admin", "org_admin"):
        raise HTTPException(status_code=403, detail="Org admin access required")

    success = store.remove_device(tenant_id=x_tenant_id, device_id=device_id)
    if not success:
        raise HTTPException(status_code=404, detail="Device not found in this org")

    return {"removed": True, "device_id": device_id}


# ════════════════════════════════════════════
# BILLING — Stripe placeholders
# ════════════════════════════════════════════

@app.get("/api/v1/saas/billing/portal")
async def billing_portal(
    x_tenant_id: str = Header(..., alias="X-Tenant-Id"),
):
    """
    Placeholder: Returns Stripe Customer Portal URL.
    In production: create a Stripe Billing Portal session.
    """
    tenant = store.get_tenant(x_tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    return {
        "portal_url": f"https://billing.stripe.com/session/demo_{x_tenant_id}",
        "note": "Stripe integration placeholder — configure STRIPE_SECRET_KEY to enable",
        "tenant_id": x_tenant_id,
        "current_plan": tenant["plan"],
    }


@app.post("/api/v1/saas/billing/upgrade")
async def billing_upgrade(
    payload: dict,
    x_tenant_id: str = Header(..., alias="X-Tenant-Id"),
    x_user_role: str = Header(..., alias="X-User-Role"),
):
    """
    Placeholder: Upgrade subscription plan.
    In production: create Stripe Checkout session.
    """
    if x_user_role not in ("city_admin", "org_admin"):
        raise HTTPException(status_code=403, detail="Org admin access required")

    new_plan = payload.get("plan")
    if new_plan not in PLANS:
        raise HTTPException(status_code=400, detail=f"Invalid plan: {list(PLANS.keys())}")

    tenant = store.get_tenant(x_tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    # Placeholder: in production, create Stripe checkout session
    checkout_url = f"https://checkout.stripe.com/demo/{x_tenant_id}/{new_plan}"

    return {
        "checkout_url": checkout_url,
        "note": "Stripe integration placeholder — configure STRIPE_SECRET_KEY to enable",
        "current_plan": tenant["plan"],
        "requested_plan": new_plan,
        "price_monthly": PLANS[new_plan]["price_monthly"],
    }


@app.get("/api/v1/saas/billing/invoices")
async def billing_invoices(
    x_tenant_id: str = Header(..., alias="X-Tenant-Id"),
):
    """Placeholder: list invoices from Stripe"""
    tenant = store.get_tenant(x_tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    # Demo invoices
    plan = PLANS.get(tenant["plan"], {})
    price = plan.get("price_monthly", 0)
    invoices = [
        {
            "id": f"inv_{i}",
            "date": (datetime.utcnow() - timedelta(days=30 * i)).strftime("%Y-%m-%d"),
            "amount": price,
            "status": "paid",
            "pdf_url": f"https://invoice.stripe.com/demo/{x_tenant_id}/{i}",
        }
        for i in range(1, 4)
    ]

    return {"invoices": invoices, "note": "Demo invoices — Stripe not yet connected"}


# ════════════════════════════════════════════
# QUOTA CHECK — called by other services
# ════════════════════════════════════════════

@app.post("/api/v1/saas/quota/check")
async def check_quota(payload: dict):
    """
    Internal: check if a tenant can perform an action.
    Body: { "tenant_id": "...", "resource": "devices" | "alerts" | "api_calls" }
    """
    tenant_id = payload.get("tenant_id")
    resource = payload.get("resource", "api_calls")

    if not tenant_id:
        raise HTTPException(status_code=400, detail="tenant_id required")

    allowed, reason = quota.check_quota(tenant_id, resource)
    return {"allowed": allowed, "reason": reason, "tenant_id": tenant_id, "resource": resource}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
