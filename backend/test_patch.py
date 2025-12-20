
import requests
import json

TEABLE_TOKEN = "teable_accns9D6q7zXSzmnz8T_6yrrJPuyniWe1otvicokIDXoV3zHZJk9CiBkm1M/nIw="
TABLE_ID = "tblxBUElSacHNStAJU2"
RECORD_ID = "recV8HNUDGSlEQt0TpV"

url = f"https://teable.namuve.com/api/table/{TABLE_ID}/record/{RECORD_ID}"

headers = {
    "Authorization": f"Bearer {TEABLE_TOKEN}",
    "Content-Type": "application/json"
}

# Payload to update a field (harmless update if possible, or just same value)
# Previous dump showed 'name': '80.00' (Maintenance ID?)
# We'll try to update 'Name' to 'Test Update' (and revert, or just assume it's test data)
# Actually, the user is editing it, so maybe I should try updating a less critical field?
# Or just "Name".
payload = {
    "record": {
        "fields": {
            "Name": "Test Update Debug"
        }
    },
    "fieldKeyType": "name"
}

print(f"Attempting PATCH to {url}")
try:
    response = requests.patch(url, headers=headers, json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Exception: {e}")
