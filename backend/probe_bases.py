import requests
import json

TEABLE_BASE_URL = "https://teable.namuve.com/api/base"
TEABLE_TOKEN = "teable_accns9D6q7zXSzmnz8T_6yrrJPuyniWe1otvicokIDXoV3zHZJk9CiBkm1M/nIw="

def probe_bases():
    headers = {
        "Authorization": f"Bearer {TEABLE_TOKEN}",
    }

    try:
        print(f"Sending GET request to {TEABLE_BASE_URL}...")
        response = requests.get(TEABLE_BASE_URL, headers=headers)
        
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print("Bases:")
            print(json.dumps(data, indent=2))
        else:
            print("Failed to list bases.")
            print(response.text)
            
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    probe_bases()
