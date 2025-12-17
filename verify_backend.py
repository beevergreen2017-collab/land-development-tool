import requests
import sys

def test_land_info():
    url = "http://127.0.0.1:8001/proxy/land-info"
    params = {
        "lot_no": "265",
        "section_name": "西園"
    }
    
    with open("verify_output.txt", "w", encoding="utf-8") as f:
        f.write(f"Testing {url} with params {params}...\n")
        try:
            response = requests.get(url, params=params)
            f.write(f"Status Code: {response.status_code}\n")
            f.write(f"Response: {response.text}\n")
            
            if response.status_code == 200:
                data = response.json()
                if "area" in data and "price" in data:
                    f.write("Backend verification PASSED\n")
                else:
                    f.write("Backend verification FAILED: Missing keys\n")
            else:
                f.write("Backend verification FAILED: Non-200 status\n")
        except Exception as e:
            f.write(f"Error: {e}\n")

if __name__ == "__main__":
    test_land_info()
