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

## Caching & Performance Optimization (High-Volume 1,000+ Record Scaling)

- Instant Boot Pre-seeding: `bootJson_` in `Code.gs` pre-seeds active lookup salespersons directly into HTML payload (`#gasBoot`), giving 0ms synchronous profile dropdown population on login without waiting for network dashboard queries.
- Chunked `CacheService` Engine: Overcomes Google Apps Script's 100KB cache item limit (`putCacheChunked_`, `getCacheChunked_`, `removeCacheChunked_`) by transparently chunking >90KB payloads across indexed keys. Allows caching 1,000+ records (~300KB) with 600s TTL; subsequent dashboard calls achieve 0 month-sheet RPC reads.
- Single Dashboard Pass on Mutation: In `saveEntry` and `deleteEntry`, `buildDashboardData_` is evaluated exactly once for the relevant FY and shared directly with `updateDashboardSheet_(ss, dashData)`, eliminating redundant multi-year full scans.
- Selective Old-Row Cleanup: `saveEntry` skips scanning all 12 sheets for old row deletion unless `existingEntry` was specifically relocated across month boundaries (`existingEntry.sheetName !== monthYear`), dropping 11 remote sheet reads per save.
- Single-Column PI Duplicate Check: `findDuplicatePIInFY_` queries Column 8 (`PI No`) in isolation (`sh.getRange(2, 8, last - 1, 1)`), avoiding the transfer and parsing of 32 columns (~30,000 cells) across 12 sheets. Full row details are read only on matching rows.
- Existing Sheet Reuse in `getMonthSheet_`: Re-styling and conditional formatting rules are applied only when a month sheet is created (`insertSheet`), preventing 10+ expensive column-level formatting mutations on every save.
- In-Memory Execution Cache (`EXEC_CACHE_`): Caches party and metadata lookups within the same script execution, preventing repetitive 12-month tab scans across `saveEntry`, `addPartyToLookup_`, and `buildDashboardData_`.
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

## PI number uniqueness per Financial Year

- Decision: PI numbers must be unique across all monthly tabs within the same Financial Year (Apr–Mar).
- Context: Duplicate PI numbers lead to invoicing errors and commission discrepancies across months.
- Behavior: `findDuplicatePIInFY_` checks month sheets in the same FY, exempting the entry being edited and ignoring soft-deleted records or empty/default prefixes (`^\d{4}-?$`).

## Soft Delete entry functionality (Excel Strikethrough & Direct Transactions Delete)

- Decision: Deleted entries are soft-deleted rather than hard-purged and strictly ignored in all calculated values.
- Behavior:
  - Accessible directly via the **Delete** button on each eligible card in the **Transactions** view (`#recentList`) as well as from the Edit banner (`#deleteEntryBtn`), with a confirmation dialog.
  - `deleteEntry` marks Col 27 (Remark) with `[DELETED]`, applies `setFontLine('line-through')` and `#94a3b8` muted text color in the spreadsheet.
  - **Exclusion from all calculated values**:
    - **Month tab summary rows**: Excel formulas dynamically subtract deleted rows via `=SUM(col2:colLast) - SUMIF(AA2:AALast, "*[DELETED]*", col2:colLast)`.
    - **Frontend Dashboard**: `renderDashboard()` filters out `!x.isDeleted` before calculating KPI cards (`kpiPoVal`, `kpiSalesVal`, `kpiEntries`, `kpiComm`, etc.), the Sales Person performance table, and the Monthly Sales chart.
    - **Email Reporting**: Both backend `generateReportData_` and frontend `updateEmailReportPreview()` ignore soft-deleted entries in order counts, sales values, and commission totals.
    - **Party Autocomplete**: Auto-suggestions from month sheets ignore deleted records.
  - Soft-deleted entries remain visible on the Transactions page with strike-through styling and a `[CANCELLED]` badge for auditability.

## Autogenerated Serial Number via Excel formula

- Decision: Col 1 (`Sr. No.`) is autogenerated dynamically via the Excel/Sheets formula `=ROW()-1` during `upsert_`.
- Context: Prevents client-side hardcoding or discrepancies when rows are moved, sorted, or filtered in Sheets.

## Transactions view makeover

- Decision: Renamed "Last 10" to "Transactions" with month & year filter dropdowns defaulting to the current month, rendering entries in descending order (highest `srNo` first) and displaying soft-deleted entries with strike-through styling and `[CANCELLED]` badge.

## Calculated product value allocation validation

- Decision: In split and multi-part commission configurations (`P + F`, `P + P`, or `CUSTOM`/multi-part), the sum of allocated product values cannot exceed the main Sales Value (`productValue`).
- Context: Prevents over-allocation and mismatched commission basis where sub-parts exceed the total net sales value.
- Behavior:
  - Frontend (`Index.html`): `handleSubmit` calculates total allocated product value and blocks submission with a toast error if `allocatedPv > productValue`. Real-time hints in `updateLiveCalc` show allocation alerts when inputs exceed Sales Value.
  - Backend (`Code.gs`): `saveEntry` throws an error if allocated product value exceeds `productValue` (`round2_(allocatedPv) > round2_(pv)`), protecting direct API calls and offline synchronization.

## Party Name Lookup & 2-Character Autocomplete Subsystem

- Decision: Party names can be selected from a persistent lookup and also added as free-text directly from the party name field. Autocomplete suggestions are suppressed until at least 2 characters are entered.
- Context: Large client bases lead to clutter and accidental selections if all parties show up on focus or 1 keystroke. Users also frequently add new clients on the fly which must be remembered permanently.
- Behavior:
  - **Backend (`Code.gs`)**:
    - `getPartiesLookup_(ss)`: Discovers parties from dedicated sheets (`Parties`, `Party`, etc.), header-scanned columns in `Lookup` (falling back to Column K `Party Name` & Column L `Active`), combined with unique party names across month sheets.
    - `addPartyToLookup_(ss, partyName)`: Appends newly typed party names into `Lookup` (Column K & L) or the dedicated sheet upon saving an entry (`saveEntry`), performing case-insensitive deduplication.
    - `bootJson_` and `getDashboardDataWithSS_`: Return fresh `parties` metadata array synchronously on boot and with dashboard payloads.
  - **Frontend (`Index.html`)**:
    - Input allows open free-text entry (`<input id="partyName" type="text" ...>`).
    - Autocomplete Threshold: When fewer than 2 characters are in the field, `<datalist id="partyList">` options are cleared and the `list` attribute is removed from the input.
    - When 2 or more characters are entered, `updatePartyAutocomplete` matches against `state.parties` and existing entries (case-insensitive substring match), populates `partyList`, and attaches `list="partyList"`.
    - Local & Preview Sync: When an entry is saved (online or offline), new parties are immediately pushed to `state.parties` for instant suggestion availability.

## High-Volume Scalability & Performance Architecture (1,000–10,000+ Records)

- Decision: Designed the backend and frontend to scale smoothly to 10,000+ records across 12+ month sheets with sub-second single record operations and zero DOM/storage freezes.
- Context: At 10,000 records, the serialized dataset is ~7.5MB. Transferring and rendering 10,000 records simultaneously overtaxes mobile browsers (creating 120,000+ DOM elements) and breaches the browser's 5MB `localStorage` quota.
- Optimizations Implemented:
  - **On-Demand Month Tab Transactions with Pagination (10, 20, 50 per page)**:
    - Backend: Implemented `getMonthTransactions(options)` in `Code.gs`. When a user navigates to a month (e.g. `NOV-2026`), Apps Script executes a single RPC call targeting solely that month's sheet (`ss.getSheetByName('NOV-2026')`), filtering, sorting descending, and slicing into pages (10, 20, or 50 records). Response time is ~150ms instead of a 2.5s multi-sheet scan.
    - Frontend: In `Index.html`, added page size selector (`transPageSizeSelect` with 10, 20, 50) and pagination controls (`transPagination`, `transPrevBtn`, `transNextBtn`, `transPageInfo`). Transactions are fetched on-demand per page in live GAS mode, falling back to local slicing in offline/preview mode.
  - **Lightweight Dashboard Aggregates**:
    - `getDashboardData` and `buildDashboardData_` compute and return lightweight precalculated aggregate objects (`summary`, `kpi`, `monthlyBreakdown`, `monthlySales`, and `repBreakdown`) with `allEntries: []` by default.
    - Wire payload drops from 7.5 MB down to ~18 KB (a 99.7% reduction).
    - `Index.html`'s `renderDashboard` renders KPI cards, rep breakdown table, and monthly sales bar chart directly from the precomputed aggregates without requiring the raw row array.
  - **LocalStorage Quota Protection**: Guarded `savePreviewStorage()` and `RKSalesDB.saveEntries()` to slice entries to the most recent 300 items before writing to `localStorage` (`entries.slice(0, 300)`), preventing `QuotaExceededError` while letting `IndexedDB` (`RKSalesDB`) store the full 10,000+ record dataset.
  - **Precomputed Dashboard Summary Bypass**: In `Code.gs`, `updateDashboardSheet_` directly consumes `data.summary` if already computed by `buildDashboardData_`, skipping redundant loops through 10,000 records.
  - **Delta Return in Save**: `saveEntry` constructs and returns `entry: savedRec` directly in its response, enabling the frontend to immediately index and update the specific record in state and `IndexedDB`.
  - **Chunked CacheService Engine**: `putCacheChunked_` and `getCacheChunked_` segment payloads exceeding 100KB into 90KB chunks with manifest keys, enabling zero-RPC cache hits for multi-megabyte dashboard datasets.

## Decoupled Lean Save & Independent Dashboard Maintenance

- Decision: Decoupled `saveEntry` and `deleteEntry` from full-FY dashboard rebuilding (`buildDashboardData_` and `updateDashboardSheet_`). Responses return a lean payload (~1.5 KB vs ~7.5 MB) containing `{ ok: true, status, entry, perf }` without embedding `dashboard` unless explicitly requested (`payload.includeDashboard === true`).
- Context: Previously, saving a single record forced a full scan and recalculation of all 12 monthly tabs in the financial year while holding a global `ScriptLock`, creating latency spikes and lock timeouts as data volume approached 50,000 records.
- Behavior:
  - Frontend (`Index.html`): Immediately updates the saved record in memory (`state.allEntries`) and `IndexedDB` (`RKSalesDB`) without awaiting full dashboard recreation.
  - Backend (`Code.gs`): Updates the target month sheet, updates that sheet's live summary row, marks the dashboard cache dirty via `markDashboardDirty_(fy)`, and returns immediately under lock.
  - Dashboard updates are performed on-demand via `getDashboardData()` or manual/scheduled rebuilds (`rebuildDashboardSheet()`).

## Client-Side Stable Request ID & Idempotency

- Decision: Unique response IDs (`RK-{timestamp}-{random}`) are generated client-side before dispatching the request to Apps Script.
- Context: If a network timeout or dropped connection occurs after the server writes the row but before the client receives the response, retrying the save could result in duplicate rows. Furthermore, new entry submissions with client-generated IDs must not be falsely treated as edits of non-existent rows.
- Behavior:
  - In `Index.html`, `#salesForm` submits `stableId = isEdit ? currentEditId : ('RK-' + Date.now() + '-' + Math.floor(1000 + Math.random() * 9000))`. For new entries, `$('responseId').value` remains empty in the DOM so the form stays cleanly in 'New Entry' mode, and passes `isEdit: false`.
  - In `Code.gs`, `saveEntry` checks `isExplicitEdit = (payload.isEdit === true || payload.isEdit === 'true' || Boolean(payload.originalMonthYear))`. If `isExplicitEdit && id && !existingEntry`, it throws `'Entry ' + id + ' was not found.'`. If it is not an explicit edit and `existingEntry` is null, it inserts a new row using that client-generated ID (`status: 'CREATED'`). If `existingEntry` already exists (e.g. on a retried save), it performs an idempotent in-place update (`status: 'UPDATED'`) rather than creating a duplicate row.

## Two-Phase Recoverable Month Transfer

- Decision: Relocating an existing entry across month sheets (`oldSheet !== targetSheet`) writes and validates the row in the target month sheet before deleting the old row from the source sheet.
- Context: A crash, quota timeout, or network disconnect during the transfer process could previously leave a record deleted from the source sheet without completing insertion into the target sheet.
- Behavior:
  - Phase 1: Write to destination sheet via `upsert_` and confirm row creation.
  - Phase 2: Once destination row is verified, remove the record from the source sheet and recalculate the source sheet's summary row.

## Restored Dynamic Excel / Sheets Formulas & repairSheetFormulas

- Decision: Month sheets use native dynamic Excel/Sheets formulas for calculations across all 32-column rows:
  - Column 1: `=ROW()-1` (Sr. No.)
  - Column 17: `=ROUND((O{row}+P{row})*0.18, 2)` (GST @ 18% on Product Value + Freight)
  - Column 18: `=ROUND(O{row}+P{row}+Q{row}, 2)` (Total Order Value)
  - Column 20: Formatted as percentage (`0.00%`)
  - Column 22: Dynamic formula for Commission Value %:
    - Type `P`: `=IF(OR(S{row}="P",S{row}="P + F"),ROUND(O{row}*T{row}, 2),0)`
    - Type `P + F` with custom split: `=ROUND({customPctPv}*T{row}, 2)`
    - Type `P + P`: `=ROUND({p1Val}*{p1Pct} + {p2Val}*{p2Pct}, 2)`
  - Column 23: Dynamic formula for Total Commission:
    - Type `P + P` or multi-part with Fixed: `=ROUND(V{row}+U{row}, 2)`
    - Standard types: `=ROUND(V{row}+IF(OR(S{row}="F",S{row}="P + F"),U{row},0), 2)`
- Utility: `repairSheetFormulas(optSS)` scans all month tabs and restores dynamic formulas on existing rows. Exposed in Google Sheets spreadsheet menu as `RK Sales Menu` → `Restore / Repair sheet formulas`.

## Multi-Commission Split P + P Calculation & Edit Persistence

- Decision: Dual percentage split (`P + P`) calculations, live preview, auto-allocation, and edit form repopulation operate consistently across backend and frontend.
- Behavior:
  - UI Auto-allocation: Switching to `P + P` automatically sets default rates (5% on Part 1, 2.5% on Part 2) and allocates product value.
  - Live Calculation: `#liveCalcGrid` switches to a 5-column responsive grid displaying `Comm 1 (P1 % on ₹X)` and `Comm 2 (P2 % on ₹Y)` alongside GST and Total Value.
  - Persistence: `savedRec` preserves `commP1ProductValue`, `commP1Pct`, `commP2ProductValue`, and `commP2Pct`.
  - Form Repopulation (`loadEntryForEdit`): Reconstructs `commP1ProductValue` and `commP2ProductValue` via algebraic solver fallback (`calcP1 = (commVal - r2*pv)/(r1 - r2)`) if an entry is loaded from a raw sheet row lacking explicit split fields.

## Multi-Year Dashboard Caching & Independent Aggregate Rendering

- Decision: Multi-year dashboard navigation (`FY 26-27`, `FY 25-26`, historical years, and `ALL`) uses client-side per-FY caching (`state.dashboardsByFy[fy]`) and renders directly from server-computed aggregates (`summary`, `kpi`, `monthlyBreakdown`, `monthlySales`, `repBreakdown`).
- Context: In high-volume mode, `getDashboardData` returns lean responses with precalculated aggregates and `allEntries: []`. When switching years or when `state.allEntries` contained entries solely from the active financial year, `renderDashboard()` previously branched into calculating from `allEntries`, filtering to zero records and overwriting KPI cards, rep breakdowns, and monthly charts with zeroes. Furthermore, global `state.loadedFys[fy]` prevented re-fetching when toggling back and forth across years.
- Behavior:
  - Backend (`Code.gs`):
    - `getAvailableFYs_(ss)` dynamically scans all month tabs (`MMM-YYYY`) in the Google Sheet and provides `availableFYs` in boot payloads and dashboard responses.
    - `getDashboardDataWithSS_` and `buildDashboardData_` properly treat `options.fy === 'ALL'` and `options.all === true` uniformly, aggregating all tabs across all years.
  - Frontend (`Index.html`):
    - `state.dashboardsByFy` caches each retrieved year's dashboard aggregates.
    - `dashFySelect` change listener immediately displays cached data if available; if not cached, it triggers `syncData(false, { fy: targetFy, all: targetFy === 'ALL' })`.
    - `renderDashboard()` resolves aggregates from `curData` (`state.dashboardData` or `state.dashboardsByFy[state.dashFY]`), rendering KPI cards, rep breakdowns, and monthly sales bar charts directly from server aggregates. It falls back to calculating from `state.allEntries` only in local preview or offline modes when server aggregates are absent.
    - Saving or deleting an entry invalidates `state.dashboardsByFy = {}`, ensuring fresh aggregates are retrieved when navigating between years.
    - Manual `#refreshBtn` click purges the active year from `state.dashboardsByFy` and executes a cache-bypassed sync (`skipCache: true`).

21. **Custom Multi-Commission Split (`P + P + F + F` and Arbitrary P + F Combinations)**
    - **Problem**: When users selected "Multi / Custom" (`CUSTOM`) and built combinations such as `P + P + F + F`:
      1. `renderMultiParts()` set `state.selectedCommType = 'P + P'` initially, and due to a lock check (`state.selectedCommType !== 'P + P'`), addition of Fixed (`F`) parts was ignored and the type remained stuck at `'P + P'`.
      2. `updateLiveCalc()` branched into the standard 2-input `#commPPSplitSection`, reading empty inputs and computing ₹0.
      3. `handleSubmit()` discarded Fixed parts in the ternary fallback when `selectedCommType` matched `'P + P'`.
      4. `loadEntryForEdit()` wiped `state.multiParts` to empty when discrete client fields were absent in raw sheet rows.
      5. Backend `upsert_` wrote static values in Col 22 instead of dynamic spreadsheet formulas, and `savedRec` dropped P3, P4, and F1..F4 fields.
    - **Solution**:
      - Introduced `state.isCustomMulti` flag in `Index.html` to manage custom multi state independently.
      - Updated `renderMultiParts()` to unconditionally track `comboName` (e.g. `'P + P + F + F'`) and added `data-part-comm-badge` for live card updates.
      - Branched `updateLiveCalc()` to evaluate `isMulti` before 2-input splits, calculating all P parts and F parts correctly.
      - Refined `handleSubmit()` and offline saves to always preserve `totalFixedAmt` and all discrete P/F part allocations.
      - Enhanced `loadEntryForEdit()` with token-based algebraic reconstruction from `entry.commissionType`, `productValue`, `commissionValuePct`, and `commissionFixed`.
      - Updated `upsert_` and `repairSheetFormulas` in `Code.gs` to generate dynamic spreadsheet formulas `=ROUND(p1*r1 + p2*r2 + ..., 2)` for Col 22 and `=ROUND(V+U, 2)` for Col 23, and expanded `savedRec` to return all discrete part fields.

22. **Transaction Page Query Caching & In-Place Updates (`state.transCache`)**
    - **Problem**: Switching to the Transactions tab (`#viewRecent`) previously triggered `renderRecentList()` and `loadTransactionsPage()` on every navigation, displaying a loading spinner and executing `google.script.run.getMonthTransactions(...)` even if data for the current month, year, page, and search query had already been loaded. Additionally, creating, editing, or deleting an entry discarded client list state and re-fetched the entire transactions page over the network.
    - **Solution**:
      - **Client-Side Query Caching**: Added `state.transCache` indexed by composite key `getTransCacheKey(month, year, page, pageSize, search)` (`${month}|${year}|${page}|${pageSize}|${search}`). `loadTransactionsPage(page, forceFetch)` immediately renders cached records on cache hits without displaying the loading spinner or issuing network RPCs.
      - **In-Place Updates (`updateTransWithSavedEntry`)**: When saving an entry, if `isEdit: true`, the record is updated in-place in `state.transCurrentRecords` and across all matching keys in `state.transCache`. If a new entry is created and matches the current filter, it is prepended to page 1, counts are updated, and shifted pages are invalidated.
      - **In-Place Deletions (`updateTransWithDeletedEntry`)**: Soft deletion marks the entry as cancelled in-place in `state.transCurrentRecords` and `state.transCache`, decrementing active counts without issuing network calls.
      - **Explicit Sync**: Manual sync (`#refreshBtn`) purges `state.transCache = {}` and executes `renderRecentList(true)`. Search query input is debounced by 250ms.

23. **Number Field Wheel & Trackpad Scroll Unblocking (`handleNumberFieldWheel`)**
    - **Problem**: When a user focused on an `<input type="number">` (e.g. Sales Value, Commission %, etc.) or scrolled with a mouse wheel or two-finger trackpad gesture ("double touch scroll"), browser default behavior in Chromium, Edge, Firefox, and WebKit intercepted the wheel event to increment or decrement the numeric input and blocked page/container scrolling.
    - **Solution**:
      - Registered global capture-phase `wheel` event listeners on `window` and `document` (`{ capture: true, passive: true }`) executing `handleNumberFieldWheel`.
      - When `document.activeElement` or `event.target` is an `<input type="number">`, `blur()` is called synchronously in the capture phase.
      - Dropping focus before default action processing stops the browser from altering numeric values. Leaving the event unprevented (`passive: true`) allows native momentum scrolling to scroll the window or modal smoothly without blockage.
      - Added CSS to disable spinner steppers (`::-webkit-outer-spin-button`, `::-webkit-inner-spin-button`, `-moz-appearance: textfield`, `appearance: textfield`) across all browsers.

Source: `Code.gs`, `Index.html`, `AGENTS.md`, `docs/superpowers/plans/`.
