import requests

TEABLE_API_URL = 'https://teable.namuve.com/api/table/tbl0LE97iFDVS5RlXoo/record'
TEABLE_TOKEN = 'teable_accns9D6q7zXSzmnz8T_6yrrJPuyniWe1otvicokIDXoV3zHZJk9CiBkm1M/nIw='

try:
    response = requests.get(TEABLE_API_URL, headers={
        'Authorization': f'Bearer {TEABLE_TOKEN}'
    })
    response.raise_for_status()
    print(response.json())
except Exception as e:
    print(e)
