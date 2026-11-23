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
- `getDashboardData()` → dashboard payload (`Code.gs:896`).
- `saveEntry(payload)` → `{ ok, message }`; upsert into month tab via `upsert_` (`Code.gs:722`, `Code.gs:995`).

### Reporting

- `generateReportData_(ss, filters)` → report metrics object (`Code.gs:1349`).
- `sendEmailReport(payload)` → `{ ok, message }` (`Code.gs:1783`).

### Automation / backup

- `setupMonthlyEmailTrigger()` / `removeMonthlyEmailTrigger()` / `sendAutomatedMonthlyEmailReport()` (`Code.gs:2065` / `2086` / `1999`).
- `setupNightlyBackupTrigger()` / `removeNightlyBackupTrigger()` / `createDataBackup()` / `triggerManualBackup()` (`Code.gs:2146` / `2167` / `2103` / `2180`).

Full source-level detail lives in `Code.gs`; tests in `test/`.
