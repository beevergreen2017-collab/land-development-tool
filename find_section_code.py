import requests
import xml.etree.ElementTree as ET

def find_section_code():
    codes_to_try = ["A05", "05", "07"]
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    with open("section_code_results.txt", "w", encoding="utf-8") as f:
        for code in codes_to_try:
            url = f"https://api.nlsc.gov.tw/other/ListLandSection/A/{code}"
            f.write(f"\n--- Testing Code {code} with {url} ---\n")
            print(f"Testing {code}...")
            
            try:
                response = requests.get(url, headers=headers, verify=False)
                if response.status_code != 200:
                    f.write(f"Status: {response.status_code}\n")
                    continue
                
                root = ET.fromstring(response.content)
                
                found = False
                for section in root.findall("sectItem"): # Guessing tag name again, usually sectItem or section
                    # Try to find code/name in children
                    s_code = section.find("sectcode")
                    s_name = section.find("sectstr") # NLSC often uses sectstr for name
                    
                    if s_code is None: s_code = section.find("code")
                    if s_name is None: s_name = section.find("name")
                    
                    if s_name is not None and s_name.text and "雙園" in s_name.text:
                        f.write(f"MATCH FOUND! TownCode: {code}, SectCode: {s_code.text}, Name: {s_name.text}\n")
                        found = True
                
                if not found:
                    f.write("No '雙園' found in this town code.\n")
                    # Log first few items to see what we got
                    f.write("First 3 items:\n")
                    for i, section in enumerate(root.findall("sectItem")[:3]):
                         f.write(f"{ET.tostring(section, encoding='unicode')}\n")

            except Exception as e:
                f.write(f"Error: {e}\n")

if __name__ == "__main__":
    find_section_code()
