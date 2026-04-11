from __future__ import annotations

import os
import shutil
import sqlite3
from pathlib import Path
from typing import Any

from flask import Flask, jsonify, request, send_from_directory

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_DB_PATH = BASE_DIR / "self_intro.db"

DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()
USE_POSTGRES = DATABASE_URL.startswith("postgres://") or DATABASE_URL.startswith("postgresql://")

if USE_POSTGRES:
    import psycopg
    from psycopg.rows import dict_row

RUNTIME_DB_DIR = Path(os.environ.get("DB_DIR", str(BASE_DIR))).resolve()
DB_PATH = RUNTIME_DB_DIR / "self_intro.db"

if not USE_POSTGRES:
    RUNTIME_DB_DIR.mkdir(parents=True, exist_ok=True)
    if not DB_PATH.exists() and DEFAULT_DB_PATH.exists():
        shutil.copy2(DEFAULT_DB_PATH, DB_PATH)

app = Flask(__name__, static_folder=str(BASE_DIR), static_url_path="")
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "zjshjh0416")

PROFILE_FIELDS = [
    "name",
    "english_name",
    "title",
    "city",
    "direction",
    "status",
    "bio",
    "email",
    "wechat",
    "phone",
    "github_url",
    "linkedin_url",
]
PROJECT_FIELDS = ["title", "project_type", "summary", "contribution", "tech_stack", "result_text", "preview_url", "source_url", "sort_order"]
EXPERIENCE_FIELDS = ["organization", "role", "period", "summary", "achievement_1", "achievement_2", "sort_order"]


def require_admin_token() -> tuple[dict[str, str], int] | None:
    token = request.headers.get("X-Admin-Token", "")
    if not token or token != ADMIN_TOKEN:
        return jsonify({"error": "未授权：admin token 无效或缺失"}), 401
    return None


def qmark() -> str:
    return "%s" if USE_POSTGRES else "?"


def get_conn():
    if USE_POSTGRES:
        return psycopg.connect(DATABASE_URL, row_factory=dict_row)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def rows_to_dicts(rows: list[Any]) -> list[dict[str, Any]]:
    return [dict(r) for r in rows]


def json_body() -> dict[str, Any]:
    return request.get_json(silent=True) or {}


def ensure_schema() -> None:
    if USE_POSTGRES:
        with get_conn() as conn:
            cur = conn.cursor()
            cur.execute("""CREATE TABLE IF NOT EXISTS profile (id INTEGER PRIMARY KEY, name TEXT NOT NULL, english_name TEXT, title TEXT NOT NULL, city TEXT, direction TEXT, status TEXT, bio TEXT, email TEXT, wechat TEXT, phone TEXT, github_url TEXT, linkedin_url TEXT)""")
            cur.execute("""CREATE TABLE IF NOT EXISTS skills (id SERIAL PRIMARY KEY, category TEXT NOT NULL, skill_name TEXT NOT NULL, level INTEGER)""")
            cur.execute("""CREATE TABLE IF NOT EXISTS projects (id SERIAL PRIMARY KEY, title TEXT NOT NULL, project_type TEXT, summary TEXT, contribution TEXT, tech_stack TEXT, result_text TEXT, preview_url TEXT, source_url TEXT, sort_order INTEGER DEFAULT 0)""")
            cur.execute("""CREATE TABLE IF NOT EXISTS experiences (id SERIAL PRIMARY KEY, organization TEXT NOT NULL, role TEXT NOT NULL, period TEXT NOT NULL, summary TEXT, achievement_1 TEXT, achievement_2 TEXT, sort_order INTEGER DEFAULT 0)""")
            cur.execute("""CREATE TABLE IF NOT EXISTS messages (id SERIAL PRIMARY KEY, visitor_name TEXT NOT NULL, visitor_email TEXT NOT NULL, message TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, is_read INTEGER NOT NULL DEFAULT 0)""")
            conn.commit()
        return

    if not DB_PATH.exists():
        raise FileNotFoundError("数据库不存在，请先运行 init_db.py")

    with get_conn() as conn:
        conn.execute("SELECT 1 FROM profile LIMIT 1")
        cols = conn.execute("PRAGMA table_info(messages)").fetchall()
        if not cols:
            conn.execute("""CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY, visitor_name TEXT NOT NULL, visitor_email TEXT NOT NULL, message TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now', 'localtime')), is_read INTEGER NOT NULL DEFAULT 0)""")
        else:
            col_names = {c["name"] for c in cols}
            if "is_read" not in col_names:
                conn.execute("ALTER TABLE messages ADD COLUMN is_read INTEGER NOT NULL DEFAULT 0")
        conn.commit()


def ensure_db_ready() -> tuple[dict[str, Any], int] | None:
    try:
        ensure_schema()
    except Exception as e:
        return jsonify({"error": f"数据库不可用：{e}"}), 500
    return None


def pick(payload: dict[str, Any], fields: list[str]) -> dict[str, Any]:
    return {k: payload.get(k) for k in fields if k in payload}


@app.get("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")


@app.get("/admin")
def admin_page():
    return send_from_directory(BASE_DIR, "admin.html")


def read_all(include_messages: bool = False):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT * FROM profile ORDER BY id LIMIT 1")
        profile = cur.fetchone()
        cur.execute("SELECT * FROM skills ORDER BY id")
        skills = rows_to_dicts(cur.fetchall())
        cur.execute("SELECT * FROM projects ORDER BY sort_order, id")
        projects = rows_to_dicts(cur.fetchall())
        cur.execute("SELECT * FROM experiences ORDER BY sort_order, id")
        experiences = rows_to_dicts(cur.fetchall())
        messages = []
        if include_messages:
            cur.execute("SELECT * FROM messages ORDER BY id DESC")
            messages = rows_to_dicts(cur.fetchall())
    return profile, skills, projects, experiences, messages


@app.get("/api/site-data")
def api_site_data():
    db_error = ensure_db_ready()
    if db_error:
        return db_error
    profile, skills, projects, experiences, _ = read_all(False)
    return jsonify({"profile": dict(profile) if profile else None, "skills": skills, "projects": projects, "experiences": experiences})


@app.get("/api/admin/health")
def api_admin_health():
    auth_error = require_admin_token()
    if auth_error:
        return auth_error
    db_error = ensure_db_ready()
    if db_error:
        return db_error
    return jsonify({"ok": True, "db_mode": "postgres" if USE_POSTGRES else "sqlite", "db_path": None if USE_POSTGRES else str(DB_PATH)})


@app.get("/api/admin/data")
def api_admin_data():
    auth_error = require_admin_token()
    if auth_error:
        return auth_error
    db_error = ensure_db_ready()
    if db_error:
        return db_error
    profile, skills, projects, experiences, messages = read_all(True)
    return jsonify({"profile": dict(profile) if profile else None, "skills": skills, "projects": projects, "experiences": experiences, "messages": messages})


@app.put("/api/admin/profile")
def api_admin_update_profile():
    auth_error = require_admin_token()
    if auth_error:
        return auth_error
    db_error = ensure_db_ready()
    if db_error:
        return db_error

    payload = json_body()
    data = pick(payload, PROFILE_FIELDS)
    if not data:
        return jsonify({"error": "没有可更新字段"}), 400
    if "name" in data and not str(data["name"] or "").strip():
        return jsonify({"error": "name 不能为空"}), 400
    if "title" in data and not str(data["title"] or "").strip():
        return jsonify({"error": "title 不能为空"}), 400

    try:
        with get_conn() as conn:
            cur = conn.cursor()
            cur.execute("SELECT id FROM profile ORDER BY id LIMIT 1")
            profile = cur.fetchone()
            if profile:
                keys = list(data.keys())
                set_clause = ", ".join([f"{k} = {qmark()}" for k in keys])
                values = [data[k] for k in keys] + [profile["id"]]
                cur.execute(f"UPDATE profile SET {set_clause} WHERE id = {qmark()}", values)
            else:
                keys = ["id", *data.keys()]
                placeholders = ", ".join([qmark()] * len(keys))
                values = [1, *[data[k] for k in data.keys()]]
                cur.execute(f"INSERT INTO profile ({', '.join(keys)}) VALUES ({placeholders})", values)
            conn.commit()
    except Exception as e:
        return jsonify({"error": f"保存资料失败：{e}"}), 500

    return jsonify({"ok": True})


@app.post("/api/admin/skills")
def api_admin_add_skill():
    auth_error = require_admin_token()
    if auth_error:
        return auth_error
    payload = json_body()
    category = str(payload.get("category", "")).strip()
    skill_name = str(payload.get("skill_name", "")).strip()
    level = payload.get("level", 70)
    if category not in ["熟练", "了解", "正在学习"]:
        return jsonify({"error": "category 必须是 熟练/了解/正在学习"}), 400
    if not skill_name:
        return jsonify({"error": "skill_name 不能为空"}), 400
    try:
        level = int(level)
    except Exception:
        return jsonify({"error": "level 必须是数字"}), 400
    with get_conn() as conn:
        conn.cursor().execute(f"INSERT INTO skills (category, skill_name, level) VALUES ({qmark()}, {qmark()}, {qmark()})", (category, skill_name, level))
        conn.commit()
    return jsonify({"ok": True})


@app.put("/api/admin/skills/<int:skill_id>")
def api_admin_update_skill(skill_id: int):
    auth_error = require_admin_token()
    if auth_error:
        return auth_error
    payload = json_body()
    category = str(payload.get("category", "")).strip()
    skill_name = str(payload.get("skill_name", "")).strip()
    level = payload.get("level", 70)
    if category not in ["熟练", "了解", "正在学习"]:
        return jsonify({"error": "category 必须是 熟练/了解/正在学习"}), 400
    if not skill_name:
        return jsonify({"error": "skill_name 不能为空"}), 400
    try:
        level = int(level)
    except Exception:
        return jsonify({"error": "level 必须是数字"}), 400
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(f"UPDATE skills SET category = {qmark()}, skill_name = {qmark()}, level = {qmark()} WHERE id = {qmark()}", (category, skill_name, level, skill_id))
        rc = cur.rowcount
        conn.commit()
    if rc == 0:
        return jsonify({"error": "skill 不存在"}), 404
    return jsonify({"ok": True})


@app.delete("/api/admin/skills/<int:skill_id>")
def api_admin_delete_skill(skill_id: int):
    auth_error = require_admin_token()
    if auth_error:
        return auth_error
    with get_conn() as conn:
        conn.cursor().execute(f"DELETE FROM skills WHERE id = {qmark()}", (skill_id,))
        conn.commit()
    return jsonify({"ok": True})


@app.post("/api/admin/projects")
def api_admin_add_project():
    auth_error = require_admin_token()
    if auth_error:
        return auth_error
    payload = json_body()
    data = pick(payload, PROJECT_FIELDS)
    if not str(data.get("title", "")).strip():
        return jsonify({"error": "title 不能为空"}), 400
    data.setdefault("sort_order", 0)
    keys = list(data.keys())
    placeholders = ", ".join([qmark()] * len(keys))
    with get_conn() as conn:
        conn.cursor().execute(f"INSERT INTO projects ({', '.join(keys)}) VALUES ({placeholders})", [data[k] for k in keys])
        conn.commit()
    return jsonify({"ok": True})


@app.put("/api/admin/projects/<int:project_id>")
def api_admin_update_project(project_id: int):
    auth_error = require_admin_token()
    if auth_error:
        return auth_error
    payload = json_body()
    data = pick(payload, PROJECT_FIELDS)
    if not data:
        return jsonify({"error": "没有可更新字段"}), 400
    if "title" in data and not str(data.get("title", "")).strip():
        return jsonify({"error": "title 不能为空"}), 400
    keys = list(data.keys())
    set_clause = ", ".join([f"{k} = {qmark()}" for k in keys])
    values = [data[k] for k in keys] + [project_id]
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(f"UPDATE projects SET {set_clause} WHERE id = {qmark()}", values)
        rc = cur.rowcount
        conn.commit()
    if rc == 0:
        return jsonify({"error": "project 不存在"}), 404
    return jsonify({"ok": True})


@app.delete("/api/admin/projects/<int:project_id>")
def api_admin_delete_project(project_id: int):
    auth_error = require_admin_token()
    if auth_error:
        return auth_error
    with get_conn() as conn:
        conn.cursor().execute(f"DELETE FROM projects WHERE id = {qmark()}", (project_id,))
        conn.commit()
    return jsonify({"ok": True})


@app.post("/api/admin/experiences")
def api_admin_add_experience():
    auth_error = require_admin_token()
    if auth_error:
        return auth_error
    payload = json_body()
    data = pick(payload, EXPERIENCE_FIELDS)
    if not str(data.get("organization", "")).strip() or not str(data.get("role", "")).strip():
        return jsonify({"error": "organization 和 role 不能为空"}), 400
    if not str(data.get("period", "")).strip():
        return jsonify({"error": "period 不能为空"}), 400
    data.setdefault("sort_order", 0)
    keys = list(data.keys())
    placeholders = ", ".join([qmark()] * len(keys))
    with get_conn() as conn:
        conn.cursor().execute(f"INSERT INTO experiences ({', '.join(keys)}) VALUES ({placeholders})", [data[k] for k in keys])
        conn.commit()
    return jsonify({"ok": True})


@app.put("/api/admin/experiences/<int:experience_id>")
def api_admin_update_experience(experience_id: int):
    auth_error = require_admin_token()
    if auth_error:
        return auth_error
    payload = json_body()
    data = pick(payload, EXPERIENCE_FIELDS)
    if not data:
        return jsonify({"error": "没有可更新字段"}), 400
    if "organization" in data and not str(data.get("organization", "")).strip():
        return jsonify({"error": "organization 不能为空"}), 400
    if "role" in data and not str(data.get("role", "")).strip():
        return jsonify({"error": "role 不能为空"}), 400
    if "period" in data and not str(data.get("period", "")).strip():
        return jsonify({"error": "period 不能为空"}), 400
    keys = list(data.keys())
    set_clause = ", ".join([f"{k} = {qmark()}" for k in keys])
    values = [data[k] for k in keys] + [experience_id]
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(f"UPDATE experiences SET {set_clause} WHERE id = {qmark()}", values)
        rc = cur.rowcount
        conn.commit()
    if rc == 0:
        return jsonify({"error": "experience 不存在"}), 404
    return jsonify({"ok": True})


@app.delete("/api/admin/experiences/<int:experience_id>")
def api_admin_delete_experience(experience_id: int):
    auth_error = require_admin_token()
    if auth_error:
        return auth_error
    with get_conn() as conn:
        conn.cursor().execute(f"DELETE FROM experiences WHERE id = {qmark()}", (experience_id,))
        conn.commit()
    return jsonify({"ok": True})


@app.put("/api/admin/messages/<int:message_id>/read")
def api_admin_mark_message_read(message_id: int):
    auth_error = require_admin_token()
    if auth_error:
        return auth_error
    payload = json_body()
    is_read = 1 if payload.get("is_read", True) else 0
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(f"UPDATE messages SET is_read = {qmark()} WHERE id = {qmark()}", (is_read, message_id))
        rc = cur.rowcount
        conn.commit()
    if rc == 0:
        return jsonify({"error": "message 不存在"}), 404
    return jsonify({"ok": True})


@app.get("/api/admin/messages/export.csv")
def api_admin_export_messages_csv():
    auth_error = require_admin_token()
    if auth_error:
        return auth_error
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id, visitor_name, visitor_email, message, is_read, created_at FROM messages ORDER BY id DESC")
        rows = cur.fetchall()

    def esc(v: Any) -> str:
        text = str(v or "").replace('"', '""')
        return f'"{text}"'

    lines = ["id,visitor_name,visitor_email,message,is_read,created_at"]
    for r in rows:
        lines.append(",".join([esc(r["id"]), esc(r["visitor_name"]), esc(r["visitor_email"]), esc(r["message"]), esc(r["is_read"]), esc(r["created_at"])]))
    return app.response_class("\n".join(lines), mimetype="text/csv; charset=utf-8", headers={"Content-Disposition": 'attachment; filename="messages.csv"'})


@app.post("/api/messages")
def api_messages():
    db_error = ensure_db_ready()
    if db_error:
        return db_error
    payload = json_body()
    name = str(payload.get("name", "")).strip()
    email = str(payload.get("email", "")).strip()
    message = str(payload.get("message", "")).strip()
    if not name or not email or not message:
        return jsonify({"error": "name、email、message 不能为空"}), 400
    with get_conn() as conn:
        conn.cursor().execute(f"INSERT INTO messages (visitor_name, visitor_email, message) VALUES ({qmark()}, {qmark()}, {qmark()})", (name, email, message))
        conn.commit()
    return jsonify({"ok": True})


@app.get("/<path:path>")
def static_files(path: str):
    file_path = BASE_DIR / path
    if file_path.exists() and file_path.is_file():
        return send_from_directory(BASE_DIR, path)
    return jsonify({"error": "Not Found"}), 404


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
