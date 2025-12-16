
import requests
import json

TEABLE_TOKEN = "teable_accns9D6q7zXSzmnz8T_6yrrJPuyniWe1otvicokIDXoV3zHZJk9CiBkm1M/nIw="
GUEST_URL = 'https://teable.namuve.com/api/table/tblRmHEtBZSwi7HoTCz/record'
VISIT_URL = 'https://teable.namuve.com/api/table/tbl2D1gLavfJn6GMe0o/record'

def check_field(url, table_name):
    try:
        response = requests.get(url, params={'take': 1}, headers={'Authorization': f'Bearer {TEABLE_TOKEN}'})
        data = response.json()
        if 'records' in data and len(data['records']) > 0:
            print(f"\nFields in {table_name}:", list(data['records'][0]['fields'].keys()))
    except Exception as e:
        print(e)

check_field(GUEST_URL, "Guest Table")
check_field(VISIT_URL, "Visit Table")
