# RK Sales

Google Apps Script web app for sales entry, dashboard, and email reporting. Backend is `Code.gs`; frontend is a single `Index.html` (embedded JS). Bound to a Google Sheet; no npm dependencies.

## Commands

- Run all tests (from repo root — tests read `Code.gs`/`Index.html` via relative paths):
  - `node test/test_code_gs.js`
  - `node test/test_e2e_simulation.js`
  - `node test/test_email_report.js`
  - `node test/test_frontend.js`
  - `node test/test_backup.js`
- No build, lint, or typecheck scripts; `package.json` is empty. Run all five test files for verification.
- Deploy: paste `Code.gs` + `Index.html` (HTML file must be named `Index`) into the bound Apps Script project, then Deploy → Web app (Execute as: Me, Who has access: Anyone). Sheet stays private.

## Architecture

- Sheets: `Dashboard`, `Report`, `All Entries`, `Lookup`, plus one tab per month (e.g. `NOV-2026`). `CORE_SHEETS`.
- `Lookup` columns A–F: `Code`, `Full Name`, `Active` (YES/NO), `PIN`, `Role` (ADMIN/SALES), `Email`. Auto-migrates 3- or 5-column legacy sheets.
- `All Entries` schema is `HEADERS` in `Code.gs` (32 columns); `ID_COL = HEADERS.length` (Response ID). Column 29 is `Revisit` (YES/NO). Month tabs are created per month.
- Fiscal year runs Apr–Mar (`FY_MONTHS`); quarters Q1=Apr–Jun … Q4=Jan–Mar. `CAL_MONTHS` is calendar order.
- `SPREADSHEET_ID` is hardcoded; `getSS_()` prefers the active spreadsheet, else opens by ID from script properties.

## Auth & roles

- `loginUser(code, pin)` (code case-insensitive). Roles `ADMIN`/`SALES`.
- Defaults: `RK` 1234 ADMIN, `TK` 1111 SALES, `SC` 2222 SALES, `OT` 3333 SALES, `ADMIN` 9999 ADMIN.
- Sales can only save/edit their own entries; admins can assign/edit any. `updateUserPin` enforces the same.
- `getSalesPersonsLookup_()` strips PIN; `getSalesPersonsInternal_()` includes PIN/email and performs migration.

## Testing quirks

- Each test file redefines its own `MockSpreadsheet`/`MockRange` and loads `Code.gs` via `vm` into a sandbox with GAS globals mocked. State is not shared across files.
- `test_email_report.js` tracks `mailLog`/`triggerLog` inside `createSandbox()`; reset per block.
- `test_frontend.js` extracts the first `<script>` block and compiles it; the required DOM-id list must stay in sync with `Index.html`.
- Must run from repo root.

## Preview vs live

- `Index.html`: `IS_LIVE_GAS = typeof google !== 'undefined' && google.script && google.script.run`.
- Preview mode stores entries in `localStorage` (`rk_sales_multiyear_preview_v2`) and users in `rk_sales_preview_users_v3`; live mode calls `google.script.run`.
- The app is offline-first: when live Apps Script is unreachable/offline, saves go to local storage and `rk_sales_pending_sync_v1`; the Sync button (and the browser `online` event) replays queued `saveEntry` calls, then refreshes Sheets.
- PWA assets are served by `Code.gs` query routes `?pwa=manifest` and `?pwa=sw`; deploy the latest `Code.gs` and `Index.html` together so install/offline caching works.

## Email reporting

- Admin only. `generateReportData_(ss, filters)` supports `periodType` MONTH/QUARTER/FY/ALL plus `partyName`/`productKeyword`/`salesPerson`; returns metrics, `qtdMetrics`, `fytdMetrics`, `repBreakdown`, `topParties`, `prodBreakdown`.
- `sendEmailReport(payload)` takes `authCode`/`authPin`/`toEmails`/`filters`; empty `toEmails` auto-resolves admin emails.
- Automated trigger: `setupMonthlyEmailTrigger()` / `removeMonthlyEmailTrigger()`; `sendAutomatedMonthlyEmailReport()` runs on the 1st at 8 AM (Asia/Kolkata).
- Menu items registered in `onOpen()`.

## Backup subsystem

- Nightly backup runs at 1:00 AM (`setupNightlyBackupTrigger()` / `removeNightlyBackupTrigger()`).
- Copies Master spreadsheet to Google Drive folder `"RK Sales Backups"` named `RK_Sales_Backup_yyyy-MM-dd_HHmm`.
- Enforces 30-day retention by automatically purging backup files older than 30 days.
- Admin can also trigger manual backup on-demand via web app button (`#backupDataBtn`) or `RK Sales Menu` → `Backup Data Now`.

## Gotchas

- Tests assert exact values: RK's default migrated email is `rahulkodag@example.com`; changing defaults breaks `test_email_report.js` Test 19.
- `HEADERS`' last column must remain `Response ID` — `ID_COL`, `findRow_`, and `upsert_` depend on it.
- Single-file GAS: no modules; `Index.html`'s script block must stay syntactically valid (frontend test compiles it).
- No `clasp` config; deployment is manual paste.

## Existing instruction sources

- None present (no `AGENTS.md`/`CLAUDE.md`/`.cursor`). Implementation plans live in `docs/superpowers/plans/`.
