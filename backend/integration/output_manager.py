from pathlib import Path
import zipfile
from tools.template_manager import BACKEND_ROOT

OUTPUTS = BACKEND_ROOT / "outputs"
ARCHIVES = OUTPUTS / "_archives"

def get_project_zip(project_id: str):
    # Restrict IDs to a safe single path segment.
    if not project_id or any(ch not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-" for ch in project_id):
        return None
    project_dir = (OUTPUTS / project_id).resolve()
    if OUTPUTS.resolve() not in project_dir.parents or not project_dir.is_dir():
        return None
    ARCHIVES.mkdir(parents=True, exist_ok=True)
    archive = ARCHIVES / f"{project_id}.zip"
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as zf:
        for path in project_dir.rglob("*"):
            if path.is_file():
                zf.write(path, Path(project_id) / path.relative_to(project_dir))
    return archive
