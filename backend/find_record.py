
import requests

TEABLE_TOKEN = "teable_accns9D6q7zXSzmnz8T_6yrrJPuyniWe1otvicokIDXoV3zHZJk9CiBkm1M/nIw="
TABLES = [
    ("tblRmHEtBZSwi7HoTCz", "In/Out"),
    ("tbl2D1gLavfJn6GMe0o", "Visit"),
    ("tblxBUElSacHNStAJU2", "Maintenance"),
    ("tblt7O90EhETDjXraHk", "Tickets"),
]

TARGET_ID = "recV8HNUDGSlEQt0TpV"

headers = {
    "Authorization": f"Bearer {TEABLE_TOKEN}"
}

print(f"Searching for record: {TARGET_ID}")

for table_id, name in TABLES:
    print(f"Checking {name} ({table_id})...")
    url = f"https://teable.namuve.com/api/table/{table_id}/record/{TARGET_ID}"
    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            print(f"SUCCESS! Found in table: {name} ({table_id})")
            print(response.json())
            break
        elif response.status_code == 404:
            print(f"Not found in {name}.")
        else:
            print(f"Error {response.status_code}: {response.text}")
    except Exception as e:
        print(f"Exception checking {name}: {e}")
