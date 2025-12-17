import requests
import xml.etree.ElementTree as ET

def find_code():
    url = "https://api.nlsc.gov.tw/other/ListTownSection"
    params = {
        "lcode": "A",
        "tcode": "07"
    }
    
    print(f"Querying {url} with params {params}...")
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }

    try:
        response = requests.get(url, params=params, headers=headers, verify=False)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"Response Text: {response.text}")
            return

        root = ET.fromstring(response.content)
        
        found = False
        print("\n--- Search Results for '雙園' ---")
        # The user said "traverse all <section>", but XML tag might be different.
        # I'll try to find all elements and check for name.
        # Based on previous experience, it might be <section> or <sectItem>
        
        # Let's iterate over all children of root to be safe
        for child in root:
            # Try to find name and code in child
            name_elem = child.find("name")
            if name_elem is None: name_elem = child.find("sectstr")
            
            code_elem = child.find("code")
            if code_elem is None: code_elem = child.find("sectcode")
            
            if name_elem is not None and name_elem.text and "雙園" in name_elem.text:
                code_val = code_elem.text if code_elem is not None else "Unknown"
                print(f"Name: {name_elem.text}, Code: {code_val}")
                found = True
        
        if not found:
            print("No section found containing '雙園'.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    find_code()
