import requests
import json

# Probe Maintenance Table for Agent Field
TEABLE_MAINTENANCE_URL = "https://teable.namuve.com/api/table/tblxBUElSacHNStAJU2/record"
TEABLE_TOKEN = "teable_accns9D6q7zXSzmnz8T_6yrrJPuyniWe1otvicokIDXoV3zHZJk9CiBkm1M/nIw="

def probe_agent_field():
    print(f"Testing record creation with Agent field URL: {TEABLE_MAINTENANCE_URL}")
    
    # Test 1: "Agent" (No space)
    print("Test 1: Field 'Agent'")
    test_payload_1 = {
        "records": [{
            "fields": {
                "Name": "Agent Test 1",
                "CNIC": "11111-1111111-1",
                "Agent": "Test Agent Name"
            }
        }],
        "fieldKeyType": "name"
    }
    
    try:
        response = requests.post(TEABLE_MAINTENANCE_URL, headers={
            'Authorization': f'Bearer {TEABLE_TOKEN}',
            'Content-Type': 'application/json'
        }, json=test_payload_1)
        
        if response.status_code in [200, 201]:
            print("Test 1 Success! Field 'Agent' works.")
            print(json.dumps(response.json(), indent=2))
        else:
            print(f"Test 1 Failed: {response.status_code} - {response.text}")
            
            # Test 2: "Agent " (With space)
            print("\nTest 2: Field 'Agent ' (with space)")
            test_payload_2 = {
                "records": [{
                    "fields": {
                        "Name": "Agent Test 2",
                        "CNIC": "22222-2222222-2",
                        "Agent ": "Test Agent Name"
                    }
                }],
                "fieldKeyType": "name"
            }
            response2 = requests.post(TEABLE_MAINTENANCE_URL, headers={
                'Authorization': f'Bearer {TEABLE_TOKEN}',
                'Content-Type': 'application/json'
            }, json=test_payload_2)
            
            if response2.status_code in [200, 201]:
                print("Test 2 Success! Field 'Agent ' works.")
                print(json.dumps(response2.json(), indent=2))
            else:
                print(f"Test 2 Failed: {response2.status_code} - {response2.text}")

    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    probe_agent_field()
