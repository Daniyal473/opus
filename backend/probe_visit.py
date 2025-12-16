import requests
import json

# Fetch Field Metadata for Visit Table
TEABLE_FIELDS_URL = "https://teable.namuve.com/api/table/tbl2D1gLavfJn6GMe0o/field"
TEABLE_TOKEN = "teable_accns9D6q7zXSzmnz8T_6yrrJPuyniWe1otvicokIDXoV3zHZJk9CiBkm1M/nIw="

def probe_visit_table():
    headers = {
        "Authorization": f"Bearer {TEABLE_TOKEN}",
    }

    try:
        print(f"Sending GET request to {TEABLE_FIELDS_URL}...")
        response = requests.get(TEABLE_FIELDS_URL, headers=headers)
        
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            fields = response.json()
            print("Fields found:")
            for field in fields:
                print(f"ID: {field.get('id')}, Name: {field.get('name')}, Type: {field.get('type')}")
        else:
            print("Failed to read fields.")
            print(response.text)
            
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    probe_visit_table()
