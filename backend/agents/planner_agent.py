from agents.llm_client import groq_json

SYSTEM = (
    "You are a pragmatic software project planner. Given requirements JSON, "
    "return JSON with features (array strings), tasks (array strings), "
    "and architecture_notes (array strings). Keep it suitable for a small starter MVP."
)

def create_plan(requirements):
    if not isinstance(requirements, dict) or not requirements.get("project_name"):
        raise ValueError("Requirements must include project_name.")
    ai = groq_json(SYSTEM, str(requirements))
    features = requirements.get("features") or ["Core application module"]
    if isinstance(ai, dict) and isinstance(ai.get("tasks"), list) and ai["tasks"]:
        tasks = [str(x).strip() for x in ai["tasks"] if str(x).strip()][:15]
        planned_features = [str(x).strip() for x in ai.get("features", features) if str(x).strip()][:12]
        notes = [str(x).strip() for x in ai.get("architecture_notes", []) if str(x).strip()][:8]
        mode = "groq" if requirements.get("ai_mode") == "groq" else "fallback"
    else:
        planned_features = [str(x) for x in features][:12]
        tasks = [f"Design the {feature.lower()} module" for feature in planned_features]
        tasks += ["Define the application data model", "Add navigation and user flows", "Run basic project validation"]
        notes = ["Use a modular starter structure", "Replace demo data with a persistent database before production"]
        mode = "fallback"
    return {
        "project_name": requirements["project_name"],
        "features": planned_features,
        "tasks": tasks,
        "architecture_notes": notes,
        "ai_mode": mode,
    }
