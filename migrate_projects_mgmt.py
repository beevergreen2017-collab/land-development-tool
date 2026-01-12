import sqlite3

def migrate():
    conn = sqlite3.connect("land_development.db")
    cursor = conn.cursor()

    columns = [
        ("is_pinned", "INTEGER DEFAULT 0"),
        ("archived_at", "DATETIME"),
        ("last_opened_at", "DATETIME"),
        ("updated_at", "DATETIME")
    ]

    for col_name, col_type in columns:
        try:
            print(f"Adding column {col_name}...")
            cursor.execute(f"ALTER TABLE projects ADD COLUMN {col_name} {col_type}")
            print(f"Successfully added {col_name}")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print(f"Column {col_name} already exists. Skipping.")
            else:
                print(f"Error adding {col_name}: {e}")

    conn.commit()
    conn.close()
    print("Migration completed.")

if __name__ == "__main__":
    migrate()
