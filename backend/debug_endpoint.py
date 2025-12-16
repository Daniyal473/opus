
import requests
import json

try:
    payload = {
        "records": [
            {
                "id": "recDWNGtZ294ecFdj2m", # User provided record ID that definitely has the fields
                "fields": {
                    "Check in Date ": "2025-12-16T10:00:00.000Z"
                }
            }
        ],
        "fieldKeyType": "name"
    }

    # Direct test to Teable to confirm field name acceptance
    response = requests.patch(
        'https://teable.namuve.com/api/table/tblRmHEtBZSwi7HoTCz/record', 
        json=payload,
        headers={
            'Authorization': 'Bearer teable_accns9D6q7zXSzmnz8T_6yrrJPuyniWe1otvicokIDXoV3zHZJk9CiBkm1M/nIw=',
            'Content-Type': 'application/json'
        } 
    )
    
    print(f"Status Code: {response.status_code}")
    print(response.text[:2000])

    # Also test proper endpoint if direct works
    # ...
except Exception as e:
    print(e)
