// Comprehensive tests for Email Reporting Subsystem in Code.gs
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

console.log('--- RUNNING EMAIL REPORTING TESTS ---');

// ======== Mock Infrastructure ========
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
  setFormula(f) {
    const tr = this.row - 1;
    while (this.sheet.data.length <= tr) this.sheet.data.push([]);
    const tc = this.col - 1;
    while (this.sheet.data[tr].length <= tc) this.sheet.data[tr].push('');
    this.sheet.data[tr][tc] = f;
    return this;
  }
  getFormulas() {
    const res = [];
    for (let r = 0; r < this.numRows; r++) {
      const rowArr = [];
      const tr = this.row - 1 + r;
      const rowData = (tr < this.sheet.data.length) ? this.sheet.data[tr] : [];
      for (let c = 0; c < this.numCols; c++) {
        const tc = this.col - 1 + c;
        const cell = tc < rowData.length ? rowData[tc] : '';
        rowArr.push(typeof cell === 'string' && cell.startsWith('=') ? cell : '');
      }
      res.push(rowArr);
    }
    return res;
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
  getSheetId() { return this.sheetId !== undefined ? this.sheetId : 12345; }
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
  getUrl() { return 'https://docs.google.com/spreadsheets/d/test-email/edit'; }
  getId() { return 'test-email-id'; }
}

// Track MailApp calls
const mailLog = [];
const triggerLog = [];
const existingTriggers = [];

function createSandbox(ss) {
  mailLog.length = 0;
  triggerLog.length = 0;
  existingTriggers.length = 0;

  return {
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ss,
      openById: () => ss,
      newDataValidation: () => ({
        requireValueInList: () => ({ build: () => ({}) })
      }),
      flush: () => {},
      getUi: () => ({
        createMenu: () => ({
          addItem: function() { return this; },
          addSeparator: function() { return this; },
          addToUi: () => {}
        }),
        alert: () => {},
        ButtonSet: { OK: 'OK' }
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
    Session: { getScriptTimeZone: () => 'Asia/Kolkata' },
    Utilities: {
      formatDate: () => '21-Nov-2026 10:00',
      newBlob: (data, type, name) => ({
        getDataAsString: () => data,
        getContentType: () => type,
        getName: () => name
      })
    },
    ScriptApp: {
      getService: () => ({
        getUrl: () => 'https://script.google.com/macros/s/mock/exec'
      }),
      newTrigger: (fnName) => {
        const triggerObj = {
          fnName,
          _timeBased: false,
          _monthDay: null,
          _hour: null,
          timeBased: function() { this._timeBased = true; return this; },
          onMonthDay: function(d) { this._monthDay = d; return this; },
          atHour: function(h) { this._hour = h; return this; },
          create: function() {
            triggerLog.push({ fnName: this.fnName, monthDay: this._monthDay, hour: this._hour });
            existingTriggers.push({
              getHandlerFunction: () => this.fnName,
              _id: 'trigger-' + triggerLog.length
            });
          }
        };
        return triggerObj;
      },
      getProjectTriggers: () => existingTriggers.slice(),
      deleteTrigger: (t) => {
        const idx = existingTriggers.findIndex(x => x === t);
        if (idx >= 0) existingTriggers.splice(idx, 1);
      }
    },
    MailApp: {
      sendEmail: (opts) => {
        mailLog.push(opts);
      }
    },
    HtmlService: {
      createTemplateFromFile: () => ({
        editId: '',
        evaluate: () => ({
          setTitle: function() { return this; },
          addMetaTag: function() { return this; },
          setXFrameOptionsMode: function() { return this; }
        })
      }),
      XFrameOptionsMode: { ALLOWALL: 'ALLOWALL' }
    },
    console: console
  };
}

// ======== Set up test spreadsheet with sample data ========
function buildTestSS() {
  const ss = new MockSpreadsheet();

  // Create Lookup sheet with 6 columns
  const lookup = ss.insertSheet('Lookup');
  lookup.getRange(1, 1, 1, 6).setValues([['Code', 'Full Name', 'Active', 'PIN', 'Role', 'Email']]);
  lookup.getRange(2, 1, 5, 6).setValues([
    ['RK', 'Rahul Kodag', 'YES', '1234', 'ADMIN', 'rahul@example.com'],
    ['TK', 'Trupti Kodag', 'YES', '1111', 'SALES', ''],
    ['SC', 'Swapnil Chikhale', 'YES', '2222', 'SALES', ''],
    ['OT', 'Other', 'YES', '3333', 'SALES', ''],
    ['ADMIN', 'Administrator', 'YES', '9999', 'ADMIN', 'admin@example.com']
  ]);

  // Create All Entries sheet with HEADERS and sample data
  const allEntries = ss.insertSheet('All Entries');
  const HEADERS = [
    'Sr. No.', 'MONTH', 'Sales Person', 'Party Name', 'Region',
    'Po No.', 'Po Date', 'PI No.', 'PI Date', 'Invoice No.', 'Invoice Date',
    'Product Keyword', 'Product Name', 'PO Value', 'Product Value', 'Freight Charges',
    'GST Value', 'Total Value', 'Commission Type', 'Commission %', 'Commission Fixed',
    'Commission Value %', 'Total Commission', 'Payment Terms', 'Paymet Status',
    'WB/Billing', 'Remark', 'Accounts Remark', 'Edit Link', 'Timestamp', 'Response ID'
  ];
  allEntries.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);

  // Sample entries: mix of months, reps, products, payment statuses
  const entries = [
    // NOV-2026 entries
    [1, 'NOV-2026', 'RK', 'ABC Corp', 'Pune', 'PO-1', '', '', '', '', '', 'LS', 'Leadshine', 50000, 48000, 2000, 9000, 59000, 'P', 0.05, 0, 2400, 2400, 'PI', '', 'B', '', '', '', '', 'RK-001'],
    [2, 'NOV-2026', 'TK', 'XYZ Ltd', 'Aurangabad', 'PO-2', '', '', '', '', '', 'BC', 'Bochu', 30000, 28000, 1000, 5220, 34220, 'P', 0.05, 0, 1400, 1400, 'CR', 'RCD', 'B', '', '', '', '', 'RK-002'],
    [3, 'NOV-2026', 'SC', 'PQR Inc', 'Nagpur', 'PO-3', '', '', '', '', '', 'RP', 'Rack', 60000, 55000, 3000, 10440, 68440, 'P', 0.025, 500, 1375, 1875, 'PI', '', 'B', '', '', '', '', 'RK-003'],
    // OCT-2026 entries (same quarter Q3)
    [4, 'OCT-2026', 'RK', 'ABC Corp', 'Pune', 'PO-4', '', '', '', '', '', 'LS', 'Leadshine', 40000, 38000, 1500, 7110, 46610, 'P', 0.05, 0, 1900, 1900, 'PI', 'RCD', 'B', '', '', '', '', 'RK-004'],
    [5, 'OCT-2026', 'TK', 'MNO Corp', 'Pune', 'PO-5', '', '', '', '', '', 'GB', 'Gearbox', 25000, 22000, 1000, 4140, 27140, 'P', 0.05, 0, 1100, 1100, 'CR', '', 'B', '', '', '', '', 'RK-005'],
    // SEP-2026 entries (Q2)
    [6, 'SEP-2026', 'RK', 'DEF Corp', 'Pune', 'PO-6', '', '', '', '', '', 'LS', 'Leadshine', 70000, 65000, 4000, 12420, 81420, 'P', 0.05, 0, 3250, 3250, 'PI', '', 'B', '', '', '', '', 'RK-006'],
    // APR-2026 entry (Q1 - FY start)
    [7, 'APR-2026', 'TK', 'GHI Ltd', 'Nashik', 'PO-7', '', '', '', '', '', 'DC', 'Chuck', 15000, 13000, 500, 2430, 15930, 'P', 0.05, 0, 650, 650, 'PI', 'RCD', 'B', '', '', '', '', 'RK-007'],
    // JAN-2027 entry (Q4 of FY 26-27)
    [8, 'JAN-2027', 'SC', 'JKL Inc', 'Kolhapur', 'PO-8', '', '', '', '', '', 'SN', 'Ball Screw', 90000, 85000, 5000, 16200, 106200, 'P', 0.025, 1000, 2125, 3125, 'PDC', '', 'WB', '', '', '', '', 'RK-008'],
  ];

  for (const entry of entries) {
    const rowIdx = allEntries.getLastRow() + 1;
    allEntries.getRange(rowIdx, 1, 1, entry.length).setValues([entry]);
  }

  return ss;
}

// Load Code.gs
const codeSource = fs.readFileSync('Code.gs', 'utf8');

// ======== TEST 1: getAdminEmails_ ========
console.log('Test 1: getAdminEmails_ returns only active admins with valid emails...');
{
  const ss = buildTestSS();
  const sandbox = createSandbox(ss);
  vm.createContext(sandbox);
  vm.runInContext(codeSource, sandbox);

  const emails = sandbox.getAdminEmails_(ss);
  assert.ok(Array.isArray(emails), 'Should return an array');
  assert.strictEqual(emails.length, 2, 'Should have 2 admin emails (RK and ADMIN)');
  assert.ok(emails.includes('rahul@example.com'), 'Should include RK email');
  assert.ok(emails.includes('admin@example.com'), 'Should include ADMIN email');
  // TK and SC have no email or are SALES, should not appear
  assert.ok(!emails.includes(''), 'Should not include empty emails');
  console.log('✓ getAdminEmails_ passed.');
}

// ======== TEST 2: getQuarterFromMonth_ ========
console.log('Test 2: getQuarterFromMonth_ mapping...');
{
  const ss = buildTestSS();
  const sandbox = createSandbox(ss);
  vm.createContext(sandbox);
  vm.runInContext(codeSource, sandbox);

  assert.strictEqual(sandbox.getQuarterFromMonth_('APR'), 'Q1');
  assert.strictEqual(sandbox.getQuarterFromMonth_('JUN'), 'Q1');
  assert.strictEqual(sandbox.getQuarterFromMonth_('JUL'), 'Q2');
  assert.strictEqual(sandbox.getQuarterFromMonth_('SEP'), 'Q2');
  assert.strictEqual(sandbox.getQuarterFromMonth_('OCT'), 'Q3');
  assert.strictEqual(sandbox.getQuarterFromMonth_('DEC'), 'Q3');
  assert.strictEqual(sandbox.getQuarterFromMonth_('JAN'), 'Q4');
  assert.strictEqual(sandbox.getQuarterFromMonth_('MAR'), 'Q4');
  console.log('✓ getQuarterFromMonth_ passed.');
}

// ======== TEST 3: getFYFromMonthYear_ ========
console.log('Test 3: getFYFromMonthYear_ computation...');
{
  const ss = buildTestSS();
  const sandbox = createSandbox(ss);
  vm.createContext(sandbox);
  vm.runInContext(codeSource, sandbox);

  assert.strictEqual(sandbox.getFYFromMonthYear_('APR', 2026), 'FY 26-27');
  assert.strictEqual(sandbox.getFYFromMonthYear_('NOV', 2026), 'FY 26-27');
  assert.strictEqual(sandbox.getFYFromMonthYear_('DEC', 2026), 'FY 26-27');
  assert.strictEqual(sandbox.getFYFromMonthYear_('JAN', 2027), 'FY 26-27');
  assert.strictEqual(sandbox.getFYFromMonthYear_('MAR', 2027), 'FY 26-27');
  assert.strictEqual(sandbox.getFYFromMonthYear_('APR', 2027), 'FY 27-28');
  console.log('✓ getFYFromMonthYear_ passed.');
}

// ======== TEST 4: generateReportData_ with MONTH filter ========
console.log('Test 4: generateReportData_ — MONTH filter (NOV-2026)...');
{
  const ss = buildTestSS();
  const sandbox = createSandbox(ss);
  vm.createContext(sandbox);
  vm.runInContext(codeSource, sandbox);

  const report = sandbox.generateReportData_(ss, {
    periodType: 'MONTH',
    monthYear: 'NOV-2026'
  });

  assert.strictEqual(report.periodType, 'MONTH');
  assert.strictEqual(report.monthYear, 'NOV-2026');
  assert.strictEqual(report.quarter, 'Q3');
  assert.strictEqual(report.fy, 'FY 26-27');

  // 3 entries in NOV-2026
  assert.strictEqual(report.metrics.orderCount, 3, 'NOV-2026 should have 3 orders');
  assert.ok(report.metrics.totalSales > 0, 'Total sales should be positive');

  // 1 entry is RCD (TK's), 2 pending
  assert.strictEqual(report.metrics.pendingCount, 2, 'Should have 2 pending orders');

  // QTD (Q3 = OCT, NOV, DEC of FY 26-27) should include OCT + NOV entries = 5
  assert.ok(report.qtdMetrics, 'QTD metrics should exist for MONTH filter');
  assert.strictEqual(report.qtdMetrics.orderCount, 5, 'Q3 QTD should have 5 orders (3 NOV + 2 OCT)');

  // FYTD (full FY 26-27 so far) should include all 8 entries
  assert.ok(report.fytdMetrics, 'FYTD metrics should exist');
  assert.strictEqual(report.fytdMetrics.orderCount, 8, 'FYTD should have all 8 entries');

  // Rep breakdown: 3 entries split across RK, TK, SC
  assert.ok(report.repBreakdown.length > 0, 'Should have rep breakdown');
  const rkRep = report.repBreakdown.find(r => r.code === 'RK');
  assert.ok(rkRep, 'RK should appear in rep breakdown');
  assert.strictEqual(rkRep.orders, 1, 'RK should have 1 order in NOV');

  // Top parties: should have 3 (ABC Corp, XYZ Ltd, PQR Inc)
  assert.ok(report.topParties.length <= 5, 'Top parties limited to 5');
  assert.ok(report.topParties.length >= 3, 'Should have 3 parties');

  // Product breakdown: LS, BC, RP
  assert.ok(report.prodBreakdown.length >= 3, 'Should have 3 product keywords');

  console.log('✓ generateReportData_ MONTH filter passed.');
}

// ======== TEST 5: generateReportData_ with QUARTER filter ========
console.log('Test 5: generateReportData_ — QUARTER filter (Q3, FY 26-27)...');
{
  const ss = buildTestSS();
  const sandbox = createSandbox(ss);
  vm.createContext(sandbox);
  vm.runInContext(codeSource, sandbox);

  const report = sandbox.generateReportData_(ss, {
    periodType: 'QUARTER',
    quarter: 'Q3',
    fy: 'FY 26-27'
  });

  assert.strictEqual(report.periodType, 'QUARTER');
  assert.strictEqual(report.quarter, 'Q3');
  // Q3 = OCT, NOV, DEC -> 5 entries (3 NOV + 2 OCT)
  assert.strictEqual(report.metrics.orderCount, 5, 'Q3 should have 5 orders');
  console.log('✓ generateReportData_ QUARTER filter passed.');
}

// ======== TEST 6: generateReportData_ with FY filter ========
console.log('Test 6: generateReportData_ — FY filter (FY 26-27)...');
{
  const ss = buildTestSS();
  const sandbox = createSandbox(ss);
  vm.createContext(sandbox);
  vm.runInContext(codeSource, sandbox);

  const report = sandbox.generateReportData_(ss, {
    periodType: 'FY',
    fy: 'FY 26-27'
  });

  assert.strictEqual(report.periodType, 'FY');
  assert.strictEqual(report.metrics.orderCount, 8, 'FY 26-27 should have all 8 entries');
  console.log('✓ generateReportData_ FY filter passed.');
}

// ======== TEST 7: generateReportData_ with ALL filter ========
console.log('Test 7: generateReportData_ — ALL filter...');
{
  const ss = buildTestSS();
  const sandbox = createSandbox(ss);
  vm.createContext(sandbox);
  vm.runInContext(codeSource, sandbox);

  const report = sandbox.generateReportData_(ss, { periodType: 'ALL' });
  assert.strictEqual(report.metrics.orderCount, 8, 'ALL should return all 8 entries');
  console.log('✓ generateReportData_ ALL filter passed.');
}

// ======== TEST 8: generateReportData_ entity filters ========
console.log('Test 8: generateReportData_ — entity filters (party, product, rep)...');
{
  const ss = buildTestSS();
  const sandbox = createSandbox(ss);
  vm.createContext(sandbox);
  vm.runInContext(codeSource, sandbox);

  // Filter by party name
  const partyReport = sandbox.generateReportData_(ss, {
    periodType: 'ALL',
    partyName: 'ABC Corp'
  });
  assert.strictEqual(partyReport.metrics.orderCount, 2, 'ABC Corp should have 2 entries');

  // Filter by product keyword
  const productReport = sandbox.generateReportData_(ss, {
    periodType: 'ALL',
    productKeyword: 'LS'
  });
  assert.strictEqual(productReport.metrics.orderCount, 3, 'LS keyword should have 3 entries');

  // Filter by sales person
  const repReport = sandbox.generateReportData_(ss, {
    periodType: 'ALL',
    salesPerson: 'TK'
  });
  assert.strictEqual(repReport.metrics.orderCount, 3, 'TK should have 3 entries');

  // Combined filters
  const combinedReport = sandbox.generateReportData_(ss, {
    periodType: 'MONTH',
    monthYear: 'NOV-2026',
    salesPerson: 'RK'
  });
  assert.strictEqual(combinedReport.metrics.orderCount, 1, 'RK in NOV-2026 should have 1 entry');

  console.log('✓ generateReportData_ entity filters passed.');
}

// ======== TEST 9: buildHtmlReportEmail_ generates valid HTML ========
console.log('Test 9: buildHtmlReportEmail_ generates valid HTML...');
{
  const ss = buildTestSS();
  const sandbox = createSandbox(ss);
  vm.createContext(sandbox);
  vm.runInContext(codeSource, sandbox);

  const report = sandbox.generateReportData_(ss, {
    periodType: 'MONTH',
    monthYear: 'NOV-2026'
  });

  const html = sandbox.buildHtmlReportEmail_(
    report,
    'https://script.google.com/macros/s/mock/exec',
    'https://docs.google.com/spreadsheets/d/test/edit'
  );

  assert.ok(html.includes('<!DOCTYPE html>'), 'Should include DOCTYPE');
  assert.ok(html.includes('RK Sales Master'), 'Should include brand name');
  assert.ok(html.includes('Monthly Report'), 'Should include period label');
  assert.ok(html.includes('NOV-2026'), 'Should include month year');
  assert.ok(html.includes('Total Sales'), 'Should include KPI labels');
  assert.ok(html.includes('Total Commission'), 'Should include commission KPI');
  assert.ok(html.includes('Multi-Period Performance Matrix'), 'Should include multi-period table');
  assert.ok(html.includes('Q3 QTD'), 'Should include QTD column');
  assert.ok(html.includes('FYTD'), 'Should include FYTD column');
  assert.ok(html.includes('Performance By Sales Person'), 'Should include rep section');
  assert.ok(html.includes('Top Customers'), 'Should include top customers');
  assert.ok(html.includes('Product Distribution'), 'Should include product section');
  assert.ok(html.includes('Open Web App'), 'Should include action buttons');
  assert.ok(html.includes('Open Google Sheet'), 'Should include sheet link');

  console.log('✓ buildHtmlReportEmail_ HTML generation passed.');
}

// ======== TEST 10: buildHtmlReportEmail_ with filter notice ========
console.log('Test 10: buildHtmlReportEmail_ shows filter notice when entity filters applied...');
{
  const ss = buildTestSS();
  const sandbox = createSandbox(ss);
  vm.createContext(sandbox);
  vm.runInContext(codeSource, sandbox);

  const report = sandbox.generateReportData_(ss, {
    periodType: 'ALL',
    partyName: 'ABC Corp',
    salesPerson: 'RK'
  });

  const html = sandbox.buildHtmlReportEmail_(report, '', '');
  assert.ok(html.includes('Filtered'), 'Should show filter notice');
  assert.ok(html.includes('ABC Corp'), 'Should show party filter value');
  assert.ok(html.includes('RK'), 'Should show rep filter value');
  console.log('✓ buildHtmlReportEmail_ filter notice passed.');
}

// ======== TEST 11: sendEmailReport - Admin allowed ========
console.log('Test 11: sendEmailReport — Admin successfully dispatches...');
{
  const ss = buildTestSS();
  const sandbox = createSandbox(ss);
  vm.createContext(sandbox);
  vm.runInContext(codeSource, sandbox);

  const result = sandbox.sendEmailReport({
    authCode: 'RK',
    authPin: '1234',
    toEmails: 'test@example.com',
    filters: {
      periodType: 'MONTH',
      monthYear: 'NOV-2026'
    }
  });

  assert.strictEqual(result.ok, true, 'Should succeed');
  assert.ok(result.message.includes('test@example.com'), 'Should mention recipient');
  assert.strictEqual(mailLog.length, 1, 'Should have sent 1 email');
  assert.strictEqual(mailLog[0].to, 'test@example.com', 'Should send to correct address');
  assert.ok(mailLog[0].subject.includes('RK Sales Report'), 'Subject should include RK Sales');
  assert.ok(mailLog[0].subject.includes('NOV-2026'), 'Subject should include period');
  assert.ok(mailLog[0].htmlBody.includes('<!DOCTYPE html>'), 'Email body should be HTML');
  console.log('✓ sendEmailReport Admin dispatch passed.');
}

// ======== TEST 12: sendEmailReport - Sales blocked ========
console.log('Test 12: sendEmailReport — Sales user blocked...');
{
  const ss = buildTestSS();
  const sandbox = createSandbox(ss);
  vm.createContext(sandbox);
  vm.runInContext(codeSource, sandbox);

  let blocked = false;
  try {
    sandbox.sendEmailReport({
      authCode: 'TK',
      authPin: '1111',
      toEmails: 'test@example.com',
      filters: { periodType: 'ALL' }
    });
  } catch (e) {
    blocked = true;
    assert.ok(e.message.includes('Only Admin'), 'Error should mention Admin-only: ' + e.message);
  }
  assert.strictEqual(blocked, true, 'Sales user must be blocked from sending reports');
  console.log('✓ sendEmailReport Sales blocked passed.');
}

// ======== TEST 13: sendEmailReport - Bad auth blocked ========
console.log('Test 13: sendEmailReport — Bad authentication blocked...');
{
  const ss = buildTestSS();
  const sandbox = createSandbox(ss);
  vm.createContext(sandbox);
  vm.runInContext(codeSource, sandbox);

  let blocked = false;
  try {
    sandbox.sendEmailReport({
      authCode: 'RK',
      authPin: 'WRONG',
      toEmails: 'test@example.com',
      filters: { periodType: 'ALL' }
    });
  } catch (e) {
    blocked = true;
    assert.ok(e.message.includes('Authentication failed'), 'Error should mention auth failure');
  }
  assert.strictEqual(blocked, true, 'Bad auth must be blocked');
  console.log('✓ sendEmailReport bad auth blocked passed.');
}

// ======== TEST 14: sendEmailReport auto-resolves admin emails when toEmails empty ========
console.log('Test 14: sendEmailReport — auto-resolves admin emails...');
{
  const ss = buildTestSS();
  const sandbox = createSandbox(ss);
  vm.createContext(sandbox);
  vm.runInContext(codeSource, sandbox);

  const result = sandbox.sendEmailReport({
    authCode: 'RK',
    authPin: '1234',
    // No toEmails - should auto-resolve from Lookup
    filters: { periodType: 'ALL' }
  });

  assert.strictEqual(result.ok, true);
  assert.strictEqual(mailLog.length, 1);
  // Should send to both admin emails
  assert.ok(mailLog[0].to.includes('rahul@example.com'), 'Should include RK admin email');
  assert.ok(mailLog[0].to.includes('admin@example.com'), 'Should include ADMIN email');
  console.log('✓ sendEmailReport auto-resolve admin emails passed.');
}

// ======== TEST 15: sendAutomatedMonthlyEmailReport ========
console.log('Test 15: sendAutomatedMonthlyEmailReport...');
{
  const ss = buildTestSS();
  const sandbox = createSandbox(ss);
  vm.createContext(sandbox);
  vm.runInContext(codeSource, sandbox);

  const result = sandbox.sendAutomatedMonthlyEmailReport();
  assert.strictEqual(result.ok, true, 'Should succeed');
  assert.ok(result.monthYear, 'Should have monthYear');
  assert.ok(Array.isArray(result.recipients), 'Should have recipients array');
  assert.strictEqual(result.recipients.length, 2, 'Should email 2 admins');
  assert.strictEqual(mailLog.length, 1, 'Should send exactly 1 email');
  assert.ok(mailLog[0].subject.includes('Monthly Report'), 'Subject should mention Monthly Report');
  console.log('✓ sendAutomatedMonthlyEmailReport passed.');
}

// ======== TEST 16: sendAutomatedMonthlyEmailReport with no admin emails ========
console.log('Test 16: sendAutomatedMonthlyEmailReport — no admin emails...');
{
  const ss = new MockSpreadsheet();
  const lookup = ss.insertSheet('Lookup');
  lookup.getRange(1, 1, 1, 6).setValues([['Code', 'Full Name', 'Active', 'PIN', 'Role', 'Email']]);
  lookup.getRange(2, 1, 1, 6).setValues([
    ['TK', 'Trupti Kodag', 'YES', '1111', 'SALES', ''] // No admin, no email
  ]);
  ss.insertSheet('All Entries');

  const sandbox = createSandbox(ss);
  vm.createContext(sandbox);
  vm.runInContext(codeSource, sandbox);

  const result = sandbox.sendAutomatedMonthlyEmailReport();
  assert.strictEqual(result.ok, false, 'Should fail when no admin emails');
  assert.ok(result.message.includes('No Admin email'), 'Should mention missing admin email');
  assert.strictEqual(mailLog.length, 0, 'Should not send any email');
  console.log('✓ sendAutomatedMonthlyEmailReport no-admin-email abort passed.');
}

// ======== TEST 17: setupMonthlyEmailTrigger ========
console.log('Test 17: setupMonthlyEmailTrigger creates trigger...');
{
  const ss = buildTestSS();
  const sandbox = createSandbox(ss);
  vm.createContext(sandbox);
  vm.runInContext(codeSource, sandbox);

  sandbox.setupMonthlyEmailTrigger();
  assert.strictEqual(triggerLog.length, 1, 'Should create 1 trigger');
  assert.strictEqual(triggerLog[0].fnName, 'sendAutomatedMonthlyEmailReport', 'Should trigger correct function');
  assert.strictEqual(triggerLog[0].monthDay, 1, 'Should trigger on 1st of month');
  assert.strictEqual(triggerLog[0].hour, 8, 'Should trigger at 8 AM');
  console.log('✓ setupMonthlyEmailTrigger passed.');
}

// ======== TEST 18: removeMonthlyEmailTrigger ========
console.log('Test 18: removeMonthlyEmailTrigger removes triggers...');
{
  const ss = buildTestSS();
  const sandbox = createSandbox(ss);
  vm.createContext(sandbox);
  vm.runInContext(codeSource, sandbox);

  // Setup then remove
  sandbox.setupMonthlyEmailTrigger();
  assert.strictEqual(existingTriggers.length, 1, 'Should have 1 trigger before removal');
  sandbox.removeMonthlyEmailTrigger();
  assert.strictEqual(existingTriggers.length, 0, 'Should have 0 triggers after removal');
  console.log('✓ removeMonthlyEmailTrigger passed.');
}

// ======== TEST 19: 6-column Lookup migration with email ========
console.log('Test 19: Lookup migration preserves email column...');
{
  const ss = new MockSpreadsheet();
  const lookup = ss.insertSheet('Lookup');
  // Legacy 5-column format (no Email)
  lookup.getRange(1, 1, 1, 5).setValues([['Code', 'Full Name', 'Active', 'PIN', 'Role']]);
  lookup.getRange(2, 1, 2, 5).setValues([
    ['RK', 'Rahul Kodag', 'YES', '1234', 'ADMIN'],
    ['TK', 'Trupti Kodag', 'YES', '1111', 'SALES']
  ]);

  const sandbox = createSandbox(ss);
  vm.createContext(sandbox);
  vm.runInContext(codeSource, sandbox);

  const internal = sandbox.getSalesPersonsInternal_(ss);
  // After migration, RK should have default email from DEFAULT_SALES_PERSONS
  const rk = internal.find(u => u.code === 'RK');
  assert.ok(rk, 'RK should exist');
  assert.strictEqual(rk.email, 'rahulkodag@example.com', 'RK should get default email after migration');
  assert.strictEqual(rk.role, 'ADMIN');
  assert.strictEqual(rk.pin, '1234');

  const tk = internal.find(u => u.code === 'TK');
  assert.ok(tk, 'TK should exist');
  assert.strictEqual(tk.email, '', 'TK should have empty email (no default)');

  // Verify header was updated to 6 columns
  assert.strictEqual(lookup.getRange(1, 6).getValue(), 'Email', 'Header column 6 should be Email');

  console.log('✓ 6-column Lookup migration passed.');
}

// ======== TEST 20: fmtINR_ and fmtINRCompact_ ========
console.log('Test 20: Currency formatting functions...');
{
  const ss = buildTestSS();
  const sandbox = createSandbox(ss);
  vm.createContext(sandbox);
  vm.runInContext(codeSource, sandbox);

  const formatted = sandbox.fmtINR_(100000);
  assert.ok(formatted.startsWith('₹'), 'Should start with ₹');
  assert.ok(formatted.includes('1,00,000'), 'Should contain Indian formatted number');

  const compact = sandbox.fmtINRCompact_(50000);
  assert.ok(compact.startsWith('₹'), 'Compact should start with ₹');
  assert.ok(compact.includes('50,000'), 'Compact should contain formatted number');

  assert.ok(sandbox.fmtINR_(0).includes('0'), 'Zero should format');
  console.log('✓ Currency formatting passed.');
}

// ======== TEST 21: onOpen menu includes email report items ========
console.log('Test 21: onOpen menu includes email report menu items...');
{
  const ss = buildTestSS();
  const menuItems = [];
  const sandbox = createSandbox(ss);
  sandbox.SpreadsheetApp.getUi = () => ({
    createMenu: () => ({
      addItem: function(label) { menuItems.push(label); return this; },
      addSeparator: function() { return this; },
      addToUi: () => {}
    }),
    alert: () => {},
    ButtonSet: { OK: 'OK' }
  });
  vm.createContext(sandbox);
  vm.runInContext(codeSource, sandbox);

  sandbox.onOpen();
  assert.ok(menuItems.some(i => i.includes('Send monthly email report')), 'Menu should have Send report item');
  assert.ok(menuItems.some(i => i.includes('Setup automated')), 'Menu should have Setup trigger item');
  assert.ok(menuItems.some(i => i.includes('Remove automated')), 'Menu should have Remove trigger item');
  console.log('✓ onOpen menu items passed.');
}

// ======== TEST 22: Monthly email report includes monthly sheet tab attachment & link ========
console.log('Test 22: Monthly email report includes monthly sheet tab CSV attachment, tab link, and table...');
{
  const ss = buildTestSS();
  const sandbox = createSandbox(ss);
  vm.createContext(sandbox);
  vm.runInContext(codeSource, sandbox);

  const result = sandbox.sendEmailReport({
    authCode: 'RK',
    authPin: '1234',
    toEmails: 'admin@example.com',
    filters: { periodType: 'MONTH', monthYear: 'NOV-2026' }
  });

  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.hasAttachment, true, 'Report should confirm attachment was added');
  assert.strictEqual(mailLog.length, 1);
  const sentMail = mailLog[0];
  assert.ok(sentMail.attachments && sentMail.attachments.length >= 1, 'MailApp must receive month tab attachment');
  const att = sentMail.attachments.find(a => a.getName().endsWith('.csv'));
  assert.ok(att, 'CSV attachment must be present');
  assert.strictEqual(att.getName(), 'RK_Sales_NOV-2026.csv', 'Attachment name must be RK_Sales_NOV-2026.csv');
  assert.ok(att.getDataAsString().includes('ABC Corp'), 'Attachment CSV must contain month row party name');
  assert.ok(att.getDataAsString().includes('Leadshine'), 'Attachment CSV must contain product name');
  assert.ok(att.getDataAsString().includes('=ROUND('), 'Attachment CSV must contain live row formulas (=ROUND)');
  assert.ok(att.getDataAsString().includes('=SUM('), 'Attachment CSV must contain live summary TOTAL formula (=SUM)');
  assert.ok(att.getDataAsString().includes('"TOTAL"'), 'Attachment CSV must include TOTAL summary row');
  assert.ok(sentMail.htmlBody.includes('Monthly Sheet Tab Data (NOV-2026)'), 'HTML body should include month tab section');
  assert.ok(sentMail.htmlBody.includes('Open NOV-2026 Tab'), 'HTML body should include direct tab link button');
  assert.ok(sentMail.htmlBody.includes('#gid=12345'), 'Direct tab link must contain #gid parameter');
  assert.ok(sentMail.htmlBody.includes('Live Formulas &amp; Totals'), 'HTML body should mention formulas and totals');
  console.log('✓ Monthly report sheet tab attachment with formulas and total verified.');
}

console.log('\n========================================');
console.log('ALL EMAIL REPORTING TESTS PASSED!');
console.log('========================================');
