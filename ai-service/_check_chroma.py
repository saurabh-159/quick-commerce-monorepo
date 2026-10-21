import sqlite3

conn = sqlite3.connect(r"chroma_db/chroma.sqlite3")
cur = conn.cursor()
tables = [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
print("tables:", tables)
for t in tables:
    try:
        n = cur.execute(f"SELECT COUNT(*) FROM [{t}]").fetchone()[0]
        print(f"{t}: {n}")
    except Exception as e:
        print(t, e)

if "embedding_metadata" in tables:
    rows = cur.execute(
        "SELECT id, key, string_value FROM embedding_metadata LIMIT 20"
    ).fetchall()
    print("meta sample:", rows)
