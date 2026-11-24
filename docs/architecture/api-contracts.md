# API Contracts

## Web app routes (`doGet`, `Code.gs:58`)

| Route | Purpose |
|---|---|
| `/exec` (default) | Serve `Index.html` via HtmlService |
| `/exec?pwa=manifest` | PWA manifest JSON (`ContentService`) |
| `/exec?pwa=sw` | PWA service worker source (`ContentService`) |
| `/exec?edit=<id>` | Load app with edit context (`sanitizeEditId_`, `Code.gs:1299`) |

## Apps Script functions (`google.script.run`)

### Auth

- `loginUser(code, pin)` → `{ ok: boolean, message?: string, user?: { code, name, role, email } }` (`Code.gs:363`).
- `updateUserPin(authCode, currentPin, targetCode, newPin)` → `{ ok, message }` (`Code.gs:408`).

### Data / dashboard

- `getSalesPersonsLookup_()` / `getSalesPersonsInternal_()` → lookup/internal user lists (`Code.gs:335` / `244`).
- `getAdminEmails_()` → admin recipient emails (`Code.gs:351`).
- `getDashboardData(options)` → precomputed aggregates (`summary`, `kpi`, `monthlyBreakdown`, `monthlySales`, `repBreakdown`) with `allEntries: []` by default (`Code.gs:896`).
- `getMonthTransactions(options)` → on-demand paginated transactions for a specific month tab (`records`, `page`, `pageSize`, `totalCount`, `totalPages`) (`Code.gs:1150`).
- `saveEntry(payload)` → lean response `{ ok: true, status: 'CREATED'|'UPDATED', entry: savedRec, perf: {...} }` (omits heavy `dashboard` payload unless `payload.includeDashboard === true`); upsert into month tab via `upsert_` (`Code.gs:1350`).
- `deleteEntry(payload)` → lean response `{ ok: true, message, responseId, perf }` (omits heavy `dashboard` unless `payload.includeDashboard === true`); soft-deletes via `[DELETED]` remark, strikethrough, and KPI exclusion (`Code.gs:1650`).
- `repairSheetFormulas(optSS)` → `{ ok: true, repairedRows: number }`; scans all month tabs and restores dynamic Excel/Sheets formulas for Sr. No. (`=ROW()-1`), GST, Total Value, Commission Value %, and Total Commission (`Code.gs:2288`).
- `rebuildDashboardSheet(optSS)` → rebuilds `Dashboard` tab calculations and updates cache (`Code.gs:2361`).

### Reporting

- `generateReportData_(ss, filters)` → report metrics object (`Code.gs:1349`).
- `sendEmailReport(payload)` → `{ ok, message }` (`Code.gs:1783`).

### Automation / backup

- `setupMonthlyEmailTrigger()` / `removeMonthlyEmailTrigger()` / `sendAutomatedMonthlyEmailReport()` (`Code.gs:2065` / `2086` / `1999`).
- `setupNightlyBackupTrigger()` / `removeNightlyBackupTrigger()` / `createDataBackup()` / `triggerManualBackup()` (`Code.gs:2146` / `2167` / `2103` / `2180`).

Full source-level detail lives in `Code.gs`; tests in `test/`.
