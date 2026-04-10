from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Any

from flask import Flask, jsonify, request, send_from_directory

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "self_intro.db"

app = Flask(__name__, static_folder=str(BASE_DIR), static_url_path="")


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

PROJECT_FIELDS = [
    "title",
    "project_type",
    "summary",
    "contribution",
    "tech_stack",
    "result_text",
    "preview_url",
    "source_url",
    "sort_order",
]

EXPERIENCE_FIELDS = [
    "organization",
    "role",
    "period",
    "summary",
    "achievement_1",
    "achievement_2",
    "sort_order",
]


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def rows_to_dicts(rows: list[sqlite3.Row]) -> list[dict[str, Any]]:
    return [dict(r) for r in rows]


def json_body() -> dict[str, Any]:
    return request.get_json(silent=True) or {}


def pick(payload: dict[str, Any], fields: list[str]) -> dict[str, Any]:
    return {k: payload.get(k) for k in fields if k in payload}


@app.get("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")


@app.get("/admin")
def admin_page():
    return send_from_directory(BASE_DIR, "admin.html")


@app.get("/api/site-data")
def api_site_data():
    if not DB_PATH.exists():
        return jsonify({"error": "数据库不存在，请先运行 init_db.py"}), 500

    with get_conn() as conn:
        profile = conn.execute("SELECT * FROM profile ORDER BY id LIMIT 1").fetchone()
        skills = rows_to_dicts(conn.execute("SELECT * FROM skills ORDER BY id").fetchall())
        projects = rows_to_dicts(conn.execute("SELECT * FROM projects ORDER BY sort_order, id").fetchall())
        experiences = rows_to_dicts(conn.execute("SELECT * FROM experiences ORDER BY sort_order, id").fetchall())

    return jsonify(
        {
            "profile": dict(profile) if profile else None,
            "skills": skills,
            "projects": projects,
            "experiences": experiences,
        }
    )


@app.get("/api/admin/data")
def api_admin_data():
    return api_site_data()


@app.put("/api/admin/profile")
def api_admin_update_profile():
    payload = json_body()
    data = pick(payload, PROFILE_FIELDS)

    if not data:
        return jsonify({"error": "没有可更新字段"}), 400

    if "name" in data and not str(data["name"] or "").strip():
        return jsonify({"error": "name 不能为空"}), 400

    if "title" in data and not str(data["title"] or "").strip():
        return jsonify({"error": "title 不能为空"}), 400

    with get_conn() as conn:
        profile = conn.execute("SELECT id FROM profile ORDER BY id LIMIT 1").fetchone()

        if profile:
            keys = list(data.keys())
            set_clause = ", ".join([f"{k} = ?" for k in keys])
            values = [data[k] for k in keys]
            values.append(profile["id"])
            conn.execute(f"UPDATE profile SET {set_clause} WHERE id = ?", values)
        else:
            keys = ["id", *data.keys()]
            placeholders = ", ".join(["?"] * len(keys))
            values = [1, *[data[k] for k in data.keys()]]
            conn.execute(
                f"INSERT INTO profile ({', '.join(keys)}) VALUES ({placeholders})",
                values,
            )
        conn.commit()

    return jsonify({"ok": True})


@app.post("/api/admin/skills")
def api_admin_add_skill():
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
        conn.execute(
            "INSERT INTO skills (category, skill_name, level) VALUES (?, ?, ?)",
            (category, skill_name, level),
        )
        conn.commit()

    return jsonify({"ok": True})


@app.delete("/api/admin/skills/<int:skill_id>")
def api_admin_delete_skill(skill_id: int):
    with get_conn() as conn:
        conn.execute("DELETE FROM skills WHERE id = ?", (skill_id,))
        conn.commit()
    return jsonify({"ok": True})


@app.post("/api/admin/projects")
def api_admin_add_project():
    payload = json_body()
    data = pick(payload, PROJECT_FIELDS)

    if not str(data.get("title", "")).strip():
        return jsonify({"error": "title 不能为空"}), 400

    data.setdefault("sort_order", 0)

    keys = list(data.keys())
    placeholders = ", ".join(["?"] * len(keys))

    with get_conn() as conn:
        conn.execute(
            f"INSERT INTO projects ({', '.join(keys)}) VALUES ({placeholders})",
            [data[k] for k in keys],
        )
        conn.commit()

    return jsonify({"ok": True})


@app.delete("/api/admin/projects/<int:project_id>")
def api_admin_delete_project(project_id: int):
    with get_conn() as conn:
        conn.execute("DELETE FROM projects WHERE id = ?", (project_id,))
        conn.commit()
    return jsonify({"ok": True})


@app.post("/api/admin/experiences")
def api_admin_add_experience():
    payload = json_body()
    data = pick(payload, EXPERIENCE_FIELDS)

    if not str(data.get("organization", "")).strip() or not str(data.get("role", "")).strip():
        return jsonify({"error": "organization 和 role 不能为空"}), 400

    if not str(data.get("period", "")).strip():
        return jsonify({"error": "period 不能为空"}), 400

    data.setdefault("sort_order", 0)

    keys = list(data.keys())
    placeholders = ", ".join(["?"] * len(keys))

    with get_conn() as conn:
        conn.execute(
            f"INSERT INTO experiences ({', '.join(keys)}) VALUES ({placeholders})",
            [data[k] for k in keys],
        )
        conn.commit()

    return jsonify({"ok": True})


@app.delete("/api/admin/experiences/<int:experience_id>")
def api_admin_delete_experience(experience_id: int):
    with get_conn() as conn:
        conn.execute("DELETE FROM experiences WHERE id = ?", (experience_id,))
        conn.commit()
    return jsonify({"ok": True})


@app.post("/api/messages")
def api_messages():
    if not DB_PATH.exists():
        return jsonify({"error": "数据库不存在，请先运行 init_db.py"}), 500

    payload = json_body()
    name = str(payload.get("name", "")).strip()
    email = str(payload.get("email", "")).strip()
    message = str(payload.get("message", "")).strip()

    if not name or not email or not message:
        return jsonify({"error": "name、email、message 不能为空"}), 400

    with get_conn() as conn:
        conn.execute(
            "INSERT INTO messages (visitor_name, visitor_email, message) VALUES (?, ?, ?)",
            (name, email, message),
        )
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
