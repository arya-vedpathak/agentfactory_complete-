# UI layer

The original team brief lists Streamlit files (`dashboard.py`, `input_form.py`, `output_view.py`).
The selected implementation decision was **React UI**, so these responsibilities are implemented in
`frontend/src/App.jsx` and `frontend/src/styles.css` instead of duplicate Streamlit modules.

- Dashboard + progress: `frontend/src/App.jsx`
- Requirement input + Generate action: `PromptComposer` section in `App.jsx`
- Output + test report: results section in `App.jsx`
- Design handoff: `docs/figma_design_spec.md`
