# Business Flows

## Login & roles

- `loginUser(code, pin)` (`Code.gs:363`) — code case-insensitive; validates against `getSalesPersonsInternal_` (`Code.gs:244`) / `getSalesPersonsLookup_` (`Code.gs:335`).
- Roles: `ADMIN` / `SALES`. Defaults: `RK` 1234 ADMIN, `TK` 1111 SALES, `SC` 2222 SALES, `OT` 3333 SALES, `ADMIN` 9999 ADMIN (`Code.gs:27`).
- `updateUserPin(authCode, currentPin, targetCode, newPin)` (`Code.gs:408`) enforces same ownership rules.
- Deactivated accounts rejected; `getAdminEmails_` (`Code.gs:351`) resolves admin recipients.

## Save / edit entry

- `saveEntry(payload)` (`Code.gs:722`) → `normalizeMonthYear_` (`Code.gs:636`) resolves month tab; writes via `upsert_` (`Code.gs:995`) / `findRow_` (`Code.gs:1111`) / `nextSr_` (`Code.gs:1121`); refreshes dashboard (`updateDashboardSheet_` `Code.gs:843`).

## Dashboard read

- `getDashboardData()` (`Code.gs:896`) → `buildDashboardData_` (`Code.gs:901`).

## Email reporting

- `generateReportData_(ss, filters)` (`Code.gs:1349`) → metrics, `qtdMetrics`, `fytdMetrics`, `repBreakdown`, `topParties`, `prodBreakdown`.
- `buildHtmlReportEmail_(report, webAppUrl, sheetUrl, optMonthTabInfo)` (`Code.gs:1526`).
- `sendEmailReport(payload)` (`Code.gs:1783`) — admin only; `sendAutomatedMonthlyEmailReport()` (`Code.gs:1999`) via monthly trigger (`setupMonthlyEmailTrigger` `Code.gs:2065`).

## Backup

- `createDataBackup()` (`Code.gs:2103`) → 30-day retention; manual via `triggerManualBackup` (`Code.gs:2180`).
