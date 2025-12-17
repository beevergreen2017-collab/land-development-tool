import requests

def test_fix():
    url = "http://127.0.0.1:8001/proxy/land-info"
    # Case: Wanhua / Shuangyuan / 537
    params = {
        "district": "萬華區",
        "section_name": "雙園段一小段",
        "lot_no": "537"
    }
    
    print(f"Testing {params}...")
    try:
        response = requests.get(url, params=params)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_fix()
