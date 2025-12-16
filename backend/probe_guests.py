import requests
import json

# Fetch Table Metadata (to find Base ID)
TEABLE_TABLE_URL = "https://teable.namuve.com/api/table/tblRmHEtBZSwi7HoTCz"
TEABLE_TOKEN = "teable_accns9D6q7zXSzmnz8T_6yrrJPuyniWe1otvicokIDXoV3zHZJk9CiBkm1M/nIw="

def probe_guests_table():
    headers = {
        "Authorization": f"Bearer {TEABLE_TOKEN}",
    }

    try:
        print(f"Sending GET request to {TEABLE_TABLE_URL}...")
        response = requests.get(TEABLE_TABLE_URL, headers=headers)
        
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print("Table Data:")
            print(json.dumps(data, indent=2))
        else:
             print("Failed to read table info.")
             print(response.text)
            
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    probe_guests_table()
