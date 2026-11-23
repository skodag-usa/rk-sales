# Architecture Status

## Last verified commit

- `ef32370` ("feat: add support for advanced multi-part commission types and calculations") + subsequent verification of PI uniqueness per FY, soft delete with strikethrough in Excel (both from Edit banner and direct Transactions page cards), `=ROW()-1` formula serial numbers, Transactions makeover, calculated product value allocation validation, and party name lookup auto-sync with 2-character autocomplete threshold.

## Status

- `docs/architecture/` created as persistent architecture knowledge (2026-11-22).
- Backend: single-file `Code.gs`; frontend: single `Index.html`; tests: `test/*.js`.

## Known discrepancies

- None. Data is strictly saved to month-specific tabs (`MMM-YYYY`) with live `TOTAL` summary rows, and Dashboard tab is maintained via `updateDashboardSheet_` with multi-tab aggregation and `CacheService`. `All Entries` is completely eliminated.

## Gotchas

- `HEADERS`' last column must remain `Response ID` — `ID_COL`, `findRow_`, and `upsert_` depend on it (`Code.gs:41-42`).
- Single-file GAS: no modules; `Index.html` script block must stay syntactically valid (frontend test compiles it).
- No `clasp` config; deployment is manual paste.

## Verification

- Run all six test suites from repo root before treating changes as verified:
  `node test/test_code_gs.js`, `test/test_e2e_simulation.js`, `test/test_email_report.js`, `test/test_frontend.js`, `test/test_backup.js`, `test/test_app_flow_simulation.js`.
- No build/lint/typecheck scripts; `package.json` is empty.

Source: `Code.gs`, `AGENTS.md`, tests in `test/`.
