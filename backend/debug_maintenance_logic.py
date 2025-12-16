
import requests
import json

TEABLE_TOKEN = "teable_accns9D6q7zXSzmnz8T_6yrrJPuyniWe1otvicokIDXoV3zHZJk9CiBkm1M/nIw="
table_id = 'tblxBUElSacHNStAJU2'
url = f"https://teable.namuve.com/api/table/{table_id}/record"
ticket_id = '65'

print(f"DEBUG: URL={url}")

params = [
    ('search', ticket_id),
    ('search', 'Ticket ID '), 
    ('search', 'true')
]

try:
    print("Sending Request...")
    response = requests.get(url, headers={'Authorization': f'Bearer {TEABLE_TOKEN}'}, params=params)
    print(f"Status: {response.status_code}")
    
    if response.status_code != 200:
        print(f"Error Body: {response.text}")
        exit()

    data = response.json()
    raw_records = data.get('records', [])
    print(f"Raw Records Count: {len(raw_records)}")
    
    records = []
    filtered_records = []
    
    for r in raw_records:
        fields = r.get('fields', {})
        print(f"Record Fields Keys: {list(fields.keys())}")
        
        # Strict check logic
        r_ticket_id = str(fields.get('Ticket ID ', ''))
        print(f"Checking Ticket ID: '{r_ticket_id}' vs '{ticket_id}'")
        
        if r_ticket_id == str(ticket_id) or r_ticket_id == f"{ticket_id}.00":
            filtered_records.append(r)

    print(f"Filtered Records: {len(filtered_records)}")

    for record in filtered_records:
            fields = record.get('fields', {})
            raw_attachments = fields.get('Attachments', [])
            processed_attachments = []
            
            for att in raw_attachments:
                processed_attachments.append({
                    'id': att.get('id'),
                    'name': att.get('name'),
                    'url': att.get('presignedUrl'),
                    'type': att.get('mimetype')
                })

            records.append({
                'id': record.get('id'),
                'name': fields.get('Name'), 
                'cnic': fields.get('CNIC'),
                'checkInDate': fields.get('Start Time '),
                'checkOutDate': fields.get('End Date '),
                'ticket_type': 'Maintenance',
                'attachments': processed_attachments,
            })
            
    print("Output Records:", json.dumps(records, indent=2))

except Exception as e:
    print(f"EXCEPTION CAUGHT: {e}")
    import traceback
    traceback.print_exc()
