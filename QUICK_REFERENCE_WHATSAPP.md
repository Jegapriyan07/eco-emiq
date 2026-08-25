# WhatsApp Integration - Quick Reference Card

## 🚀 Quick Start (Copy & Paste Ready)

### For Development (Mock Mode)
```bash
# 1. No setup needed - just start ML service
docker-compose up ml-service

# 2. Test with curl
curl -X POST http://localhost:8000/api/v1/ml/simulate/trigger-whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "whatsapp:+919876543210",
    "message": "Test alert from EcoTronics",
    "priority": "high"
  }'

# 3. Response (mock mode)
{
  "status": "sent",
  "gateway": "mock_whatsapp",
  "platform": "WhatsApp",
  "note": "Demo mode - configure TWILIO..."
}
```

### For Sandbox (Free Trial)
```bash
# 1. Create .env with sandbox credentials
TWILIO_ACCOUNT_SID=ACxxxxxxxxx
TWILIO_AUTH_TOKEN=your_token_here
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155552671

# 2. Activate sandbox on your WhatsApp
# Send activation message to sandbox number from Twilio

# 3. Test real delivery
# Same curl command as above - now sends real message!
```

### For Production
```bash
# 1. Get WhatsApp Business approval (1-2 weeks)
# 2. Update .env with production credentials
# 3. Deploy and monitor
```

---

## 📋 API Reference

### Endpoint
```
POST /api/v1/ml/simulate/trigger-whatsapp
```

### Request
```json
{
    "phone": "whatsapp:+919876543210",      // Required: WhatsApp format
    "message": "Your alert message here",   // Required: Alert text
    "priority": "high"                      // Optional: high/medium/low (default: high)
}
```

### Phone Formats (All Work)
```
✅ whatsapp:+919876543210         (preferred)
✅ +919876543210                  (auto-formatted)
✅ 9876543210                     (auto-formatted to +919876543210)
```

### Response (Success)
```json
{
    "status": "sent",
    "gateway": "twilio_whatsapp" | "mock_whatsapp",
    "timestamp": "2024-01-15T10:30:45.123456",
    "recipient": "+919876543210",
    "message_id": "SM1234567890abcdef...",
    "message": "Your alert message here",
    "platform": "WhatsApp"
}
```

### Response (Error)
```json
{
    "detail": "WhatsApp delivery failed: [error message]"
}
```

---

## 🛠️ Setup Credentials

### Get Twilio Credentials
1. Go to https://www.twilio.com/console
2. Copy "Account SID" (starts with AC...)
3. Copy "Auth Token" (keep secret!)
4. Go to Messaging → WhatsApp → Sandbox
5. Copy sandbox number (e.g., +14155552671)

### Set in .env
```dotenv
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155552671
```

### Activate Sandbox
1. In Twilio Console, go to WhatsApp → Sandbox
2. Copy activation code (e.g., "join xxxxxxxx")
3. Open WhatsApp on your phone
4. Send message to sandbox number: join xxxxxxxx
5. Done - now you can receive messages!

---

## 📱 Frontend Usage

### In React Component
```typescript
const triggerWhatsApp = async () => {
    const res = await fetch(`${ML_BASE}/api/v1/ml/simulate/trigger-whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            phone: 'whatsapp:+919876543210',
            message: 'Your alert text',
            priority: 'high'
        })
    });
    
    if (res.ok) {
        const data = await res.json();
        console.log('Message sent:', data.message_id);
        setStatus('Message sent!'); // Show confirmation
    }
};
```

### Used In
- Alerts page: `/frontend/src/pages/city-admin/Alerts.tsx`
- Button: "Trigger Alert"

---

## ❌ Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| "Mock mode" response | Add credentials to .env and restart |
| "Invalid phone format" | Use format: whatsapp:+919876543210 |
| "Sandbox session expired" | Re-send activation message (72hr limit) |
| "No response" | Check ML service is running (docker ps) |
| "Rate limited" | Wait 30 seconds, then try again |
| "Connection refused" | ML service not running (docker-compose up ml-service) |

---

## 📚 Documentation Map

| Need | Document |
|------|----------|
| **Overview** | WHATSAPP_MIGRATION_COMPLETE.md |
| **Setup Guide** | WHATSAPP_SETUP_GUIDE.md |
| **Full Details** | MIGRATION_SUMMARY.md |
| **Deployment** | DEPLOYMENT_CHECKLIST.md |
| **Troubleshooting** | WHATSAPP_SETUP_GUIDE.md → Troubleshooting |
| **Navigation** | DOCUMENTATION_INDEX.md |

---

## 💡 Pro Tips

**Tip 1**: Use mock mode for testing UI  
**Tip 2**: Activate sandbox once for free testing  
**Tip 3**: Message ID is useful for tracking  
**Tip 4**: Check ML service logs for errors: `docker logs ecotronics-ml-service-1`  
**Tip 5**: Use curl to test endpoint before frontend

---

## 🔐 Security Checklist

- [ ] .env file is NOT committed to git
- [ ] TWILIO_AUTH_TOKEN is kept secret
- [ ] Phone numbers are validated
- [ ] No credentials in logs
- [ ] Use HTTPS for production
- [ ] Monitor message delivery

---

## 📊 Cost Reference

| Tier | Cost | Use Case |
|------|------|----------|
| Free Trial | $0 | Development & testing |
| Sandbox | $0 | Demo & validation |
| Production | $0.004/msg | Live alerts |

**Example**: 100 alerts/day = ~$150/year

---

## 🎯 Status Indicators

**Development**: 🟢 Ready now  
**Sandbox**: 🟡 30 min setup  
**Production**: 🟡 2-week approval  

---

## 📞 Help

1. **Error messages** → Check WHATSAPP_SETUP_GUIDE.md Troubleshooting
2. **Deployment questions** → Check DEPLOYMENT_CHECKLIST.md
3. **API questions** → Check this card or MIGRATION_SUMMARY.md
4. **Setup help** → WHATSAPP_SETUP_GUIDE.md sections 1-4
5. **Can't find answer** → DOCUMENTATION_INDEX.md

---

## ✅ Before You Deploy

- [ ] Read DEPLOYMENT_CHECKLIST.md
- [ ] Have Twilio credentials ready (if sandbox/prod)
- [ ] Test with mock mode first
- [ ] Check .env file is not in git
- [ ] Verify ML service starts
- [ ] Test endpoint with curl
- [ ] Check logs for errors

---

## 🚀 Deploy Commands

```bash
# Development (mock mode)
docker-compose up ml-service

# After Twilio sandbox setup
nano .env  # Add credentials
docker restart ecotronics-ml-service-1

# Test endpoint
curl http://localhost:8000/api/v1/ml/simulate/trigger-whatsapp \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"phone":"whatsapp:+919876543210","message":"Test"}'
```

---

**Last Updated**: January 2024  
**Status**: ✅ Ready to Use  
**Print This**: Yes - laminate for desk reference!
