# WhatsApp Alert Integration Guide

## Overview

EcoTronics uses **Twilio WhatsApp Business API** for sending alert notifications. This guide explains how to set up WhatsApp alerts for the platform.

## Why Twilio WhatsApp?

- **Free Trial**: Start with Twilio's free sandbox environment (no cost)
- **Scalable**: Transition to production WhatsApp Business API when ready
- **Reliable**: Enterprise-grade message delivery
- **Flexible**: Single provider instead of managing multiple SMS gateways (MSG91, AWS SNS, etc.)
- **Easy Setup**: Straightforward API for message sending

## Setup Steps

### 1. Create a Twilio Account

1. Visit [https://www.twilio.com/console](https://www.twilio.com/console)
2. Sign up for a free account (includes $15 free trial credit)
3. Verify your email and phone number
4. Select "WhatsApp" as your use case

### 2. Get API Credentials

From your Twilio Console:

1. Navigate to **Account → API keys & tokens**
2. Copy your **Account SID** (starts with `AC...`)
3. Copy your **Auth Token** (keep this secret!)
4. Navigate to **Messaging → WhatsApp** → **Get Started** or **Sandbox**

### 3. Enable WhatsApp Sandbox

For development and testing:

1. In Twilio Console, go to **Messaging → Try It Out → Send a WhatsApp Message**
2. You'll see a **Sandbox Phone Number** like `+14155552671` (this changes per account)
3. Send the activation message from your WhatsApp phone to join the sandbox
4. Once activated, you can send messages from the sandbox to your phone

**Sandbox Limitations:**
- Messages expire after 72 hours of inactivity (restart with activation code)
- Limited to approved template messages in production
- Good for development and demo purposes

### 4. Configure Environment Variables

Create or update `.env` file:

```dotenv
# Twilio WhatsApp Configuration
TWILIO_ACCOUNT_SID=AC...your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155552671
```

Get the WhatsApp Number from Twilio Console:
- Go to **Messaging → WhatsApp → Sandbox Settings**
- Copy the "From" number (e.g., `+14155552671`)
- Add `whatsapp:` prefix: `whatsapp:+14155552671`

### 5. Install Dependencies

WhatsApp support requires the Twilio Python SDK:

```bash
# Already in ml-service/requirements.txt
pip install twilio>=8.10.0
```

## API Usage

### Send WhatsApp Alert

**Endpoint:** `POST /api/v1/ml/simulate/trigger-whatsapp`

**Request Body:**
```json
{
    "phone": "whatsapp:+919876543210",
    "message": "EcoTronics Alert: High AQI detected in Sadar ward. Immediate action required.",
    "priority": "high"
}
```

**Phone Number Formats:**
- With `whatsapp:` prefix: `whatsapp:+919876543210` ✅
- Without `whatsapp:` prefix: `+919876543210` (auto-formatted)
- Indian format: `9876543210` (auto-formatted to `+919876543210`)

**Response (Success):**
```json
{
    "status": "sent",
    "gateway": "twilio_whatsapp",
    "timestamp": "2024-01-15T10:30:45.123456",
    "recipient": "+919876543210",
    "message_id": "SM1234567890abcdef1234567890abcdef",
    "message": "EcoTronics Alert: High AQI detected...",
    "platform": "WhatsApp"
}
```

**Response (Mock/Demo Mode - Credentials Not Configured):**
```json
{
    "status": "sent",
    "gateway": "mock_whatsapp",
    "timestamp": "2024-01-15T10:30:45.123456",
    "recipient": "+919876543210",
    "message": "EcoTronics Alert: High AQI detected...",
    "platform": "WhatsApp",
    "note": "Demo mode - configure TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN for real WhatsApp delivery"
}
```

## Frontend Integration

The Alerts page (`frontend/src/pages/city-admin/Alerts.tsx`) includes a button to trigger WhatsApp alerts:

```typescript
const triggerWhatsApp = async () => {
    const res = await fetch(`${ML_BASE}/simulate/trigger-whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            phone: 'whatsapp:+919876543210',
            message: 'EcoTronics Alert: High AQI detected in Sadar ward. Immediate action required.',
            priority: 'high'
        })
    });
    
    if (res.ok) {
        setSmsStatus(t('message_sent')); // "WhatsApp Alert Sent to +91-9876543210"
    }
};
```

## Transitioning to Production

### Step 1: Set Up WhatsApp Business Account

1. Visit [https://www.whatsapp.com/business](https://www.whatsapp.com/business)
2. Create a WhatsApp Business Account
3. Verify your business information
4. Get your Business Account ID

### Step 2: Upgrade Twilio WhatsApp

1. In Twilio Console, upgrade from Sandbox to Production
2. Connect your WhatsApp Business Account
3. Request approval for message templates (if needed)

### Step 3: Update Configuration

Replace sandbox credentials with production credentials in `.env`:

```dotenv
TWILIO_ACCOUNT_SID=AC...your_production_sid
TWILIO_AUTH_TOKEN=your_production_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+91...your_business_number
```

**Note:** Production WhatsApp Business API requires payment after free trial. Check [Twilio Pricing](https://www.twilio.com/en-us/messaging/channels/whatsapp) for current rates.

## Troubleshooting

### "Twilio credentials not configured"

**Issue:** Getting mock mode responses instead of real WhatsApp messages

**Solution:**
1. Verify `.env` file has `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` set
2. Check that values don't have quotes: ✅ `TWILIO_ACCOUNT_SID=AC123` ❌ `TWILIO_ACCOUNT_SID="AC123"`
3. Restart the ML service: `docker-compose restart ml-service`

### "Invalid phone format"

**Issue:** WhatsApp message not sent to recipient

**Solution:**
- Ensure phone number includes country code: `+919876543210` (not just `9876543210`)
- Use `whatsapp:` prefix or let the API auto-format
- Verify recipient is in your Twilio sandbox contact list (if using sandbox)

### "Sandbox session expired"

**Issue:** Messages not delivering after 72 hours of inactivity

**Solution:**
1. Go to Twilio Console → **Messaging → WhatsApp → Sandbox**
2. Copy the activation code (e.g., "join ...")
3. Send via WhatsApp to the sandbox number
4. Wait for confirmation

### "Rate limited"

**Issue:** Too many messages sent too quickly

**Solution:**
- Twilio applies rate limits on sandbox (100 messages/day typical)
- For production, adjust Twilio plan or implement rate limiting in your application

## Security Considerations

1. **Credentials**: Never commit `.env` file with real credentials to Git
2. **Phone Numbers**: Validate recipient phone numbers before sending
3. **Message Content**: Sanitize alert messages to prevent injection
4. **Rate Limiting**: Implement application-level rate limiting for bulk alerts
5. **Logging**: Avoid logging full phone numbers in production

## Alternative Providers

If you decide to use different WhatsApp providers in the future:

1. **Meta Cloud API** (WhatsApp Business API directly from Meta)
   - Cost: Starts at $0.0065 per message
   - Complexity: More setup required
   
2. **AWS Pinpoint**
   - Supports WhatsApp through API
   - Integration with AWS ecosystem
   
3. **MessageBird**
   - Global coverage
   - WhatsApp + SMS + other channels

To implement alternatives, modify:
- `send_whatsapp_twilio()` function in `ml-service/src/main.py`
- Rename to `send_whatsapp_[provider]()` and update `trigger_whatsapp()` routing
- Update `.env.example` with provider-specific credentials

## Testing

### Manual Test via cURL

```bash
curl -X POST http://localhost:8000/api/v1/ml/simulate/trigger-whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "whatsapp:+919876543210",
    "message": "Test message from EcoTronics",
    "priority": "high"
  }'
```

### Python Test Script

```python
import requests
import os

ML_BASE = "http://localhost:8000"

payload = {
    "phone": "whatsapp:+919876543210",
    "message": "EcoTronics Alert: Testing WhatsApp integration",
    "priority": "high"
}

response = requests.post(
    f"{ML_BASE}/api/v1/ml/simulate/trigger-whatsapp",
    json=payload
)

print(response.json())
```

## Cost Estimation

### Twilio Pricing (as of 2024)

| Tier | Messages/Month | Cost |
|------|---|---|
| Free Trial | Up to $15 credit | $0 (limited time) |
| Sandbox | Unlimited | $0 (after trial) |
| Production (Standard) | 0-10K | $0.0045 per msg |
| Production (High Volume) | 10K+ | $0.0035-0.0045 per msg |

### Cost Example

- **100 alerts/day** × 365 days = 36,500 messages/year
- **36,500 × $0.004** (avg) = **~$146/year**
- **Per alert cost** ≈ **$0.0040**

This is significantly cheaper than multi-provider SMS (MSG91 + Twilio + AWS SNS).

## Useful Links

- [Twilio WhatsApp Documentation](https://www.twilio.com/docs/whatsapp)
- [Twilio Python SDK](https://www.twilio.com/docs/libraries/python)
- [WhatsApp Business API](https://www.whatsapp.com/business/api)
- [Twilio Console](https://www.twilio.com/console)
- [Twilio Pricing](https://www.twilio.com/en-us/messaging/channels/whatsapp)

## Support

For issues:
1. Check Twilio error messages in ML service logs: `docker logs ecotronics-ml-service`
2. Verify credentials in `.env` are correct
3. Test with Twilio Console before testing with the application
4. Refer to [Twilio Support](https://support.twilio.com)
