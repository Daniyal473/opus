
import requests
import json

TEABLE_TOKEN = "teable_accns9D6q7zXSzmnz8T_6yrrJPuyniWe1otvicokIDXoV3zHZJk9CiBkm1M/nIw="
MAINTENANCE_URL = 'https://teable.namuve.com/api/table/tblxBUElSacHNStAJU2/record'
TICKET_ID = '65'

params = {
    'filter': json.dumps({
        'field': 'Ticket ID ',
        'operator': 'is',
        'value': f"{TICKET_ID}" 
    })
}

print("Attempting to fetch Maintenance records...")
print(f"URL: {MAINTENANCE_URL}")
print(f"Params: {params}")

try:
    response = requests.get(MAINTENANCE_URL, headers={'Authorization': f'Bearer {TEABLE_TOKEN}'}, params=params)
    print(f"Status: {response.status_code}")
    print("Response Text Preview:", response.text[:200])
    
    if response.status_code == 200:
        data = response.json()
        print(f"Records Found: {len(data.get('records', []))}")
        if data.get('records'):
            print("First Record Keys:", data['records'][0].keys())
            print("First Record Fields:", data['records'][0]['fields'].keys())
    else:
        print("Error Response:", response.json())
        
except Exception as e:
    print(f"Exception: {e}")
