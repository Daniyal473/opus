import requests
import json

url = "https://teable.namuve.com/api/table/tblW8KQtEUKhIyY4ARm/record?take=10"
headers = {
    "Authorization": "Bearer teable_accns9D6q7zXSzmnz8T_6yrrJPuyniWe1otvicokIDXoV3zHZJk9CiBkm1M/nIw="
}

try:
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    data = response.json()
    
    # Print first few records to inspect structure
    print(json.dumps(data, indent=2))
    
    # specifically check the 'Floor' field values
    print("\n--- Floor Values ---")
    if 'records' in data:
        for record in data['records']:
            fields = record.get('fields', {})
            # fldLDqxFV67sZ1rxPvN is the suggested ID for Floor
            print(f"Record {record['id']} Floor: {fields.get('fldLDqxFV67sZ1rxPvN')}")
            
except Exception as e:
    print(f"Error: {e}")
