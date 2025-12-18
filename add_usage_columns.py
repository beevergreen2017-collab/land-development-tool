import sqlite3

# Connect to the database
conn = sqlite3.connect('sql_app.db')
cursor = conn.cursor()

# Columns to add
columns = [
    ("usage_residential_rate", "FLOAT", "60.0"),
    ("usage_commercial_rate", "FLOAT", "30.0"),
    ("usage_agency_rate", "FLOAT", "10.0")
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
