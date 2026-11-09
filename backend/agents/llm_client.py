import json
import os

def groq_json(system_prompt: str, user_prompt: str):
    """Return parsed JSON from Groq, or None if unavailable/unparseable."""
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        return None
    try:
        from groq import Groq
        client = Groq(api_key=api_key, timeout=35.0, max_retries=1)
        response = client.chat.completions.create(
            model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
            messages=[
                {"role": "system", "content": system_prompt + " Return valid JSON only."},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.2,
            response_format={"type": "json_object"},
        )
        return json.loads(response.choices[0].message.content)
    except Exception:
        # Keep demo resilient; callers use a deterministic fallback.
        return None
