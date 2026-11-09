# Frontend redesign — business outcome workspace

The React frontend has been redesigned as a business-led delivery workspace rather than a student/demo-style agent dashboard.

## Product experience
- Business challenge intake: users describe the operational or customer outcome they need, without having to choose a technology stack first.
- Business scenario starters: inventory/order operations, customer support, and expense approvals.
- Delivery command center: discovery, solution planning, project scaffolding, and quality validation are shown as a single pipeline.
- Outcome-oriented handoff: requirements, capabilities in scope, work breakdown, generated artifacts, quality checks, and ZIP download are grouped into one delivery package.
- Explicit MVP boundary: the UI states that the current builder creates a template-based starter scaffold and is not production-certified.

## Frontend stack
- React 18 + Vite 5
- Tailwind CSS 3 utility layer
- SCSS for responsive design system and component styling
- Lucide React icons

## Run
```bash
cd frontend
npm install
npm run dev
```

The frontend calls the existing FastAPI endpoints at `http://localhost:8000` by default. Override with `VITE_API_URL` in `frontend/.env` if required.
