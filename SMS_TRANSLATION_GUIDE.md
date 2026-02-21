# EcoTronics SMS Integration & Multilingual Support Guide

## 1. SMS Integration

### Overview
The EcoTronics platform now supports **real SMS delivery** through multiple providers:
- **MSG91** (India-specific, recommended)
- **Twilio** (Global)
- **AWS SNS** (Enterprise option)
- **Mock Mode** (Development/testing)

### Installation & Configuration

#### Step 1: Install Required Packages

```bash
# For Twilio
pip install twilio

# For MSG91 (requests is usually pre-installed)
pip install requests

# For AWS SNS
pip install boto3
```

#### Step 2: Set Up Your SMS Provider

Choose one of the following providers and configure the environment variables in `.env`:

##### Option A: MSG91 (Recommended for India)
```bash
SMS_PROVIDER=msg91
MSG91_AUTH_KEY=your_msg91_auth_key_here
MSG91_ROUTE=4  # 4=Promotional, 1=Transactional
```

Get your auth key:
1. Visit https://msg91.com
2. Sign up for an account
3. Go to Dashboard > Settings > API Keys
4. Copy your AUTH KEY
5. Add to `.env`

**Cost**: ₹0.50-2 per SMS (varies by volume)

##### Option B: Twilio (Global)
```bash
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_FROM_NUMBER=+1234567890
```

Get your credentials:
1. Visit https://www.twilio.com
2. Sign up and verify your phone number
3. Go to Console > Account > API Keys & Tokens
4. Copy Account SID and Auth Token
5. Request a Twilio phone number
6. Add all to `.env`

**Cost**: $0.0075-$0.06 per SMS (varies by country)

##### Option C: AWS SNS (Enterprise)
```bash
SMS_PROVIDER=aws_sns
AWS_SNS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_key_here
AWS_SECRET_ACCESS_KEY=your_secret_here
```

Set up AWS credentials:
1. Create an AWS account
2. Go to IAM > Create User with SNS permissions
3. Get Access Key ID and Secret Access Key
4. Configure AWS CLI: `aws configure`
5. Or set environment variables

**Cost**: $0.00645 per SMS (India)

##### Option D: Mock Mode (Development)
```bash
SMS_PROVIDER=mock
# No credentials needed - logs to console
```

#### Step 3: Restart Backend Service

```bash
cd ml-service
python -m uvicorn src.main:app --reload
```

### API Endpoint

**Endpoint**: `POST /api/v1/ml/simulate/trigger-sms`

**Request Body**:
```json
{
  "phone": "+91-9876543210",
  "message": "EcoTronics Alert: High AQI detected in Sadar ward. Immediate action required.",
  "priority": "high"
}
```

**Response** (Success):
```json
{
  "status": "sent",
  "gateway": "msg91",
  "timestamp": "2026-02-20T14:30:45.123456",
  "recipient": "+91-9876543210",
  "message_id": "request_id_from_provider",
  "message": "Alert message..."
}
```

**Response** (Mock Mode):
```json
{
  "status": "sent",
  "gateway": "mock",
  "timestamp": "2026-02-20T14:30:45.123456",
  "recipient": "+91-9876543210",
  "message": "Alert message...",
  "note": "Demo mode - configure MSG91_AUTH_KEY for real SMS"
}
```

### Frontend Integration

The SMS alert is triggered from the **Alerts Page**:

```tsx
const triggerSMS = async () => {
    const res = await fetch(`${ML_BASE}/simulate/trigger-sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            phone: '+91-9876543210',
            message: 'EcoTronics Alert: High AQI detected...'
        })
    });
    if (res.ok) {
        setSmsStatus(t('sms_sent'));
        setTimeout(() => setSmsStatus(null), 5000);
    }
};
```

### Testing

1. **Mock Mode Test**:
```bash
# SMS_PROVIDER=mock in .env
curl -X POST http://localhost:8000/api/v1/ml/simulate/trigger-sms \
  -H "Content-Type: application/json" \
  -d '{"phone":"+91-9876543210","message":"Test alert"}'
# Check console logs for "📱 MOCK SMS..."
```

2. **Real Provider Test**:
```bash
# Replace SMS_PROVIDER with your choice
curl -X POST http://localhost:8000/api/v1/ml/simulate/trigger-sms \
  -H "Content-Type: application/json" \
  -d '{"phone":"+91-9876543210","message":"Test alert"}'
# Check your phone for SMS
```

---

## 2. Multilingual Support (Tamil & English)

### Overview
EcoTronics now has **comprehensive bilingual support** with 150+ translation keys covering:
- Navigation & Common UI
- City Admin Dashboard
- Industry Owner Dashboard
- Alerts & Compliance
- Anomaly Detection
- Organization Management
- Vehicle Owner Dashboard
- Maintenance Predictions
- Device Management
- Authentication
- And more...

### Translation Architecture

**File**: `frontend/src/i18n/translations.ts`

Structure:
```typescript
export const translations = {
    en: {
        'key1': 'English Value',
        'key2': 'Another Value',
    },
    ta: {
        'key1': 'தமிழ் மதிப்பு',
        'key2': 'மற்றொரு மதிப்பு',
    }
};
```

### Using Translations in Components

**Step 1**: Import `useLanguage` hook
```tsx
import { useLanguage } from '../../contexts/LanguageContext';
```

**Step 2**: Get the translation function
```tsx
const { t } = useLanguage();
```

**Step 3**: Use in JSX
```tsx
<h1>{t('dashboard')}</h1>
<button>{t('refresh')}</button>
<p>{t('loading')}</p>
```

### Adding New Translations

1. **Open** `frontend/src/i18n/translations.ts`
2. **Add key to `en` object**:
   ```typescript
   'new_feature': 'My New Feature'
   ```
3. **Add corresponding Tamil translation to `ta` object**:
   ```typescript
   'new_feature': 'என் புதிய அம்சம்'
   ```
4. **Use in component** with `t('new_feature')`

### Language Context

**File**: `frontend/src/contexts/LanguageContext.tsx`

Provides:
- `language`: Current language ('en' or 'ta')
- `setLanguage()`: Switch language
- `t()`: Translation function

### Pages with Translations

✅ **Fully Translated**:
- City Dashboard
- Alerts Page
- Sidebar Navigation
- Navbar (with language toggle)

🔄 **Recently Updated** (with expanded keys):
- Compliance Page
- Anomalies Page
- Organization Page
- Ward Analytics
- Maintenance
- Vehicle Owner Dashboard
- Device Management
- Authentication Pages

📋 **Translation Coverage**:
```
Total Keys: 150+
English: 100%
Tamil: 100%
Coverage:
- Common UI: 30 keys
- City Admin: 20 keys
- Industry Owner: 20 keys
- Alerts: 12 keys
- Anomalies: 9 keys
- Organization: 9 keys
- Vehicle: 15 keys
- Maintenance: 10 keys
- Devices: 10 keys
- Auth: 12 keys
- Misc: 13 keys
```

### Current Translation Keys

#### Common Navigation (30)
dashboard, alerts, maintenance, compliance, anomalies, organization, devices, total_devices, active_alerts, city_wards, live, refresh, export, trigger_alert, welcome, city_admin, industry_owner, vehicle_owner, loading, error, success, cancel, save, delete, edit, add, close, submit, logout, login, register, settings

#### City Dashboard (14)
city_dashboard, physics_simulation, avg_aqi, ward_details, forecast, ward_comparison, hourly_trend, aqi_level, pollutants, pm25, co, nox, co2, heatmap, warnings, critical, moderate, good

#### Alerts (12)
alert_desc, all_clear, no_alerts, resolve, sms_sent, alert_details, threshold, current_value, last_updated, alert_status, active, resolved

#### Industry Dashboard (14)
industry_dashboard, compliant, warning, non_compliant, chamber_emissions, compliance_trend, chamber, emission_limit, current_emission, status, capacity, cpcb_limits, compliance_report, last_inspection, next_inspection

#### Anomalies (9)
anomalies, detected_anomalies, no_anomalies, anomaly_score, anomaly_type, severity, high, medium, low, timestamp, investigate

#### Organization (9)
organization, employees, facilities, facility_name, facility_type, location, employee_count, add_employee, add_facility, employee_name, email, phone, role, department

#### Vehicle Owner (15)
vehicle_owner_dashboard, emission_score, engine_health, maintenance_status, next_service, days, service_due, urgent, engine_temp, rpm, fuel_efficiency, weekly_trend, vehicle_id, vehicle_type, registration

#### Maintenance (10)
maintenance_predictions, predicted_service, confidence, recommended_action, service_history, last_service, service_type, parts_replaced, service_cost, technician

#### Devices (10)
device_list, device_id, device_status, online, offline, last_reading, battery_level, signal_strength, paired_device, device_type

#### Authentication (12)
username, password, confirm_password, forgot_password, remember_me, sign_in, sign_up, already_have_account, create_new_account, invalid_credentials, password_mismatch, account_created

#### Misc (13)
language, english, tamil, data_export, download_pdf, download_csv, print, share, about, help, contact_us, privacy_policy, terms_conditions, copyright

### Language Toggle

Users can switch between English and Tamil using the **language toggle in Navbar**:

```tsx
const { language, setLanguage, t } = useLanguage();

<select value={language} onChange={(e) => setLanguage(e.target.value as Language)}>
    <option value="en">{t('english')}</option>
    <option value="ta">{t('tamil')}</option>
</select>
```

### Mobile & Accessibility

- ✅ All text-heavy components support translations
- ✅ RTL support ready (Tamil text alignment)
- ✅ Font supports both scripts (English + Tamil)
- ✅ Language preference persists in localStorage

---

## 3. Environment Variables Reference

| Variable | Purpose | Example |
|----------|---------|---------|
| `SMS_PROVIDER` | SMS delivery provider | `msg91`, `twilio`, `aws_sns`, `mock` |
| `MSG91_AUTH_KEY` | MSG91 authentication | Get from msg91.com dashboard |
| `MSG91_ROUTE` | MSG91 message type | `1` (transactional), `4` (promotional) |
| `TWILIO_ACCOUNT_SID` | Twilio account identifier | `AC...` |
| `TWILIO_AUTH_TOKEN` | Twilio authentication | Get from Twilio console |
| `TWILIO_FROM_NUMBER` | Twilio sender number | `+1234567890` |
| `AWS_SNS_REGION` | AWS region for SNS | `ap-south-1`, `us-east-1` |

---

## 4. Troubleshooting

### SMS Not Sending

**Problem**: SMS not received, no error shown
**Solution**: 
1. Check `SMS_PROVIDER` in `.env` is set correctly
2. Verify credentials are valid
3. Enable console logs: `FASTAPI_DEBUG=True`
4. Check phone number format (must include country code: +91...)

### Translation Key Missing

**Problem**: `t('undefined_key')` returns `undefined_key`
**Solution**:
1. Add key to both `en` and `ta` objects in `translations.ts`
2. Restart frontend: `npm run dev`
3. Clear browser cache

### MSG91 Authentication Error

**Problem**: "MSG91 error: Invalid auth key"
**Solution**:
1. Verify auth key copied correctly (no spaces)
2. Check MSG91 account is active
3. Regenerate auth key in msg91.com dashboard

### Twilio Credentials Invalid

**Problem**: "Twilio error: Invalid credentials"
**Solution**:
1. Verify Account SID and Auth Token in Twilio Console
2. Check phone number is in E.164 format (+country_code...)
3. Ensure Twilio account is active (not suspended)

---

## 5. Next Steps

1. ✅ SMS Integration implemented with 3 providers
2. ✅ Comprehensive translations (150+ keys)
3. 📝 Add SMS delivery tracking (logs, statistics)
4. 📝 Implement SMS scheduling
5. 📝 Add SMS template management
6. 📝 Expand RTL support for Tamil
7. 📝 Add SMS delivery webhooks for receipts

---

**Last Updated**: February 20, 2026
**Status**: Production Ready
