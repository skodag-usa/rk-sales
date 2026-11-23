# Technical Decisions

## Single-file GAS

- Backend is one `Code.gs` file; frontend is one `Index.html` with embedded JS. No modules, no build step, no npm.
- Rationale: Apps Script bound-script simplicity; deployment is manual paste of `Code.gs` + `Index.html` (file must be named `Index`).

## Month-tab storage

- Entries saved strictly to month-specific tabs (e.g. `NOV-2026`), not a single `All Entries` sheet; live `TOTAL` summary row per month tab.

## Fiscal year

- FY runs Apr–Mar; quarters derived from `FY_MONTHS` / `QUARTERS`.

## Offline-first & Client Storage

- Asynchronous `IndexedDB` storage engine (`RKSalesDB`) stores `entries`, `pendingSync`, `offlineAuth`, and `meta`. Uses standard transaction completion (`tx.oncomplete` resolving `req.result`) with a 2.5s open timeout fallback to `localStorage`. Auto-migrates legacy `localStorage` keys on startup.
- Manual Offline Mode Toggle in the page header (`#offlineModeToggle`) allows forcing offline mode with visual banner (`#forceOfflineBanner`). Replays queued changes sequentially upon going online or clicking Sync.

## Caching & Performance Optimization

- Instant Boot Pre-seeding: `bootJson_` in `Code.gs` pre-seeds active lookup salespersons directly into HTML payload (`#gasBoot`), giving 0ms synchronous profile dropdown population on login without waiting for network dashboard queries.
- `CacheService`: Aggregated dashboard metrics cached (600s TTL) by FY; invalidated on entry creation/update.
- O(1) `nextSr_`: `PropertiesService` stores `MAX_SR_NO` counter, incremented atomically inside script lock.
- Tab-hinted lookup: `findEntryById_` jumps directly to target month tab using `hintMonthYear` in O(1) before falling back to full scan.
- Windowed on-demand loading: Defaults to current FY; on-demand loads historical years or ALL. Immediate parallel execution of `syncData(false)` on startup.

## Email reporting

- Admin-only; period filters MONTH/QUARTER/FY/ALL plus party/product/sales-person; automated monthly trigger on 1st 8 AM Asia/Kolkata.

## Backup

- Nightly backup 1:00 AM to Drive folder `"RK Sales Backups"`; 30-day retention; manual trigger via UI/menu.

## Auth & Offline Credential Security

- PIN-based (`loginUser`, `updateUserPin`); roles ADMIN/SALES; sales scoped to own entries.
- Offline Credentials Protection: Plaintext PINs are NEVER stored in persistent browser storage (`IndexedDB` `offlineAuth` store or `localStorage` `rk_sales_offline_auth_v1`). Offline credentials store salted SHA-256 hashes (`pinHash`) and obfuscated ciphertext (`encryptedPin`). Offline authentication verifies against `pinHash` with zero-knowledge, and automatically migrates legacy plaintext PIN records.

## Region Lookup Subsystem

- Flexible Auto-Detection: `getRegionsLookup_(ss)` automatically discovers custom regions from:
  1. Dedicated sheets (`Region`, `Regions`, `Region Lookup`, `Territory`, `Territories`).
  2. Column scanning in `Lookup` sheet for headers containing `REGION`, `TERRITORY`, `ZONE` with optional adjacent `ACTIVE`/`STATUS` column.
  3. Columns H (`Region`) & I (`Active`) fallback, initializing defaults (`R - Pune`, `N - Pune`, `MP`, `WB`) only if no region configuration exists.
- Cache-Bypass Metadata: `getDashboardDataWithSS_` always returns freshly fetched `salesPersons` and `regions` lookups directly from the sheet, ensuring metadata edits reflect immediately without waiting for cache expiration. Sync button (`#refreshBtn`) explicitly passes `skipCache: true`.
- Dynamic UI Pill Selection: In `Index.html`, `#regionPills` dynamically renders active regions from the sheet. If an existing selection becomes obsolete upon sync, it automatically selects the first active sheet region instead of falling back to `__OTHER__`.

## Multi-Commission Split Subsystem (P + F, P + P, and Multi-Part Combinations)

- When Commission Type involves multiple parts (e.g. `P + F`, `P + P`, or multi-part combinations like `P + P + P + F`, `P + P + F + F`), sales/product value is distributed across up to 4 Percentage (P) parts and up to 4 Fixed (F) parts.
  - **P + F**: Splits value between % and Fixed parts (e.g. ₹300 total = ₹200 @ 5% [₹10] + ₹100 with fixed ₹3 [₹3] = ₹13 total commission).
  - **P + P**: Splits value between two distinct percentages (e.g. ₹300 total = ₹200 @ 5% [₹10] + ₹100 @ 2.5% [₹2.50] = ₹12.50 total commission).
  - **Multi-Commission Builder (`CUSTOM` / Combinations)**: Supports arbitrary combinations of up to 4 P parts (P1..P4) and up to 4 F parts (F1..F4) with dynamic "+ Add % (P)" and "+ Add Fixed (F)" buttons, allocation tracking bar (`Allocated: ₹X / ₹Y`), and live combination tag generation (e.g. `P + P + P + F`).
- **Sheet Representation (Strict 32-Column Preservation)**:
  - Column 19 (S): Stores combination label (e.g. `P + P + P + F`).
  - Column 20 (T): Primary % (Part 1 rate, e.g. 0.05).
  - Column 21 (U): Sum of all Fixed parts.
  - Column 22 (V): Sum of all Percentage parts.
  - Column 23 (W): Total Commission formula (`=ROUND(V{row}+U{row}, 2)` for multi-part combos containing 'F', preserving existing `=ROUND(V{row}+IF(OR(S{row}="F",S{row}="P + F"),U{row},0), 2)` for legacy types).
- **Backend & Offline Mode**: Both `Code.gs` and `Index.html` (offline mode / preview) support `commissionParts` array and discrete fields (`commP1..4`, `commF1..4`), recalculating exact totals across all parts.

Source: `Code.gs`, `AGENTS.md`, `docs/superpowers/plans/`.
