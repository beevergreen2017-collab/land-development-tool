import sqlite3

DB_PATH = "sql_app.db"

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print(f"Connecting to {DB_PATH}...")
    
    # Add site_config to projects
    try:
        cursor.execute("ALTER TABLE projects ADD COLUMN site_config JSON")
        print("Added column site_config to projects")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("Column site_config already exists.")
        else:
            print(f"Error adding site_config: {e}")

    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
