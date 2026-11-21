# Monthly, Quarterly & Annual Email Reporting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement automated and on-demand email reporting in RK Sales with monthly, quarterly, and annual summaries, customer/product-level filtering, and admin email configuration in the Lookup sheet.

**Architecture:**
1. **Google Sheets `Lookup` Tab Extension:**
   - 6 columns: `Code` (A), `Full Name` (B), `Active` (C), `PIN` (D), `Role` (E), `Email` (F).
   - Auto-migrates existing 5-column or 3-column sheets, preserving all existing rows and appending the `Email` column.
2. **Report Calculation Engine (`Code.gs`):**
   - `generateReportData_(ss, filters)` filters entries by period (Month, Quarter, FY, All), party, product, and sales person.
   - Computes:
     - Target period totals: Sales, Commission, Product Value, GST, Pending, Collected.
     - Multi-period comparisons: Selected Month vs. QTD vs. FYTD.
     - Sales person breakdown table.
     - Top Parties by revenue.
     - Product keyword revenue distribution.
3. **Responsive HTML Email Generator (`Code.gs`):**
   - High-compatibility inline styled HTML email with KPI cards, multi-period tables, rep breakdown, and quick links to the live Google Sheet and Web App.
4. **Trigger & Endpoints (`Code.gs`):**
   - `sendEmailReport(payload)` validates Admin permission and dispatches custom filtered report via `MailApp.sendEmail()`.
   - `sendAutomatedMonthlyEmailReport()` runs automatically on the 1st of every month, pulling active Admin emails from `Lookup`.
   - `setupMonthlyEmailTrigger()` and `removeMonthlyEmailTrigger()` manage the time-driven trigger.
   - Spreadsheet menu items under `RK Sales`.
5. **Web App Filter Modal (`Index.html`):**
   - "Email Report" button on the UI (accessible to Admin).
   - Modal with filters:
     - Period: Specific Month, Quarter (Q1-Q4), FY, or All.
     - Particular Client / Party.
     - Particular Product Keyword.
     - Particular Sales Person.
     - Recipient Email(s).
     - Live calculation preview before sending.
   - Full support in Preview Mode (simulated send with preview alert).

**Tech Stack:** Google Apps Script (`Code.gs`), `MailApp`, HTML5/Tailwind/JS (`Index.html`).

---

### Task 1: Update `Code.gs` Engine & Endpoints
**Files:**
- Modify: `Code.gs`

**Interfaces:**
- Produces:
  - `sendEmailReport(payload)` -> `{ ok: boolean, message: string }`
  - `sendAutomatedMonthlyEmailReport()` -> sends monthly/quarterly/FYTD summary to admin emails
  - `setupMonthlyEmailTrigger()` -> installs Apps Script monthly trigger
  - `getDashboardData()` -> returns `salesPersons` with `email` field
  - `generateReportData_(ss, filters)` -> structured calculation object
  - `buildHtmlReportEmail_(data, filters, links)` -> HTML string

- [ ] Update `DEFAULT_SALES_PERSONS` with 6 columns (adding `Email`).
- [ ] Upgrade `getSalesPersonsInternal_(ss)` to read and migrate Column 6 (`Email`).
- [ ] Upgrade `getSalesPersonsLookup_(ss)` to return `email`.
- [ ] Implement `getAdminEmails_(ss)` helper to retrieve active admin emails.
- [ ] Implement financial quarter helper functions (`getQuarterFromMonth(mo)`, `getFYMonthsForQuarter(q, fy)`).
- [ ] Implement `generateReportData_(ss, filters)`.
- [ ] Implement `buildHtmlReportEmail_(reportData, filters, links)`.
- [ ] Implement `sendEmailReport(payload)`.
- [ ] Implement `sendAutomatedMonthlyEmailReport()`.
- [ ] Implement `setupMonthlyEmailTrigger()` and update `onOpen()` menu items.

---

### Task 2: Build Email Report Modal & Controls in `Index.html`
**Files:**
- Modify: `Index.html`

- [ ] Add "Email Report" button in Top App Bar / Active User Bar for Admin.
- [ ] Add Email Report Modal (`#emailReportModal`):
  - Period selector: Month, Quarter, Financial Year, All.
  - Dynamic period sub-selectors (Month dropdown, Quarter dropdown, FY dropdown).
  - Client / Party dropdown with live list of existing parties.
  - Product Keyword dropdown.
  - Sales Person dropdown.
  - Recipient email input (pre-filled with admin email, editable).
  - Live summary box displaying matching orders count, Total Sales ₹, and Commission ₹.
  - Action buttons: Cancel, Send Email Report.
- [ ] Implement client-side controller:
  - Live calculation update when filters change.
  - Sending logic via `google.script.run.sendEmailReport` (or preview simulation).

---

### Task 3: Preview Mode Support
**Files:**
- Modify: `Index.html`

- [ ] Support simulated email sending in preview mode with toast notification.
- [ ] Include default emails in mock user profiles.

---

### Task 4: Automated Testing & Verification
**Files:**
- Create: `test/test_email_report.js`

- [ ] Test 6-column `Lookup` sheet auto-migration.
- [ ] Test `generateReportData_` for Month, Quarter, FY, Party, and Product filtering.
- [ ] Test `buildHtmlReportEmail_` HTML generation.
- [ ] Test `sendEmailReport` permission checks (Admin vs Sales).
- [ ] Test `sendAutomatedMonthlyEmailReport` execution and recipient resolution.
- [ ] Run full test suite with zero regressions.
