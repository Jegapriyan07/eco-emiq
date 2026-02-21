"""
Email Notifier
Sends emails using SMTP with Jinja2 HTML templates.
Falls back to console logging in demo mode.
"""

import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

# Try to import email libraries
try:
    import aiosmtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText
    SMTP_AVAILABLE = True
except ImportError:
    SMTP_AVAILABLE = False
    logger.warning("aiosmtplib not available — email will use demo mode")

try:
    from jinja2 import Environment, BaseLoader
    JINJA2_AVAILABLE = True
except ImportError:
    JINJA2_AVAILABLE = False


# ============================================================
# EMAIL TEMPLATES (inline Jinja2)
# ============================================================

TEMPLATES = {
    "alert": """
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .card { background: white; border-radius: 12px; padding: 32px; max-width: 600px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #1890ff, #096dd9); color: white;
              border-radius: 8px; padding: 20px; margin-bottom: 24px; }
    .severity-critical { border-left: 4px solid #ff4d4f; }
    .severity-high     { border-left: 4px solid #fa8c16; }
    .severity-medium   { border-left: 4px solid #faad14; }
    .severity-low      { border-left: 4px solid #52c41a; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px;
             font-size: 12px; font-weight: bold; text-transform: uppercase; }
    .badge-critical { background: #fff1f0; color: #ff4d4f; }
    .badge-high     { background: #fff7e6; color: #fa8c16; }
    .badge-medium   { background: #fffbe6; color: #faad14; }
    .badge-low      { background: #f6ffed; color: #52c41a; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0;
                  border-bottom: 1px solid #f0f0f0; }
    .footer { margin-top: 24px; font-size: 12px; color: #999; text-align: center; }
    .btn { display: inline-block; background: #1890ff; color: white; padding: 12px 24px;
           border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="card severity-{{ severity }}">
    <div class="header">
      <h1 style="margin:0; font-size:24px;">⚠️ EcoTronics Alert</h1>
      <p style="margin:8px 0 0; opacity:0.9;">Emission Monitoring Platform</p>
    </div>

    <span class="badge badge-{{ severity }}">{{ severity }}</span>

    <h2 style="margin: 16px 0 8px;">{{ message }}</h2>

    <div class="detail-row">
      <span style="color:#666;">Device ID</span>
      <strong>{{ device_id }}</strong>
    </div>
    <div class="detail-row">
      <span style="color:#666;">Alert Time</span>
      <strong>{{ timestamp }}</strong>
    </div>
    <div class="detail-row">
      <span style="color:#666;">Alert ID</span>
      <strong>{{ alert.id }}</strong>
    </div>

    <p style="margin-top:20px; color:#555;">
      Please log in to your EcoTronics dashboard to acknowledge this alert and take action.
    </p>

    <a href="http://localhost:5173" class="btn">View Dashboard →</a>

    <div class="footer">
      <p>EcoTronics Emission Monitoring Platform | Do not reply to this email</p>
    </div>
  </div>
</body>
</html>
""",

    "maintenance": """
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .card { background: white; border-radius: 12px; padding: 32px; max-width: 600px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #52c41a, #389e0d); color: white;
              border-radius: 8px; padding: 20px; margin-bottom: 24px; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0;
                  border-bottom: 1px solid #f0f0f0; }
    .footer { margin-top: 24px; font-size: 12px; color: #999; text-align: center; }
    .btn { display: inline-block; background: #52c41a; color: white; padding: 12px 24px;
           border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1 style="margin:0; font-size:24px;">🔧 Maintenance Reminder</h1>
      <p style="margin:8px 0 0; opacity:0.9;">EcoTronics Emission Monitoring Platform</p>
    </div>

    <h2 style="margin: 16px 0 8px;">Maintenance Due in {{ days }} Days</h2>
    <p style="color:#555;">
      Our ML prediction system has detected that device <strong>{{ device_id }}</strong>
      will require maintenance within <strong>{{ days }} days</strong>.
    </p>

    <div class="detail-row">
      <span style="color:#666;">Device ID</span>
      <strong>{{ device_id }}</strong>
    </div>
    <div class="detail-row">
      <span style="color:#666;">Days Until Service</span>
      <strong>{{ days }} days</strong>
    </div>
    <div class="detail-row">
      <span style="color:#666;">Predicted On</span>
      <strong>{{ timestamp }}</strong>
    </div>

    <p style="margin-top:20px; color:#555;">
      Schedule a maintenance appointment to avoid unexpected downtime and keep emissions within limits.
    </p>

    <a href="http://localhost:5173" class="btn">Schedule Maintenance →</a>

    <div class="footer">
      <p>EcoTronics Emission Monitoring Platform | Do not reply to this email</p>
    </div>
  </div>
</body>
</html>
""",

    "generic": """
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; padding: 20px;">
  <h2>EcoTronics Notification</h2>
  <p>{{ message }}</p>
  <hr>
  <small>EcoTronics Emission Monitoring Platform</small>
</body>
</html>
""",
}


class EmailNotifier:
    """
    Sends HTML emails using SMTP.
    Falls back to console logging in demo mode.
    """

    def __init__(self):
        self.host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.port = int(os.getenv("SMTP_PORT", "587"))
        self.username = os.getenv("SMTP_USERNAME", "")
        self.password = os.getenv("SMTP_PASSWORD", "")
        self.from_addr = os.getenv("SMTP_FROM", "noreply@ecotronics.io")
        self.tls = os.getenv("SMTP_TLS", "true").lower() == "true"

        self.demo_mode = not (self.username and self.password and SMTP_AVAILABLE)

        if self.demo_mode:
            logger.info("EmailNotifier: running in DEMO mode (no SMTP credentials)")

        # Setup Jinja2 if available
        if JINJA2_AVAILABLE:
            self._jinja = Environment(loader=BaseLoader())
        else:
            self._jinja = None

    def _render(self, template_name: str, context: dict) -> str:
        """Render an HTML email template"""
        template_str = TEMPLATES.get(template_name, TEMPLATES["generic"])

        if self._jinja:
            tmpl = self._jinja.from_string(template_str)
            return tmpl.render(**context)

        # Fallback: simple string replacement
        result = template_str
        for key, val in context.items():
            result = result.replace("{{ " + key + " }}", str(val))
        return result

    async def send(
        self,
        to: str,
        subject: str,
        template: str = "generic",
        context: Optional[dict] = None,
    ):
        """Send an HTML email"""
        context = context or {}
        html_body = self._render(template, context)

        if self.demo_mode:
            # Demo: just log it
            logger.info(
                f"[EMAIL DEMO] To: {to} | Subject: {subject}\n"
                f"  Template: {template} | Context keys: {list(context.keys())}"
            )
            return

        # Real SMTP send
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = self.from_addr
        msg["To"] = to
        msg.attach(MIMEText(html_body, "html"))

        await aiosmtplib.send(
            msg,
            hostname=self.host,
            port=self.port,
            username=self.username,
            password=self.password,
            start_tls=self.tls,
        )

        logger.info(f"Email sent to {to}: {subject}")
