import requests
import json

# Probe Maintenance Table
TEABLE_MAINTENANCE_URL = "https://teable.namuve.com/api/table/tblxBUElSacHNStAJU2/record"
TEABLE_FIELDS_URL = "https://teable.namuve.com/api/table/tblxBUElSacHNStAJU2/field"
TEABLE_TOKEN = "teable_accns9D6q7zXSzmnz8T_6yrrJPuyniWe1otvicokIDXoV3zHZJk9CiBkm1M/nIw="

def probe_maintenance_table():
    headers = {
        "Authorization": f"Bearer {TEABLE_TOKEN}",
    }

    # Try to get fields
    print(f"Probing fields URL: {TEABLE_FIELDS_URL}")
    try:
        response = requests.get(TEABLE_FIELDS_URL, headers=headers)
        print(f"Fields Status Code: {response.status_code}")
        if response.status_code == 200:
            fields = response.json()
            print("Fields found:")
            for field in fields:
                print(f"  ID: {field.get('id')}, Name: {field.get('name')}, Type: {field.get('type')}")
        else:
            print(f"Fields Error: {response.text}")
    except Exception as e:
        print(f"Fields request failed: {e}")

    print("\n" + "="*50 + "\n")

    # Try to create a test record
    print(f"Testing record creation URL: {TEABLE_MAINTENANCE_URL}")
    test_payload = {
        "records": [{
            "fields": {
                "Name": "Test Worker",
                "CNIC": "12345-6789012-3"
            }
        }],
        "fieldKeyType": "name"
    }
    
    try:
        response = requests.post(TEABLE_MAINTENANCE_URL, headers={
            'Authorization': f'Bearer {TEABLE_TOKEN}',
            'Content-Type': 'application/json'
        }, json=test_payload)
        print(f"Create Status Code: {response.status_code}")
        if response.status_code in [200, 201]:
            print("Record created successfully!")
            print(json.dumps(response.json(), indent=2))
        else:
            print(f"Create Error: {response.text}")
    except Exception as e:
        print(f"Create request failed: {e}")

if __name__ == "__main__":
    probe_maintenance_table()
