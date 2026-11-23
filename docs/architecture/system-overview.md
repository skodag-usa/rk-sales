# System Overview

## Purpose

Google Apps Script web app for sales entry, dashboard, and email reporting. Backend is single-file `Code.gs`; frontend is a single `Index.html` (embedded JS). Bound to a Google Sheet; no npm dependencies.

## Runtime

- Apps Script V8 runtime; `HtmlService` for UI, `ContentService` for PWA endpoints, `MailApp` for email, Drive for backups, Time-driven triggers for automation.
- `doGet(e)` (`Code.gs:58`) routes: default page, `?pwa=manifest`, `?pwa=sw`, `?edit=<id>`.
- Service worker source: `getServiceWorkerSource_()` (`Code.gs:86`).

## Data model

- Sheets: `Dashboard`, `Report`, `Lookup`, plus one tab per month (e.g. `NOV-2026`). `CORE_SHEETS` (`Code.gs:26`) marks the always-present sheets; month tabs hold the entries.
- `Lookup` tab: Columns A–F for Sales Persons (`Code`, `Full Name`, `Active`, `PIN`, `Role`, `Email`) and Columns H–I for Regions (`Region`, `Active`).
- Month tabs schema is `HEADERS` in `Code.gs:34` (32 columns); `ID_COL = HEADERS.length` (`Code.gs:42`). Column 29 is `Revisit` (YES/NO). Month tabs get a live `TOTAL` summary row.
- The `Dashboard` sheet metrics are dynamically aggregated across month tabs and written directly via `updateDashboardSheet_` (`Code.gs`), with `CacheService` optimization for web app queries.

## Fiscal / calendar

- Fiscal year runs Apr–Mar (`FY_MONTHS`, `Code.gs:18`); quarters Q1=Apr–Jun … Q4=Jan–Mar (`QUARTERS`, `Code.gs:20`).
- `CAL_MONTHS` (`Code.gs:19`) is calendar order.

## Config

- `SPREADSHEET_ID` hardcoded (`Code.gs:17`); `getSS_()` prefers the active spreadsheet, else opens by ID from script properties (`Code.gs:230`).
