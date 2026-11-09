# Agent Factory OS — Demo Presentation

## Slide 1 — Problem
Turning a project idea into a clear development plan and a starter repository takes repeated manual effort.

## Slide 2 — Solution
Agent Factory OS coordinates requirement analysis, planning, template-based building, validation, and ZIP packaging.

## Slide 3 — Architecture
React dashboard → FastAPI → Requirement Agent → Planner Agent → Builder Agent → Tester Agent → Output Manager.

## Slide 4 — Live demo
Prompt: “Build a Student Management System with student registration, attendance, fee tracking and reports.”

Show:
1. Requirement summary and detected features
2. Development plan and tasks
3. Generated project file list
4. Test report
5. Downloaded ZIP

## Slide 5 — AI integration
Groq is used for structured requirement extraction and planning when `GROQ_API_KEY` is configured. Without a key, a deterministic fallback keeps the demo functional.

## Slide 6 — Honest MVP scope
The builder creates a reusable starter scaffold. It is not an autonomous production software engineer and does not execute generated code.

## Slide 7 — Future work
More templates, safe sandbox execution, persistent project history, authentication, streaming progress, and CI/CD integration.
