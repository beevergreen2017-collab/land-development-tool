import sqlite3

conn = sqlite3.connect('sql_app.db')
cursor = conn.cursor()

try:
    cursor.execute("UPDATE projects SET bonus_cap = 100.0 WHERE bonus_cap = 50.0")
    print(f"Updated {cursor.rowcount} projects to bonus_cap 100.0")
    conn.commit()
except Exception as e:
    print(f"Error updating projects: {e}")
finally:
    conn.close()
