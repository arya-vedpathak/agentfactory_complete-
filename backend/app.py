from pathlib import Path
import sys
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parent
if str(Path(__file__).resolve().parent) not in sys.path:
    sys.path.insert(0, str(Path(__file__).resolve().parent))

from orchestrator.workflow import run_factory
from integration.output_manager import get_project_zip
from integration.project_editor import (
    list_project_files, save_project_file, propose_ai_changes,
    apply_ai_changes, delete_history_record,
)

app = FastAPI(title="Agent Factory OS API", version="1.0.0")

try:
    from dotenv import load_dotenv
    load_dotenv(ROOT / ".env")
except Exception:
    pass

import os
origins = [x.strip() for x in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if x.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class GenerateRequest(BaseModel):
    prompt: str = Field(min_length=8, max_length=4000)

class SaveFileRequest(BaseModel):
    path: str = Field(min_length=1, max_length=500)
    content: str

class AIEditRequest(BaseModel):
    instruction: str = Field(min_length=5, max_length=4000)

class ApplyEditsRequest(BaseModel):
    changes: list[dict] = Field(min_length=1, max_length=20)

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "Agent Factory OS", "ai_mode": "groq" if os.getenv("GROQ_API_KEY") else "fallback"}

@app.post("/api/generate")
def generate(request: GenerateRequest):
    try:
        result = run_factory(request.prompt)
        if result["build"]["status"] != "success":
            raise HTTPException(status_code=500, detail=result["build"].get("message", "Build failed"))
        return result
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Workflow failed: {exc}") from exc

@app.get("/api/download/{project_id}")
def download(project_id: str):
    archive = get_project_zip(project_id)
    if not archive or not archive.exists():
        raise HTTPException(status_code=404, detail="Project ZIP not found")
    return FileResponse(archive, media_type="application/zip", filename=f"{project_id}.zip")

@app.get("/api/memory")
def get_memory():
    import sqlite3
    import json

    db_path = ROOT / "outputs" / "context_memory.db"

    if not db_path.exists():
        return {"memories": []}

    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            "SELECT id, project_name, prompt, requirements, plan, outcome FROM project_memory ORDER BY rowid DESC LIMIT 50"
        ).fetchall()

    memories = []
    for row in rows:
        item = dict(row)
        for key in ("requirements", "plan", "outcome"):
            try:
                item[key] = json.loads(item[key]) if item[key] else {}
            except (TypeError, json.JSONDecodeError):
                pass
        memories.append(item)

    return {"memories": memories}

@app.get("/api/projects/{history_id}/files")
def get_project_files(history_id: str):
    try:
        return list_project_files(history_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.put("/api/projects/{history_id}/file")
def update_project_file(history_id: str, request: SaveFileRequest):
    try:
        return save_project_file(history_id, request.path, request.content)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/projects/{history_id}/ai-edit")
def create_ai_edit(history_id: str, request: AIEditRequest):
    try:
        return propose_ai_changes(history_id, request.instruction)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.post("/api/projects/{history_id}/apply-ai-edits")
def apply_project_ai_edits(history_id: str, request: ApplyEditsRequest):
    try:
        return apply_ai_changes(history_id, request.changes)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.delete("/api/memory/{history_id}")
def delete_project_history(history_id: str):
    try:
        return delete_history_record(history_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

