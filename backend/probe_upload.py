import requests
import os

TOKEN = "teable_accns9D6q7zXSzmnz8T_6yrrJPuyniWe1otvicokIDXoV3zHZJk9CiBkm1M/nIw="
URLS_TO_TEST = [
    "https://teable.namuve.com/api/upload",
    "https://teable.namuve.com/api/file/upload",
    "https://teable.namuve.com/api/storage/upload",
    "https://teable.namuve.com/upload",
    "https://teable.namuve.com/api/v1/file/upload",
]

def probe_upload():
    # Create dummy file
    with open("probe_test.txt", "w") as f:
        f.write("test content")

    for url in URLS_TO_TEST:
        print(f"Testing {url}...")
        try:
            files = {'file': ('probe_test.txt', open('probe_test.txt', 'rb'), 'text/plain')}
            response = requests.post(url, headers={
                'Authorization': f'Bearer {TOKEN}'
            }, files=files)
            print(f"Result: {response.status_code}")
            if response.status_code != 404:
                 print(f"Content: {response.text}")
        except Exception as e:
            print(f"Error: {e}")
            
    if os.path.exists("probe_test.txt"):
        os.remove("probe_test.txt")

if __name__ == "__main__":
    probe_upload()
