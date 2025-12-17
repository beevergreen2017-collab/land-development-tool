import requests
import sys

def test_land_info(district, section, lot):
    url = "http://127.0.0.1:8001/proxy/land-info"
    params = {
        "district": district,
        "section_name": section,
        "lot_no": lot
    }
    
    print(f"Testing {district} - {section} - {lot}...")
    try:
        response = requests.get(url, params=params)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        return response.status_code
    except Exception as e:
        print(f"Error: {e}")
        return 500

if __name__ == "__main__":
    # Test Case 1: Wanhua - Xiyuan (Should be 404 from external API, or 200 if valid)
    # Expected: town=A10, sect=0307
    c1 = test_land_info("萬華區", "西園段一小段", "265")
    
    # Test Case 2: Wanhua - Shuangyuan (Should be 404 from external API, or 200 if valid)
    # Expected: town=A10, sect=0363
    c2 = test_land_info("萬華區", "雙園段一小段", "265")
    
    # Test Case 3: Wenshan (Should be 400 because no section mapping for Wenshan provided yet, 
    # OR 404 if I didn't enforce section mapping for Wenshan? 
    # Looking at code: `if not sect_code: raise HTTPException(400...)`
    # I only added mappings for "西園段一小段" and "雙園段一小段".
    # So if I test Wenshan with "Unknown Section", it should fail with 400.
    c3 = test_land_info("文山區", "Unknown Section", "123")
    
    # Test Case 4: Invalid District
    c4 = test_land_info("Invalid District", "西園段一小段", "265")

    with open("verify_refinement_output.txt", "w", encoding="utf-8") as f:
        f.write(f"Case 1 (Wanhua/Xiyuan): {c1}\n")
        f.write(f"Case 2 (Wanhua/Shuangyuan): {c2}\n")
        f.write(f"Case 3 (Wenshan/Unknown): {c3}\n")
        f.write(f"Case 4 (Invalid): {c4}\n")
