import json
from pathlib import Path
from orchestrator.workflow import run_factory
from agents.requirement_agent import analyze_requirement
from agents.planner_agent import create_plan
from agents.tester_agent import test_project

def test_requirement_contract():
    result = analyze_requirement("Build a Library Management System with books and members")
    assert result["project_name"]
    assert isinstance(result["features"], list)
    assert result["requirements"]

def test_planner_contract():
    req = {"project_name": "Demo App", "features": ["Users", "Reports"], "ai_mode": "fallback"}
    plan = create_plan(req)
    assert plan["project_name"] == "Demo App"
    assert len(plan["tasks"]) >= 1

def test_full_workflow_creates_and_checks_project():
    result = run_factory("Build a Student Management System with registration, attendance, fee tracking and reports")
    assert result["build"]["status"] == "success"
    assert result["tests"]["status"] == "passed"
    assert Path(result["build"]["output_path"]).is_dir()
    assert "project_spec.json" in result["build"]["files"]

def test_tester_does_not_claim_success_for_failed_build():
    result = test_project({"status": "failed"})
    assert result["status"] == "failed"
