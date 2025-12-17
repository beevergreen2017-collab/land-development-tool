import requests
import time

BASE_URL = "http://127.0.0.1:8001"

def test_bonus_update():
    # 1. Create a project
    project_payload = {"name": "Test Bonus Project"}
    try:
        response = requests.post(f"{BASE_URL}/projects/", json=project_payload)
        response.raise_for_status()
        project = response.json()
        project_id = project["id"]
        print(f"Created project: {project['id']}")
    except Exception as e:
        print(f"Failed to create project: {e}")
        return

    # 2. Verify default values
    print("Checking defaults...")
    assert project["bonus_central"] == 30.0
    assert project["bonus_cap"] == 50.0
    
    # 3. Update bonus values
    update_payload = {
        "bonus_central": 40.0,
        "bonus_local": 25.0,
        "bonus_other": 10.0,
        "bonus_soil_mgmt": 5.0,
        "bonus_tod": 20.0,
        "bonus_public_exemption": 10.0,
        "bonus_cap": 60.0 # Just testing persistence
    }
    
    print(f"Updating project {project_id} with {update_payload}...")
    try:
        response = requests.put(f"{BASE_URL}/projects/{project_id}", json=update_payload)
        response.raise_for_status()
        updated_project = response.json()
    except Exception as e:
        print(f"Failed to update project: {e}")
        return

    # 4. Verify updates
    print("Verifying updates...")
    assert updated_project["bonus_central"] == 40.0
    assert updated_project["bonus_local"] == 25.0
    assert updated_project["bonus_other"] == 10.0
    assert updated_project["bonus_soil_mgmt"] == 5.0
    assert updated_project["bonus_tod"] == 20.0
    assert updated_project["bonus_public_exemption"] == 10.0
    assert updated_project["bonus_cap"] == 60.0
    
    print("✅ Bonus API Verification Passed!")

if __name__ == "__main__":
    # Wait for server to be ready ideally, but we'll assume it's running
    try:
        requests.get(f"{BASE_URL}/projects/")
        test_bonus_update()
    except requests.exceptions.ConnectionError:
        print("❌ Server is not running. Please start the server at port 8001.")
