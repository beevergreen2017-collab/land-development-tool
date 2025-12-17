import sqlite3

# Connect to the database
conn = sqlite3.connect('sql_app.db')
cursor = conn.cursor()

# Add new columns to land_parcels table
try:
    cursor.execute("ALTER TABLE land_parcels ADD COLUMN legal_coverage_rate FLOAT DEFAULT 0.0")
    print("Added legal_coverage_rate column")
except sqlite3.OperationalError as e:
    print(f"Error adding legal_coverage_rate: {e}")

try:
    cursor.execute("ALTER TABLE land_parcels ADD COLUMN legal_floor_area_rate FLOAT DEFAULT 0.0")
    print("Added legal_floor_area_rate column")
except sqlite3.OperationalError as e:
    print(f"Error adding legal_floor_area_rate: {e}")

conn.commit()

# Add new columns to projects table
try:
    cursor.execute("ALTER TABLE projects ADD COLUMN bonus_central FLOAT DEFAULT 30.0")
    print("Added bonus_central column")
except sqlite3.OperationalError as e:
    print(f"Error adding bonus_central: {e}")

try:
    cursor.execute("ALTER TABLE projects ADD COLUMN bonus_local FLOAT DEFAULT 20.0")
    print("Added bonus_local column")
except sqlite3.OperationalError as e:
    print(f"Error adding bonus_local: {e}")

try:
    cursor.execute("ALTER TABLE projects ADD COLUMN bonus_other FLOAT DEFAULT 0.0")
    print("Added bonus_other column")
except sqlite3.OperationalError as e:
    print(f"Error adding bonus_other: {e}")

try:
    cursor.execute("ALTER TABLE land_parcels ADD COLUMN district TEXT")
    print("Added district column to land_parcels")
except sqlite3.OperationalError as e:
    print(f"Error adding district to land_parcels: {e}")

try:
    cursor.execute("ALTER TABLE projects ADD COLUMN bonus_soil_mgmt FLOAT DEFAULT 0.0")
    print("Added bonus_soil_mgmt column")
except sqlite3.OperationalError as e:
    print(f"Error adding bonus_soil_mgmt: {e}")

try:
    cursor.execute("ALTER TABLE projects ADD COLUMN bonus_tod FLOAT DEFAULT 0.0")
    print("Added bonus_tod column")
except sqlite3.OperationalError as e:
    print(f"Error adding bonus_tod: {e}")

try:
    cursor.execute("ALTER TABLE projects ADD COLUMN bonus_public_exemption FLOAT DEFAULT 7.98")
    print("Added bonus_public_exemption column")
except sqlite3.OperationalError as e:
    print(f"Error adding bonus_public_exemption: {e}")

try:
    cursor.execute("ALTER TABLE projects ADD COLUMN bonus_cap FLOAT DEFAULT 100.0")
    print("Added bonus_cap column")
except sqlite3.OperationalError as e:
    print(f"Error adding bonus_cap: {e}")

try:
    cursor.execute("ALTER TABLE projects ADD COLUMN bonus_tod_reward FLOAT DEFAULT 0.0")
    print("Added bonus_tod_reward column")
except sqlite3.OperationalError as e:
    print(f"Error adding bonus_tod_reward: {e}")

try:
    cursor.execute("ALTER TABLE projects ADD COLUMN bonus_tod_increment FLOAT DEFAULT 0.0")
    print("Added bonus_tod_increment column")
except sqlite3.OperationalError as e:
    print(f"Error adding bonus_tod_increment: {e}")

try:
    cursor.execute("ALTER TABLE projects ADD COLUMN bonus_chloride FLOAT DEFAULT 0.0")
    print("Added bonus_chloride column")
except sqlite3.OperationalError as e:
    print(f"Error adding bonus_chloride: {e}")

conn.commit()
conn.close()
