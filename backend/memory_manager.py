import sqlite3
import json
import uuid
from pathlib import Path
from datetime import datetime

DB_PATH = Path(__file__).resolve().parent / "outputs" / "context_memory.db"

def initialize_memory():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)

def retrieve_relevant_memory(user_prompt):
    initialize_memory()
    with sqlite3.connect(DB_PATH) as conn:
        rows = conn.execute(
            "SELECT project_name, prompt, requirements FROM project_memory ORDER BY rowid DESC LIMIT 10"
        ).fetchall()

    results = []
    words = set(user_prompt.lower().split())

    for project_name, prompt, requirements in rows:
        if words.intersection(set((prompt or "").lower().split())):
            try:
                results.append({
                    "project_name": project_name,
                    "requirements": json.loads(requirements or "{}")
                })
            except (TypeError, json.JSONDecodeError):
                continue

    return results

def save_project_memory(user_prompt, requirements, plan, outcome):
    initialize_memory()
    memory_id = str(uuid.uuid4())
    project_name = requirements.get("project_name", "Untitled Project") if isinstance(requirements, dict) else "Untitled Project"

    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """INSERT INTO project_memory
            (id, project_name, prompt, requirements, plan, outcome, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                memory_id,
                project_name,
                user_prompt,
                json.dumps(requirements, default=str),
                json.dumps(plan, default=str),
                json.dumps(outcome, default=str),
                datetime.now().isoformat(timespec="seconds")
            )
        )

    return memory_id
