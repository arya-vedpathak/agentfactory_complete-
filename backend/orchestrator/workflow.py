
from agents.requirement_agent import analyze_requirement
from agents.planner_agent import create_plan
from agents.builder_agent import generate_project
from agents.tester_agent import test_project

from memory_manager import (
    initialize_memory,
    retrieve_relevant_memory,
    save_project_memory,
)


def run_factory(user_prompt):
    initialize_memory()

    # Retrieve relevant previous project context
    previous_context = retrieve_relevant_memory(user_prompt)

    events = []

    events.append({
        "stage": "memory",
        "status": "completed",
        "message": f"Retrieved {len(previous_context)} relevant previous projects",
    })

    requirements = analyze_requirement(user_prompt)

    # Attach retrieved context without changing existing agent contracts
    requirements["previous_context"] = [
        {
            "project_name": item["project_name"],
            "features": item["requirements"].get("features", []),
            "summary": item["requirements"].get("summary", ""),
        }
        for item in previous_context
    ]

    events.append({
        "stage": "requirements",
        "status": "completed",
        "message": "Requirements analyzed",
    })

    plan = create_plan(requirements)

    events.append({
        "stage": "plan",
        "status": "completed",
        "message": "Development plan created",
    })

    build_result = generate_project(plan)

    events.append({
        "stage": "build",
        "status": build_result.get("status", "failed"),
        "message": build_result.get("message", "Starter project generated"),
    })

    test_result = test_project(build_result)

    events.append({
        "stage": "test",
        "status": test_result["status"],
        "message": test_result["message"],
    })

    outcome = {
        "build": build_result,
        "tests": test_result,
    }

    # Save project history, including failed attempts
    memory_id = save_project_memory(
        user_prompt,
        requirements,
        plan,
        outcome,
    )

    events.append({
        "stage": "memory_save",
        "status": "completed",
        "message": "Project history saved",
    })

    return {
        "requirements": requirements,
        "plan": plan,
        "build": build_result,
        "tests": test_result,
        "events": events,
        "memory": {
            "id": memory_id,
            "retrieved_count": len(previous_context),
            "saved": True,
        },
    }
