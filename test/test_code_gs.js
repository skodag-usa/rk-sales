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
  setNumberFormat() { return this; }
  setDataValidation() { return this; }
  setFontSize() { return this; }
  setFormulas() { return this; }
  setFormula() { return this; }
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
  getSheets() { return this.sheets; }
  getUrl() { return 'https://docs.google.com/spreadsheets/d/test/edit'; }
  getId() { return 'test-id'; }
}

const mockSS = new MockSpreadsheet();

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
      getProperty: () => 'mock-id',
      setProperty: () => {}
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
const testSheet = mockSS.getSheetByName('All Entries') || mockSS.insertSheet('All Entries');
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

console.log('\n========================================');
console.log('ALL Code.gs TESTS PASSED SUCCESSFULLY!');
console.log('========================================');
