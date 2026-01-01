
import requests
import json
import os

# Hardcoded for the Tickets Table based on views.py
TEABLE_API_TOKEN = "hzM3GkK0q3w1S4pL8tN7rQ9vX2bJ6yH5" # I need to find the token from settings or environment. 
# Wait, I don't have the token in plain text usually. It's in settings. 
# I can import from django settings if I run via manage.py shell, or just use `backend/manage.py shell`

# Alternative: I'll use a management command script or just run it via 'python manage.py shell'
# passing the code to stdin if possible, or creating a temporary command.

# Better: Create a file that can be run with `python manage.py shell < script.py` concept
# actually `shell` doesn't accept a file argument easily in all versions, checking `<` redirection.

# I will write a script that imports settings properly.
import os
import sys
import django

# Setup Django environment
# Current dir is d:\Opus Portal\new-project
# Backend is in d:\Opus Portal\new-project\backend
# We need to add 'backend' to sys.path so 'core' is importable
sys.path.append(os.path.join(os.getcwd(), 'backend'))

# Use correct settings module found in manage.py
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.conf import settings
import requests

TEABLE_TICKETS_URL = 'https://teable.namuve.com/api/table/tblt7O90EhETDjXraHk/record'
TEABLE_TOKEN = settings.TEABLE_API_TOKEN

print(f"Token: {TEABLE_TOKEN[:5]}...")

try:
    response = requests.get(TEABLE_TICKETS_URL, headers={
        'Authorization': f'Bearer {TEABLE_TOKEN}'
    }, params={'limit': 1})
    
    response.raise_for_status()
    data = response.json()
    records = data.get('records', [])
    
    if records:
        print("Found a record. Listing fields:")
        fields = records[0].get('fields', {})
        for k in fields.keys():
            print(f"'{k}'")
            
        # specifically check for anything looking like Parking Status
        print("\nChecking for 'Parking Status' variants:")
        for k in fields.keys():
            if 'parking' in k.lower():
                print(f"Match: '{k}'")
    else:
        print("No records found to inspect fields.")

except Exception as e:
    print(f"Error: {e}")
