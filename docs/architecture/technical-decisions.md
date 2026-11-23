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

## Auth

- PIN-based (`loginUser`, `updateUserPin`); roles ADMIN/SALES; sales scoped to own entries.

## Region Lookup Subsystem

- Managed in `Lookup` sheet columns H (`Region`) & I (`Active`), initialized automatically with default regions: `R - Pune`, `N - Pune`, `MP`, `WB`.
- Pre-seeded via `bootJson_` into the web app's initial payload (`#gasBoot`) and refreshed via `getDashboardData()`.
- Client dynamically generates pill selection buttons in `#regionPills` with `__OTHER__` fallback for custom/historical regions.

Source: `Code.gs`, `AGENTS.md`, `docs/superpowers/plans/`.
