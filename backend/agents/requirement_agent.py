import re
from agents.llm_client import groq_json

SYSTEM = (
    "You are a software requirements analyst. Extract a concise project_name "
    "and a list of concrete features from the user's software request. "
    "Return JSON with project_name (string), features (array of strings), "
    "and summary (string). Do not invent unrelated features."
)

def _slug_title(prompt: str) -> str:
    match = re.search(r"(?:build|create|make|develop)\s+(?:an?\s+)?(.+?)(?:\s+with\s+|\s+that\s+|[.!?]|$)", prompt, re.I)
    raw = match.group(1) if match else "Generated Starter App"
    raw = re.sub(r"\b(a|an|the)\b", "", raw, flags=re.I).strip(" -")
    words = [w for w in re.split(r"[\s_-]+", raw) if w]
    return " ".join(w.capitalize() for w in words[:6]) or "Generated Starter App"

def analyze_requirement(user_prompt):
    if not isinstance(user_prompt, str) or len(user_prompt.strip()) < 8:
        raise ValueError("Please provide a project requirement of at least 8 characters.")
    ai = groq_json(SYSTEM, user_prompt.strip())
    if isinstance(ai, dict) and isinstance(ai.get("features"), list) and ai.get("project_name"):
        features = [str(x).strip() for x in ai["features"] if str(x).strip()][:12]
        if features:
            return {
                "project_name": str(ai["project_name"]).strip()[:80],
                "requirements": user_prompt.strip(),
                "features": features,
                "summary": str(ai.get("summary", user_prompt.strip())),
                "ai_mode": "groq",
            }

    # Deterministic fallback: identify comma/and-separated features after common phrasing.
    tail = re.split(r"\bwith\b", user_prompt, maxsplit=1, flags=re.I)
    candidates = re.split(r",|;|\band\b", tail[1] if len(tail) > 1 else "")
    features = [x.strip(" .-") for x in candidates if len(x.strip(" .-")) > 2]
    if not features:
        features = ["Core application module", "Data management", "Reports"]
    return {
        "project_name": _slug_title(user_prompt),
        "requirements": user_prompt.strip(),
        "features": features[:12],
        "summary": user_prompt.strip(),
        "ai_mode": "fallback",
    }
