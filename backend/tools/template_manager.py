from pathlib import Path
import re
from shutil import copytree

BACKEND_ROOT = Path(__file__).resolve().parents[1]
TEMPLATE_ROOT = BACKEND_ROOT / "templates"

def safe_project_slug(name: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "_", name.strip().lower()).strip("_")
    return slug[:48] or "generated_app"

def get_template_path(template_name="basic_app"):
    candidate = (TEMPLATE_ROOT / template_name).resolve()
    if TEMPLATE_ROOT.resolve() not in candidate.parents or not candidate.is_dir():
        raise ValueError("Unknown or invalid template.")
    return candidate

def copy_template(template_name, destination: Path):
    source = get_template_path(template_name)
    destination = destination.resolve()
    outputs_root = (BACKEND_ROOT / "outputs").resolve()
    if outputs_root not in destination.parents:
        raise ValueError("Output destination must stay inside backend/outputs.")
    copytree(source, destination, dirs_exist_ok=True)
    return destination
