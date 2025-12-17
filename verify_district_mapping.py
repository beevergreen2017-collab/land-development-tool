import requests
import json

BASE_URL = "http://127.0.0.1:8001"

def test_district_mapping():
    # Helper to clean up output
    def print_result(case, success, msg):
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} [{case}]: {msg}")

    print("--- Verifying District Mapping ---")

    # 1. Test Valid District (Xinyi - A17)
    # We need a valid section/lot to avoid 404/400 from other checks. 
    # But wait, the code checks `if not town: raise...` BEFORE section code check?
    # No, it checks `if not town or not sect_code:` then strictly checks town.
    # So if I provide a Dummy Section, it will fail on Sect Code, but PASS the Town Code check.
    # If I provide an Invalid District, it should fail on Town Code check FIRST.
    
    # Actually, looking at the code:
    # if not town: raise ... "目前僅支援台北市"
    # if not sect_code: raise ... "Section ... not supported"
    # So I can test "Invalid District" easily.
    
    try:
        # Case 1: Invalid District
        r = requests.get(f"{BASE_URL}/proxy/land-info", params={
            "district": "板橋區", 
            "section_name": "SomeSection", 
            "lot_no": "123"
        })
        if r.status_code == 400 and "目前僅支援台北市" in r.text:
            print_result("Invalid District", True, f"Got expected error: {r.json()['detail']}")
        else:
            print_result("Invalid District", False, f"Status: {r.status_code}, Resp: {r.text}")

        # Case 2: Valid District (Xinyi), Invalid Section (Should pass district check, fail section check)
        # Note: "Section not supported or found" specifically means the dynamic lookup returned None
        r = requests.get(f"{BASE_URL}/proxy/land-info", params={
            "district": "信義區", 
            "section_name": "InvalidSection", 
            "lot_no": "123"
        })
        if r.status_code == 400 and "not supported or found" in r.text:
            print_result("Valid District (Xinyi) / Invalid Section", True, "Got expected error for missing section.")
        else:
             print_result("Valid District (Xinyi) / Invalid Section", False, f"Status: {r.status_code}, Resp: {r.text}")

        # Case 3: Valid Fuzzy Lookup (Songshan / "寶清") - Should find e.g., "寶清段一小段"
        # Since I updated main.py to handle fuzzy search, this should now succeed.
        r = requests.get(f"{BASE_URL}/proxy/land-info", params={
            "district": "松山區", 
            "section_name": "寶清", # Matches "寶清段一小段" etc.
            "lot_no": "90"
        })
        if r.status_code == 200 or (r.status_code == 404 and "Parcel not found" in r.text):
             print_result("Valid Fuzzy Lookup (Songshan/'寶清')", True, f"Lookup proceeded (Fuzzy Match Success). Status: {r.status_code}")
        else:
             print_result("Valid Fuzzy Lookup (Songshan/'寶清')", False, f"Failed. Status: {r.status_code}, Resp: {r.text}")

    except Exception as e:
        print(f"❌ Exception: {e}")

if __name__ == "__main__":
    test_district_mapping()
