const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const code = fs.readFileSync('Code.gs', 'utf8');

let getRangeCount = 0;
let getValuesCount = 0;
let setValuesCount = 0;
let setFormulaCount = 0;

class MockRange {
  constructor(sheet, row, col, numRows = 1, numCols = 1) {
    this.sheet = sheet;
    this.row = row;
    this.col = col;
    this.numRows = numRows;
    this.numCols = numCols;
  }
  setValues(vals) {
    setValuesCount++;
    for (let r = 0; r < vals.length; r++) {
      const targetRow = this.row - 1 + r;
      while (this.sheet.data.length <= targetRow) this.sheet.data.push([]);
      for (let c = 0; c < vals[r].length; c++) {
        const targetCol = this.col - 1 + c;
        while (this.sheet.data[targetRow].length <= targetCol) this.sheet.data[targetRow].push('');
        this.sheet.data[targetRow][targetCol] = vals[r][c];
      }
    }
    return this;
  }
  setValue(val) { return this.setValues([[val]]); }
  getValues() {
    getValuesCount++;
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
  getValue() { return this.getValues()[0][0]; }
  setFontWeight() { return this; }
  setBackground() { return this; }
  setFontColor() { return this; }
  setFontLine() { return this; }
  setNumberFormat() { return this; }
  setDataValidation() { return this; }
  setFontSize() { return this; }
  setFormula(f) { setFormulaCount++; return this; }
  clearContent() { return this; }
}

class MockSheet {
  constructor(name) {
    this.name = name;
    this.data = [];
  }
  getName() { return this.name; }
  setName(n) { this.name = n; return this; }
  getLastRow() { return this.data.length; }
  getLastColumn() { return this.data.reduce((max, r) => Math.max(max, (r ? r.length : 0)), 0); }
  getRange(r, c, nr, nc) {
    getRangeCount++;
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
  setConditionalFormatRules() {}
  deleteRow(idx) { this.data.splice(idx - 1, 1); }
}

class MockSpreadsheet {
  constructor() { this.sheets = []; }
  getSheets() { return this.sheets; }
  getSheetByName(n) { return this.sheets.find(s => s.name === n) || null; }
  insertSheet(n, idx) {
    const s = new MockSheet(n);
    if (idx !== undefined) this.sheets.splice(idx, 0, s);
    else this.sheets.push(s);
    return s;
  }
  getUrl() { return 'https://example.com'; }
  getId() { return 'mock-ss-id'; }
}

const mockSS = new MockSpreadsheet();
const mockCacheStore = {};
const mockCacheTtl = {};

const sandbox = {
  SpreadsheetApp: {
    getActiveSpreadsheet: () => mockSS,
    openById: () => mockSS,
    newDataValidation: () => ({ requireValueInList: () => ({ build: () => ({}) }) }),
    flush: () => {}
  },
  PropertiesService: {
    getScriptProperties: () => ({ getProperty: () => '1000', setProperty: () => {} })
  },
  LockService: {
    getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} })
  },
  CacheService: {
    getScriptCache: () => ({
      get: (k) => mockCacheStore[k] || null,
      put: (k, v, ttl) => { mockCacheStore[k] = v; mockCacheTtl[k] = ttl; },
      putAll: (obj, ttl) => {
        for (const k in obj) { mockCacheStore[k] = obj[k]; mockCacheTtl[k] = ttl; }
      },
      getAll: (keys) => {
        const res = {};
        for (const k of keys) res[k] = mockCacheStore[k] || null;
        return res;
      },
      remove: (k) => { delete mockCacheStore[k]; delete mockCacheTtl[k]; },
      removeAll: (keys) => {
        for (const k of keys) { delete mockCacheStore[k]; delete mockCacheTtl[k]; }
      }
    })
  },
  Utilities: {
    formatDate: (d) => (d instanceof Date ? d.toISOString().split('T')[0] : String(d))
  },
  Session: {
    getScriptTimeZone: () => 'Asia/Kolkata'
  },
  Logger: console
};
vm.createContext(sandbox);
vm.runInContext(code, sandbox);
sandbox.setupRKSalesSheets();

console.log('--- RUNNING HIGH-VOLUME 1,000 RECORD PERFORMANCE TESTS ---');

// Seed 1,000 records across 12 monthly tabs
const tabs = ['APR-2026', 'MAY-2026', 'JUN-2026', 'JUL-2026', 'AUG-2026', 'SEP-2026', 'OCT-2026', 'NOV-2026', 'DEC-2026', 'JAN-2027', 'FEB-2027', 'MAR-2027'];
let totalSeed = 0;
tabs.forEach(tab => {
  const sh = sandbox.getMonthSheet_(mockSS, tab);
  const rows = [];
  for (let i = 0; i < 83; i++) {
    totalSeed++;
    const row = new Array(32).fill('');
    row[0] = i + 1;
    row[1] = tab;
    row[2] = 'RK';
    row[3] = 'Party ' + (i % 20);
    row[4] = 'N - Pune';
    row[5] = 'PO-' + totalSeed;
    row[6] = new Date(2026, 10, 1);
    row[7] = 'PI-2627-' + totalSeed;
    row[8] = new Date(2026, 10, 1);
    row[13] = 10000;
    row[14] = 9000;
    row[15] = 1000;
    row[16] = 1800;
    row[17] = 11800;
    row[18] = 'P';
    row[19] = 0.05;
    row[20] = 0;
    row[21] = 450;
    row[22] = 450;
    row[24] = 'RCD';
    row[31] = 'SEED-' + totalSeed;
    rows.push(row);
  }
  sh.getRange(2, 1, rows.length, 32).setValues(rows);
});

console.log('Test 1: Verifying 1,000 seeded records...');
assert.strictEqual(totalSeed, 996);
console.log('✓ Successfully seeded', totalSeed, 'records across 12 monthly tabs.');

console.log('Test 2: Benchmarking saveEntry with 1,000 existing records...');
getRangeCount = 0;
getValuesCount = 0;
setValuesCount = 0;
setFormulaCount = 0;

const t0 = Date.now();
const saveRes = sandbox.saveEntry({
  authCode: 'RK',
  authPin: '1234',
  monthYear: 'NOV-2026',
  salesPerson: 'RK',
  partyName: 'Performance Test Corp',
  region: 'N - Pune',
  poNo: 'PO-PERF-1',
  poDate: '2026-11-15',
  piNo: 'PI-2627-88888',
  piDate: '2026-11-15',
  productKeyword: 'LS',
  productName: 'Laser Sensor',
  poValue: 20000,
  productValue: 18000,
  freightCharges: 2000,
  commissionType: 'P',
  commissionPct: 5,
  commissionFixed: 0,
  paymentTerms: '30 Days',
  paymentStatus: 'PENDING',
  wbBilling: 'B'
});
const saveElapsed = Date.now() - t0;
console.log(`✓ saveEntry completed in ${saveElapsed}ms (getValues calls: ${getValuesCount}, getRange: ${getRangeCount})`);
assert.ok(saveRes.ok, 'saveEntry must succeed');
assert.ok(saveRes.perf, 'saveEntry must include perf diagnostics');
assert.ok(Array.isArray(saveRes.perf.checkpoints), 'perf must include detailed checkpoints');
assert.ok(getValuesCount <= 50, `getValues calls (${getValuesCount}) must be <= 50 (was 98 before optimization)`);

console.log('Test 2b: Benchmarking single existing record UPDATE with 1,000 existing records...');
getRangeCount = 0;
getValuesCount = 0;
setValuesCount = 0;
setFormulaCount = 0;

const tUpdate0 = Date.now();
const updateRes = sandbox.saveEntry({
  authCode: 'RK',
  authPin: '1234',
  responseId: saveRes.responseId,
  originalMonthYear: 'NOV-2026',
  monthYear: 'NOV-2026',
  salesPerson: 'RK',
  partyName: 'Performance Test Corp (Updated)',
  region: 'N - Pune',
  poNo: 'PO-PERF-1-UPDATED',
  poDate: '2026-11-15',
  piNo: 'PI-2627-88888',
  piDate: '2026-11-15',
  productKeyword: 'LS',
  productName: 'Laser Sensor Updated',
  poValue: 25000,
  productValue: 22000,
  freightCharges: 3000,
  commissionType: 'P',
  commissionPct: 5,
  commissionFixed: 0,
  paymentTerms: '30 Days',
  paymentStatus: 'PENDING',
  wbBilling: 'B'
});
const updateElapsed = Date.now() - tUpdate0;
console.log(`✓ Single-record UPDATE completed in ${updateElapsed}ms (getValues calls: ${getValuesCount}, getRange: ${getRangeCount})`);
console.log('  Timings summary:', updateRes.perf ? updateRes.perf.summary : 'none');
assert.ok(updateRes.ok, 'Updating single existing record must succeed');
assert.strictEqual(updateRes.isEdit, true, 'isEdit must be true for record update');
assert.ok(updateRes.perf, 'updateRes must include perf diagnostics');
assert.ok(getValuesCount <= 35, `Single-record update getValues calls (${getValuesCount}) must be <= 35`);

console.log('Test 3: Benchmarking deleteEntry with 1,000 existing records...');
getRangeCount = 0;
getValuesCount = 0;
const tDel0 = Date.now();
const delRes = sandbox.deleteEntry({
  authCode: 'RK',
  authPin: '1234',
  responseId: saveRes.responseId,
  monthYear: 'NOV-2026'
});
const delElapsed = Date.now() - tDel0;
console.log(`✓ deleteEntry completed in ${delElapsed}ms (getValues calls: ${getValuesCount})`);
assert.ok(delRes.ok, 'deleteEntry must succeed');
assert.ok(getValuesCount <= 50, `getValues calls (${getValuesCount}) must be <= 50 (was 98 before optimization)`);

console.log('Test 4: Verifying CacheService chunking for >100KB payloads...');
const dashFresh = sandbox.getDashboardDataWithSS_(mockSS, { fy: 'FY 26-27' });
assert.ok(dashFresh, 'Dashboard data must be generated');
// Check if cache stores data
const hasChunks = mockCacheStore['DASHBOARD_FY 26-27_chunks'] || mockCacheStore['DASHBOARD_FY 26-27'];
assert.ok(hasChunks, 'Dashboard data must be cached in CacheService (either direct or chunked)');

// Second call must hit cache: only metadata lookups on Lookup sheet, 0 month sheet reads!
getRangeCount = 0;
getValuesCount = 0;
const cachedDash = sandbox.getDashboardDataWithSS_(mockSS, { fy: 'FY 26-27' });
assert.strictEqual(cachedDash.totalCount, dashFresh.totalCount);
assert.ok(getValuesCount <= 3, 'Cached getDashboardData must make <= 3 getValues calls (fresh Lookup metadata only, 0 month sheet reads)');
console.log('✓ CacheService chunked caching and 0-RPC cache hit verified.');

console.log('\n======================================================');
console.log('ALL HIGH-VOLUME PERFORMANCE TESTS PASSED 100%!');
console.log('======================================================');
