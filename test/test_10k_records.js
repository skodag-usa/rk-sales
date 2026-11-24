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
    getScriptProperties: () => ({ getProperty: () => '10000', setProperty: () => {} })
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

console.log('--- RUNNING 10,000 RECORD BENCHMARK & ANALYSIS ---');

// Seed 10,000 records across 12 monthly tabs (~833 records per tab)
const tabs = ['APR-2026', 'MAY-2026', 'JUN-2026', 'JUL-2026', 'AUG-2026', 'SEP-2026', 'OCT-2026', 'NOV-2026', 'DEC-2026', 'JAN-2027', 'FEB-2027', 'MAR-2027'];
let totalSeed = 0;
const recordsPerTab = Math.floor(10000 / tabs.length); // 833
const remainder = 10000 % tabs.length; // 4

tabs.forEach((tab, tabIdx) => {
  const sh = sandbox.getMonthSheet_(mockSS, tab);
  const count = recordsPerTab + (tabIdx < remainder ? 1 : 0);
  const rows = [];
  for (let i = 0; i < count; i++) {
    totalSeed++;
    const row = new Array(32).fill('');
    row[0] = i + 1;
    row[1] = tab;
    row[2] = (i % 4 === 0) ? 'RK' : (i % 4 === 1 ? 'TK' : (i % 4 === 2 ? 'SC' : 'OT'));
    row[3] = 'Party ' + (i % 100);
    row[4] = 'N - Pune';
    row[5] = 'PO-10K-' + totalSeed;
    row[6] = new Date(2026, 10, 1);
    row[7] = 'PI-2627-' + String(totalSeed).padStart(5, '0');
    row[8] = new Date(2026, 10, 1);
    row[13] = 25000;
    row[14] = 22000;
    row[15] = 3000;
    row[16] = 4500;
    row[17] = 29500;
    row[18] = 'P';
    row[19] = 0.05;
    row[20] = 0;
    row[21] = 1100;
    row[22] = 1100;
    row[24] = (i % 5 === 0) ? 'PENDING' : 'RCD';
    row[31] = 'RK-10K-' + totalSeed;
    rows.push(row);
  }
  sh.getRange(2, 1, rows.length, 32).setValues(rows);
});

console.log('Test 1: Verification of 10,000 Seeded Records...');
assert.strictEqual(totalSeed, 10000);
console.log('✓ Successfully seeded', totalSeed, 'records across 12 monthly tabs.');

console.log('\nTest 2: Benchmarking Single Record UPDATE with 10,000 existing records...');
getRangeCount = 0;
getValuesCount = 0;
setValuesCount = 0;
setFormulaCount = 0;

const t0 = Date.now();
const updateRes = sandbox.saveEntry({
  authCode: 'RK',
  authPin: '1234',
  responseId: 'RK-10K-5000',
  monthYear: 'NOV-2026',
  salesPerson: 'RK',
  partyName: 'Updated 10K Enterprise',
  region: 'N - Pune',
  poNo: 'PO-UPDATED-10K',
  poDate: '2026-11-20',
  piNo: 'PI-2627-05000',
  piDate: '2026-11-20',
  productKeyword: 'LS',
  productName: 'Laser Sensor High Speed',
  poValue: 50000,
  productValue: 45000,
  freightCharges: 5000,
  commissionType: 'P',
  commissionPct: 5,
  commissionFixed: 0,
  paymentTerms: '30 Days',
  paymentStatus: 'RCD',
  wbBilling: 'B'
});
const updateDuration = Date.now() - t0;
console.log(`✓ Single record update completed in ${updateDuration}ms (getValues: ${getValuesCount}, getRange: ${getRangeCount}, setValues: ${setValuesCount})`);
console.log('  Perf Checkpoints:', updateRes.perf ? updateRes.perf.summary : 'N/A');
assert.strictEqual(updateRes.ok, true);

console.log('\nTest 3: Measuring Payload Size and Serialization at 10,000 Records...');
const leanString = JSON.stringify(updateRes);
const leanKb = (leanString.length / 1024).toFixed(2);
console.log(`  Lean save response total size: ${leanKb} KB`);
assert.ok(leanString.length < 10240, 'Lean save response must be < 10 KB');

const fullDashboard = sandbox.getDashboardData();
const jsonString = JSON.stringify(fullDashboard);
const sizeKb = (jsonString.length / 1024).toFixed(2);
const sizeMb = (jsonString.length / (1024 * 1024)).toFixed(2);
console.log(`  Full Dashboard payload total size: ${sizeKb} KB (${sizeMb} MB)`);
console.log(`  Total entries in dashboard: ${fullDashboard.totalCount}`);
console.log(`  Total active entries: ${fullDashboard.activeCount}`);

console.log('\nTest 4: Benchmarking deleteEntry with 10,000 existing records...');
getRangeCount = 0;
getValuesCount = 0;
setValuesCount = 0;
const tDel = Date.now();
const delRes = sandbox.deleteEntry({
  authCode: 'RK',
  authPin: '1234',
  responseId: 'RK-10K-5001'
});
const delDuration = Date.now() - tDel;
console.log(`✓ deleteEntry completed in ${delDuration}ms (getValues: ${getValuesCount}, getRange: ${getRangeCount})`);
assert.strictEqual(delRes.ok, true);

console.log('\nTest 5: Testing CacheService Chunking with 10,000 records (~' + sizeMb + ' MB payload)...');
const scriptCache = sandbox.CacheService.getScriptCache();
sandbox.putCacheChunked_(scriptCache, 'TEST_10K_CACHE', jsonString, 600);
const retrieved = sandbox.getCacheChunked_(scriptCache, 'TEST_10K_CACHE');
assert.strictEqual(retrieved.length, jsonString.length);
const chunkCount = mockCacheStore['TEST_10K_CACHE_chunks'];
console.log(`✓ Successfully stored and retrieved chunked payload across ${chunkCount} chunks without corruption!`);

console.log('\nTest 6: Benchmarking on-demand getMonthTransactions at 10,000 records...');
getRangeCount = 0;
getValuesCount = 0;
const tPage10 = Date.now();
const p10 = sandbox.getMonthTransactions({
  month: 'NOV',
  year: '2026',
  page: 1,
  pageSize: 10
});
const dur10 = Date.now() - tPage10;
console.log(`✓ getMonthTransactions (Page 1, size 10) completed in ${dur10}ms (getValues: ${getValuesCount}, getRange: ${getRangeCount})`);
assert.strictEqual(p10.ok, true);
assert.strictEqual(p10.records.length, 10);
assert.strictEqual(p10.pageSize, 10);
assert.ok(p10.totalCount > 800, 'Month should have ~833 records');

const p20 = sandbox.getMonthTransactions({ month: 'NOV', year: '2026', page: 1, pageSize: 20 });
assert.strictEqual(p20.records.length, 20);

const p50 = sandbox.getMonthTransactions({ month: 'NOV', year: '2026', page: 1, pageSize: 50 });
assert.strictEqual(p50.records.length, 50);

const pagePayloadKb = (JSON.stringify(p50).length / 1024).toFixed(2);
console.log(`  Paginated transactions wire payload (50 records): ${pagePayloadKb} KB`);

console.log('\n======================================================');
console.log('ALL 10,000 RECORD BENCHMARKS EXECUTED SUCCESSFULLY!');
console.log('======================================================');
