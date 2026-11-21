// Automated tests for Backup Subsystem in Code.gs
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

console.log('--- RUNNING BACKUP SUBSYSTEM TESTS ---');

// Mock infrastructure for DriveApp and ScriptApp
class MockFile {
  constructor(id, name, createdDate = new Date()) {
    this.id = id;
    this.name = name;
    this.createdDate = createdDate;
    this.trashed = false;
  }
  getId() { return this.id; }
  getName() { return this.name; }
  getUrl() { return 'https://drive.google.com/file/d/' + this.id + '/view'; }
  getDateCreated() { return this.createdDate; }
  setTrashed(val) { this.trashed = !!val; }
  makeCopy(newName, destinationFolder) {
    const copyId = 'copy-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    const copiedFile = new MockFile(copyId, newName, new Date());
    if (destinationFolder && destinationFolder.files) {
      destinationFolder.files.push(copiedFile);
    }
    return copiedFile;
  }
}

class MockFolder {
  constructor(name) {
    this.name = name;
    this.files = [];
  }
  getName() { return this.name; }
  getUrl() { return 'https://drive.google.com/drive/folders/mock-' + this.name; }
  getFiles() {
    let idx = 0;
    const list = this.files.slice();
    return {
      hasNext: () => idx < list.length,
      next: () => list[idx++]
    };
  }
}

class MockDriveApp {
  constructor() {
    this.folders = [];
    this.files = {};
  }
  getFoldersByName(name) {
    const matched = this.folders.filter(f => f.name === name);
    let idx = 0;
    return {
      hasNext: () => idx < matched.length,
      next: () => matched[idx++]
    };
  }
  createFolder(name) {
    const folder = new MockFolder(name);
    this.folders.push(folder);
    return folder;
  }
  getFileById(id) {
    return this.files[id] || new MockFile(id, 'Master Spreadsheet');
  }
}

// Spreadsheet & Range mocks
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
    return new MockRange(this, r, c, nr || 1, nc || 1);
  }
  setFrozenRows() {}
}

class MockSpreadsheet {
  constructor() {
    this.sheets = [];
    this.id = 'rk-sales-sheet-id';
  }
  getId() { return this.id; }
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
}

function initLookupSheet(ss) {
  const lookup = ss.insertSheet('Lookup');
  const vals = [
    ['Code', 'Full Name', 'Active', 'PIN', 'Role', 'Email'],
    ['RK', 'Rahul Kodag', 'YES', '1234', 'ADMIN', 'rahulkodag@example.com'],
    ['TK', 'Tanaji Kodag', 'YES', '1111', 'SALES', 'tanaji@example.com'],
    ['SC', 'Subhash Chavan', 'YES', '2222', 'SALES', 'subhash@example.com'],
    ['OT', 'Other Rep', 'YES', '3333', 'SALES', 'other@example.com']
  ];
  lookup.getRange(1, 1, vals.length, vals[0].length).setValues(vals);
  return lookup;
}

const activeTriggers = [];
const triggerCreations = [];

function createSandbox(ss, drive) {
  activeTriggers.length = 0;
  triggerCreations.length = 0;

  return {
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ss,
      openById: () => ss,
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
    DriveApp: drive,
    ScriptApp: {
      newTrigger: (fnName) => {
        const t = {
          fnName,
          _everyDays: 1,
          _atHour: 1,
          timeBased: function() { return this; },
          everyDays: function(d) { this._everyDays = d; return this; },
          atHour: function(h) { this._atHour = h; return this; },
          create: function() {
            triggerCreations.push({ fnName: this.fnName, everyDays: this._everyDays, atHour: this._atHour });
            const trig = {
              getHandlerFunction: () => this.fnName,
              id: 'trig-' + (activeTriggers.length + 1)
            };
            activeTriggers.push(trig);
            return trig;
          }
        };
        return t;
      },
      getProjectTriggers: () => activeTriggers.slice(),
      deleteTrigger: (t) => {
        const idx = activeTriggers.findIndex(x => x === t);
        if (idx >= 0) activeTriggers.splice(idx, 1);
      }
    },
    Session: { getScriptTimeZone: () => 'Asia/Kolkata' },
    Utilities: {
      formatDate: (d, tz, fmt) => '2026-11-21_0100'
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: () => 'rk-sales-sheet-id',
        setProperty: () => {}
      })
    },
    console: console
  };
}

const codeGs = fs.readFileSync('Code.gs', 'utf8');

// Test 1: createDataBackup creates a backup and retention-purges files > 30 days
console.log('Test 1: createDataBackup creates folder and file copy with 30-day retention...');
{
  const ss = new MockSpreadsheet();
  initLookupSheet(ss);
  const drive = new MockDriveApp();
  const masterFile = new MockFile(ss.getId(), 'RK Sales Master');
  drive.files[ss.getId()] = masterFile;

  // Pre-seed the folder with an old file (40 days old) and a recent file (5 days old)
  const folder = drive.createFolder('RK Sales Backups');
  const now = Date.now();
  const oldFile = new MockFile('old-1', 'RK_Sales_Backup_2026-10-10_0100', new Date(now - (40 * 24 * 60 * 60 * 1000)));
  const recentFile = new MockFile('recent-1', 'RK_Sales_Backup_2026-11-16_0100', new Date(now - (5 * 24 * 60 * 60 * 1000)));
  folder.files.push(oldFile, recentFile);

  const sandbox = createSandbox(ss, drive);
  vm.createContext(sandbox);
  vm.runInContext(codeGs, sandbox);

  const res = sandbox.createDataBackup();
  assert.ok(res && res.ok, 'createDataBackup should return ok: true');
  assert.strictEqual(res.fileName, 'RK_Sales_Backup_2026-11-21_0100');
  assert.strictEqual(res.deletedCount, 1, 'Should purge exactly 1 file older than 30 days');
  assert.strictEqual(oldFile.trashed, true, 'Old backup file must be trashed');
  assert.strictEqual(recentFile.trashed, false, 'Recent backup file must NOT be trashed');
  assert.strictEqual(folder.files.length, 3, 'Folder should contain old, recent, and newly copied file');
  console.log('✓ createDataBackup successfully created backup and enforced 30-day retention.');
}

// Test 2: setupNightlyBackupTrigger schedules 1:00 AM daily trigger
console.log('Test 2: setupNightlyBackupTrigger schedules trigger at 1:00 AM...');
{
  const ss = new MockSpreadsheet();
  initLookupSheet(ss);
  const drive = new MockDriveApp();
  const sandbox = createSandbox(ss, drive);
  vm.createContext(sandbox);
  vm.runInContext(codeGs, sandbox);

  const res = sandbox.setupNightlyBackupTrigger();
  assert.strictEqual(res, true);
  assert.strictEqual(triggerCreations.length, 1);
  assert.strictEqual(triggerCreations[0].fnName, 'createDataBackup');
  assert.strictEqual(triggerCreations[0].everyDays, 1);
  assert.strictEqual(triggerCreations[0].atHour, 1);
  assert.strictEqual(activeTriggers.length, 1);
  console.log('✓ setupNightlyBackupTrigger correctly configured daily 1:00 AM trigger.');
}

// Test 3: removeNightlyBackupTrigger removes active triggers
console.log('Test 3: removeNightlyBackupTrigger cleans up existing triggers...');
{
  const ss = new MockSpreadsheet();
  initLookupSheet(ss);
  const drive = new MockDriveApp();
  const sandbox = createSandbox(ss, drive);
  vm.createContext(sandbox);
  vm.runInContext(codeGs, sandbox);

  sandbox.setupNightlyBackupTrigger();
  assert.strictEqual(activeTriggers.length, 1);

  sandbox.removeNightlyBackupTrigger();
  assert.strictEqual(activeTriggers.length, 0, 'Trigger must be removed');
  console.log('✓ removeNightlyBackupTrigger cleanly removed the trigger.');
}

// Test 4: triggerManualBackup permissions check (Admin vs Sales)
console.log('Test 4: triggerManualBackup enforces Admin role check...');
{
  const ss = new MockSpreadsheet();
  initLookupSheet(ss);
  const drive = new MockDriveApp();
  drive.files[ss.getId()] = new MockFile(ss.getId(), 'RK Sales Master');
  const sandbox = createSandbox(ss, drive);
  vm.createContext(sandbox);
  vm.runInContext(codeGs, sandbox);

  // 1. Invalid PIN should throw
  assert.throws(() => {
    sandbox.triggerManualBackup({ authCode: 'RK', authPin: '9999' });
  }, /Authentication failed/);

  // 2. Non-admin (Sales user TK) should be blocked
  assert.throws(() => {
    sandbox.triggerManualBackup({ authCode: 'TK', authPin: '1111' });
  }, /Permission denied: Only Admin/);

  // 3. Admin (RK with PIN 1234) should succeed
  const res = sandbox.triggerManualBackup({ authCode: 'RK', authPin: '1234' });
  assert.ok(res && res.ok, 'Admin manual backup must succeed');
  assert.strictEqual(res.fileName, 'RK_Sales_Backup_2026-11-21_0100');
  console.log('✓ triggerManualBackup successfully verified Admin auth and blocked Sales users.');
}

console.log('\n========================================');
console.log('ALL BACKUP SUBSYSTEM TESTS PASSED!');
console.log('========================================');
