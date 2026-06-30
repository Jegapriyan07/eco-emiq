#!/usr/bin/env python3
"""
Send WhatsApp alert via EcoTronics API
"""
import requests
import json
import sys

API_URL = "http://localhost:8000/api/v1/ml/simulate/trigger-whatsapp"

# Alert message
payload = {
    "phone": "+919360260470",
    "message": "🚨 EcoTronics Alert: AQI threshold exceeded! Immediate action required in your ward.",
    "priority": "high"
}

try:
    print(f"📱 Sending WhatsApp Alert...")
    print(f"Phone: {payload['phone']}")
    print(f"Message: {payload['message']}")
    print()
    
    response = requests.post(API_URL, json=payload)
    
    if response.status_code == 200:
        result = response.json()
        print("✅ WhatsApp Alert Sent Successfully!")
        print(json.dumps(result, indent=2))
    else:
        print(f"❌ Error: {response.status_code}")
        print(json.dumps(response.json(), indent=2))
        sys.exit(1)
        
except Exception as e:
    print(f"❌ Failed to send alert: {str(e)}")
    sys.exit(1)
