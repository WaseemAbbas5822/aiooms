import os
import sqlite3

db = os.path.join(os.path.dirname(os.path.abspath(__file__)), "aiooms.db")
if not os.path.exists(db):
    print("aiooms.db not found next to this script. Tell me where your database file is.")
    raise SystemExit

con = sqlite3.connect(db)
cols = [r[1] for r in con.execute("PRAGMA table_info(vendors)")]
for name, ddl in [
    ("role", "VARCHAR DEFAULT 'vendor'"),
    ("is_active", "BOOLEAN DEFAULT 1"),
    ("created_at", "DATETIME"),
]:
    if name in cols:
        print("already has", name)
    else:
        con.execute(f"ALTER TABLE vendors ADD COLUMN {name} {ddl}")
        print("added", name)
con.commit()
con.close()
