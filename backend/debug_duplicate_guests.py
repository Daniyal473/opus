
import requests
import json

ticket_id = "63"
TEABLE_TOKEN = "teable_accns9D6q7zXSzmnz8T_6yrrJPuyniWe1otvicokIDXoV3zHZJk9CiBkm1M/nIw="

TEABLE_URL = 'https://teable.namuve.com/api/table/tblRmHEtBZSwi7HoTCz/record'

# Current implementation logic
params = [
    ('search', ticket_id),
    ('search', 'Ticket ID '), 
    ('search', 'true')
]

print(f"Fetching records for Ticket ID: {ticket_id}")
response = requests.get(TEABLE_URL, params=params, headers={
    'Authorization': f'Bearer {TEABLE_TOKEN}'
})

if response.status_code == 200:
    data = response.json()
    records = data.get('records', [])
    print(f"Found {len(records)} records (Before Filtering).")
    filtered_records = []
    for rec in records:
        f = rec.get('fields', {})
        rec_ticket_id = str(f.get('Ticket ID '))
        if rec_ticket_id == ticket_id:
            filtered_records.append(rec)
            print(f"MATCH - ID: {rec['id']}, Name: {f.get('Name ')}, Ticket ID: {rec_ticket_id}")
        else:
            print(f"SKIP - ID: {rec['id']}, Name: {f.get('Name ')}, Ticket ID: {rec_ticket_id}")
            
    print(f"Final Count: {len(filtered_records)}")
else:
    print(f"Error: {response.status_code} - {response.text}")
