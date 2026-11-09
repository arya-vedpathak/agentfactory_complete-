from pathlib import Path
import json
from tools.template_manager import copy_template, safe_project_slug, BACKEND_ROOT

def generate_project(plan):
    if not isinstance(plan, dict) or not plan.get("project_name"):
        raise ValueError("Plan must include project_name.")
    slug = safe_project_slug(plan["project_name"])
    project_id = slug
    output_root = BACKEND_ROOT / "outputs"
    output_root.mkdir(parents=True, exist_ok=True)
    destination = output_root / project_id
    if destination.exists():
        # Rebuild same named project cleanly; destination is confined to outputs.
        import shutil
        shutil.rmtree(destination)
    copy_template("basic_app", destination)

    spec = {
        "project_name": plan["project_name"],
        "features": plan.get("features", []),
        "tasks": plan.get("tasks", []),
        "architecture_notes": plan.get("architecture_notes", []),
        "generation_mode": "template-based MVP",
    }
    (destination / "project_spec.json").write_text(json.dumps(spec, indent=2), encoding="utf-8")
    readme = destination / "README.md"
    original = readme.read_text(encoding="utf-8")
    readme.write_text(original.replace("{{PROJECT_NAME}}", plan["project_name"]), encoding="utf-8")
    main = destination / "main.py"
    main.write_text(main.read_text(encoding="utf-8").replace("{{PROJECT_NAME}}", plan["project_name"]), encoding="utf-8")
    return {
        "status": "success",
        "message": "Starter project generated from the basic_app template.",
        "output_path": str(destination),
        "project_id": project_id,
        "files": sorted(str(p.relative_to(destination)).replace("\\\\", "/") for p in destination.rglob("*") if p.is_file()),
    }
