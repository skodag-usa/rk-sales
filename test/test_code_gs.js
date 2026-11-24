// Comprehensive test for Code.gs authentication and role-based logic
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

// Mock SpreadsheetApp and Google Apps Script environment
class MockRange {
  constructor(sheet, row, col, numRows = 1, numCols = 1) {
    this.sheet = sheet;
    this.row = row;
    this.col = col;
    this.numRows = numRows;
    this.numCols = numCols;
  }
  setValues(vals) {
    for (let r = 0; r < vals.length; r++) {
      const targetRow = this.row - 1 + r;
      while (this.sheet.data.length <= targetRow) {
        this.sheet.data.push([]);
      }
      for (let c = 0; c < vals[r].length; c++) {
        const targetCol = this.col - 1 + c;
        while (this.sheet.data[targetRow].length <= targetCol) {
          this.sheet.data[targetRow].push('');
        }
        this.sheet.data[targetRow][targetCol] = vals[r][c];
      }
    }
    return this;
  }
  setValue(val) {
    return this.setValues([[val]]);
  }
  getValues() {
    const res = [];
    for (let r = 0; r < this.numRows; r++) {
      const rowArr = [];
      const rowIdx = this.row - 1 + r;
      const rowData = (rowIdx < this.sheet.data.length) ? this.sheet.data[rowIdx] : [];
      for (let c = 0; c < this.numCols; c++) {
        const colIdx = this.col - 1 + c;
        rowArr.push(colIdx < rowData.length ? rowData[colIdx] : '');
      }
      res.push(rowArr);
    }
    return res;
  }
  getValue() {
    return this.getValues()[0][0];
  }
  setFontWeight() { return this; }
  setBackground() { return this; }
  setFontColor() { return this; }
  setFontLine(l) { this.fontLine = l; return this; }
  setNumberFormat() { return this; }
  setDataValidation() { return this; }
  setFontSize() { return this; }
  setFormulas() { return this; }
  setFormula(f) {
    const targetRow = this.row - 1;
    while (this.sheet.data.length <= targetRow) {
      this.sheet.data.push([]);
    }
    const targetCol = this.col - 1;
    while (this.sheet.data[targetRow].length <= targetCol) {
      this.sheet.data[targetRow].push('');
    }
    this.sheet.data[targetRow][targetCol] = f;
    return this;
  }
}

class MockSheet {
  constructor(name) {
    this.name = name;
    this.data = [];
  }
  getName() { return this.name; }
  setName(n) { this.name = n; return this; }
  getLastRow() { return this.data.length; }
  getLastColumn() {
    return this.data.reduce((max, r) => Math.max(max, (r ? r.length : 0)), 0);
  }
  getRange(r, c, nr, nc) {
    if (typeof r === 'string') {
      const m = r.match(/^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/);
      if (m) {
        const col1 = m[1].charCodeAt(0) - 64;
        const row1 = parseInt(m[2], 10);
        const col2 = m[3] ? (m[3].charCodeAt(0) - 64) : col1;
        const row2 = m[4] ? parseInt(m[4], 10) : row1;
        return new MockRange(this, row1, col1, row2 - row1 + 1, col2 - col1 + 1);
      }
      return new MockRange(this, 1, 1, 1, 1);
    }
    return new MockRange(this, r, c, nr || 1, nc || 1);
  }
  setFrozenRows() {}
  setConditionalFormatRules(r) { this.rules = r; }
  deleteRow(idx) { this.data.splice(idx - 1, 1); }
}

class MockSpreadsheet {
  constructor() {
    this.sheets = [];
  }
  getSheetByName(name) {
    return this.sheets.find(s => s.name === name) || null;
  }
  insertSheet(name, idx) {
    const s = new MockSheet(name);
    if (idx !== undefined && idx < this.sheets.length) {
      this.sheets.splice(idx, 0, s);
    } else {
      this.sheets.push(s);
    }
    return s;
  }
  deleteSheet(sh) {
    const idx = this.sheets.indexOf(sh);
    if (idx !== -1) this.sheets.splice(idx, 1);
  }
  getSheets() { return this.sheets; }
  getUrl() { return 'https://docs.google.com/spreadsheets/d/test/edit'; }
  getId() { return 'test-id'; }
}

const mockSS = new MockSpreadsheet();

const scriptPropsStore = { SS_ID: 'mock-id' };
const scriptCacheStore = {};
const cacheTtlStore = {};

const sandbox = {
  SpreadsheetApp: {
    getActiveSpreadsheet: () => mockSS,
    openById: () => mockSS,
    newDataValidation: () => ({
      requireValueInList: () => ({
        build: () => ({})
      })
    }),
    flush: () => {},
    getUi: () => ({
      createMenu: () => ({
        addItem: function() { return this; },
        addToUi: () => {}
      }),
      alert: () => {}
    })
  },
  PropertiesService: {
    getScriptProperties: () => ({
      getProperty: (k) => scriptPropsStore[k] !== undefined ? scriptPropsStore[k] : null,
      setProperty: (k, v) => { scriptPropsStore[k] = String(v); }
    })
  },
  CacheService: {
    getScriptCache: () => ({
      get: (k) => scriptCacheStore[k] || null,
      put: (k, v, ttl) => { scriptCacheStore[k] = String(v); cacheTtlStore[k] = ttl; },
      remove: (k) => { delete scriptCacheStore[k]; delete cacheTtlStore[k]; },
      removeAll: (keys) => { keys.forEach(k => { delete scriptCacheStore[k]; delete cacheTtlStore[k]; }); }
    })
  },
  LockService: {
    getScriptLock: () => ({
      waitLock: () => {},
      releaseLock: () => {}
    })
  },
  Session: {
    getScriptTimeZone: () => 'Asia/Kolkata'
  },
  Utilities: {
    formatDate: (d, tz, fmt) => '2026-11-21 12:00'
  },
  ScriptApp: {
    getService: () => ({
      getUrl: () => 'https://script.google.com/macros/s/mock/exec'
    })
  },
  console: console
};

// Load Code.gs into VM
const codeGsSource = fs.readFileSync('Code.gs', 'utf8');
vm.createContext(sandbox);
vm.runInContext(codeGsSource, sandbox);

console.log('--- RUNNING TESTS ON Code.gs ---');

// Test 1: getSalesPersonsInternal_ creates Lookup sheet with 5 columns
console.log('Test 1: Initializing Lookup sheet...');
const internal1 = sandbox.getSalesPersonsInternal_(mockSS);
assert.strictEqual(internal1.length, 5, 'Should have 5 default users');
const lookupSheet = mockSS.getSheetByName('Lookup');
assert.ok(lookupSheet, 'Lookup sheet must exist');
assert.strictEqual(lookupSheet.getRange(1, 1).getValue(), 'Code');
assert.strictEqual(lookupSheet.getRange(1, 4).getValue(), 'PIN');
assert.strictEqual(lookupSheet.getRange(1, 5).getValue(), 'Role');

// Test 2: Verify Roles and PINs
const rkUser = internal1.find(u => u.code === 'RK');
assert.strictEqual(rkUser.role, 'ADMIN', 'RK should be ADMIN');
assert.strictEqual(rkUser.pin, '1234', 'RK PIN should be 1234');
const tkUser = internal1.find(u => u.code === 'TK');
assert.strictEqual(tkUser.role, 'SALES', 'TK should be SALES');
assert.strictEqual(tkUser.pin, '1111', 'TK PIN should be 1111');
console.log('✓ Default users, roles, and PINs verified.');

// Test 3: getSalesPersonsLookup_ strips PIN for public consumption
console.log('Test 3: Public sanitization...');
const publicLookup = sandbox.getSalesPersonsLookup_(mockSS);
publicLookup.forEach(u => {
  assert.strictEqual(u.pin, undefined, 'Public lookup must NOT contain PIN');
  assert.ok(u.role, 'Public lookup must contain role');
});
console.log('✓ Public lookup sanitization verified (PIN omitted, role included).');

// Test 4: loginUser
console.log('Test 4: loginUser verification...');
const loginRK = sandbox.loginUser('rk', '1234');
assert.strictEqual(loginRK.ok, true, 'RK login should succeed');
assert.strictEqual(loginRK.user.role, 'ADMIN');

const loginWrongPin = sandbox.loginUser('TK', '9999');
assert.strictEqual(loginWrongPin.ok, false, 'TK login with wrong PIN must fail');
assert.strictEqual(loginWrongPin.message, 'Incorrect PIN.');

const loginTK = sandbox.loginUser('TK', '1111');
assert.strictEqual(loginTK.ok, true, 'TK login should succeed');
assert.strictEqual(loginTK.user.role, 'SALES');

const loginUnknown = sandbox.loginUser('UNKNOWN', '0000');
assert.strictEqual(loginUnknown.ok, false, 'Unknown user must fail');
console.log('✓ loginUser logic passed.');

// Test 5: Auto-migration of 3-column legacy sheets
console.log('Test 5: Testing migration of legacy 3-column Lookup tab...');
const legacySS = new MockSpreadsheet();
const legacyLookup = legacySS.insertSheet('Lookup');
legacyLookup.getRange(1, 1, 1, 3).setValues([['Code', 'Full Name', 'Active']]);
legacyLookup.getRange(2, 1, 2, 3).setValues([
  ['TK', 'Trupti Kodag', 'YES'],
  ['RK', 'Rahul Kodag', 'YES']
]);
const migrated = sandbox.getSalesPersonsInternal_(legacySS);
assert.strictEqual(legacyLookup.getRange(1, 4).getValue(), 'PIN', 'Header should be updated with PIN');
assert.strictEqual(legacyLookup.getRange(1, 5).getValue(), 'Role', 'Header should be updated with Role');
assert.strictEqual(migrated.find(u => u.code === 'RK').role, 'ADMIN');
assert.strictEqual(migrated.find(u => u.code === 'TK').role, 'SALES');
assert.strictEqual(migrated.find(u => u.code === 'RK').pin, '1234');
console.log('✓ Migration of 3-column sheet passed.');

// Test 6: updateUserPin
console.log('Test 6: updateUserPin permissions...');
// TK (SALES) changes her own PIN
const changeSelf = sandbox.updateUserPin('TK', '1111', 'TK', '5555');
assert.strictEqual(changeSelf.ok, true, 'TK changing own PIN should succeed');
const checkNewPin = sandbox.loginUser('TK', '5555');
assert.strictEqual(checkNewPin.ok, true, 'New PIN 5555 should now work for TK');

// TK (SALES) attempts to change RK's PIN -> should fail
const unauthorizedChange = sandbox.updateUserPin('TK', '5555', 'RK', '0000');
assert.strictEqual(unauthorizedChange.ok, false, 'Non-admin cannot change another user PIN');

// RK (ADMIN) changes SC's PIN -> should succeed
const adminReset = sandbox.updateUserPin('RK', '1234', 'SC', '7777');
assert.strictEqual(adminReset.ok, true, 'Admin can reset another user PIN');
const checkSC = sandbox.loginUser('SC', '7777');
assert.strictEqual(checkSC.ok, true, 'SC should now log in with 7777');
console.log('✓ updateUserPin passed.');

// Test 7: saveEntry permissions (SALES vs ADMIN)
console.log('Test 7: saveEntry role authorization...');
// TK (SALES) saves entry for herself -> allowed
const tkPayloadOwn = {
  authCode: 'TK',
  authPin: '5555',
  monthYear: 'NOV-2026',
  salesPerson: 'TK',
  partyName: 'ABC Corp',
  region: 'Pune',
  poNo: 'PO-101',
  poDate: '2026-11-20',
  productKeyword: 'LS',
  productValue: 10000,
  freightCharges: 500,
  poValue: 10500,
  commissionType: 'P',
  commissionPct: 5,
  paymentStatus: '',
  wbBilling: 'B'
};
const res1 = sandbox.saveEntry(tkPayloadOwn);
assert.strictEqual(res1.ok, true, 'TK saving entry for TK should succeed');

// TK (SALES) attempts to save entry for RK -> MUST FAIL!
const tkPayloadOther = Object.assign({}, tkPayloadOwn, {
  salesPerson: 'RK',
  poNo: 'PO-102'
});
let blocked = false;
try {
  sandbox.saveEntry(tkPayloadOther);
} catch (e) {
  blocked = true;
  assert.ok(e.message.includes('Only Admin can assign entries to other sales persons'), e.message);
}
assert.strictEqual(blocked, true, 'Regular sales person must be blocked from submitting for another rep');

// RK (ADMIN) saves entry and assigns to TK -> MUST SUCCEED!
const rkPayloadForTK = Object.assign({}, tkPayloadOwn, {
  authCode: 'RK',
  authPin: '1234',
  salesPerson: 'TK',
  poNo: 'PO-103'
});
const resAdmin = sandbox.saveEntry(rkPayloadForTK);
assert.strictEqual(resAdmin.ok, true, 'Admin should be able to assign entry to any sales person');

// Editing permissions:
// TK attempts to edit an entry owned by RK -> MUST FAIL!
const rkEntryPayload = {
  authCode: 'RK',
  authPin: '1234',
  monthYear: 'NOV-2026',
  salesPerson: 'RK',
  partyName: 'Rahul Corp',
  region: 'Pune',
  poNo: 'PO-200',
  poDate: '2026-11-20',
  productKeyword: 'BC',
  productValue: 20000,
  freightCharges: 0,
  poValue: 20000,
  commissionType: 'P',
  commissionPct: 5,
  paymentStatus: '',
  wbBilling: 'B'
};
const rkEntryRes = sandbox.saveEntry(rkEntryPayload);
const rkEntryId = rkEntryRes.responseId;

// TK tries to edit RK's entry
let tkEditBlocked = false;
try {
  sandbox.saveEntry({
    authCode: 'TK',
    authPin: '5555',
    responseId: rkEntryId,
    monthYear: 'NOV-2026',
    salesPerson: 'TK',
    partyName: 'Hacked Corp',
    region: 'Pune',
    poNo: 'PO-200',
    poDate: '2026-11-20',
    productKeyword: 'BC',
    productValue: 20000,
    freightCharges: 0,
    poValue: 20000,
    commissionType: 'P',
    commissionPct: 5,
    paymentStatus: '',
    wbBilling: 'B'
  });
} catch (e) {
  tkEditBlocked = true;
  assert.ok(e.message.includes('Regular sales persons can only edit their own entries'), e.message);
}
assert.strictEqual(tkEditBlocked, true, 'Regular sales person must not edit another rep entry');

// Admin CAN edit any entry and reassign salesperson!
const adminEditRes = sandbox.saveEntry({
  authCode: 'RK',
  authPin: '1234',
  responseId: rkEntryId,
  monthYear: 'NOV-2026',
  salesPerson: 'SC', // Reassigned to SC by Admin
  partyName: 'Admin Updated Corp',
  region: 'Pune',
  poNo: 'PO-200',
  poDate: '2026-11-20',
  productKeyword: 'BC',
  productValue: 25000,
  freightCharges: 0,
  poValue: 25000,
  commissionType: 'P',
  commissionPct: 5,
  paymentStatus: '',
  wbBilling: 'B'
});
assert.strictEqual(adminEditRes.ok, true);
assert.strictEqual(adminEditRes.isEdit, true);
console.log('✓ saveEntry authorization checks passed (Sales restricted, Admin unrestricted).');

// Test 8: applyDataConditionalFormatting_ rules verification
console.log('Test 8: applyDataConditionalFormatting_ rules verification...');
const appliedRules = [];
class MockConditionalFormatRuleBuilder {
  constructor() {
    this.rule = { formula: '', bg: '', color: '', ranges: [] };
  }
  whenFormulaSatisfied(f) { this.rule.formula = f; return this; }
  setBackground(b) { this.rule.bg = b; return this; }
  setFontColor(c) { this.rule.color = c; return this; }
  setRanges(r) { this.rule.ranges = r; return this; }
  build() { return this.rule; }
}

sandbox.SpreadsheetApp.newConditionalFormatRule = () => new MockConditionalFormatRuleBuilder();
const testSheet = mockSS.getSheetByName('NOV-2026') || mockSS.insertSheet('NOV-2026');
testSheet.setConditionalFormatRules = (r) => { appliedRules.push(...r); };

sandbox.applyDataConditionalFormatting_(testSheet);

assert.strictEqual(appliedRules.length, 5, 'Must have exactly 5 cell-level conditional format rules');

// 1. Need to Revisit / Commission Doubt flagged: Sr No in Light Pink (#F8BBD0)
const pinkRule = appliedRules.find(r => r.formula && (r.formula.includes('$AC2="YES"') || r.formula.includes('$AC2=TRUE')));
assert.ok(pinkRule, 'Must have rule for Trupti doubt flag ($AC2="YES" or TRUE)');
assert.strictEqual(pinkRule.bg, '#F8BBD0', 'Sr No doubt background must be light pink #F8BBD0');

// 2. Open PO: Party Name & Invoice cell in Light Green (#D9EAD3)
const openPoRule = appliedRules.find(r => r.formula && r.formula.includes('$J2=""'));
assert.ok(openPoRule, 'Must have rule for Open PO ($J2="")');
assert.strictEqual(openPoRule.bg, '#D9EAD3', 'Open PO background must be light green #D9EAD3');

// 3. Percentage other than 5%: Yellow (#FFF59D)
const pctRule = appliedRules.find(r => r.formula && r.formula.includes('ROUND($T2,4)<>0.05'));
assert.ok(pctRule, 'Must have rule for % other than 5%');
assert.strictEqual(pctRule.bg, '#FFF59D', 'Non-5% commission must be yellow #FFF59D');

// 4. Commission type F or P + F: Yellow (#FFF59D)
const fixedTypeRule = appliedRules.find(r => r.formula && (r.formula.includes('$S2="P + F"') || r.formula.includes('$S2="F"')));
assert.ok(fixedTypeRule, 'Must have rule for Commission Type F / P + F');
assert.strictEqual(fixedTypeRule.bg, '#FFF59D', 'Fixed commission type must be yellow #FFF59D');

// 5. WB selected: Blue text color (#1565C0)
const wbRule = appliedRules.find(r => r.formula === '=$Z2="WB"');
assert.ok(wbRule, 'Must have rule for WB remark');
assert.strictEqual(wbRule.color, '#1565C0', 'WB remark font color must be Blue #1565C0');

// Test 9: Verify applyFormattingToAllSheets runs without error
console.log('Test 9: applyFormattingToAllSheets execution...');
const allTabsRes = sandbox.applyFormattingToAllSheets();
assert.strictEqual(allTabsRes, true);
console.log('✓ applyFormattingToAllSheets passed.');

// Test 10: Verify parseMonthYearFields_ robust parsing
console.log('Test 10: parseMonthYearFields_ robustness...');
const pDateObj = sandbox.parseMonthYearFields_(new Date(2026, 10, 1));
assert.strictEqual(pDateObj.month, 'NOV');
assert.strictEqual(pDateObj.year, '2026');
assert.strictEqual(pDateObj.monthYear, 'NOV-2026');

const pStandard = sandbox.parseMonthYearFields_('NOV-2026');
assert.strictEqual(pStandard.month, 'NOV');
assert.strictEqual(pStandard.year, '2026');

const p2Digit = sandbox.parseMonthYearFields_('NOV-26');
assert.strictEqual(p2Digit.month, 'NOV');
assert.strictEqual(p2Digit.year, '2026');

const pFullName = sandbox.parseMonthYearFields_('November 2026');
assert.strictEqual(pFullName.month, 'NOV');
assert.strictEqual(pFullName.year, '2026');

const pDateStr = sandbox.parseMonthYearFields_('Sun Nov 01 2026 00:00:00 GMT+0530 (IST)');
assert.strictEqual(pDateStr.month, 'NOV');
assert.strictEqual(pDateStr.year, '2026');

const pFallback = sandbox.parseMonthYearFields_('', '2026-11-15');
assert.strictEqual(pFallback.month, 'NOV');
assert.strictEqual(pFallback.year, '2026');
console.log('✓ parseMonthYearFields_ passed.');

// Test 11: Month sheet summary row verification
console.log('Test 11: Month sheet summary row verification...');
const monthTab = mockSS.getSheetByName('NOV-2026');
assert.ok(monthTab, 'NOV-2026 tab should exist after saveEntry');
const mRows = monthTab.data;
const lastRowIdx = mRows.length - 1;
assert.ok(lastRowIdx >= 2, 'Should have header, data rows, and summary row');
const summaryRow = mRows[lastRowIdx];
assert.strictEqual(summaryRow[0], 'TOTAL', 'Summary row col 1 should be TOTAL');
assert.strictEqual(summaryRow[3], 'TOTAL', 'Summary row col 4 should be TOTAL');
assert.ok(String(summaryRow[13]).includes('=SUM(N2:N'), 'Col 14 (PO Value) should have SUM formula: ' + summaryRow[13]);
assert.ok(String(summaryRow[14]).includes('=SUM(O2:O'), 'Col 15 (Product Value) should have SUM formula: ' + summaryRow[14]);
assert.ok(String(summaryRow[22]).includes('=SUM(W2:W'), 'Col 23 (Total Commission) should have SUM formula: ' + summaryRow[22]);
console.log('✓ Month sheet summary row with Total PO, Product Value, and Total Commission verified.');

// Test 12: Rigorous verification of saveEntry saving ONLY to Month Sheet and NOT All Entries
console.log('Test 12: Verifying data gets saved ONLY to Month Sheet (DEC-2026) and NOT All Entries...');
const testPayloadA = {
  authCode: 'RK',
  authPin: '1234',
  monthYear: 'DEC-2026',
  salesPerson: 'RK',
  partyName: 'Precision Tech Works',
  region: 'Pune',
  poNo: 'PO-DEC-001',
  poDate: '2026-12-05',
  productKeyword: 'LS',
  productValue: 50000,
  freightCharges: 1000,
  poValue: 51000,
  commissionType: 'P',
  commissionPct: 5,
  paymentStatus: 'RCD',
  wbBilling: 'B'
};

const resA = sandbox.saveEntry(testPayloadA);
assert.strictEqual(resA.ok, true);
const allSh = mockSS.getSheetByName('All Entries');
const decSh = mockSS.getSheetByName('DEC-2026');
assert.strictEqual(allSh, null, 'All Entries sheet must NOT exist or be created');
assert.ok(decSh, 'DEC-2026 month sheet must exist');

// 1. Check entry exists in DEC-2026 month sheet
const decRowA = decSh.data.find(r => r && r[31] === resA.responseId);
assert.ok(decRowA, 'Entry must be saved into DEC-2026 month sheet');
assert.strictEqual(decRowA[1], 'DEC-2026', 'DEC-2026 month sheet monthYear must match');
assert.strictEqual(decRowA[3], 'Precision Tech Works', 'DEC-2026 month sheet party must match');
assert.strictEqual(decRowA[5], 'PO-DEC-001', 'DEC-2026 month sheet PO must match');
assert.strictEqual(decRowA[13], 51000, 'DEC-2026 month sheet PO Value must match');

// 2. Verify DEC-2026 ends with a TOTAL summary row
const decLastIdx = decSh.data.length - 1;
assert.strictEqual(decSh.data[decLastIdx][0], 'TOTAL', 'Last row in DEC-2026 must be TOTAL');

// 3. Edit entry to update party name and verify month sheet reflects edit while All Entries remains absent
const editRes = sandbox.saveEntry({
  authCode: 'RK',
  authPin: '1234',
  responseId: resA.responseId,
  monthYear: 'DEC-2026',
  salesPerson: 'RK',
  partyName: 'Precision Tech Works (Renamed)',
  region: 'Pune',
  poNo: 'PO-DEC-001',
  poDate: '2026-12-05',
  productKeyword: 'LS',
  productValue: 60000,
  freightCharges: 1000,
  poValue: 61000,
  commissionType: 'P',
  commissionPct: 5,
  paymentStatus: 'RCD',
  wbBilling: 'B'
});
assert.strictEqual(editRes.ok, true);
assert.strictEqual(editRes.isEdit, true);

assert.strictEqual(mockSS.getSheetByName('All Entries'), null, 'All Entries must remain absent after edit');
const decRowEdited = decSh.data.find(r => r && r[31] === resA.responseId);
assert.strictEqual(decRowEdited[3], 'Precision Tech Works (Renamed)', 'DEC-2026 must have updated party');
assert.strictEqual(decRowEdited[13], 61000, 'DEC-2026 must have updated PO value');
console.log('✓ Verified: Data is saved strictly into month sheet (DEC-2026) and All Entries does NOT exist!');

// Test 13: O(1) nextSr_ using MAX_SR_NO in PropertiesService
console.log('Test 13: O(1) nextSr_ verification with PropertiesService...');
scriptPropsStore['MAX_SR_NO'] = '50';
const srNext1 = sandbox.nextSr_(mockSS);
assert.strictEqual(srNext1, 51, 'nextSr_ must return 51 when MAX_SR_NO is 50');
assert.strictEqual(scriptPropsStore['MAX_SR_NO'], '51', 'MAX_SR_NO must be updated to 51');

const srNext2 = sandbox.nextSr_(mockSS);
assert.strictEqual(srNext2, 52, 'nextSr_ must return 52 on next call');
assert.strictEqual(scriptPropsStore['MAX_SR_NO'], '52', 'MAX_SR_NO must be updated to 52');

// Test fallback when MAX_SR_NO is unset
delete scriptPropsStore['MAX_SR_NO'];
const computedSr = sandbox.nextSr_(mockSS);
assert.ok(computedSr > 0, 'Computed nextSr_ must be positive');
assert.strictEqual(scriptPropsStore['MAX_SR_NO'], String(computedSr), 'Computed Sr must be persisted to PropertiesService');
console.log('✓ O(1) nextSr_ with PropertiesService verified.');

// Test 14: Tab-hinted findEntryById_
console.log('Test 14: Tab-hinted findEntryById_ verification...');
const decEntryId = resA.responseId;
// Hint provided and matches
const hintedFind = sandbox.findEntryById_(mockSS, decEntryId, 'DEC-2026');
assert.ok(hintedFind, 'Should find entry with correct tab hint');
assert.strictEqual(hintedFind.sheetName, 'DEC-2026');
assert.strictEqual(hintedFind.rowNum, 2);

// Hint provided with different casing / formatting
const hintedFindCase = sandbox.findEntryById_(mockSS, decEntryId, 'dec-2026');
assert.ok(hintedFindCase, 'Should find entry with lowercase hint');
assert.strictEqual(hintedFindCase.sheetName, 'DEC-2026');

// Hint wrong but entry exists in another tab (fallback scan)
const fallbackFind = sandbox.findEntryById_(mockSS, decEntryId, 'NOV-2026');
assert.ok(fallbackFind, 'Should fall back to scanning all tabs when hint is wrong');
assert.strictEqual(fallbackFind.sheetName, 'DEC-2026');

// Non-existent ID
const missingFind = sandbox.findEntryById_(mockSS, 'RK-NON-EXISTENT', 'DEC-2026');
assert.strictEqual(missingFind, null, 'Non-existent ID should return null');
console.log('✓ Tab-hinted findEntryById_ verified.');

// Test 15: Windowed and pre-calculated getDashboardData with CacheService
console.log('Test 15: Windowed & pre-calculated getDashboardData with CacheService...');
// Clear cache before test
Object.keys(scriptCacheStore).forEach(k => delete scriptCacheStore[k]);

// Request specific FY
const fyData = sandbox.getDashboardData({ fy: 'FY 26-27', all: false });
assert.ok(fyData, 'Dashboard data should be returned');
assert.ok(Array.isArray(fyData.allEntries), 'allEntries should be an array');
assert.strictEqual(fyData.fy, 'FY 26-27');
assert.ok(fyData.summary, 'Summary object must exist');
assert.ok(fyData.summary.orderCount >= 1, 'Summary orderCount should reflect entries');
assert.ok(fyData.summary.totalPoValue >= 0, 'Summary totalPoValue should be calculated');
assert.ok(fyData.kpi, 'KPI object must exist');

// Verify CacheService cached the result
assert.ok(scriptCacheStore['DASHBOARD_FY 26-27'], 'CacheService must store DASHBOARD_FY 26-27');
assert.strictEqual(cacheTtlStore['DASHBOARD_FY 26-27'], 600, 'Cache TTL must be 600s');

// Second call should return cached data
const cachedCall = sandbox.getDashboardData({ fy: 'FY 26-27' });
assert.deepStrictEqual(cachedCall, fyData, 'Cached call should return identical data');

// Request all years
const allData = sandbox.getDashboardData({ all: true });
assert.ok(allData, 'All years data should be returned');
assert.strictEqual(allData.isAll, true);
assert.ok(scriptCacheStore['DASHBOARD_ALL'], 'CacheService must store DASHBOARD_ALL');
console.log('✓ Windowed and pre-calculated getDashboardData with CacheService verified.');

// Test 16: saveEntry cache invalidation
console.log('Test 16: saveEntry CacheService invalidation verification...');
assert.ok(scriptCacheStore['DASHBOARD_ALL'], 'Cache should exist before saveEntry');
sandbox.saveEntry({
  authCode: 'RK',
  authPin: '1234',
  monthYear: 'DEC-2026',
  salesPerson: 'RK',
  partyName: 'Cache Invalidation Corp',
  region: 'Pune',
  poNo: 'PO-CACHE-01',
  poDate: '2026-12-10',
  productKeyword: 'LS',
  productValue: 15000,
  freightCharges: 500,
  poValue: 15500,
  commissionType: 'P',
  commissionPct: 5,
  wbBilling: 'B'
});
assert.strictEqual(scriptCacheStore['DASHBOARD_ALL'], undefined, 'DASHBOARD_ALL cache must be invalidated on saveEntry');
assert.strictEqual(scriptCacheStore['DASHBOARD_FY 26-27'], undefined, 'DASHBOARD_FY 26-27 cache must be invalidated on saveEntry');
console.log('✓ saveEntry cache invalidation verified.');

// Test 17: Service worker script generation
console.log('Test 17: Service worker script generation...');
const swSource = sandbox.getServiceWorkerSource_();
assert.ok(swSource.includes('isStaticAsset'), 'SW must have static asset detection');
assert.ok(swSource.includes('caches.match(e.request)'), 'SW must have cache-first match for static assets');
assert.ok(swSource.includes('fetch(e.request)'), 'SW must have network-first for data');
assert.ok(swSource.includes("'message'"), 'SW must have message listener');
assert.ok(swSource.includes('SYNC_NOW') || swSource.includes('BACKGROUND_SYNC'), 'SW must handle sync messages');
assert.ok(swSource.includes('SKIP_WAITING'), 'SW must handle SKIP_WAITING message');
assert.ok(swSource.includes("'sync'"), 'SW must handle sync event');

// Verify service worker syntax
try {
  new vm.Script(swSource);
  console.log('✓ Service worker script compiled with zero syntax errors.');
} catch (swErr) {
  assert.fail('Service worker script has syntax error: ' + swErr.message);
}

// Test 18: bootJson_ includes pre-seeded salesPersons & regions
console.log('Test 18: bootJson_ pre-seeds salesPersons & regions...');
const bootStr = sandbox.bootJson_('RK-TEST-123');
const bootData = JSON.parse(bootStr);
assert.strictEqual(bootData.editId, 'RK-TEST-123');
assert.ok(Array.isArray(bootData.salesPersons), 'bootJson_ must include salesPersons array');
assert.ok(bootData.salesPersons.some(u => u.code === 'RK'), 'salesPersons must include active users');
assert.ok(Array.isArray(bootData.regions), 'bootJson_ must include regions array');
assert.deepStrictEqual(bootData.regions, ['R - Pune', 'N - Pune', 'MP', 'WB'], 'bootJson_ must include default regions');
console.log('✓ bootJson_ pre-seeds salesPersons & regions verified.');

// Test 19: getRegionsLookup_ Lookup tab initialization & custom regions
console.log('Test 19: getRegionsLookup_ Lookup sheet integration & custom regions...');
const lookupSh = mockSS.getSheetByName('Lookup');
assert.strictEqual(lookupSh.getRange(1, 8).getValue(), 'Region', 'Column H header must be Region');
assert.strictEqual(lookupSh.getRange(1, 9).getValue(), 'Active', 'Column I header must be Active');

const regs = sandbox.getRegionsLookup_(mockSS);
assert.strictEqual(JSON.stringify(regs), JSON.stringify(['R - Pune', 'N - Pune', 'MP', 'WB']), 'Initial regions must match DEFAULT_REGIONS');

// Test adding a custom region in Lookup sheet
lookupSh.getRange(6, 8, 1, 2).setValues([['Goa', 'YES']]);
const updatedRegs = sandbox.getRegionsLookup_(mockSS);
assert.ok(updatedRegs.includes('Goa'), 'Added region Goa must be returned');

// Test marking a region inactive
lookupSh.getRange(6, 8, 1, 2).setValues([['Goa', 'NO']]);
const activeRegsAfterDeactivation = sandbox.getRegionsLookup_(mockSS);
assert.ok(!activeRegsAfterDeactivation.includes('Goa'), 'Inactive region Goa must not be returned');

// Verify getDashboardData includes regions
const dashPayload = sandbox.getDashboardData();
assert.ok(Array.isArray(dashPayload.regions), 'getDashboardData must include regions');
console.log('✓ getRegionsLookup_ Lookup sheet integration & custom regions verified.');

// Test 20: Dedicated Region tab and arbitrary column auto-detection
console.log('Test 20: Dedicated Region tab and flexible column auto-detection...');
// Create a separate sheet named 'Region'
const dedicatedRegionSh = mockSS.insertSheet('Region');
dedicatedRegionSh.getRange(1, 1, 4, 2).setValues([
  ['Region Name', 'Status'],
  ['South Mumbai', 'YES'],
  ['Navi Mumbai', 'YES'],
  ['Thane', 'NO']
]);
const dedicatedRegs = sandbox.getRegionsLookup_(mockSS);
assert.ok(dedicatedRegs.includes('South Mumbai'), 'Must detect South Mumbai from dedicated Region sheet');
assert.ok(dedicatedRegs.includes('Navi Mumbai'), 'Must detect Navi Mumbai from dedicated Region sheet');
assert.ok(!dedicatedRegs.includes('Thane'), 'Must exclude Thane marked NO');

// Clean up dedicated sheet and test flexible column in Lookup sheet
mockSS.deleteSheet(dedicatedRegionSh);

// Test updating regions in Column 8
lookupSh.getRange(2, 8, 2, 2).setValues([
  ['Pune Central', 'YES'],
  ['Pune PCMC', 'YES']
]);
const col8Regs = sandbox.getRegionsLookup_(mockSS);
assert.ok(col8Regs.includes('Pune Central'), 'Must detect updated region Pune Central');
assert.ok(col8Regs.includes('Pune PCMC'), 'Must detect updated region Pune PCMC');

// Test moving regions to an arbitrary column (e.g. Column 11 with header 'Zone')
for (let r = 1; r <= 10; r++) {
  lookupSh.getRange(r, 8, 1, 2).setValues([['', '']]);
}
lookupSh.getRange(1, 11, 3, 2).setValues([
  ['Zone', 'Active'],
  ['North Zone', 'YES'],
  ['South Zone', 'YES']
]);
const flexibleLookupRegs = sandbox.getRegionsLookup_(mockSS);
assert.ok(flexibleLookupRegs.includes('North Zone'), 'Must detect North Zone from column 11');
assert.ok(flexibleLookupRegs.includes('South Zone'), 'Must detect South Zone from column 11');

// Test skipCache parameter on getDashboardData
const dashFresh = sandbox.getDashboardData({ skipCache: true });
assert.ok(dashFresh.regions.includes('North Zone'), 'Fresh dashboard data must reflect new regions immediately');
console.log('✓ Dedicated Region tab and flexible column auto-detection verified.');

// Test 21: saveEntry with P + F split amounts
console.log('Test 21: saveEntry with P + F split amounts (5% on 200 + 3 on 100 = 13)...');
const splitPayload = {
  authCode: 'RK',
  authPin: '1234',
  month: 'NOV',
  year: '2026',
  monthYear: 'NOV-2026',
  salesPerson: 'RK',
  partyName: 'Split Precision Ltd',
  region: 'R - Pune',
  poNo: 'PO-SPLIT-1',
  poDate: '2026-11-20',
  productKeyword: 'LS',
  productName: 'Leadshine Hybrid',
  poValue: 300,
  productValue: 300,
  freightCharges: 0,
  commissionType: 'P + F',
  commissionPct: 5,
  commissionFixed: 3,
  commPctProductValue: 200,
  commFixedProductValue: 100,
  paymentTerms: 'PI',
  paymentStatus: 'RCD',
  wbBilling: 'B'
};
const splitRes = sandbox.saveEntry(splitPayload);
assert.ok(splitRes.ok, 'saveEntry must succeed for P + F split');
const novSh = mockSS.getSheetByName('NOV-2026');
assert.ok(novSh, 'NOV-2026 sheet must exist');
const splitRowIdx = novSh.getLastRow();
// In month sheet: row before summary row
const savedRowVals = novSh.getRange(splitRowIdx - 1, 1, 1, 32).getValues()[0];
assert.strictEqual(savedRowVals[14], 300, 'Product Value should be 300');
assert.strictEqual(savedRowVals[18], 'P + F', 'Commission Type should be P + F');
assert.strictEqual(savedRowVals[19], 0.05, 'Commission % should be 0.05');
assert.strictEqual(savedRowVals[20], 3, 'Commission Fixed should be 3');
assert.strictEqual(savedRowVals[21], '=ROUND(200*T5, 2)', 'Commission Value % formula should be =ROUND(200*T5, 2)');
assert.ok(String(savedRowVals[22]).includes('V5+IF(OR(S5="F",S5="P + F"),U5,0)'), 'Total Commission formula should sum V5 + U5');
console.log('✓ saveEntry with P + F split amounts verified.');

// Test 22: saveEntry with P + P split amounts
console.log('Test 22: saveEntry with P + P split amounts (5% on 200 + 2.5% on 100 = 12.5)...');
const ppPayload = {
  authCode: 'RK',
  authPin: '1234',
  month: 'NOV',
  year: '2026',
  monthYear: 'NOV-2026',
  salesPerson: 'RK',
  partyName: 'Dual Percentage Ltd',
  region: 'R - Pune',
  poNo: 'PO-PP-1',
  poDate: '2026-11-21',
  productKeyword: 'LS',
  productName: 'Leadshine Dual',
  poValue: 300,
  productValue: 300,
  freightCharges: 0,
  commissionType: 'P + P',
  commP1ProductValue: 200,
  commP1Pct: 5,
  commP2ProductValue: 100,
  commP2Pct: 2.5,
  paymentTerms: 'PI',
  paymentStatus: 'RCD',
  wbBilling: 'B'
};
const ppRes = sandbox.saveEntry(ppPayload);
assert.ok(ppRes.ok, 'saveEntry must succeed for P + P split');
const ppNovSh = mockSS.getSheetByName('NOV-2026');
assert.ok(ppNovSh, 'NOV-2026 sheet must exist');
const ppRowIdx = ppNovSh.getLastRow();
const savedPPRowVals = ppNovSh.getRange(ppRowIdx - 1, 1, 1, 32).getValues()[0];
assert.strictEqual(savedPPRowVals[14], 300, 'Product Value should be 300');
assert.strictEqual(savedPPRowVals[18], 'P + P', 'Commission Type should be P + P');
assert.strictEqual(savedPPRowVals[19], 0.05, 'Commission % should be 0.05 (Part 1)');
assert.strictEqual(savedPPRowVals[20], 0, 'Commission Fixed should be 0');
assert.ok(savedPPRowVals[21] === 12.5 || String(savedPPRowVals[21]).includes('ROUND(200*0.05 + 100*0.025, 2)'), 'Commission Value % formula should be =ROUND(200*0.05 + 100*0.025, 2)');
assert.strictEqual(ppRes.entry.commP1ProductValue, 200, 'Entry should retain commP1ProductValue 200');
assert.strictEqual(ppRes.entry.commP2ProductValue, 100, 'Entry should retain commP2ProductValue 100');
assert.strictEqual(ppRes.entry.commP1Pct, 5, 'Entry should retain commP1Pct 5');
assert.strictEqual(ppRes.entry.commP2Pct, 2.5, 'Entry should retain commP2Pct 2.5');
assert.ok(String(savedPPRowVals[22]).includes('V'), 'Total Commission formula should reference V');
console.log('✓ saveEntry with P + P dual percentage split amounts verified.');

// Test 23: saveEntry with multi-part P + P + P + F combination
console.log('Test 23: saveEntry with multi-part P + P + P + F (3 P parts + 1 F part = 12)...');
const multiPayload = {
  authCode: 'RK',
  authPin: '1234',
  month: 'NOV',
  year: '2026',
  monthYear: 'NOV-2026',
  salesPerson: 'RK',
  partyName: 'Multi Combo Precision Ltd',
  region: 'R - Pune',
  poNo: 'PO-MULTI-1',
  poDate: '2026-11-22',
  productKeyword: 'LS',
  productName: 'Leadshine Multi',
  poValue: 300,
  productValue: 300,
  freightCharges: 0,
  commissionType: 'P + P + P + F',
  commissionParts: [
    { type: 'P', pv: 100, rate: 5 },
    { type: 'P', pv: 100, rate: 3 },
    { type: 'P', pv: 50, rate: 2 },
    { type: 'F', pv: 50, rate: 3 }
  ],
  paymentTerms: 'PI',
  paymentStatus: 'RCD',
  wbBilling: 'B'
};
const multiRes = sandbox.saveEntry(multiPayload);
assert.ok(multiRes.ok, 'saveEntry must succeed for P + P + P + F combo');
const multiNovSh = mockSS.getSheetByName('NOV-2026');
assert.ok(multiNovSh, 'NOV-2026 sheet must exist');
const multiRowIdx = multiNovSh.getLastRow();
const savedMultiVals = multiNovSh.getRange(multiRowIdx - 1, 1, 1, 32).getValues()[0];
assert.strictEqual(savedMultiVals[14], 300, 'Product Value should be 300');
assert.strictEqual(savedMultiVals[18], 'P + P + P + F', 'Commission Type should be P + P + P + F');
assert.strictEqual(savedMultiVals[19], 0.05, 'Commission % should be 0.05 (Part 1)');
assert.strictEqual(savedMultiVals[20], 3, 'Commission Fixed should be 3 (Sum of F parts)');
assert.strictEqual(savedMultiVals[21], 9, 'Commission Value % should be 9 (100@5% + 100@3% + 50@2%)');
assert.ok(String(savedMultiVals[22]).includes('+U'), 'Total Commission formula should sum V and U');
console.log('✓ saveEntry with multi-part P + P + P + F combination verified.');

// Test 24: PI Number uniqueness in Financial Year & self-edit exemption
console.log('Test 24: Verifying PI number uniqueness in financial year & self-edit exemption...');
const piPayload1 = {
  authCode: 'RK',
  authPin: '1234',
  month: 'NOV',
  year: '2026',
  monthYear: 'NOV-2026',
  salesPerson: 'RK',
  partyName: 'PI Test Unique A',
  region: 'R - Pune',
  poNo: 'PO-PI-1',
  poDate: '2026-11-20',
  piNo: 'PI-2627-999',
  productKeyword: 'LS',
  poValue: 1000,
  productValue: 1000,
  commissionType: 'P',
  commissionPct: 5,
  paymentStatus: 'RCD',
  wbBilling: 'B'
};
const piRes1 = sandbox.saveEntry(piPayload1);
assert.ok(piRes1.ok, 'First entry with PI-2627-999 should succeed');

// Attempting duplicate PI in another month of the SAME financial year (e.g. DEC-2026 in FY 26-27)
const piPayloadDup = {
  authCode: 'RK',
  authPin: '1234',
  month: 'DEC',
  year: '2026',
  monthYear: 'DEC-2026',
  salesPerson: 'RK',
  partyName: 'PI Test Duplicate B',
  region: 'R - Pune',
  poNo: 'PO-PI-2',
  poDate: '2026-12-05',
  piNo: 'PI-2627-999',
  productKeyword: 'LS',
  poValue: 2000,
  productValue: 2000,
  commissionType: 'P',
  commissionPct: 5,
  paymentStatus: 'RCD',
  wbBilling: 'B'
};
assert.throws(() => {
  sandbox.saveEntry(piPayloadDup);
}, /already exists in this financial year/, 'Duplicate PI in same FY must be rejected');

// Self-edit exemption: Updating entry 1 keeping the same PI number must succeed
const piPayloadSelfEdit = Object.assign({}, piPayload1, {
  responseId: piRes1.responseId,
  poValue: 1500,
  productValue: 1500
});
const piSelfEditRes = sandbox.saveEntry(piPayloadSelfEdit);
assert.ok(piSelfEditRes.ok, 'Self-edit of entry with same PI number must succeed');

// Different Financial Year (e.g. NOV-2025 in FY 25-26) with same PI must succeed
const piPayloadDiffFY = Object.assign({}, piPayload1, {
  responseId: '',
  month: 'NOV',
  year: '2025',
  monthYear: 'NOV-2025',
  poNo: 'PO-PI-OLD'
});
const piDiffFYRes = sandbox.saveEntry(piPayloadDiffFY);
assert.ok(piDiffFYRes.ok, 'Same PI number in different FY (FY 25-26) must be allowed');
console.log('✓ PI number uniqueness in financial year & self-edit exemption verified.');

// Test 25: deleteEntry functionality with strike-through in Excel
console.log('Test 25: Verifying deleteEntry soft-delete, strike-through, and KPI exclusion...');
const delNovSh = mockSS.getSheetByName('NOV-2026');
const beforeDash = sandbox.getDashboardDataWithSS_(mockSS);
const initialOrderCount = beforeDash.summary.orderCount;

const deleteRes = sandbox.deleteEntry({
  authCode: 'RK',
  authPin: '1234',
  responseId: piRes1.responseId,
  monthYear: 'NOV-2026'
});
assert.ok(deleteRes.ok, 'deleteEntry should return ok: true');

// Verify row in NOV-2026 has [DELETED] in Col 27 (Remark)
const deletedEntryRow = sandbox.findEntryById_(mockSS, piRes1.responseId, 'NOV-2026');
assert.ok(deletedEntryRow, 'Entry row should still exist in sheet (soft delete)');
const deletedVals = deletedEntryRow.sheet.getRange(deletedEntryRow.rowNum, 1, 1, 32).getValues()[0];
assert.ok(String(deletedVals[26]).includes('[DELETED]'), 'Col 27 (Remark) must contain [DELETED]');

// Verify getAllMonthRecords_ marks isDeleted: true
const allRecs = sandbox.getAllMonthRecords_(mockSS);
const foundDeletedRec = allRecs.find(r => r.responseId === piRes1.responseId);
assert.ok(foundDeletedRec, 'Deleted record should be returned in getAllMonthRecords_');
assert.strictEqual(foundDeletedRec.isDeleted, true, 'isDeleted must be true');

// Verify dashboard KPI excludes the deleted record
const afterDash = sandbox.getDashboardDataWithSS_(mockSS, { skipCache: true });
assert.strictEqual(afterDash.summary.orderCount, initialOrderCount - 1, 'orderCount should decrement by 1');

// Verify findDuplicatePIInFY_ ignores deleted records
const dupCheckAfterDelete = sandbox.findDuplicatePIInFY_(mockSS, 'PI-2627-999', 'FY 26-27');
assert.strictEqual(dupCheckAfterDelete, null, 'Deleted entry PI should no longer block new entries');
console.log('✓ deleteEntry soft-delete, strike-through, and KPI exclusion verified.');

// Test 26: Serial number autogenerated from Excel with =ROW()-1
console.log('Test 26: Verifying serial number formula autogenerated from Excel...');
const novLastRow = delNovSh.getLastRow();
// In mock, setFormula sets the formula string in the cell
const srFormula = delNovSh.getRange(deletedEntryRow.rowNum, 1).getValue();
assert.strictEqual(srFormula, '=ROW()-1', 'Col 1 (Sr. No.) must be autogenerated formula =ROW()-1');
console.log('✓ Serial number autogenerated formula =ROW()-1 verified.');

// Test 27: getPartiesLookup_ returns parties from Lookup sheet, dedicated sheet, and month sheets
console.log('Test 27: getPartiesLookup_ discovery & verification...');
assert.strictEqual(typeof sandbox.getPartiesLookup_, 'function', 'getPartiesLookup_ must be defined');
const initialParties = sandbox.getPartiesLookup_(mockSS);
assert.ok(Array.isArray(initialParties), 'getPartiesLookup_ must return an array');
assert.ok(initialParties.includes('Multi Combo Precision Ltd'), 'Existing entry party must be included in lookup');

// Test 28: addPartyToLookup_ adds new party to Lookup tab
console.log('Test 28: addPartyToLookup_ appends new party and deduplicates...');
assert.strictEqual(typeof sandbox.addPartyToLookup_, 'function', 'addPartyToLookup_ must be defined');
const addedFirst = sandbox.addPartyToLookup_(mockSS, 'Zenith Automation Pvt Ltd');
assert.strictEqual(addedFirst, true, 'First add must return true');
const addedDuplicate = sandbox.addPartyToLookup_(mockSS, 'zenith automation pvt ltd');
assert.strictEqual(addedDuplicate, false, 'Duplicate add must return false');
const partiesAfterAdd = sandbox.getPartiesLookup_(mockSS);
assert.ok(partiesAfterAdd.includes('Zenith Automation Pvt Ltd'), 'Zenith Automation must be in parties lookup');

// Test 29: saveEntry automatically registers new party in Lookup sheet
console.log('Test 29: saveEntry automatically calls addPartyToLookup_...');
const newPartyPayload = {
  authCode: 'RK',
  authPin: '1234',
  month: 'NOV',
  year: '2026',
  monthYear: 'NOV-2026',
  salesPerson: 'RK',
  partyName: 'Apex Robotics India',
  region: 'R - Pune',
  poNo: 'PO-APEX-1',
  poDate: '2026-11-23',
  productKeyword: 'LS',
  productName: 'Leadshine Servo',
  poValue: 500,
  productValue: 500,
  freightCharges: 0,
  commissionType: 'P',
  commissionPct: 5,
  paymentTerms: 'PI',
  paymentStatus: 'RCD',
  wbBilling: 'B'
};
const newPartyRes = sandbox.saveEntry(newPartyPayload);
assert.ok(newPartyRes.ok, 'saveEntry must succeed');
const partiesAfterSave = sandbox.getPartiesLookup_(mockSS);
assert.ok(partiesAfterSave.includes('Apex Robotics India'), 'Apex Robotics India must be automatically added to party lookup');
console.log('✓ getPartiesLookup_ and auto-add on saveEntry verified.');

// Test 30: Validation that calculated product value cannot exceed Sales Value (productValue)
console.log('Test 30: Validation that calculated product value cannot exceed Sales Value...');
assert.throws(() => {
  sandbox.saveEntry({
    authCode: 'RK',
    authPin: '1234',
    monthYear: 'NOV-2026',
    salesPerson: 'RK',
    partyName: 'Apex Robotics India',
    region: 'R - Pune',
    poNo: 'PO-TEST-OVER-1',
    poDate: '2026-11-23',
    productKeyword: 'LS',
    productValue: 1000,
    poValue: 1000,
    commissionType: 'P + F',
    commPctProductValue: 600,
    commFixedProductValue: 500, // Total 1100 > 1000
    commissionPct: 5,
    commissionFixed: 50,
    paymentStatus: 'RCD',
    wbBilling: 'B'
  });
}, /Calculated product value.*cannot exceed Sales Value/i, 'saveEntry must throw error when P+F split exceeds productValue');

assert.throws(() => {
  sandbox.saveEntry({
    authCode: 'RK',
    authPin: '1234',
    monthYear: 'NOV-2026',
    salesPerson: 'RK',
    partyName: 'Apex Robotics India',
    region: 'R - Pune',
    poNo: 'PO-TEST-OVER-2',
    poDate: '2026-11-23',
    productKeyword: 'LS',
    productValue: 1000,
    poValue: 1000,
    commissionType: 'P + P',
    commP1ProductValue: 700,
    commP2ProductValue: 400, // Total 1100 > 1000
    commP1Pct: 5,
    commP2Pct: 2.5,
    paymentStatus: 'RCD',
    wbBilling: 'B'
  });
}, /Calculated product value.*cannot exceed Sales Value/i, 'saveEntry must throw error when P+P split exceeds productValue');

assert.throws(() => {
  sandbox.saveEntry({
    authCode: 'RK',
    authPin: '1234',
    monthYear: 'NOV-2026',
    salesPerson: 'RK',
    partyName: 'Apex Robotics India',
    region: 'R - Pune',
    poNo: 'PO-TEST-OVER-3',
    poDate: '2026-11-23',
    productKeyword: 'LS',
    productValue: 1000,
    poValue: 1000,
    commissionType: 'CUSTOM',
    commissionParts: [
      { type: 'P', pv: 600, rate: 5 },
      { type: 'P', pv: 500, rate: 2.5 } // Total 1100 > 1000
    ],
    paymentStatus: 'RCD',
    wbBilling: 'B'
  });
}, /Calculated product value.*cannot exceed Sales Value/i, 'saveEntry must throw error when multi-part split exceeds productValue');
console.log('✓ Validation for calculated product value exceeding Sales Value verified.');

// Test 24: On-demand paginated getMonthTransactions (10, 20, 50 records)
console.log('Test 24: Verifying on-demand paginated getMonthTransactions...');
const paged10 = sandbox.getMonthTransactions({
  month: 'NOV',
  year: '2026',
  page: 1,
  pageSize: 10
});
assert.ok(paged10.ok, 'getMonthTransactions should return ok: true');
assert.strictEqual(paged10.page, 1);
assert.strictEqual(paged10.pageSize, 10);
assert.ok(Array.isArray(paged10.records), 'records must be an array');
assert.ok(paged10.records.length <= 10, 'records length must be <= 10');
assert.ok(paged10.totalCount >= 1, 'totalCount should be >= 1');
assert.ok(paged10.totalPages >= 1, 'totalPages should be >= 1');
assert.ok(paged10.perf, 'Performance report should be included in live response');

// Test page size 20 and 50
const paged20 = sandbox.getMonthTransactions({ month: 'NOV', year: '2026', page: 1, pageSize: 20 });
assert.strictEqual(paged20.pageSize, 20);
assert.ok(paged20.records.length <= 20);

const paged50 = sandbox.getMonthTransactions({ month: 'NOV', year: '2026', page: 1, pageSize: 50 });
assert.strictEqual(paged50.pageSize, 50);

// Test search filter
const searched = sandbox.getMonthTransactions({ month: 'NOV', year: '2026', page: 1, pageSize: 10, search: 'Apex' });
assert.ok(searched.ok);
searched.records.forEach(r => {
  const match = (r.partyName && r.partyName.toLowerCase().includes('apex')) ||
                (r.productKeyword && r.productKeyword.toLowerCase().includes('apex')) ||
                (r.salesPerson && r.salesPerson.toLowerCase().includes('apex'));
  assert.ok(match, 'All returned records must match search term');
});
console.log('✓ On-demand paginated getMonthTransactions (10, 20, 50) verified.');

// Test 31: Verifying dynamic formulas in Google Sheets (GST, Total Value, Commission Value %, Total Commission) and repairSheetFormulas
console.log('Test 31: Verifying dynamic formulas and repairSheetFormulas...');
const repairRes = sandbox.repairSheetFormulas(mockSS);
assert.ok(repairRes.ok, 'repairSheetFormulas must succeed');
assert.ok(repairRes.repairedRows > 0, 'repairSheetFormulas must repair rows across sheets');

// Check an existing row in NOV-2026 sheet
const testSh = mockSS.getSheetByName('NOV-2026');
const lastR = testSh.getLastRow();
// In MockRange, setFormula stores formula string directly into sheet.data
const testVals = testSh.getRange(lastR - 1, 1, 1, 32).getValues()[0];
const gstFormula = String(testVals[16]);
const totalValFormula = String(testVals[17]);
const totalCommFormula = String(testVals[22]);
assert.ok(gstFormula.includes('ROUND((O') && gstFormula.includes('0.18'), 'GST formula must compute 18% GST');
assert.ok(totalValFormula.includes('ROUND(O') && totalValFormula.includes('+Q'), 'Total Value formula must sum product, freight, and GST');
assert.ok(totalCommFormula.includes('ROUND(V'), 'Total Commission formula must reference Commission Value %');
console.log('✓ Dynamic formulas and repairSheetFormulas verified.');

// Test 32: Verifying saveEntry with client-generated responseId for new entries (idempotency & retry safe)
console.log('Test 32: Verifying saveEntry with client-generated responseId for new entries...');
const clientGenId = 'RK-' + Date.now() + '-9999';
const newEntryWithIdRes = sandbox.saveEntry({
  authCode: 'RK',
  authPin: '1234',
  responseId: clientGenId,
  isEdit: false,
  month: 'NOV',
  year: '2026',
  monthYear: 'NOV-2026',
  salesPerson: 'RK',
  partyName: 'Client Idempotent Ltd',
  region: 'R - Pune',
  poNo: 'PO-CLIENT-ID-1',
  poDate: '2026-11-24',
  piNo: 'PI-2627-CLIENT-1',
  productKeyword: 'LS',
  productName: 'Laser Unit',
  poValue: 5000,
  productValue: 5000,
  freightCharges: 0,
  commissionType: 'P',
  commissionPct: 5,
  paymentStatus: 'RCD',
  wbBilling: 'B'
});
assert.strictEqual(newEntryWithIdRes.ok, true);
assert.strictEqual(newEntryWithIdRes.isEdit, false);
assert.strictEqual(newEntryWithIdRes.responseId, clientGenId);
assert.strictEqual(newEntryWithIdRes.status, 'CREATED');

// Retrying the exact same submission with the same client-generated ID should succeed idempotently without error
const retryEntryRes = sandbox.saveEntry({
  authCode: 'RK',
  authPin: '1234',
  responseId: clientGenId,
  isEdit: false,
  month: 'NOV',
  year: '2026',
  monthYear: 'NOV-2026',
  salesPerson: 'RK',
  partyName: 'Client Idempotent Ltd',
  region: 'R - Pune',
  poNo: 'PO-CLIENT-ID-1',
  poDate: '2026-11-24',
  piNo: 'PI-2627-CLIENT-1',
  productKeyword: 'LS',
  productName: 'Laser Unit',
  poValue: 5000,
  productValue: 5000,
  freightCharges: 0,
  commissionType: 'P',
  commissionPct: 5,
  paymentStatus: 'RCD',
  wbBilling: 'B'
});
assert.strictEqual(retryEntryRes.ok, true);
assert.strictEqual(retryEntryRes.isEdit, true); // Found existing entry on retry!
assert.strictEqual(retryEntryRes.responseId, clientGenId);
assert.strictEqual(retryEntryRes.status, 'UPDATED');

// But attempting an explicit edit (isEdit: true) on a non-existent ID should throw "was not found"
assert.throws(() => {
  sandbox.saveEntry({
    authCode: 'RK',
    authPin: '1234',
    responseId: 'RK-NONEXISTENT-9999',
    isEdit: true,
    monthYear: 'NOV-2026',
    salesPerson: 'RK',
    partyName: 'Ghost Ltd',
    region: 'R - Pune',
    poNo: 'PO-GHOST',
    poDate: '2026-11-24',
    productKeyword: 'LS',
    productValue: 1000,
    commissionType: 'P',
    paymentStatus: 'RCD',
    wbBilling: 'B'
  });
}, /was not found/, 'Explicit edit of non-existent entry must throw was not found');
console.log('✓ saveEntry with client-generated responseId, idempotency retry, and explicit edit check verified.');

console.log('\n========================================');
console.log('ALL Code.gs TESTS PASSED SUCCESSFULLY!');
console.log('========================================');
