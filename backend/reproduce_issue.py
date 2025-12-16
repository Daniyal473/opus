import requests
import json
import os

URL = "http://127.0.0.1:8000/api/tickets/create/"

def reproduce_with_file():
    # Create a dummy file
    with open("test_attachment.txt", "w") as f:
        f.write("This is a test attachment content.")

    data = {
        'apartment_id': '14',
        'type': 'In/Out',
        'title': 'Test Ticket with Attachment',
        'purpose': 'Testing attachment upload',
        'priority': 'High',
        'occupancy': '2',
    }

    guests = [
        {
            'name': 'Jane Doe',
            'cnic': '98765-4321098-7',
            'cnicExpiry': '2031-12-31'
        }
    ]
    data['guests_data'] = json.dumps(guests)

    # File dictionary for requests
    # Key must match frontend: guest_0_attachment_0
    files = {
        'guest_0_attachment_0': ('test_attachment.txt', open('test_attachment.txt', 'rb'), 'text/plain')
    }

    try:
        print(f"Sending POST to {URL} with attachment...")
        response = requests.post(URL, data=data, files=files)
        print(f"Status: {response.status_code}")
        try:
            resp_json = response.json()
            print(json.dumps(resp_json, indent=2))
        except:
            print(f"Response Text: {response.text}")
            
    except Exception as e:
        print(f"Request failed: {e}")
    finally:
        # Cleanup
        if os.path.exists("test_attachment.txt"):
            os.remove("test_attachment.txt")

if __name__ == "__main__":
    reproduce_with_file()
