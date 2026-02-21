# EcoTronics - Quick Reference Card

## 🚀 Starting the Application

### Frontend
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5174
```

### ML Service
```bash
cd ml-service
pip install -r requirements.txt
python -m uvicorn src.main:app --reload
# Runs on http://localhost:8000
```

---

## 📱 SMS Integration Quick Start

### 1. Configure Provider
Choose ONE provider and add to `.env`:

**Option A: MSG91 (India)**
```
SMS_PROVIDER=msg91
MSG91_AUTH_KEY=your_key_from_msg91.com
MSG91_ROUTE=1
```

**Option B: Twilio (Global)**
```
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_FROM_NUMBER=+1234567890
```

**Option C: Development (Mock)**
```
SMS_PROVIDER=mock
# No credentials needed, logs to console
```

### 2. Install Dependencies (if using Twilio or AWS)
```bash
pip install twilio  # For Twilio
pip install boto3   # For AWS SNS
```

### 3. Test SMS Endpoint
```bash
curl -X POST http://localhost:8000/api/v1/ml/simulate/trigger-sms \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919876543210","message":"Test"}'
```

---

## 🌐 Translation Quick Start

### Using Translations in Components
```tsx
import { useLanguage } from '../../contexts/LanguageContext';

export default function MyComponent() {
    const { t } = useLanguage();
    
    return (
        <div>
            <h1>{t('dashboard')}</h1>
            <button>{t('refresh')}</button>
        </div>
    );
}
```

### Common Translation Keys
- `dashboard` - Dashboard
- `alerts` - Alerts
- `loading` - Loading...
- `success` - Success
- `error` - Error
- `refresh` - Refresh
- `export` - Export
- `compliance` - Compliance
- `anomalies` - Anomalies
- `organization` - Organization

### Adding New Translation
```typescript
// In frontend/src/i18n/translations.ts

export const translations = {
    en: {
        'my_feature': 'My New Feature'
    },
    ta: {
        'my_feature': 'என் புதிய அம்சம்'
    }
};

// Use in component: t('my_feature')
```

---

## 📊 Key Endpoints

### Simulation
- `GET /api/v1/ml/simulate/city` - City snapshot
- `GET /api/v1/ml/simulate/ward/{id}` - Ward data
- `GET /api/v1/ml/simulate/vehicle` - Vehicle data

### SMS Alerts
- `POST /api/v1/ml/simulate/trigger-sms` - Send SMS alert

### ML Predictions
- `POST /api/v1/ml/predict/anomaly` - Anomaly detection
- `POST /api/v1/ml/predict/maintenance` - Maintenance prediction
- `POST /api/v1/ml/predict/aqi_forecast` - AQI forecast

---

## 📁 Important Files

### Frontend
- `frontend/src/i18n/translations.ts` - All translations (150+ keys)
- `frontend/src/contexts/LanguageContext.tsx` - Language state management
- `frontend/src/pages/city-admin/` - City dashboards
- `frontend/src/pages/industry-owner/` - Industry dashboards
- `frontend/src/pages/vehicle-owner/` - Vehicle dashboards

### Backend
- `ml-service/src/main.py` - SMS endpoints & ML models
- `ml-service/src/simulation.py` - Physics-based data generation
- `ml-service/requirements.txt` - Python dependencies
- `.env.example` - Configuration template

---

## 🐛 Troubleshooting

### SMS Not Sending
1. Check `SMS_PROVIDER` in `.env`
2. Verify credentials are correct
3. Ensure phone number includes country code (+91...)
4. Check service is running: `curl http://localhost:8000/docs`

### Translation Not Working
1. Check `useLanguage` is imported
2. Verify key exists in translations.ts
3. Clear browser cache (Ctrl+Shift+Delete)
4. Restart frontend: `npm run dev`

### Frontend Can't Connect to Backend
1. Check ML service is running: `http://localhost:8000`
2. Check CORS is enabled (should be in main.py)
3. Check firewall isn't blocking port 8000
4. Try accessing `/docs` endpoint directly

---

## 📚 Documentation

- **Full SMS Guide**: [SMS_TRANSLATION_GUIDE.md](SMS_TRANSLATION_GUIDE.md)
- **Implementation Summary**: [IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md)
- **Project Status**: [PROJECT_STATUS.md](PROJECT_STATUS.md)
- **Architecture**: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## 🎯 Common Tasks

### Adding a New Page
1. Create file: `frontend/src/pages/section/PageName.tsx`
2. Import useLanguage: `import { useLanguage } from '../../contexts/LanguageContext'`
3. Use translations: `const { t } = useLanguage()`
4. Add to routing in `App.tsx`

### Adding a New SMS Provider
1. Edit `ml-service/src/main.py`
2. Add new function: `async def send_sms_provider_name(...)`
3. Update SMS_CONFIG with credentials
4. Update trigger_sms function to include new provider
5. Add to requirements.txt if needed
6. Document in `.env.example`

### Deploying to Production
1. Set `ENVIRONMENT=production` in `.env`
2. Use real SMS credentials (not mock)
3. Configure proper database (not SQLite)
4. Set up HTTPS/TLS
5. Configure monitoring (Prometheus/Grafana)
6. Run migrations if applicable

---

## 💡 Tips & Tricks

### Language Testing
```tsx
// Force language in browser console
localStorage.setItem('language', 'ta');
// Then refresh page
```

### SMS Testing Without Credentials
```bash
SMS_PROVIDER=mock
# SMS will log to console instead of sending
# Perfect for development!
```

### View All Available Endpoints
```bash
# Open http://localhost:8000/docs
# Shows interactive API documentation
```

### Database Query Examples
```python
# In ml-service, if using database
from sqlalchemy import select
result = session.execute(select(Model).where(Model.id == 1))
```

---

## 🔗 Provider Support Links

- **MSG91**: https://msg91.com (India)
- **Twilio**: https://www.twilio.com (Global)
- **AWS SNS**: https://aws.amazon.com/sns/ (Enterprise)

---

## ✅ Checklist for New Developers

- [ ] Clone repository
- [ ] Install frontend dependencies: `cd frontend && npm install`
- [ ] Install backend dependencies: `cd ml-service && pip install -r requirements.txt`
- [ ] Copy `.env.example` to `.env`
- [ ] Configure SMS provider in `.env`
- [ ] Start frontend: `npm run dev`
- [ ] Start ML service: `python -m uvicorn src.main:app --reload`
- [ ] Visit http://localhost:5174
- [ ] Test SMS endpoint
- [ ] Test language toggle

---

**Last Updated**: February 20, 2026  
**Version**: 2.0 (With SMS & Translation)  
**Status**: Production Ready ✅
