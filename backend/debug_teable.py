
import requests

TEABLE_TOKEN = "teable_accns9D6q7zXSzmnz8T_6yrrJPuyniWe1otvicokIDXoV3zHZJk9CiBkm1M/nIw="
TABLES = [
    ("tblRmHEtBZSwi7HoTCz", "In/Out"),
    ("tbl2D1gLavfJn6GMe0o", "Visit"),
    ("tblxBUElSacHNStAJU2", "Maintenance")
]

headers = {
    "Authorization": f"Bearer {TEABLE_TOKEN}"
}

for table_id, name in TABLES:
    print(f"Fetching fields for {name} ({table_id})")
    try:
        url = f"https://teable.namuve.com/api/table/{table_id}/field"
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            fields = response.json()
            found = False
            for f in fields:
                 if f['name'] == 'Attachments':
                    print(f"[{name}] FOUND ATTACHMENTS ID: {f['id']}")
                    found = True
            if not found:
                print(f"[{name}] Attachments field NOT FOUND. Fields: {[f['name'] for f in fields]}")
        else:
            print(f"Error {response.status_code}: {response.text}")
    except Exception as e:
        print(e)
