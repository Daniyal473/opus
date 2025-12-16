import requests

def probe_server():
    base_url = "http://localhost:8000/api"
    
    # Control test
    try:
        health_resp = requests.get(f"{base_url}/health/")
        print(f"Health Check: {health_resp.status_code}")
    except Exception as e:
        print(f"Health Check Failed: {e}")

    # Target test
    try:
        tickets_resp = requests.get(f"{base_url}/tickets/")
        print(f"Tickets Endpoint: {tickets_resp.status_code}")
        if tickets_resp.status_code != 200:
             print(f"Response: {tickets_resp.text}")
    except Exception as e:
        print(f"Tickets Endpoint Failed: {e}")

if __name__ == "__main__":
    probe_server()
