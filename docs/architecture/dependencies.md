# Dependencies

## Runtime (Google services)

- Google Apps Script (`Code.gs`) — backend logic, served via `doGet`.
- Google Sheets — data store (`Dashboard`, `Report`, `Lookup`, month tabs).
- Google Mail (`MailApp`) — report emails and notifications.
- Google Drive — nightly backups to folder `"RK Sales Backups"`.
- Google Apps Script Triggers — monthly email (1st, 8 AM Asia/Kolkata) and nightly backup (1:00 AM).

## Client

- `Index.html` frontend talks to backend via `google.script.run`.
- Preview mode: `localStorage` keys `rk_sales_multiyear_preview_v2` (entries), `rk_sales_preview_users_v3` (users); offline queue `rk_sales_pending_sync_v1`; offline auth cache `rk_sales_offline_auth_v1`.
- PWA: service worker + manifest served via `?pwa=sw` / `?pwa=manifest` (`Code.gs:58-77`).

## External CDNs (service worker cache)

- Tailwind CSS CDN, Chart.js CDN, Google Fonts — cached by PWA service worker (`getServiceWorkerSource_`, `Code.gs:86+`).

## Internal

- No npm dependencies. Single-file GAS: no modules; frontend script block must stay syntactically valid.

Source: `Code.gs`, `Index.html`, `docs/architecture/api-contracts.md`.
