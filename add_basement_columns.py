import sqlite3

# Connect to the database
conn = sqlite3.connect('sql_app.db')
cursor = conn.cursor()

# Columns to add
columns = [
    ("basement_legal_parking", "INTEGER", "0"),
    ("basement_bonus_parking", "INTEGER", "0"),
    ("basement_excavation_rate", "FLOAT", "70.0"),
    ("basement_parking_space_area", "FLOAT", "40.0"),
    ("basement_floor_height", "FLOAT", "3.3")
]

# Add columns if they don't exist
for col_name, col_type, default_val in columns:
    try:
        cursor.execute(f"ALTER TABLE projects ADD COLUMN {col_name} {col_type} DEFAULT {default_val}")
        print(f"Added column {col_name}")
    except sqlite3.OperationalError as e:
        print(f"Column {col_name} might already exist: {e}")

conn.commit()
conn.close()
print("Migration completed.")
