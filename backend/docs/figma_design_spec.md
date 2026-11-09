# Figma / Google Stitch UI Design Spec

Use this brief in Google Stitch (https://stitch.withgoogle.com/) or Figma AI.

## Product
Agent Factory OS — a polished desktop-first AI project generator dashboard.

## Visual direction
- Dark navy/slate application shell with a clean off-white main canvas.
- Electric indigo accent; restrained green for completed stages and amber for warnings.
- Typography: Inter or a similar modern sans-serif.
- Rounded 12–16px panels, subtle borders, generous whitespace.
- Avoid noisy gradients and excessive glass effects.

## Main screen layout
1. **Sidebar (240px):** brand mark “AF”, Agent Factory OS, nav items Overview / New Project / History / Docs, bottom system status.
2. **Top bar:** page title “Build something great”, subtitle “Turn an idea into a working starter project”, API status pill.
3. **Prompt panel:** large multiline prompt input, sample prompt chip “Student Management System”, primary “Generate project” button.
4. **Workflow panel:** horizontal or vertical 4-stage stepper: Requirements → Plan → Build → Test. Each stage has icon, state, and short status.
5. **Results area:** two-column layout:
   - left: project summary, detected feature chips, numbered development tasks
   - right: generated files tree, validation report, download ZIP action
6. **Empty state:** friendly instruction and example prompt; no fake completed state.

## Components
- `Sidebar`
- `TopBar`
- `PromptComposer`
- `WorkflowStepper`
- `FeatureChip`
- `TaskList`
- `FileTree`
- `TestReport`
- `DownloadProjectButton`
- `Toast` / inline error panel

## Responsive behavior
- Desktop: fixed sidebar + two-column results.
- Tablet: collapsible sidebar + stacked results.
- Mobile: single column, sidebar becomes drawer, prompt and CTA full-width.

## Interaction
- Generate button disables while request is in progress.
- Workflow stages update from API response; do not show success until the backend confirms it.
- Download button appears only after a successful build and uses the returned project ID.
- Show a clear “Demo fallback mode” note when Groq is not configured.
\n## Implementation mapping\nThe selected implementation uses React. The dashboard, input composer, workflow stepper, generated-file tree and test report are in `frontend/src/App.jsx`; visual styles are in `frontend/src/styles.css`.\n