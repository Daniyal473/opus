import requests
import json

# Configuration
TEABLE_API_URL = "https://teable.namuve.com/api/table/tblW8KQtEUKhIyY4ARm/record"
TEABLE_TOKEN = "teable_accns9D6q7zXSzmnz8T_6yrrJPuyniWe1otvicokIDXoV3zHZJk9CiBkm1M/nIw="

def probe_apartments():
    headers = {
        "Authorization": f"Bearer {TEABLE_TOKEN}",
    }

    try:
        print(f"Sending GET request to {TEABLE_API_URL}...")
        response = requests.get(TEABLE_API_URL, headers=headers)
        
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            records = data.get('records', [])
            if records:
                print("First record fields:", json.dumps(records[0]['fields'], indent=2))
            else:
                print("No records found.")
        else:
            print("Failed to read apartments.")
            print(response.text)
            
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    probe_apartments()
