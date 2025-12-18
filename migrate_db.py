import sqlite3
import os

DB_FILE = "sql_app.db"

def migrate():
    # Check if DB exists
    if not os.path.exists(DB_FILE):
        print(f"Database {DB_FILE} not found. Skipping migration.")
        return

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    print(f"Migrating database: {DB_FILE}")

    # --- 1. Projects Table Updates ---
    print("\n--- Checking 'projects' table ---")
    try:
        cursor.execute("PRAGMA table_info(projects)")
        columns = [info[1] for info in cursor.fetchall()]
        print(f"Existing columns: {columns}")

        new_columns = {
            "bonus_central": "FLOAT DEFAULT 0.0",
            "bonus_local": "FLOAT DEFAULT 0.0",
            "bonus_other": "FLOAT DEFAULT 0.0",
            "bonus_soil_mgmt": "FLOAT DEFAULT 0.0",
            "bonus_tod_reward": "FLOAT DEFAULT 0.0",
            "bonus_tod_increment": "FLOAT DEFAULT 0.0",
            "bonus_chloride": "FLOAT DEFAULT 0.0",
            "bonus_public_exemption": "FLOAT DEFAULT 0.0",
            "bonus_cap": "FLOAT DEFAULT 100.0",
            "massing_design_coverage": "FLOAT DEFAULT 45.0",
            "massing_exemption_coef": "FLOAT DEFAULT 1.15",
            "massing_public_ratio": "FLOAT DEFAULT 33.0",
            "massing_me_rate": "FLOAT DEFAULT 15.0",
            "massing_stair_rate": "FLOAT DEFAULT 10.0"
        }

        for col, definition in new_columns.items():
            if col not in columns:
                try:
                    print(f"Adding missing column: {col}")
                    cursor.execute(f"ALTER TABLE projects ADD COLUMN {col} {definition}")
                except sqlite3.OperationalError as e:
                    print(f"Error adding {col}: {e}")
            else:
                print(f"Column '{col}' already exists.")

    except Exception as e:
        print(f"Error accessing projects table: {e}")


    # --- 2. Land Parcels Table Updates ---
    print("\n--- Checking 'land_parcels' table ---")
    try:
        cursor.execute("PRAGMA table_info(land_parcels)")
        parcel_columns = [info[1] for info in cursor.fetchall()]
        print(f"Existing columns: {parcel_columns}")

        new_parcel_columns = {
            "district": "VARCHAR",
            "legal_coverage_rate": "FLOAT DEFAULT 0.0",
            "legal_floor_area_rate": "FLOAT DEFAULT 0.0"
        }

        for col, definition in new_parcel_columns.items():
            if col not in parcel_columns:
                try:
                    print(f"Adding missing column: {col}")
                    cursor.execute(f"ALTER TABLE land_parcels ADD COLUMN {col} {definition}")
                except sqlite3.OperationalError as e:
                    print(f"Error adding {col}: {e}")
            else:
                print(f"Column '{col}' already exists.")
    
    except Exception as e:
        print(f"Error accessing land_parcels table: {e}")

    conn.commit()
    conn.close()
    print("\nMigration completed successfully.")

if __name__ == "__main__":
    migrate()
