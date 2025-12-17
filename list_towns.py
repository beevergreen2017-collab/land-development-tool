import requests
import xml.etree.ElementTree as ET

def list_towns():
    # Try the format found in search: https://api.nlsc.gov.tw/other/ListTown/A
    url = "https://api.nlsc.gov.tw/other/ListTown/A"
    
    print(f"Querying {url}...")
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }

    with open("town_list_results.txt", "w", encoding="utf-8") as f:
        try:
            response = requests.get(url, headers=headers, verify=False)
            response.raise_for_status()
            
            root = ET.fromstring(response.content)
            
            f.write("--- Towns in City A ---\n")
            for town in root.findall("townItem"): # Guessing tag name, might be 'town' or 'item'
                # Search result said fields are towncode and townname.
                # Let's try to print all children to be safe if tag names differ.
                code = town.find("towncode")
                name = town.find("townname")
                
                if code is not None and name is not None:
                    f.write(f"Code: {code.text}, Name: {name.text}\n")
                else:
                    # Fallback: print raw XML of the item
                    f.write(f"Item: {ET.tostring(town, encoding='unicode')}\n")
                    
        except Exception as e:
            f.write(f"Error: {e}\n")
            # Also try the query param format just in case
            try:
                url2 = "https://api.nlsc.gov.tw/other/ListTown?lcode=A"
                f.write(f"\nRetrying with {url2}...\n")
                response = requests.get(url2, headers=headers, verify=False)
                f.write(f"Status: {response.status_code}\n")
                f.write(f"Content: {response.text[:500]}\n")
            except Exception as e2:
                f.write(f"Retry Error: {e2}\n")

if __name__ == "__main__":
    list_towns()
