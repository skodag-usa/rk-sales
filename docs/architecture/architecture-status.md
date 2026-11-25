# Architecture Status

## Last verified commit

- `6068142` ("feat: add dynamic financial year handling and improve edit tracking") + high-volume performance modifications (lean save decoupled from full-FY dashboard rebuild, two-phase recoverable month transfer, client-side request ID idempotency, lightweight aggregate indexing), restored dynamic sheet formulas (Col 1 Sr No, Col 17 GST, Col 18 Total Value, Col 20 Commission %, Col 22 Commission Value %, Col 23 Total Commission, and `repairSheetFormulas`), Multi-Commission Split P + P calculation & persistence fixes, multi-year dashboard caching & independent aggregate rendering, custom multi-commission split calculation & formula fixes (`P + P + F + F`), Transaction Page query caching (`state.transCache`) with in-place updates/deletions, and number field mouse wheel & double-touch trackpad scroll unblocking (`handleNumberFieldWheel`).

## Status

- `docs/architecture/` created as persistent architecture knowledge (2026-11-22).
- Backend: single-file `Code.gs`; frontend: single `Index.html`; tests: `test/*.js`.

## Known discrepancies

- None. Data is strictly saved to month-specific tabs (`MMM-YYYY`) with live `TOTAL` summary rows, and Dashboard tab is maintained via `updateDashboardSheet_` with multi-tab aggregation and chunked `CacheService`. `All Entries` is completely eliminated.

## Gotchas

- `HEADERS`' last column must remain `Response ID` — `ID_COL`, `findRow_`, and `upsert_` depend on it (`Code.gs:41-42`).
- Single-file GAS: no modules; `Index.html` script block must stay syntactically valid (frontend test compiles it).
- No `clasp` config; deployment is manual paste.

## Verification

- Run all eight test suites from repo root before treating changes as verified:
  `node test/test_code_gs.js`, `test/test_e2e_simulation.js`, `test/test_email_report.js`, `test/test_frontend.js`, `test/test_backup.js`, `test/test_app_flow_simulation.js`, `test/test_performance.js`, `test/test_10k_records.js`.
- No build/lint/typecheck scripts; `package.json` is empty.

Source: `Code.gs`, `AGENTS.md`, tests in `test/`.
