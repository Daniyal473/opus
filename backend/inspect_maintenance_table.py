
import requests
import json

TEABLE_TOKEN = "teable_accns9D6q7zXSzmnz8T_6yrrJPuyniWe1otvicokIDXoV3zHZJk9CiBkm1M/nIw="
MAINTENANCE_URL = 'https://teable.namuve.com/api/table/tblxBUElSacHNStAJU2/record'

def inspect_table(url, name):
    print(f"--- Inspecting {name} ---")
    try:
        response = requests.get(url, params={'take': 1}, headers={'Authorization': f'Bearer {TEABLE_TOKEN}'})
        data = response.json()
        if 'records' in data and len(data['records']) > 0:
            fields = data['records'][0]['fields']
            print("\nFields found:", list(fields.keys()))
            print("\nSample Record Fields:", json.dumps(fields, indent=2))
        else:
            print("No records found or error reading table.")
            print(data)
    except Exception as e:
        print(f"Error: {e}")

inspect_table(MAINTENANCE_URL, "Maintenance Table")
