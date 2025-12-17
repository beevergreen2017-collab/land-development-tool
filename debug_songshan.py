import requests
import xml.etree.ElementTree as ET

def debug_songshan():
    # Checking ListLandSection as ListTownSection failed (404)
    url = "https://api.nlsc.gov.tw/other/ListLandSection/A/A01"
    params = {}
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }

    print(f"Querying {url} with params {params}...")
    try:
        # Use verify=False to avoid SSL issues in dev environment
        response = requests.get(url, params=params, headers=headers, verify=False)
        print(f"Status Code: {response.status_code}")

        if response.status_code == 200:
            try:
                root = ET.fromstring(response.content)
                # print(f"Root Tag: {root.tag}")
                
                # NLSC API usually returns <sectItem> elements
                items = root.findall(".//sectItem")
                print(f"Found {len(items)} sections in XML response.")
                
                found_match = False
                for item in items:
                    name_elem = item.find("sectstr")
                    code_elem = item.find("sectcode")
                    
                    if name_elem is not None and code_elem is not None:
                        name = name_elem.text
                        code = code_elem.text
                        
                        if "寶清" in name:
                            print(f"MATCH FOUND: Name='{name}', Code='{code}'")
                            found_match = True
                
                if not found_match:
                    print("No section containing '寶清' found.")
                    # Optional: Print first few to verify content
                    # for i, item in enumerate(items[:5]):
                    #     print(f"Sample {i}: {item.find('sectstr').text}")

            except ET.ParseError as e:
                print(f"XML Parse Error: {e}")
                print(f"Raw Content Sample: {response.text[:200]}")
        else:
            print(f"Request Failed. Status: {response.status_code}")
            print(f"Response: {response.text[:200]}")

    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    debug_songshan()
