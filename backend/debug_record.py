
import requests
import json

TEABLE_TOKEN = "teable_accns9D6q7zXSzmnz8T_6yrrJPuyniWe1otvicokIDXoV3zHZJk9CiBkm1M/nIw="
TABLE_ID = "tblRmHEtBZSwi7HoTCz" # In/Out table
RECORD_ID = "recRXOUdZhXduLW5K2j" # ID from the error message

URL = f"https://teable.namuve.com/api/table/{TABLE_ID}/record/{RECORD_ID}"

headers = {
    "Authorization": f"Bearer {TEABLE_TOKEN}"
}

print(f"Fetching record {RECORD_ID}...")
try:
    response = requests.get(URL, headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(json.dumps(data, indent=2))
    else:
        print(response.text)
except Exception as e:
    print(e)
