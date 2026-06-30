"""
Tenant Store — In-memory tenant, device, and user management.
In production: replace with PostgreSQL + row-level tenant_id.
"""

import uuid
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict

from subscription_plans import PLANS

logger = logging.getLogger(__name__)


class TenantStore:

    def __init__(self):
        self.tenants: Dict[str, dict] = {}
        self.devices: Dict[str, dict] = {}   # device_id → device
        self.users: Dict[str, dict] = {}     # user_id → user

    # ─────────────────────────────────────────
    # TENANTS
    # ─────────────────────────────────────────

    def create_tenant(
        self,
        org_name: str,
        owner_email: str,
        plan: str,
        city: str = "",
        contact_phone: str = "",
    ) -> dict:
        tenant_id = f"org-{str(uuid.uuid4())[:8]}"
        now = datetime.utcnow().isoformat()
        tenant = {
            "id": tenant_id,
            "org_name": org_name,
            "owner_email": owner_email,
            "plan": plan,
            "status": "active",
            "city": city,
            "contact_phone": contact_phone,
            "stripe_customer_id": None,
            "stripe_subscription_id": None,
            "created_at": now,
            "updated_at": now,
            "trial_ends_at": (datetime.utcnow() + timedelta(days=14)).isoformat(),
            "metadata": {},
        }
        self.tenants[tenant_id] = tenant
        logger.info(f"Tenant created: {org_name} ({tenant_id})")
        return tenant

    def get_tenant(self, tenant_id: str) -> Optional[dict]:
        return self.tenants.get(tenant_id)

    def update_tenant(self, tenant_id: str, updates: dict) -> Optional[dict]:
        tenant = self.tenants.get(tenant_id)
        if not tenant:
            return None
        tenant.update(updates)
        tenant["updated_at"] = datetime.utcnow().isoformat()
        return tenant

    def get_platform_summary(self) -> dict:
        tenants = list(self.tenants.values())
        by_plan = {}
        by_status = {}
        for t in tenants:
            by_plan[t["plan"]] = by_plan.get(t["plan"], 0) + 1
            by_status[t["status"]] = by_status.get(t["status"], 0) + 1

        devices = list(self.devices.values())
        active_devices = [d for d in devices if d.get("status") == "active"]

        return {
            "total_tenants": len(tenants),
            "active_tenants": by_status.get("active", 0),
            "suspended_tenants": by_status.get("suspended", 0),
            "by_plan": by_plan,
            "total_devices": len(devices),
            "active_devices": len(active_devices),
            "total_users": len(self.users),
            "timestamp": datetime.utcnow().isoformat(),
        }

    def get_revenue_summary(self) -> dict:
        from subscription_plans import PLANS
        mrr = 0
        arr = 0
        by_plan = {}

        for tenant in self.tenants.values():
            if tenant["status"] != "active":
                continue
            plan = PLANS.get(tenant["plan"], {})
            price = plan.get("price_monthly", 0)
            mrr += price
            by_plan[tenant["plan"]] = by_plan.get(tenant["plan"], 0) + price

        arr = mrr * 12
        return {
            "mrr": mrr,
            "arr": arr,
            "currency": "INR",
            "by_plan": by_plan,
            "paying_tenants": sum(1 for t in self.tenants.values()
                                  if t["status"] == "active" and PLANS.get(t["plan"], {}).get("price_monthly", 0) > 0),
            "timestamp": datetime.utcnow().isoformat(),
        }

    # ─────────────────────────────────────────
    # DEVICES
    # ─────────────────────────────────────────

    def register_device(
        self,
        tenant_id: str,
        device_id: str,
        device_name: str,
        device_type: str,
        location: dict,
    ) -> dict:
        now = datetime.utcnow().isoformat()
        device = {
            "id": device_id,
            "tenant_id": tenant_id,
            "name": device_name,
            "type": device_type,
            "location": location,
            "status": "active",
            "registered_at": now,
            "last_seen": now,
            "api_key": f"dk-{str(uuid.uuid4()).replace('-', '')[:24]}",
        }
        self.devices[device_id] = device
        return device

    def get_tenant_devices(self, tenant_id: str) -> List[dict]:
        return [d for d in self.devices.values() if d["tenant_id"] == tenant_id]

    def remove_device(self, tenant_id: str, device_id: str) -> bool:
        device = self.devices.get(device_id)
        if not device or device["tenant_id"] != tenant_id:
            return False
        del self.devices[device_id]
        return True

    def count_tenant_devices(self, tenant_id: str) -> int:
        return sum(1 for d in self.devices.values() if d["tenant_id"] == tenant_id)

    # ─────────────────────────────────────────
    # DEMO DATA SEEDING
    # ─────────────────────────────────────────

    def seed_demo_data(self):
        demo_tenants = [
            {
                "org_name": "Nagpur Municipal Corporation",
                "owner_email": "admin@nmc.gov.in",
                "plan": "enterprise",
                "city": "Nagpur",
                "devices": [
                    ("dev-nmc-001", "Ward 1 Monitor", "air_quality", {"lat": 21.1458, "lon": 79.0882}),
                    ("dev-nmc-002", "Ward 5 Monitor", "air_quality", {"lat": 21.1520, "lon": 79.0965}),
                    ("dev-nmc-003", "Industrial Zone A", "air_quality", {"lat": 21.1400, "lon": 79.1500}),
                    ("dev-nmc-004", "Traffic Junction", "vehicle", {"lat": 21.1480, "lon": 79.0680}),
                ],
            },
            {
                "org_name": "Butibori Industrial Estate",
                "owner_email": "ops@butibori.in",
                "plan": "professional",
                "city": "Nagpur",
                "devices": [
                    ("dev-bie-001", "Factory A Generator", "generator", {"lat": 21.0500, "lon": 79.0000}),
                    ("dev-bie-002", "Factory B Generator", "generator", {"lat": 21.0510, "lon": 79.0010}),
                    ("dev-bie-003", "Boiler Unit 1", "industrial", {"lat": 21.0520, "lon": 79.0020}),
                ],
            },
            {
                "org_name": "Raj Transport Fleet",
                "owner_email": "fleet@rajtransport.com",
                "plan": "starter",
                "city": "Nagpur",
                "devices": [
                    ("dev-rt-001", "Truck MH-31-AB-1234", "vehicle", {"lat": 21.1200, "lon": 79.0900}),
                    ("dev-rt-002", "Truck MH-31-CD-5678", "vehicle", {"lat": 21.1300, "lon": 79.1000}),
                ],
            },
            {
                "org_name": "Green Power Solutions",
                "owner_email": "admin@greenpower.io",
                "plan": "starter",
                "city": "Nagpur",
                "devices": [
                    ("dev-gp-001", "DG Set Unit 1", "generator", {"lat": 21.1700, "lon": 79.0800}),
                ],
            },
            {
                "org_name": "Demo Startup",
                "owner_email": "founder@demo.io",
                "plan": "free",
                "city": "Nagpur",
                "devices": [
                    ("dev-demo-001", "Test Device", "air_quality", {"lat": 21.1458, "lon": 79.0882}),
                ],
            },
        ]

        for td in demo_tenants:
            tenant = self.create_tenant(
                org_name=td["org_name"],
                owner_email=td["owner_email"],
                plan=td["plan"],
                city=td["city"],
            )
            for dev_id, dev_name, dev_type, loc in td["devices"]:
                self.register_device(
                    tenant_id=tenant["id"],
                    device_id=dev_id,
                    device_name=dev_name,
                    device_type=dev_type,
                    location=loc,
                )

        logger.info(f"Seeded {len(demo_tenants)} demo tenants with devices")
