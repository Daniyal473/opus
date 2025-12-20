
import requests

TEABLE_TOKEN = "token_aa964648750800732822709295326573887c331a"
TABLE_ID = "tblRmHEtBZSwi7HoTCz" # In/Out table
URL = f"https://teable.namuve.com/api/table/{TABLE_ID}/field"

headers = {
    "Authorization": f"Bearer {TEABLE_TOKEN}"
}

try:
    response = requests.get(URL, headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        fields = response.json()
        for f in fields:
            print(f"ID: {f['id']}, Name: {f['name']}, Type: {f['type']}")
    else:
        print(response.text)
except Exception as e:
    print(e)
