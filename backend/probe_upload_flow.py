import requests
import json
import os

TEABLE_CREATE_URL = "https://teable.namuve.com/api/table/tblRmHEtBZSwi7HoTCz/record"
TEABLE_TOKEN = "teable_accns9D6q7zXSzmnz8T_6yrrJPuyniWe1otvicokIDXoV3zHZJk9CiBkm1M/nIw="
TABLE_ID = "tblRmHEtBZSwi7HoTCz"
FIELD_ID = "fldJdomUaG2ufpuQj45" # Attachments

def probe_upload_flow():
    # 1. Create a dummy guest
    print("Creating dummy guest...")
    payload = {
        "records": [{
            "fields": {
                "Name ": "Probe Upload Test",
                "CNIC / Passport": "00000",
            }
        }],
        "fieldKeyType": "name"
    }
    
    try:
        response = requests.post(TEABLE_CREATE_URL, headers={
            'Authorization': f'Bearer {TEABLE_TOKEN}',
            'Content-Type': 'application/json'
        }, json=payload)
        response.raise_for_status()
        data = response.json()
        record_id = data['records'][0]['id']
        print(f"Created Guest Record ID: {record_id}")
        
    except Exception as e:
        print(f"Failed to create guest: {e}")
        return

    # 2. Upload Attachment
    # Endpoint: /api/table/{tableId}/record/{recordId}/{fieldId}/uploadAttachment
    upload_url = f"https://teable.namuve.com/api/table/{TABLE_ID}/record/{record_id}/{FIELD_ID}/uploadAttachment"
    print(f"Attempting upload to {upload_url}...")
    
    # Create dummy file
    with open("probe_upload.txt", "w") as f:
        f.write("Upload Probe Content")
        
    try:
        files = {'file': ('probe_upload.txt', open('probe_upload.txt', 'rb'), 'text/plain')}
        # Note: headers usually don't need Content-Type for files if using existing lib, 
        # but Authorization is needed.
        up_response = requests.post(upload_url, headers={
            'Authorization': f'Bearer {TEABLE_TOKEN}'
        }, files=files)
        
        print(f"Upload Status: {up_response.status_code}")
        print(f"Upload Response: {up_response.text}")
        
    except Exception as e:
        print(f"Upload failed: {e}")
    finally:
        if os.path.exists("probe_upload.txt"):
            os.remove("probe_upload.txt")

if __name__ == "__main__":
    probe_upload_flow()
