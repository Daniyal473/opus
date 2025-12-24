import requests
import os

# Simulate the log_ticket_action function logic directly to test connectivity
def test_log():
    TEABLE_TOKEN = os.getenv('TEABLE_TOKEN') or "keyvY2By911L4p2gT" # Hardcoded for test if env parsing fails/is complex here
    
    action = "Created"
    status_val = "Open"
    apartment_number = "999"  # Test Room
    managed_by = "System"

    print(f"Testing Log Action: {action} for Room {apartment_number}")

    # 1. Teable Log
    LOG_URL = 'https://teable.namuve.com/api/table/tblgBUXf5G1HdpzxXiW/record'
    FIELD_IDS = {
        "Ticket Status": "fldMJxZZQB5psQrDxdr",
        "Apartment Number": "fldn8lKxqW0d4hcgCwh",
        "Action": "fldO7TD4Ygu9xg8y8SL",
    }
    
    payload = {
        "records": [{
            "fields": {
                FIELD_IDS["Ticket Status"]: status_val,
                FIELD_IDS["Apartment Number"]: str(apartment_number),
                FIELD_IDS["Action"]: action,
            }
        }],
        "fieldKeyType": "id"
    }
    
    try:
        print("Sending to Teable...")
        response = requests.post(LOG_URL, headers={
            'Authorization': f'Bearer {TEABLE_TOKEN}',
            'Content-Type': 'application/json'
        }, json=payload)
        print(f"Teable Status: {response.status_code}")
        if response.status_code not in [200, 201]:
            print(f"Teable Error: {response.text}")
    except Exception as e:
        print(f"Teable Exception: {e}")

    # 2. N8N Webhook Log
    N8N_WEBHOOK_URL = "https://n8n.namuve.com/webhook/997cf0f9-5d64-4d0e-a064-57b413e95d22"
    n8n_payload = {
        "Ticket Status": status_val,
        "Apartment Number": str(apartment_number),
        "Action": action,
        "Managed by": managed_by
    }
    
    try:
        print("Sending to N8N...")
        n8n_response = requests.post(N8N_WEBHOOK_URL, json=n8n_payload)
        print(f"N8N Status: {n8n_response.status_code}")
        if n8n_response.status_code not in [200, 201]:
             print(f"N8N Error: {n8n_response.text}")
        else:
             print("N8N Success!")
    except Exception as e:
        print(f"N8N Exception: {e}")

if __name__ == "__main__":
    test_log()
