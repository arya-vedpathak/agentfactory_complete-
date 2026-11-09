from pathlib import Path

def test_project(build_result):
    """Run structural checks only; generated code is never executed."""
    if not isinstance(build_result, dict) or build_result.get("status") != "success":
        return {"status": "failed", "message": "Build did not complete successfully.", "checks": [], "passed": 0, "failed": 1}
    root = Path(build_result.get("output_path", ""))
    required = ["README.md", "main.py", "requirements.txt", "project_spec.json"]
    checks = [{"name": f"File exists: {name}", "status": "passed" if (root / name).is_file() else "failed"} for name in required]
    passed = sum(c["status"] == "passed" for c in checks)
    failed = len(checks) - passed
    return {
        "status": "passed" if failed == 0 else "failed",
        "message": f"{passed}/{len(checks)} structural checks passed. Generated code was not executed.",
        "checks": checks,
        "passed": passed,
        "failed": failed,
    }

# Prevent pytest from collecting this production agent function as a test case.
test_project.__test__ = False
