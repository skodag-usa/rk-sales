# PIN-Based Login & Admin Role Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement salesperson PIN-based authentication and role-based permissions (Admin vs Sales Person) in RK Sales, allowing Admin to assign any salesperson to an entry while regular salespersons are locked to their own account.

**Architecture:**
1. **Google Sheets `Lookup` Tab Extension:**
   - 5 columns: `Code` (A), `Full Name` (B), `Active` (C), `PIN` (D), `Role` (E).
   - Auto-migrates existing 3-column sheets, setting default PINs and roles.
   - Validation on `Active` (`YES`/`NO`) and `Role` (`ADMIN`/`SALES`).
2. **Backend Authentication & Access Control (`Code.gs`):**
   - Server-side `loginUser(code, pin)` returning sanitized user object `{ code, name, role }`.
   - `getSalesPersonsLookup_()` returns public list `{ code, name, active, role }` without exposing raw PINs.
   - `saveEntry(payload)` validates `payload.authCode` and `payload.authPin`:
     - If role is `SALES`, `payload.salesPerson` MUST match `authCode`.
     - If role is `ADMIN`, `payload.salesPerson` can be any valid sales person.
   - `updateUserPin(authCode, currentPin, targetCode, newPin)` allows users to change their own PIN and Admins to reset any user's PIN.
3. **Frontend PIN Login & Role-Based UI (`Index.html`):**
   - Clean, mobile-friendly PIN login dialog with user selector, PIN keypad, and keyboard support.
   - Header displays current user with role badge (`ADMIN` or `SALES`), plus "Switch User / Logout".
   - Entry Form enforcement:
     - If Admin: `Sales Person` dropdown is enabled, allowing selection of any salesperson with an "Admin override" badge.
     - If Sales: `Sales Person` dropdown is automatically locked and set to the logged-in user's code, with a visual lock badge.
   - Edit Protection:
     - Regular sales reps can only edit their own entries.
     - Admins can edit any entry and re-assign sales rep.
   - Preview Mode & GAS dual compatibility:
     - Full functionality in preview mode with simulated `Lookup` data and PIN check.

**Tech Stack:** Google Apps Script (`Code.gs`), HTML5 / Tailwind CSS / Vanilla JS (`Index.html`), Google Sheets.

---

### Task 1: Backend Upgrade in `Code.gs`
**Files:**
- Modify: `Code.gs`

**Interfaces:**
- Produces:
  - `loginUser(code, pin)` -> `{ ok: boolean, user?: { code, name, role }, message?: string }`
  - `updateUserPin(authCode, currentPin, targetCode, newPin)` -> `{ ok: boolean, message: string }`
  - `getDashboardData()` -> returns `salesPersons: [{ code, name, active, role }]`
  - `saveEntry(payload)` -> validates role permissions before saving

- [x] Update `DEFAULT_SALES_PERSONS` with PIN and Role fields:
  - `['RK', 'Rahul Kodag', 'YES', '1234', 'ADMIN']`
  - `['TK', 'Trupti Kodag', 'YES', '1111', 'SALES']`
  - `['SC', 'Swapnil Chikhale', 'YES', '2222', 'SALES']`
  - `['OT', 'Other', 'YES', '3333', 'SALES']`
  - `['ADMIN', 'Administrator', 'YES', '9999', 'ADMIN']`
- [x] Upgrade `getSalesPersonsLookup_()`:
  - Read columns A to E.
  - Detect if Lookup tab has fewer than 5 columns; if so, upgrade headers to `['Code', 'Full Name', 'Active', 'PIN', 'Role']` and populate missing values.
  - Add data validation for Active and Role.
  - Return `{ code, name, active, role }` (without PIN).
- [x] Implement `getSalesPersonsInternal_(ss)` to read internal records including PIN.
- [x] Implement `loginUser(code, pin)`.
- [x] Implement `updateUserPin(authCode, currentPin, targetCode, newPin)`.
- [x] Update `saveEntry(payload)` to verify authorization and enforce that non-admins cannot submit entries for another salesperson.
- [x] Update `setupRKSalesSheets()` to apply 5 columns to Lookup tab.

---

### Task 2: PIN Login Screen & Session Management in `Index.html`
**Files:**
- Modify: `Index.html`

- [x] Add PIN login modal/overlay:
  - User selection dropdown or avatar chips.
  - 4-digit PIN input with obscured display / digit dots.
  - Number keypad (1-9, 0, Backspace, Clear) + keyboard event support.
  - Error message display for incorrect PIN.
  - Quick demo credentials hint in Preview mode.
- [x] Session management in JavaScript:
  - Store `currentUser` `{ code, name, role }` and PIN in `localStorage`.
  - Restore session on load.
  - Add `logout()` / `switchUser()` function.
- [x] Top App Bar updates:
  - Show logged-in user name and role badge (`ADMIN` in amber/purple, `SALES` in indigo).
  - Add "Switch User" / "Logout" button.

---

### Task 3: Role-Based Form Behavior & Entry Restrictions in `Index.html`
**Files:**
- Modify: `Index.html`

- [x] Update `populateSalesPersonOptions()`:
  - Check `state.currentUser`.
  - If `role === 'ADMIN'`:
    - Dropdown is enabled.
    - Show helper badge: "Admin: Can assign to any Sales Person".
    - Populate all active salespersons.
  - If `role !== 'ADMIN'`:
    - Dropdown value locked to `currentUser.code`.
    - Dropdown disabled / styled as read-only.
    - Show helper badge: "🔒 Locked to your account".
- [x] Update `resetForm()`:
  - If regular salesperson, ensure `salesPerson.value` defaults to `currentUser.code`.
- [x] Update `loadEntryForEdit(entry)`:
  - If `currentUser.role !== 'ADMIN'` and `entry.salesPerson !== currentUser.code`:
    - Prevent editing and display alert: "Only Admin or the assigned sales person can edit this entry."
  - If Admin:
    - Allow editing and allow changing the `salesPerson` to any rep.
- [x] Update `handleSubmit()`:
  - Attach `authCode: currentUser.code` and `authPin: currentUser.pin` to `payload`.
  - Validate that salesperson is assigned.
- [x] Update `fillSampleBtn` (Preview Mode):
  - Set sample salesperson based on current user role.

---

### Task 4: PIN Management UI (Change PIN)
**Files:**
- Modify: `Index.html`

- [x] Add "Change PIN" modal:
  - For normal user: enter current PIN, enter new PIN (4-6 digits), confirm new PIN.
  - For Admin: ability to select any user and reset their PIN.
  - Connect to `google.script.run.updateUserPin(...)` and localStorage in preview mode.

---

### Task 5: Preview Mode Support & Offline Testing
**Files:**
- Modify: `Index.html`

- [x] Mock backend responses for `loginUser`, `updateUserPin`, and `saveEntry` in `!IS_LIVE_GAS` preview mode.
- [x] Provide sample PINs (`RK: 1234 (Admin)`, `TK: 1111 (Sales)`, etc.) in preview banner.

---

### Task 6: Comprehensive Testing and Verification
**Files:**
- Create: `test/test_sales_auth.js`

- [x] Test PIN verification for valid and invalid credentials.
- [x] Test admin role privileges (can assign any salesperson).
- [x] Test regular salesperson restriction (cannot assign someone else).
- [x] Test auto-migration of 3-column Lookup sheets.
- [x] Test PIN update logic.
- [x] Verify HTML validity and preview rendering.
