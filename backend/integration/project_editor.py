import json
import os
import sqlite3
import tempfile
from datetime import datetime
from pathlib import Path, PurePosixPath

from agents.llm_client import groq_json
from tools.template_manager import BACKEND_ROOT

OUTPUTS = BACKEND_ROOT / "outputs"
DB_PATH = OUTPUTS / "context_memory.db"
BACKUPS = OUTPUTS / "_edit_backups"

BLOCKED_PARTS = {
    ".git", "node_modules", "__pycache__", ".venv", "venv",
    ".pytest_cache", ".mypy_cache"
}
BLOCKED_FILES = {
    ".env", ".env.local", ".env.production",
    "id_rsa", "id_ed25519"
}
MAX_FILE_SIZE = 1024 * 1024


def get_project_id(history_id):
    if not history_id:
        raise ValueError("A history record ID is required.")

    if not DB_PATH.exists():
        raise FileNotFoundError("Project history database was not found.")

    with sqlite3.connect(DB_PATH) as conn:
        row = conn.execute(
            "SELECT outcome FROM project_memory WHERE id = ?",
            (history_id,)
        ).fetchone()

    if not row:
        raise FileNotFoundError("Project history record was not found.")

    try:
        outcome = json.loads(row[0] or "{}")
        project_id = outcome.get("build", {}).get("project_id")
    except (TypeError, json.JSONDecodeError, AttributeError):
        project_id = None

    if not project_id:
        raise FileNotFoundError("This history record has no generated project files.")

    if not all(ch.isalnum() or ch in "_-" for ch in project_id):
        raise ValueError("Invalid project identifier.")

    return project_id


def get_project_directory(history_id):
    project_id = get_project_id(history_id)
    project_dir = (OUTPUTS / project_id).resolve()

    if OUTPUTS.resolve() not in project_dir.parents or not project_dir.is_dir():
        raise FileNotFoundError("Generated project folder was not found.")

    return project_id, project_dir



def safe_project_file(project_dir, relative_path):
    if not isinstance(relative_path, str) or not relative_path.strip():
        raise ValueError("A project file path is required.")

    normalized = relative_path.replace("\\", "/")
    candidate = PurePosixPath(normalized)

    if candidate.is_absolute() or ".." in candidate.parts or ":" in normalized:
        raise ValueError("Invalid project file path.")

    if any(part in BLOCKED_PARTS for part in candidate.parts):
        raise ValueError("This folder cannot be edited.")

    filename = candidate.name.lower()
    blocked_extensions = (".pem", ".key", ".p12", ".pfx", ".sqlite", ".db")

    if filename in BLOCKED_FILES or filename.startswith(".env") or filename.endswith(blocked_extensions):
        raise ValueError("Secret, database and environment files cannot be edited here.")

    root = project_dir.resolve()
    current = root

    for part in candidate.parts:
        current = current / part
        if current.is_symlink():
            raise ValueError("Symbolic links cannot be edited.")

    target = current.resolve()

    if root not in target.parents:
        raise ValueError("Project file path is outside the project folder.")

    return target

def list_project_files(history_id):
    project_id, project_dir = get_project_directory(history_id)
    files = []

    for path in sorted(project_dir.rglob("*")):
        if not path.is_file():
            continue

        relative = path.relative_to(project_dir)
        if any(part in BLOCKED_PARTS for part in relative.parts):
            continue
        if path.name.lower() in BLOCKED_FILES or path.name.lower().startswith(".env"):
            continue
        if path.is_symlink() or path.stat().st_size > MAX_FILE_SIZE:
            continue

        try:
            content = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue

        files.append({
            "path": relative.as_posix(),
            "content": content
        })

    return {"project_id": project_id, "files": files}




def atomic_write_text(target, content):
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            newline="",
            prefix=".agentfactory-edit-",
            suffix=".tmp",
            dir=str(target.parent),
            delete=False
        ) as handle:
            temporary = Path(handle.name)
            handle.write(content)
            handle.flush()
            os.fsync(handle.fileno())

        os.replace(temporary, target)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def save_project_file(history_id, relative_path, content):
    if not isinstance(content, str):
        raise ValueError("File content must be text.")

    if len(content.encode("utf-8")) > MAX_FILE_SIZE:
        raise ValueError("File is too large to edit (1 MB maximum).")

    project_id, project_dir = get_project_directory(history_id)
    target = safe_project_file(project_dir, relative_path)

    if not target.is_file():
        raise FileNotFoundError("The selected project file does not exist.")

    backup_file(target, project_id, project_dir)
    atomic_write_text(target, content)

    return {
        "status": "success",
        "message": "File saved successfully.",
        "path": relative_path
    }

def backup_file(target, project_id, project_dir):
    relative = target.relative_to(project_dir)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    backup_path = BACKUPS / project_id / stamp / relative
    backup_path.parent.mkdir(parents=True, exist_ok=True)

    import shutil
    shutil.copy2(target, backup_path)


def propose_ai_changes(history_id, instruction):
    if not isinstance(instruction, str) or len(instruction.strip()) < 5:
        raise ValueError("Please describe the code changes you want.")

    if len(instruction) > 4000:
        raise ValueError("AI instructions must be 4000 characters or fewer.")

    project = list_project_files(history_id)
    available = {item["path"]: item["content"] for item in project["files"]}

    if not available:
        raise ValueError("No editable text files were found in this project.")

    context = []
    total = 0

    for path, content in available.items():
        block = f"\n--- FILE: {path} ---\n{content}\n"
        if total + len(block) > 80000:
            break
        context.append(block)
        total += len(block)

    system_prompt = """
You are a careful software engineer editing an existing project.
Return JSON only with this exact structure:
{
  "summary": "short explanation",
  "changes": [
    {"path": "existing/relative/file.py", "content": "complete replacement file content"}
  ]
}
Only modify files included in the supplied project context.
Return complete file contents, not patches or markdown fences.
Do not change secrets, environment files, dependencies, or unrelated files.
If the requested change cannot be made safely, return an empty changes array
and explain why in summary.
"""

    user_prompt = (
        "USER REQUEST:\n" + instruction.strip()
        + "\n\nEXISTING PROJECT FILES:\n" + "\n".join(context)
    )

    response = groq_json(system_prompt, user_prompt)

    if not isinstance(response, dict):
        raise RuntimeError("AI could not produce a valid response. Check Groq configuration and try again.")

    changes = response.get("changes")
    if not isinstance(changes, list):
        raise RuntimeError("AI returned an invalid change proposal.")

    validated = []
    seen = set()

    for item in changes:
        if not isinstance(item, dict):
            continue

        path = item.get("path")
        content = item.get("content")

        if not isinstance(path, str) or not isinstance(content, str):
            continue

        target = safe_project_file(get_project_directory(history_id)[1], path)
        if path not in available or path in seen or not target.is_file():
            continue
        if len(content.encode("utf-8")) > MAX_FILE_SIZE:
            continue

        seen.add(path)
        validated.append({"path": path, "content": content})

    return {
        "summary": str(response.get("summary", "AI proposal ready for review.")),
        "changes": validated
    }



def apply_ai_changes(history_id, changes):
    if not isinstance(changes, list) or not changes:
        raise ValueError("There are no proposed changes to apply.")

    if len(changes) > 20:
        raise ValueError("A maximum of 20 files can be changed at once.")

    project_id, project_dir = get_project_directory(history_id)
    validated = []
    seen = set()

    # Validate every change before writing any project file.
    for item in changes:
        if not isinstance(item, dict):
            raise ValueError("Invalid change item.")

        path = item.get("path")
        content = item.get("content")

        if not isinstance(path, str) or not isinstance(content, str):
            raise ValueError("Each change needs a file path and text content.")

        if path in seen:
            raise ValueError("Duplicate file path in proposed changes.")
        seen.add(path)

        if len(content.encode("utf-8")) > MAX_FILE_SIZE:
            raise ValueError(f"File is too large: {path}")

        target = safe_project_file(project_dir, path)
        if not target.is_file():
            raise FileNotFoundError(f"Project file not found: {path}")

        validated.append((path, target, content))

    # Back up all originals before applying any edits.
    for _, target, _ in validated:
        backup_file(target, project_id, project_dir)

    # Prepare all temporary files before replacing project files.
    prepared = []
    try:
        for path, target, content in validated:
            handle = tempfile.NamedTemporaryFile(
                mode="w",
                encoding="utf-8",
                newline="",
                prefix=".agentfactory-edit-",
                suffix=".tmp",
                dir=str(target.parent),
                delete=False
            )
            try:
                with handle:
                    handle.write(content)
                    handle.flush()
                    os.fsync(handle.fileno())
            except Exception:
                Path(handle.name).unlink(missing_ok=True)
                raise

            prepared.append((path, target, Path(handle.name)))

        for _, target, temporary in prepared:
            os.replace(temporary, target)

    finally:
        for _, _, temporary in prepared:
            temporary.unlink(missing_ok=True)

    return {
        "status": "success",
        "message": f"Changes saved to {len(validated)} file(s).",
        "files": [path for path, _, _ in validated]
    }

def delete_history_record(history_id):
    if not DB_PATH.exists():
        raise FileNotFoundError("Project history database was not found.")

    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.execute(
            "DELETE FROM project_memory WHERE id = ?",
            (history_id,)
        )

        if cursor.rowcount == 0:
            raise FileNotFoundError("Project history record was not found.")

    return {"status": "success", "message": "History record deleted."}
