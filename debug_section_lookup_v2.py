import requests
import xml.etree.ElementTree as ET

def test_url(name, url, params=None):
    print(f"--- {name} ---")
    print(f"Querying {url} with params {params}...")
    try:
        if params:
            response = requests.get(url, params=params, verify=False)
        else:
            response = requests.get(url, verify=False)
            
        print(f"Status: {response.status_code}")
        print(f"Content-Type: {response.headers.get('Content-Type', 'Unknown')}")
        print(f"Raw Text: {response.text[:200]}...")
        
        if response.status_code == 200:
            try:
                root = ET.fromstring(response.content)
                print(f"XML Root: {root.tag}")
                items = root.findall(".//sectItem")
                print(f"Found {len(items)} items")
                for item in items:
                    print(f"  {item.find('sectstr').text} : {item.find('sectcode').text}")
            except Exception as e:
                print(f"XML Parse Fail: {e}")
    except Exception as e:
        print(f"Request Fail: {e}")

if __name__ == "__main__":
    # 1. User Suggested
    # test_url("User Suggested (ListTownSection)", "https://api.nlsc.gov.tw/other/ListTownSection", {"lcode": "A", "tcode": "A05"})
    
    # 2. Legacy / Previous Known (ListLandSection)
    test_url("Legacy (ListLandSection)", "https://api.nlsc.gov.tw/other/ListLandSection/A/A05")
