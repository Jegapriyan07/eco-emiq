# EcoTronics - SMS Integration & Translation Test Plan

**Date**: February 20, 2026  
**Components**: SMS Integration + Multilingual Support  
**Status**: Ready for Testing

---

## 🧪 SMS Integration Test Plan

### Test Environment Setup
```bash
# 1. Clone and setup
git clone <repo>
cd ecotronics

# 2. Install dependencies
cd ml-service
pip install -r requirements.txt

# 3. Create .env file
cp ../.env.example ../.env
```

### Test Case 1: Mock SMS Mode (No Credentials)
**Objective**: Verify SMS works in mock mode without credentials
**Provider**: mock

**Steps**:
```bash
# 1. Edit .env
SMS_PROVIDER=mock

# 2. Start service
python -m uvicorn src.main:app --reload

# 3. Send test SMS
curl -X POST http://localhost:8000/api/v1/ml/simulate/trigger-sms \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919876543210",
    "message": "Test alert from EcoTronics",
    "priority": "high"
  }'
```

**Expected Result**:
```json
{
  "status": "sent",
  "gateway": "mock",
  "timestamp": "2026-02-20T14:30:45.xxx",
  "recipient": "+919876543210",
  "message": "Test alert from EcoTronics"
}
```

**Console Output**: Should see `📱 MOCK SMS to +919876543210: ...`

---

### Test Case 2: MSG91 Provider (With Credentials)
**Objective**: Verify SMS sends via MSG91
**Provider**: msg91
**Precondition**: Valid MSG91 auth key

**Steps**:
```bash
# 1. Edit .env
SMS_PROVIDER=msg91
MSG91_AUTH_KEY=your_actual_key_here
MSG91_ROUTE=1  # Transactional

# 2. Restart service
python -m uvicorn src.main:app --reload

# 3. Send test SMS
curl -X POST http://localhost:8000/api/v1/ml/simulate/trigger-sms \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919876543210",
    "message": "EcoTronics: Test SMS via MSG91"
  }'
```

**Expected Result**:
- HTTP 200 response with message_id
- SMS received on actual phone
- Console: `✅ SMS sent via MSG91 to +919876543210`

**Test Variations**:
- [ ] Indian number without +91 prefix (should auto-add)
- [ ] International number with different country code
- [ ] Very long message (>160 chars, should be split)
- [ ] Special characters in message

---

### Test Case 3: Twilio Provider (With Credentials)
**Objective**: Verify SMS sends via Twilio
**Provider**: twilio
**Precondition**: Valid Twilio credentials

**Steps**:
```bash
# 1. Install Twilio
pip install twilio

# 2. Edit .env
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxx
TWILIO_AUTH_TOKEN=your_token
TWILIO_FROM_NUMBER=+1234567890

# 3. Restart and test
python -m uvicorn src.main:app --reload

curl -X POST http://localhost:8000/api/v1/ml/simulate/trigger-sms \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919876543210",
    "message": "EcoTronics: Test SMS via Twilio"
  }'
```

**Expected Result**:
- HTTP 200 with Twilio message SID
- SMS received on phone
- Console: `✅ SMS sent via Twilio. SID: SMxxxxxxxxx`

---

### Test Case 4: Error Handling

#### 4.1 Invalid Credentials
```bash
SMS_PROVIDER=msg91
MSG91_AUTH_KEY=invalid_key_xyz

# Send SMS
curl -X POST http://localhost:8000/api/v1/ml/simulate/trigger-sms ...
```

**Expected**: HTTP 500 error with "SMS delivery failed" message

#### 4.2 Malformed Phone Number
```json
{"phone": "invalid", "message": "test"}
```

**Expected**: Function handles gracefully, attempts delivery

#### 4.3 Missing Message
```json
{"phone": "+919876543210"}
```

**Expected**: Validation error or default message

---

### Test Case 5: Frontend Integration
**Objective**: Verify SMS trigger from UI

**Steps**:
1. Start frontend: `cd frontend && npm run dev`
2. Navigate to City Admin > Alerts
3. Wait for alert to appear (or verify mock alert visible)
4. Click "Trigger SMS Alert" button
5. Verify SMS sent message appears

**Expected**:
- Success notification: "SMS Alert Sent to +91-9876543210"
- SMS received on configured phone (if real provider)

---

## 🌐 Translation Test Plan

### Test Case 1: Language Context Initialization
**Objective**: Verify language context loads properly

**Steps**:
```tsx
// In browser console
localStorage.getItem('language')  // Should return 'en' or 'ta'
```

**Expected**: Language preference saved in localStorage

---

### Test Case 2: Translation Keys Coverage

**Objective**: Verify all 150+ keys are properly defined

**Steps**:
```tsx
// In browser console
import { translations } from './frontend/src/i18n/translations.ts'
Object.keys(translations.en).length  // Should be 150+
Object.keys(translations.ta).length  // Should be 150+
```

**Expected**: 
- English keys: 150+
- Tamil keys: 150+
- All keys match between en and ta

---

### Test Case 3: Page Translation Rendering

#### 3.1 City Dashboard
1. Navigate to City Admin Dashboard
2. Verify all labels display correctly:
   - [ ] Dashboard title uses t('city_dashboard')
   - [ ] AQI label uses t('avg_aqi')
   - [ ] Ward details uses t('ward_details')
   - [ ] Refresh button uses t('refresh')

#### 3.2 Compliance Page
1. Navigate to Industry > Compliance
2. Check translations:
   - [ ] Compliance Monitor title
   - [ ] CPCB/SPCB limits label
   - [ ] Compliant/Warning/Non-Compliant status
   - [ ] Chamber table headers

#### 3.3 Alerts Page
1. Navigate to City Admin > Alerts
2. Verify:
   - [ ] No alerts message
   - [ ] Trigger SMS button label
   - [ ] Alert details display

---

### Test Case 4: Language Toggle

**Steps**:
1. Click language toggle (typically in Navbar)
2. Select Tamil (தமிழ்)
3. Verify entire UI switches to Tamil
4. All text should be in Tamil script
5. Toggle back to English
6. All text should be in English

**Expected**:
- [ ] Language changes immediately
- [ ] No page reload needed
- [ ] All components update
- [ ] Language persists on refresh

---

### Test Case 5: Missing Translation Fallback

**Objective**: Verify behavior when translation key is missing

**Steps**:
1. Create component with non-existent key: `t('non_existent_key')`
2. Load page

**Expected**: Should display "non_existent_key" (the key itself) as fallback

---

### Test Case 6: Mobile Responsiveness

**Objective**: Verify translations work on mobile devices

**Steps**:
1. Open DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select different phone models
4. Test language toggle on mobile
5. Verify text doesn't overflow
6. Check Tamil text renders properly

**Expected**: All translations display correctly on mobile

---

## 🔄 Integration Test Cases

### Test Case 1: SMS + Translation Combined
**Objective**: Verify SMS alert message respects language preference

**Steps**:
1. Set language to Tamil: Switch navbar toggle to Tamil
2. Navigate to Alerts
3. Trigger SMS alert
4. (Verify SMS message is in English - SMS provider limitation)

**Expected**: UI shows Tamil, SMS content in English (expected limitation)

---

### Test Case 2: Multi-role Testing

#### City Admin Role
1. Login as city admin
2. Switch language to Tamil
3. Navigate all pages
4. Verify all labels in Tamil

#### Industry Owner Role
1. Login as industry owner
2. Switch language to English
3. Navigate Compliance, Anomalies, Organization
4. Verify all labels in English
5. Test SMS trigger

#### Vehicle Owner Role
1. Login as vehicle owner
2. Switch to Tamil
3. View vehicle dashboard
4. Check maintenance predictions
5. Verify all content in Tamil

---

## 📋 Performance Test Cases

### Test Case 1: SMS Response Time
**Objective**: Verify SMS endpoint responds quickly

```bash
# Using Apache Bench
ab -n 100 -c 10 http://localhost:8000/api/v1/ml/simulate/trigger-sms

# Expected: < 500ms average response time
```

---

### Test Case 2: Translation Performance
**Objective**: Verify language switching is instant

**Steps**:
1. Open DevTools Performance tab
2. Record while toggling language 10 times
3. Check for Performance > 60fps

**Expected**: No jank, instant language switch

---

## 🔐 Security Test Cases

### Test Case 1: Phone Number Validation
**Objective**: Prevent injection attacks

```bash
# Test with special characters
{"phone": "+91123'; DROP TABLE users; --"}

# Expected: Should be handled safely or rejected
```

### Test Case 2: Message Content
**Objective**: Prevent XSS via SMS message

```bash
{"message": "<script>alert('xss')</script>"}

# Expected: Should be sent as plain text, not executed
```

---

## ✅ Final Verification Checklist

### Backend
- [ ] SMS endpoint returns 200 for valid requests
- [ ] Mock mode works without credentials
- [ ] MSG91 sends SMS successfully (with key)
- [ ] Twilio sends SMS successfully (with credentials)
- [ ] Error messages are helpful and clear
- [ ] Phone numbers auto-format correctly
- [ ] Timestamps are accurate
- [ ] Request logging is working

### Frontend
- [ ] All 150+ translation keys defined
- [ ] English translations complete
- [ ] Tamil translations complete
- [ ] Language toggle works
- [ ] Language preference persists
- [ ] All updated pages use t() function
- [ ] No console errors
- [ ] No untranslated strings visible

### Integration
- [ ] SMS triggered from Alerts page works
- [ ] Language affects UI, not SMS content
- [ ] All pages load with current language
- [ ] Mobile devices display correctly
- [ ] No performance issues
- [ ] Error handling graceful

---

## 🐛 Known Issues & Workarounds

### Issue 1: MSG91 Auth Key Not Working
**Cause**: Copy-paste spaces or case sensitivity
**Workaround**: Verify key in msg91.com dashboard, remove any spaces

### Issue 2: Phone Number Format
**Cause**: Different country codes
**Workaround**: Always include + and country code: +91XXXXXXXXXX

### Issue 3: Translation Key Missing
**Cause**: Key not added to both en and ta objects
**Workaround**: Add missing key to both objects before using

---

## 📊 Test Results Summary Template

```
Test Date: ___________
Tester: ___________
Environment: Development / Staging / Production

SMS Integration:
  [ ] Pass - Mock mode works
  [ ] Pass - MSG91 integration works
  [ ] Pass - Twilio integration works
  [ ] Pass - Error handling works
  [ ] Pass - Frontend trigger works

Translations:
  [ ] Pass - All 150+ keys defined
  [ ] Pass - English complete
  [ ] Pass - Tamil complete
  [ ] Pass - Language toggle works
  [ ] Pass - Language persists

Integration:
  [ ] Pass - Combined testing successful
  [ ] Pass - No performance issues
  [ ] Pass - Mobile responsive

Overall Status: PASS / FAIL / BLOCKED

Notes:
_______________________________________________
_______________________________________________
_______________________________________________
```

---

## 🚀 Deployment Readiness

Before deploying to production:

- [ ] SMS credentials configured in `.env`
- [ ] All tests passed
- [ ] Error logging enabled
- [ ] Database configured (if needed)
- [ ] SSL/TLS configured
- [ ] Environment set to 'production'
- [ ] Monitoring/alerts configured
- [ ] Backup strategy in place
- [ ] Documentation updated
- [ ] Team trained on new features

---

**Created**: February 20, 2026  
**Status**: Ready for Testing  
**Estimated Test Time**: 2-3 hours
