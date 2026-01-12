import sqlite3
import os

DB_FILE = "./sql_app.db"

def patch_db():
    if not os.path.exists(DB_FILE):
        print(f"Skipping DB patch: {DB_FILE} not found.")
        return

    print(f"Checking DB schema for projects table in {DB_FILE}...")
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    try:
        # Check existing columns
        # PRAGMA table_info returns tuples like (cid, name, type, notnull, dflt_value, pk)
        cursor.execute("PRAGMA table_info(projects)")
        columns_info = cursor.fetchall()
        existing_columns = [col[1] for col in columns_info]
        
        # 1. is_pinned (INTEGER DEFAULT 0)
        if "is_pinned" not in existing_columns:
            print("Adding column: is_pinned")
            cursor.execute("ALTER TABLE projects ADD COLUMN is_pinned INTEGER DEFAULT 0")
        
        # 2. archived_at (DATETIME/TEXT NULLABLE)
        if "archived_at" not in existing_columns:
            print("Adding column: archived_at")
            cursor.execute("ALTER TABLE projects ADD COLUMN archived_at TEXT")
            
        # 3. last_opened_at (DATETIME/TEXT NULLABLE)
        if "last_opened_at" not in existing_columns:
            print("Adding column: last_opened_at")
            cursor.execute("ALTER TABLE projects ADD COLUMN last_opened_at TEXT")
            
        # 4. updated_at (DATETIME/TEXT NULLABLE)
        if "updated_at" not in existing_columns:
            print("Adding column: updated_at")
            cursor.execute("ALTER TABLE projects ADD COLUMN updated_at TEXT")
            
            # Backfill updated_at with created_at if created_at exists
            if "created_at" in existing_columns:
                print("Backfilling updated_at from created_at...")
                cursor.execute("UPDATE projects SET updated_at = created_at WHERE updated_at IS NULL")

        conn.commit()
        print("DB Patch completed successfully.")
        
    except Exception as e:
        print(f"DB Patch failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    patch_db()
