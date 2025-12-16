
import requests
import json

TEABLE_TOKEN = "teable_accns9D6q7zXSzmnz8T_6yrrJPuyniWe1otvicokIDXoV3zHZJk9CiBkm1M/nIw="

GUEST_URL = 'https://teable.namuve.com/api/table/tblRmHEtBZSwi7HoTCz/record/recPx9jF2dspC1CDVv1'
VISIT_URL = 'https://teable.namuve.com/api/table/tbl2D1gLavfJn6GMe0o/record/recPx9jF2dspC1CDVv1'

headers = {'Authorization': f'Bearer {TEABLE_TOKEN}'}

print("Checking User's provided Record ID: recPx9jF2dspC1CDVv1")

print("--- Checking Guest Table (In/Out) ---")
r1 = requests.get(GUEST_URL, headers=headers)
print(f"Status: {r1.status_code}")
if r1.status_code == 200:
    print("Found in Guest Table!")
    print(r1.json())
else:
    print("Not in Guest Table")

print("\n--- Checking Visit Table ---")
r2 = requests.get(VISIT_URL, headers=headers)
print(f"Status: {r2.status_code}")
if r2.status_code == 200:
    print("Found in Visit Table!")
    print(r2.json())
else:
    print("Not in Visit Table")
