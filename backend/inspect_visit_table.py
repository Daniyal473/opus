
import requests
import json

# Visit Table ID from user
TEABLE_VISIT_URL = 'https://teable.namuve.com/api/table/tbl2D1gLavfJn6GMe0o/record'
TEABLE_TOKEN = "teable_accns9D6q7zXSzmnz8T_6yrrJPuyniWe1otvicokIDXoV3zHZJk9CiBkm1M/nIw="

# Search for any record (limit 1) to inspect fields
try:
    response = requests.get(
        TEABLE_VISIT_URL, 
        params={'take': 1},
        headers={
            'Authorization': f'Bearer {TEABLE_TOKEN}'
        } 
    )
    
    print(f"Status Code: {response.status_code}")
    data = response.json()
    if 'records' in data and len(data['records']) > 0:
        record = data['records'][0]
        fields = record.get('fields', {})
        print("Fields found:", list(fields.keys()))
    else:
        print("No records found in Visit table.")
        print(response.text[:500])

except Exception as e:
    print(e)
