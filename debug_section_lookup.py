import requests
import xml.etree.ElementTree as ET

def find_section_code(town_code, section_name):
    url = "https://api.nlsc.gov.tw/other/ListTownSection"
    params = {"lcode": "A", "tcode": town_code}
    
    print(f"Querying {url} with params {params}...")
    try:
        response = requests.get(url, params=params, verify=False)
        print(f"Status: {response.status_code}")
        print(f"Content-Type: {response.headers.get('Content-Type', 'Unknown')}")
        print(f"Raw Text: {response.text[:200]}...") # Print first 200 chars
        
        root = ET.fromstring(response.content)
        print("Root tag:", root.tag)
        
        found_any = False
        print(f"Items found: {len(root.findall('.//sectItem'))}")
        for item in root.findall(".//sectItem"):
            name_elem = item.find("sectstr")
            code_elem = item.find("sectcode")
            
            if name_elem is not None:
                print(f"  - {name_elem.text} ({code_elem.text if code_elem is not None else '?'})")
                if name_elem.text == section_name:
                    print(f"!!! MATCH FOUND !!! -> {code_elem.text}")
                    return code_elem.text
                if section_name in name_elem.text:
                     print(f"Partial match found for {section_name} in {name_elem.text}")
            else:
                 print("Item without sectstr")

    except Exception as e:
        print(f"Error: {e}")
        return None
    
    return None

if __name__ == "__main__":
    find_section_code("A05", "西園段一小段")
