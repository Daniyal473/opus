import os
import requests
from dotenv import load_dotenv

load_dotenv()

TEABLE_API_URL = os.getenv('TEABLE_API_URL')
TEABLE_API_TOKEN = os.getenv('TEABLE_API_TOKEN')

username_to_check = "test"

if not TEABLE_API_URL or not TEABLE_API_TOKEN:
    print("Missing credentials")
    exit(1)

headers = {
    'Authorization': f'Bearer {TEABLE_API_TOKEN}',
    'Content-Type': 'application/json'
}

print(f"Checking specific fields for user: {username_to_check}")
response = requests.get(TEABLE_API_URL, headers=headers)

if response.status_code == 200:
    data = response.json()
    records = data.get('records', [])
    found = False
    for record in records:
        fields = record.get('fields', {})
        # Note: using the key exactly as found in previous debug 'Username '
        db_user = fields.get('Username ')
        if db_user == username_to_check:
            print(f"MATCH FOUND!")
            print(f"ID: {record.get('id')}")
            print(f"Username: '{db_user}'")
            print(f"Password: '{fields.get('Password ')}'")
            print(f"Role: '{fields.get('Role ')}'")
            found = True
            # No break, find all duplicates
    
    if not found:
        print(f"User '{username_to_check}' not found.")
else:
    print(f"Error: {response.status_code} {response.text}")
