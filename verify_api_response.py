import requests
import sys

try:
    # Try to fetch projects from the local API
    response = requests.get("http://127.0.0.1:8001/projects/")
    if response.status_code == 200:
        projects = response.json()
        print(f"Successfully fetched {len(projects)} projects.")
        if len(projects) > 0:
            p = projects[0]
            print(f"Sample Project Keys: {list(p.keys())}")
            # Check for new keys
            required = ['massing_me_rate', 'massing_stair_rate', 'massing_design_coverage']
            missing = [k for k in required if k not in p]
            if missing:
                print(f"FAILED: Missing keys in API response: {missing}")
            else:
                print("SUCCESS: All massing keys are present in API response.")
                print(f"me_rate: {p.get('massing_me_rate')}, stair_rate: {p.get('massing_stair_rate')}")
    else:
        print(f"Failed to fetch projects. Status: {response.status_code}")
        print(response.text)
except Exception as e:
    print(f"Connection error: {e}")
