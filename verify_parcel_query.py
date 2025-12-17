import requests

def verify_parcel_query():
    url = "https://api.nlsc.gov.tw/other/ParcelQuery"
    # Using codes found from ListLandSection:
    # City: A
    # Town: A05 (Wanhua)
    # Section: 0024 (Shuangyuan 1)
    # Lot: 537 -> 05370000
    
    params = {
        "lcode": "A",
        "tcode": "A05",
        "scode": "0024",
        "lodcode": "05370000"
    }
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    print(f"Testing {url} with params {params}...")
    try:
        response = requests.get(url, params=params, headers=headers, verify=False)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    verify_parcel_query()
