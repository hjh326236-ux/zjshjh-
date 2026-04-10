import sqlite3
from pathlib import Path

base = Path(__file__).parent
sql_path = base / "database.sql"
db_path = base / "self_intro.db"

if not sql_path.exists():
    raise FileNotFoundError(f"未找到 SQL 文件: {sql_path}")

sql = sql_path.read_text(encoding="utf-8")

conn = sqlite3.connect(db_path)
try:
    conn.executescript(sql)
    conn.commit()
finally:
    conn.close()

print(f"数据库已创建: {db_path}")
