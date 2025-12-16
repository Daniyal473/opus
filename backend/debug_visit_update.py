
import requests
import json
from datetime import datetime

TEABLE_TOKEN = "teable_accns9D6q7zXSzmnz8T_6yrrJPuyniWe1otvicokIDXoV3zHZJk9CiBkm1M/nIw="
VISIT_URL = 'https://teable.namuve.com/api/table/tbl2D1gLavfJn6GMe0o/record'

record_id = "recPx9jF2dspC1CDVv1" # User's record
now_iso = datetime.now().isoformat()

# Payload trying to update 'Check in Date '
payload = {
    "record_id": record_id,
    "fields": {
        "Check in Date ": now_iso
    }
}

print(f"Attempting to PATCH record {record_id} in Visit Table...")
print(f"URL: {VISIT_URL}")

try:
    # Note: Teable single record update is usually PATCH /record/{record_id} or PATCH /record with list
    # The view uses: requests.patch(url, ... json=payload) where payload is formatted for specific endpoint?
    # Let's check views.py logic. 
    # views.py does: 
    # payload = { "record": { "fields": { "Check in Date ": ... } } } ??? 
    # No, let's look at views.py.
    
    # Actually, let's use the exact logic from views.py to reproduce exactly.
    # views.py: 
    # url = TEABLE_VISIT_URL // which is .../record
    # payload = { "id": record_id, "fields": fields }  <-- Wait, checking views.py content...
    
    # Logic in views.py:
    # response = requests.patch(url, headers=..., json=payload)
    # where payload = {"id": record_id, "fields": {"Check in Date ": ...}}
    
    # Teable API for updating a single record is PATCH /table/{tableId}/record/{recordId} 
    # OR PATCH /table/{tableId}/record with body {records: [{id:..., fields:...}]}
    
    # Checking what `update_guest_status` implements.
    pass
except Exception as e:
    pass
    
# Re-implementing exact logic from likely views.py to test
url = VISIT_URL
patch_payload = {
    "id": record_id,
    "fields": {
        "Check in Date ": now_iso
    }
}

response = requests.patch(
    url, 
    headers={
        'Authorization': f'Bearer {TEABLE_TOKEN}',
        'Content-Type': 'application/json'
    }, 
    json=patch_payload
)

print(f"Status: {response.status_code}")
print(f"Response: {response.text}")
