// End-to-End Simulation Test: Complete Sales & Admin Authentication Workflow
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

console.log('--- RUNNING FULL END-TO-END WORKFLOW SIMULATION ---');

// Set up full Google Apps Script backend environment
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
      const tr = this.row - 1 + r;
      while (this.sheet.data.length <= tr) this.sheet.data.push([]);
      for (let c = 0; c < vals[r].length; c++) {
        const tc = this.col - 1 + c;
        while (this.sheet.data[tr].length <= tc) this.sheet.data[tr].push('');
        this.sheet.data[tr][tc] = vals[r][c];
      }
    }
    return this;
  }
  setValue(val) { return this.setValues([[val]]); }
  getValues() {
    const res = [];
    for (let r = 0; r < this.numRows; r++) {
      const rowArr = [];
      const tr = this.row - 1 + r;
      const rowData = (tr < this.sheet.data.length) ? this.sheet.data[tr] : [];
      for (let c = 0; c < this.numCols; c++) {
        const tc = this.col - 1 + c;
        rowArr.push(tc < rowData.length ? rowData[tc] : '');
      }
      res.push(rowArr);
    }
    return res;
  }
  getValue() { return this.getValues()[0][0]; }
  setFontWeight() { return this; }
  setBackground() { return this; }
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
    return this.data.reduce((m, r) => Math.max(m, (r ? r.length : 0)), 0);
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
    if (idx !== undefined && idx < this.sheets.length) this.sheets.splice(idx, 0, s);
    else this.sheets.push(s);
    return s;
  }
  getSheets() { return this.sheets; }
  getUrl() { return 'https://docs.google.com/spreadsheets/d/rk-sales-sheet/edit'; }
  getId() { return 'test-rk-sales'; }
}

const ss = new MockSpreadsheet();

const backendContext = {
  SpreadsheetApp: {
    getActiveSpreadsheet: () => ss,
    openById: () => ss,
    newDataValidation: () => ({
      requireValueInList: () => ({ build: () => ({}) })
    }),
    flush: () => {},
    getUi: () => ({
      createMenu: () => ({ addItem: function() { return this; }, addToUi: () => {} }),
      alert: () => {}
    })
  },
  PropertiesService: {
    getScriptProperties: () => ({ getProperty: () => 'test-rk-sales', setProperty: () => {} })
  },
  LockService: {
    getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} })
  },
  Session: { getScriptTimeZone: () => 'Asia/Kolkata' },
  Utilities: { formatDate: () => '2026-11-21 14:00' },
  ScriptApp: { getService: () => ({ getUrl: () => 'https://script.google.com/macros/s/exec' }) },
  console: console
};

const codeSource = fs.readFileSync('Code.gs', 'utf8');
vm.createContext(backendContext);
vm.runInContext(codeSource, backendContext);

// Step 1: Initialize Sheets
console.log('Step 1: Setting up RK Sales sheets...');
backendContext.setupRKSalesSheets();
const lookup = ss.getSheetByName('Lookup');
assert.ok(lookup, 'Lookup sheet initialized');
console.log('✓ Sheets initialized.');

// Step 2: Test Login as Regular Sales Person (TK)
console.log('Step 2: Authenticating Trupti Kodag (TK)...');
const tkAuth = backendContext.loginUser('TK', '1111');
assert.strictEqual(tkAuth.ok, true);
assert.strictEqual(tkAuth.user.role, 'SALES');
assert.strictEqual(tkAuth.user.code, 'TK');
console.log('✓ Authenticated as TK (Role: SALES).');

// Step 3: TK submits an order for TK -> Allowed
console.log('Step 3: TK submits sales order for TK...');
const order1 = backendContext.saveEntry({
  authCode: tkAuth.user.code,
  authPin: '1111',
  monthYear: 'NOV-2026',
  salesPerson: 'TK',
  partyName: 'Sunrise Lasers Pvt Ltd',
  region: 'Pune',
  poNo: 'PO-SUN-1001',
  poDate: '2026-11-21',
  productKeyword: 'LS',
  productName: 'Leadshine Drive',
  poValue: 50000,
  productValue: 48000,
  freightCharges: 2000,
  commissionType: 'P',
  commissionPct: 5,
  commissionFixed: 0,
  paymentTerms: 'PI',
  paymentStatus: '',
  wbBilling: 'B'
});
assert.strictEqual(order1.ok, true);
assert.strictEqual(order1.srNo, 1);
console.log('✓ Order #1 saved successfully for TK.');

// Step 4: TK attempts to submit an order assigning it to SC -> MUST FAIL
console.log('Step 4: Verifying regular rep cannot assign order to another rep...');
let blockedNonAdmin = false;
try {
  backendContext.saveEntry({
    authCode: tkAuth.user.code,
    authPin: '1111',
    monthYear: 'NOV-2026',
    salesPerson: 'SC', // Trying to set Swapnil Chikhale
    partyName: 'Illegitimate Order',
    region: 'Pune',
    poNo: 'PO-FAIL-1',
    poDate: '2026-11-21',
    productKeyword: 'LS',
    productValue: 10000,
    freightCharges: 0,
    poValue: 10000,
    commissionType: 'P',
    commissionPct: 5,
    wbBilling: 'B'
  });
} catch (err) {
  blockedNonAdmin = true;
  assert.ok(err.message.includes('Only Admin can assign entries to other sales persons'));
}
assert.strictEqual(blockedNonAdmin, true, 'Regular sales person was blocked from assigning to another rep');
console.log('✓ Non-admin rep properly blocked from assigning other salespersons.');

// Step 5: Test Login as Admin (Rahul Kodag - RK)
console.log('Step 5: Authenticating Rahul Kodag (RK) as Admin...');
const rkAuth = backendContext.loginUser('RK', '1234');
assert.strictEqual(rkAuth.ok, true);
assert.strictEqual(rkAuth.user.role, 'ADMIN');
assert.strictEqual(rkAuth.user.code, 'RK');
console.log('✓ Authenticated as RK (Role: ADMIN).');

// Step 6: Admin creates an order and assigns to Swapnil Chikhale (SC) -> MUST SUCCEED
console.log('Step 6: Admin sets salesperson to SC while adding data...');
const order2 = backendContext.saveEntry({
  authCode: rkAuth.user.code,
  authPin: '1234',
  monthYear: 'NOV-2026',
  salesPerson: 'SC', // Admin assigns to SC!
  partyName: 'Precision CNC Works',
  region: 'Aurangabad',
  poNo: 'PO-PCW-2002',
  poDate: '2026-11-21',
  productKeyword: 'RP',
  productName: 'Apex Dynamics Rack',
  poValue: 85000,
  productValue: 80000,
  freightCharges: 5000,
  commissionType: 'P',
  commissionPct: 2.5,
  commissionFixed: 500,
  paymentTerms: 'CR',
  paymentStatus: 'RCD',
  wbBilling: 'B'
});
assert.strictEqual(order2.ok, true);
assert.strictEqual(order2.srNo, 2);
console.log('✓ Admin successfully created entry #' + order2.srNo + ' assigned to SC!');

// Step 7: Admin edits Order #1 (owned by TK) and reassigns to RK
console.log('Step 7: Admin edits Order #1 and reassigns sales person...');
const editRes = backendContext.saveEntry({
  authCode: rkAuth.user.code,
  authPin: '1234',
  responseId: order1.responseId,
  monthYear: 'NOV-2026',
  salesPerson: 'RK', // Reassigned to RK!
  partyName: 'Sunrise Lasers Pvt Ltd (Updated)',
  region: 'Pune',
  poNo: 'PO-SUN-1001',
  poDate: '2026-11-21',
  productKeyword: 'LS',
  productName: 'Leadshine Drive',
  poValue: 52000,
  productValue: 50000,
  freightCharges: 2000,
  commissionType: 'P',
  commissionPct: 5,
  commissionFixed: 0,
  paymentTerms: 'PI',
  paymentStatus: 'RCD',
  wbBilling: 'B'
});
assert.strictEqual(editRes.ok, true);
assert.strictEqual(editRes.isEdit, true);
console.log('✓ Admin successfully edited and reassigned sales person.');

// Step 8: Regular rep (TK) attempts to edit Order #2 (owned by SC) -> MUST FAIL
console.log('Step 8: Verifying regular rep cannot edit another rep entry...');
let editBlocked = false;
try {
  backendContext.saveEntry({
    authCode: tkAuth.user.code,
    authPin: '1111',
    responseId: order2.responseId,
    monthYear: 'NOV-2026',
    salesPerson: 'TK',
    partyName: 'Hacked precision',
    region: 'Aurangabad',
    poNo: 'PO-PCW-2002',
    poDate: '2026-11-21',
    productKeyword: 'RP',
    productValue: 80000,
    freightCharges: 0,
    poValue: 80000,
    commissionType: 'P',
    commissionPct: 2.5,
    wbBilling: 'B'
  });
} catch (err) {
  editBlocked = true;
  assert.ok(err.message.includes('Regular sales persons can only edit their own entries'));
}
assert.strictEqual(editBlocked, true);
console.log('✓ Regular rep properly blocked from editing another rep entry.');

// Step 9: Verify Dashboard reflects correct totals and rep assignment
console.log('Step 9: Verifying Dashboard data...');
const dash = backendContext.getDashboardData();
assert.strictEqual(dash.totalCount, 2);
assert.strictEqual(dash.salesPersons.length, 5);
// Ensure public lookup doesn't expose PINs
dash.salesPersons.forEach(sp => {
  assert.strictEqual(sp.pin, undefined, 'Public salesPersons list must never expose PINs');
  assert.ok(sp.role === 'ADMIN' || sp.role === 'SALES');
});
console.log('✓ Dashboard data and security verified.');

console.log('\n======================================================');
console.log('ALL END-TO-END WORKFLOW SIMULATIONS PASSED 100%!');
console.log('======================================================');
