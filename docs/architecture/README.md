# Architecture Knowledge

Persistent architecture documentation for the RK Sales repository. Consult this directory before performing repository-wide analysis; reuse existing architecture knowledge here before repeating discovery; verify claims against source with file/line references; never treat undocumented assumptions as facts.

## Files

- `system-overview.md` — system structure, runtime, data model, fiscal/calendar constants.
- `business-flows.md` — login, save/edit, dashboard, email report, backup workflows.
- `dependencies.md` — runtime and external dependencies.
- `api-contracts.md` — web app routes and Apps Script function contracts.
- `technical-decisions.md` — key architectural decisions and rationale.
- `architecture-status.md` — last verified commit, discrepancies, known gotchas.

## Operating rules

1. Before any repository-wide analysis, consult `docs/architecture/README.md` and the relevant module doc first.
2. Reuse existing architecture knowledge from `docs/architecture/` before repeating full repository discovery.
3. Avoid repeating full repository discovery when a targeted question or existing doc answer suffices.
4. Architectural claims require targeted source-code verification with `file:line` references.
5. Document important business workflows and dependencies in these docs.
6. When implementation changes affect architecture, update the affected `docs/architecture/` file in the same change.
7. Record the last verified Git commit SHA in `docs/architecture/architecture-status.md`.
8. Never treat undocumented assumptions as facts; verify against source before acting.

## Source map

- Backend: `Code.gs` (single-file Google Apps Script; no modules).
- Frontend: `Index.html` (single file, embedded JS served via HtmlService).
- Tests: `test/*.js` (GAS globals mocked via `vm` sandbox).

## Last verified commit

- `dc785effef8b6acfca9e57779b133f72396ff6fb` (`dc785ef` — "updated the report and update columns")
