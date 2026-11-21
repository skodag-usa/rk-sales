/**
 * RK SALES (MULTI-YEAR) — Mobile web app for Google Sheets.
 *
 * Bound script: open the spreadsheet, then Extensions → Apps Script,
 * and paste Code.gs plus Index.html (the HTML file must be named Index).
 *
 * Deploy: Deploy → New deployment → Web app.
 *   Execute as: Me
 *   Who has access: Anyone (Google account required)
 * The sheet stays private. The web app writes as the account that deploys it.
 *
 * Sheets used:
 *   Dashboard, Report, All Entries, Lookup, and one tab per month (NOV-2026).
 * Lookup columns: A Code, B Full Name, C Active (YES/NO), D PIN, E Role (ADMIN/SALES), F Email.
 */

var SPREADSHEET_ID = '12WViovDOoOFiu7vQDTY2SiqTaKw5aiF4F46PPN7Xesk';
var FY_MONTHS = ['APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC', 'JAN', 'FEB', 'MAR'];
var CAL_MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
var QUARTERS = {
  Q1: ['APR', 'MAY', 'JUN'],
  Q2: ['JUL', 'AUG', 'SEP'],
  Q3: ['OCT', 'NOV', 'DEC'],
  Q4: ['JAN', 'FEB', 'MAR']
};
var CORE_SHEETS = { Dashboard: true, Report: true, 'All Entries': true, Lookup: true };
var DEFAULT_SALES_PERSONS = [
  ['RK', 'Rahul Kodag', 'YES', '1234', 'ADMIN', 'rahulkodag@example.com'],
  ['TK', 'Trupti Kodag', 'YES', '1111', 'SALES', ''],
  ['SC', 'Swapnil Chikhale', 'YES', '2222', 'SALES', ''],
  ['OT', 'Other', 'YES', '3333', 'SALES', ''],
  ['ADMIN', 'Administrator', 'YES', '9999', 'ADMIN', 'admin@example.com']
];
var HEADERS = [
  'Sr. No.', 'MONTH', 'Sales Person', 'Party Name', 'Region',
  'Po No.', 'Po Date', 'PI No.', 'PI Date', 'Invoice No.', 'Invoice Date',
  'Product Keyword', 'Product Name', 'PO Value', 'Product Value', 'Freight Charges',
  'GST Value', 'Total Value', 'Commission Type', 'Commission %', 'Commission Fixed',
  'Commission Value %', 'Total Commission', 'Payment Terms', 'Paymet Status',
  'WB/Billing', 'Remark', 'Accounts Remark', 'Revisit', 'Edit Link', 'Timestamp', 'Response ID'
];
var ID_COL = HEADERS.length;

var KPI_FORMULAS = [
  ["=COUNTA('All Entries'!A2:A)"],
  ["=SUM('All Entries'!N2:N)"],
  ["=SUM('All Entries'!O2:O)"],
  ["=SUM('All Entries'!Q2:Q)"],
  ["=SUM('All Entries'!R2:R)"],
  ["=SUM('All Entries'!V2:V)"],
  ["=SUM('All Entries'!W2:W)"],
  ['=COUNTIFS(\'All Entries\'!A2:A,"<>",\'All Entries\'!Y2:Y,"<>RCD")'],
  ['=SUMIFS(\'All Entries\'!R2:R,\'All Entries\'!A2:A,"<>",\'All Entries\'!Y2:Y,"<>RCD")'],
  ['=SUMIFS(\'All Entries\'!R2:R,\'All Entries\'!A2:A,"<>",\'All Entries\'!Y2:Y,"=RCD")']
];
var LAST10_FORMULA = '=IFERROR(QUERY(\'All Entries\'!A1:Y,"select A,B,C,D,E,L,M,O,R,W,X,Y where A is not null order by A desc limit 10",1),"No transactions yet")';

function doGet(e) {
  var pwaAsset = e && e.parameter ? String(e.parameter.pwa || '') : '';
  if (pwaAsset === 'manifest') {
    var appUrl = ScriptApp.getService().getUrl() || './';
    return ContentService.createTextOutput(JSON.stringify({
      name: 'RK Sales',
      short_name: 'RK Sales',
      description: 'Offline-first sales entry and dashboard',
      start_url: appUrl,
      scope: appUrl,
      display: 'standalone',
      background_color: '#f1f5f9',
      theme_color: '#0f172a',
      icons: []
    })).setMimeType(ContentService.MimeType.JSON);
  }
  if (pwaAsset === 'sw') {
    return ContentService.createTextOutput(getServiceWorkerSource_())
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  var template = HtmlService.createTemplateFromFile('Index');
  template.editId = sanitizeEditId_(e && e.parameter ? e.parameter.edit : '');
  return template.evaluate()
    .setTitle('RK Sales — Multi-Year Entry & Dashboard')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getServiceWorkerSource_() {
  return [
    "const CACHE='rk-sales-pwa-v1';",
    "const CDN=[",
    " 'https://cdn.tailwindcss.com/3.4.17',",
    " 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',",
    " 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'",
    "];",
    "self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(async c=>{",
    " try{await c.addAll(CDN)}catch(_){ }",
    " try{await c.add(location.href.replace(/[?&]pwa=sw/,'').replace(/[?&]$/,''))}catch(_){ }",
    "}));self.skipWaiting()});",
    "self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));",
    "self.addEventListener('fetch',e=>{",
    " if(e.request.method!=='GET')return;",
    " e.respondWith(fetch(e.request).then(r=>{",
    "  if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));}",
    "  return r;",
    " }).catch(()=>caches.match(e.request).then(r=>r||caches.match('/'))));",
    "});"
  ].join('\n');
}

function bootJson_(editId) {
  return JSON.stringify({ editId: sanitizeEditId_(editId) }).replace(/</g, '\\u003c');
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('RK Sales')
    .addItem('Set up sheets', 'setupRKSalesSheets')
    .addItem('Show web app link', 'showWebAppLink')
    .addSeparator()
    .addItem('Send monthly email report now', 'sendAutomatedMonthlyEmailReport')
    .addItem('Setup automated monthly email trigger (1st of month)', 'setupMonthlyEmailTrigger')
    .addItem('Remove automated monthly email trigger', 'removeMonthlyEmailTrigger')
    .addSeparator()
    .addItem('Create data backup now', 'createDataBackup')
    .addItem('Setup nightly backup trigger (1:00 AM)', 'setupNightlyBackupTrigger')
    .addItem('Remove nightly backup trigger', 'removeNightlyBackupTrigger')
    .addToUi();
}

function showWebAppLink() {
  var url = webAppUrl_();
  var ui = SpreadsheetApp.getUi();
  if (!url) {
    ui.alert(
      'RK Sales',
      'Deploy the script as a web app first.\n\nDeploy → New deployment → Web app.\nExecute as: Me\nWho has access: Anyone.',
      ui.ButtonSet.OK
    );
    return;
  }
  ui.alert('RK Sales web app', url, ui.ButtonSet.OK);
}

function getSS_() {
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  var id = PropertiesService.getScriptProperties().getProperty('SS_ID') || SPREADSHEET_ID;
  if (!id) {
    throw new Error('No spreadsheet found. Open this script from Extensions → Apps Script inside the RK Sales Google Sheet.');
  }
  return SpreadsheetApp.openById(id);
}

/**
 * Reads internal salesperson records including PINs and emails.
 * Automatically migrates legacy sheets to 6 columns.
 */
function getSalesPersonsInternal_(ss) {
  var sh = ss.getSheetByName('Lookup');
  if (!sh) {
    sh = ss.insertSheet('Lookup', Math.min(3, ss.getSheets().length));
    sh.getRange(1, 1, 1, 6).setValues([['Code', 'Full Name', 'Active', 'PIN', 'Role', 'Email']]).setFontWeight('bold').setBackground('#d9ead3');
    sh.getRange(2, 1, DEFAULT_SALES_PERSONS.length, 6).setValues(DEFAULT_SALES_PERSONS);
    sh.setFrozenRows(1);
    sh.getRange('C2:C50').setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(['YES', 'NO'], true).build()
    );
    sh.getRange('E2:E50').setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(['ADMIN', 'SALES'], true).build()
    );
  }

  var last = sh.getLastRow();
  if (last < 2) {
    return DEFAULT_SALES_PERSONS.map(function (r, idx) {
      return { rowIndex: idx + 2, code: r[0], name: r[1], active: true, pin: String(r[3]), role: r[4], email: String(r[5] || '') };
    });
  }

  var lastCol = sh.getLastColumn();
  if (lastCol < 6) {
    sh.getRange(1, 1, 1, 6).setValues([['Code', 'Full Name', 'Active', 'PIN', 'Role', 'Email']]).setFontWeight('bold').setBackground('#d9ead3');
    sh.getRange('E2:E50').setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(['ADMIN', 'SALES'], true).build()
    );
  }

  var numCols = Math.max(6, lastCol);
  var vals = sh.getRange(2, 1, last - 1, numCols).getValues();
  var list = [];

  for (var i = 0; i < vals.length; i++) {
    var code = String(vals[i][0] || '').trim();
    if (!code) continue;
    var name = String(vals[i][1] || code).trim();
    var activeRaw = String(vals[i][2] === '' || vals[i][2] === null || vals[i][2] === undefined ? 'YES' : vals[i][2]).toUpperCase().trim();
    var isActive = activeRaw !== 'NO' && activeRaw !== 'FALSE' && activeRaw !== 'N' && activeRaw !== '0';
    var pinRaw = (vals[i][3] !== undefined && vals[i][3] !== null && String(vals[i][3]).trim() !== '') ? String(vals[i][3]).trim() : '';
    var roleRaw = (vals[i][4] !== undefined && vals[i][4] !== null && String(vals[i][4]).trim() !== '') ? String(vals[i][4]).toUpperCase().trim() : '';
    var emailRaw = (vals[i][5] !== undefined && vals[i][5] !== null) ? String(vals[i][5]).trim() : '';

    var updated = false;
    var defaultMatch = null;
    for (var d = 0; d < DEFAULT_SALES_PERSONS.length; d++) {
      if (DEFAULT_SALES_PERSONS[d][0].toUpperCase() === code.toUpperCase()) {
        defaultMatch = DEFAULT_SALES_PERSONS[d];
        break;
      }
    }

    if (!pinRaw) {
      pinRaw = defaultMatch ? String(defaultMatch[3]) : '1234';
      updated = true;
    }
    if (!roleRaw || (roleRaw !== 'ADMIN' && roleRaw !== 'SALES')) {
      if (defaultMatch) {
        roleRaw = defaultMatch[4];
      } else {
        roleRaw = (code.toUpperCase() === 'RK' || code.toUpperCase() === 'ADMIN') ? 'ADMIN' : 'SALES';
      }
      updated = true;
    }
    if (!emailRaw && defaultMatch && defaultMatch[5]) {
      emailRaw = defaultMatch[5];
      updated = true;
    }

    if (updated) {
      sh.getRange(i + 2, 4, 1, 3).setValues([[pinRaw, roleRaw, emailRaw]]);
    }

    list.push({
      rowIndex: i + 2,
      code: code,
      name: name,
      active: isActive,
      pin: pinRaw,
      role: roleRaw === 'ADMIN' ? 'ADMIN' : 'SALES',
      email: emailRaw
    });
  }

  return list;
}

/**
 * Returns sanitized salesperson list for client consumption (omitting raw PINs).
 */
function getSalesPersonsLookup_(ss) {
  var internal = getSalesPersonsInternal_(ss);
  return internal.map(function (u) {
    return {
      code: u.code,
      name: u.name,
      active: u.active,
      role: u.role,
      email: u.email
    };
  });
}

/**
 * Returns all active Admin emails from Lookup.
 */
function getAdminEmails_(ss) {
  var internal = getSalesPersonsInternal_(ss);
  var emails = [];
  for (var i = 0; i < internal.length; i++) {
    var u = internal[i];
    if (u.active && u.role === 'ADMIN' && u.email && u.email.indexOf('@') !== -1) {
      emails.push(u.email.trim());
    }
  }
  return emails;
}

function loginUser(code, pin) {
  try {
    var ss = getSS_();
    var internal = getSalesPersonsInternal_(ss);
    var targetCode = String(code || '').toUpperCase().trim();
    var targetPin = String(pin || '').trim();

    if (!targetCode || !targetPin) {
      return { ok: false, message: 'Please select a profile and enter your PIN.' };
    }

    var found = null;
    for (var i = 0; i < internal.length; i++) {
      if (internal[i].code.toUpperCase() === targetCode) {
        found = internal[i];
        break;
      }
    }

    if (!found) {
      return { ok: false, message: 'User code "' + code + '" not found.' };
    }

    if (!found.active) {
      return { ok: false, message: 'Account is deactivated. Please contact Admin.' };
    }

    if (String(found.pin).trim() !== targetPin) {
      return { ok: false, message: 'Incorrect PIN.' };
    }

    return {
      ok: true,
      user: {
        code: found.code,
        name: found.name,
        role: found.role,
        email: found.email
      }
    };
  } catch (err) {
    return { ok: false, message: 'Login error: ' + (err.message || err) };
  }
}

function updateUserPin(authCode, currentPin, targetCode, newPin) {
  try {
    var ss = getSS_();
    var internal = getSalesPersonsInternal_(ss);
    var aCode = String(authCode || '').toUpperCase().trim();
    var cPin = String(currentPin || '').trim();
    var tCode = String(targetCode || '').toUpperCase().trim();
    var nPin = String(newPin || '').trim();

    if (!nPin || nPin.length < 4 || nPin.length > 8) {
      return { ok: false, message: 'New PIN must be between 4 and 8 digits.' };
    }

    var authUser = null;
    for (var i = 0; i < internal.length; i++) {
      if (internal[i].code.toUpperCase() === aCode) {
        authUser = internal[i];
        break;
      }
    }

    if (!authUser || !authUser.active || String(authUser.pin).trim() !== cPin) {
      return { ok: false, message: 'Authentication failed. Please verify your current PIN.' };
    }

    var isSelf = (aCode === tCode);
    var isAdmin = (authUser.role === 'ADMIN');

    if (!isSelf && !isAdmin) {
      return { ok: false, message: 'Only Admin can change PIN for other users.' };
    }

    var targetUser = null;
    for (var j = 0; j < internal.length; j++) {
      if (internal[j].code.toUpperCase() === tCode) {
        targetUser = internal[j];
        break;
      }
    }

    if (!targetUser) {
      return { ok: false, message: 'Target user "' + targetCode + '" not found.' };
    }

    var sh = ss.getSheetByName('Lookup');
    if (!sh) return { ok: false, message: 'Lookup sheet not found.' };
    sh.getRange(targetUser.rowIndex, 4).setValue(nPin);
    SpreadsheetApp.flush();

    return { ok: true, message: 'PIN updated successfully for ' + targetUser.name + ' (' + targetUser.code + ').' };
  } catch (err) {
    return { ok: false, message: 'Error updating PIN: ' + (err.message || err) };
  }
}

function setupRKSalesSheets() {
  var ss = getSS_();
  PropertiesService.getScriptProperties().setProperty('SS_ID', ss.getId());

  var dash = ss.getSheetByName('Dashboard') || (ss.getSheets().length > 0 ? ss.getSheets()[0].setName('Dashboard') : ss.insertSheet('Dashboard'));
  if (!ss.getSheetByName('Report')) ss.insertSheet('Report', 1);
  var all = ss.getSheetByName('All Entries') || ss.insertSheet('All Entries', 2);
  getSalesPersonsInternal_(ss);

  ensureDataSheetSchema_(all);
  styleDataSheet_(all);
  var setupSheets = ss.getSheets();
  for (var si = 0; si < setupSheets.length; si++) {
    var setupSheet = setupSheets[si];
    if (parseMonthTabKey_(setupSheet.getName()) !== null) {
      ensureDataSheetSchema_(setupSheet);
      styleDataSheet_(setupSheet);
    }
  }

  if (dash.getLastRow() === 0) {
    dash.getRange('A1').setValue('RK SALES DASHBOARD (MULTI-YEAR)').setFontSize(16).setFontWeight('bold');
    dash.getRange('A3:B12').setValues([
      ['Total entries', ''],
      ['Total PO Value ₹', ''],
      ['Total Product Value (Sales Value) ₹', ''],
      ['Total GST Value ₹', ''],
      ['Total Value (Sales) ₹', ''],
      ['Total Commission Value % ₹', ''],
      ['Total Commission ₹', ''],
      ['Payment pending (entries)', ''],
      ['Payment pending ₹', ''],
      ['Collected (RCD) ₹', '']
    ]);
    dash.getRange('A3:A12').setFontWeight('bold');
    dash.getRange('B4:B10').setNumberFormat('#,##0.00');
    dash.getRange('B12').setNumberFormat('#,##0.00');
    dash.getRange('A14').setValue('LAST 10 TRANSACTIONS').setFontWeight('bold');
    dash.getRange('A15:L15').setFontWeight('bold').setBackground('#d9ead3');
  }

  if (String(dash.getRange('A3').getValue()) === 'Total entries') {
    dash.getRange('A3:A12').setValues([
      ['Total entries'],
      ['Total PO Value ₹'],
      ['Total Product Value (Sales Value) ₹'],
      ['Total GST Value ₹'],
      ['Total Value ₹'],
      ['Total Commission Value % ₹'],
      ['Total Commission ₹'],
      ['Payment pending (entries)'],
      ['Payment pending ₹'],
      ['Collected (RCD) ₹']
    ]);
    dash.getRange('B3:B12').setFormulas(KPI_FORMULAS);
    dash.getRange('A15').setFormula(LAST10_FORMULA);
  }

  try {
    SpreadsheetApp.getUi().alert('RK Sales sheets are ready.\n\n' + ss.getUrl());
  } catch (err) {}
  return ss.getUrl();
}

function styleDataSheet_(sh) {
  sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold').setBackground('#fff2cc');
  sh.setFrozenRows(1);
  sh.getRange('G:G').setNumberFormat('dd-mm-yyyy');
  sh.getRange('I:I').setNumberFormat('dd-mm-yyyy');
  sh.getRange('K:K').setNumberFormat('dd-mm-yyyy');
  sh.getRange('N:R').setNumberFormat('#,##0.00');
  sh.getRange('T:T').setNumberFormat('0.0%');
  sh.getRange('U:W').setNumberFormat('#,##0.00');
  sh.getRange('AD:AD').setNumberFormat('dd-mm-yyyy hh:mm');
  sh.getRange(1, 1, 1, HEADERS.length).setNumberFormat('@');
  applyDataConditionalFormatting_(sh);
}

function ensureDataSheetSchema_(sh) {
  if (!sh || !sh.getLastColumn) return;
  var lastColumn = sh.getLastColumn();
  // Older sheets had no Revisit column. Insert it before Edit Link (column 30).
  if (lastColumn === HEADERS.length - 1 && sh.insertColumnBefore) {
    sh.insertColumnBefore(29);
  }
  sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
}

function applyDataConditionalFormatting_(sh) {
  // Conditional formatting is unavailable in the Node test mocks.
  if (!SpreadsheetApp.newConditionalFormatRule || !sh.getRange) return;

  var dataRange = sh.getRange('A2:AF');
  var remarkRange = sh.getRange('AA2:AA');
  var commissionTypeRange = sh.getRange('S2:S');
  var commissionPctRange = sh.getRange('T2:T');
  var totalCommissionRange = sh.getRange('W2:W');
  var revisitSerialRange = sh.getRange('A2:A');
  var rules = [
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$AC2="YES"')
      .setBackground('#fef3c7')
      .setFontColor('#92400e')
      .setRanges([dataRange])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$Y2="RCD"')
      .setBackground('#ecfdf5')
      .setFontColor('#166534')
      .setRanges([dataRange])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$Y2="PENDING"')
      .setBackground('#fffbeb')
      .setFontColor('#92400e')
      .setRanges([dataRange])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$Y2="PARTIAL"')
      .setBackground('#eff6ff')
      .setFontColor('#1e40af')
      .setRanges([dataRange])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$Z2="WB"')
      .setFontColor('#dc2626')
      .setRanges([remarkRange])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=OR($S2="P + F",$S2="F")')
      .setBackground('#fef3c7')
      .setFontColor('#92400e')
      .setRanges([commissionTypeRange])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=OR($S2="P + F",$S2="F")')
      .setBackground('#fef3c7')
      .setFontColor('#92400e')
      .setRanges([commissionPctRange, totalCommissionRange])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$AC2="YES"')
      .setBackground('#fef08a')
      .setFontColor('#854d0e')
      .setRanges([revisitSerialRange])
      .build()
  ];
  sh.setConditionalFormatRules(rules);
}

function normalizeMonthYear_(payload) {
  var raw = String(payload.monthYear || '').toUpperCase().trim();
  if (/^[A-Z]{3}-\d{4}$/.test(raw)) {
    var parts = raw.split('-');
    if (CAL_MONTHS.indexOf(parts[0]) !== -1) return raw;
  }
  var mo = String(payload.month || '').toUpperCase().trim();
  var yr = String(payload.year || '').trim();
  if (CAL_MONTHS.indexOf(mo) !== -1 && /^\d{4}$/.test(yr)) return mo + '-' + yr;
  throw new Error('Invalid Month/Year: ' + (raw || (mo + '-' + yr)));
}

function parseMonthTabKey_(name) {
  var m = String(name || '').toUpperCase().match(/^([A-Z]{3})-(\d{4})$/);
  if (!m) return null;
  var moIdx = CAL_MONTHS.indexOf(m[1]);
  if (moIdx === -1) return null;
  return Number(m[2]) * 100 + (moIdx + 1);
}

function getQuarterFromMonth_(mo) {
  var m = String(mo || '').toUpperCase().trim();
  if (['APR', 'MAY', 'JUN'].indexOf(m) !== -1) return 'Q1';
  if (['JUL', 'AUG', 'SEP'].indexOf(m) !== -1) return 'Q2';
  if (['OCT', 'NOV', 'DEC'].indexOf(m) !== -1) return 'Q3';
  if (['JAN', 'FEB', 'MAR'].indexOf(m) !== -1) return 'Q4';
  return 'Q1';
}

function getFYFromMonthYear_(mo, yr) {
  var y = Number(yr);
  if (!y) return 'FY 26-27';
  var startY = (mo === 'JAN' || mo === 'FEB' || mo === 'MAR') ? (y - 1) : y;
  return 'FY ' + String(startY).slice(-2) + '-' + String(startY + 1).slice(-2);
}

function saveEntry(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('Missing entry.');
  var lock = LockService.getScriptLock();
  var locked = false;
  try {
    lock.waitLock(30000);
    locked = true;

    var ss = getSS_();
    var all = ss.getSheetByName('All Entries');
    if (!all) all = ss.insertSheet('All Entries');
    ensureDataSheetSchema_(all);
    styleDataSheet_(all);

    var monthYear = normalizeMonthYear_(payload);
    var salesPerson = String(payload.salesPerson || '').trim();
    var partyName = String(payload.partyName || '').trim();
    var region = String(payload.region || '').trim();
    var poNo = String(payload.poNo || '').trim();
    if (!salesPerson || !partyName || !region || !poNo) {
      throw new Error('Sales person, party, region, and PO number are required.');
    }

    // Role & PIN Authentication Verification
    var authUser = null;
    var authCode = String(payload.authCode || '').toUpperCase().trim();
    var authPin = String(payload.authPin || '').trim();
    if (authCode && authPin) {
      var internal = getSalesPersonsInternal_(ss);
      for (var u = 0; u < internal.length; u++) {
        if (internal[u].code.toUpperCase() === authCode) {
          authUser = internal[u];
          break;
        }
      }
      if (!authUser || !authUser.active || String(authUser.pin).trim() !== authPin) {
        throw new Error('Authentication failed. Invalid PIN or inactive user.');
      }
      if (authUser.role !== 'ADMIN' && salesPerson.toUpperCase() !== authUser.code.toUpperCase()) {
        throw new Error('Permission denied: Only Admin can assign entries to other sales persons.');
      }
    }

    var pv = toNum_(payload.productValue);
    var fr = toNum_(payload.freightCharges);
    var gst = round2_((pv + fr) * 0.18);
    var totalVal = round2_(pv + fr + gst);
    var commissionType = String(payload.commissionType || 'P').trim().toUpperCase();
    var pct = commissionType === 'F' ? 0 : toNum_(String(payload.commissionPct || '').replace('%', '')) / 100;
    var commVal = round2_(pv * pct);
    var commFix = commissionType === 'P' ? 0 : toNum_(payload.commissionFixed);
    var totalComm = round2_(commVal + commFix);

    var requestedId = String(payload.responseId || '').trim();
    if (requestedId && !sanitizeEditId_(requestedId)) {
      throw new Error('Invalid entry id.');
    }
    var id = sanitizeEditId_(requestedId);
    var existingRow = id ? findRow_(all, id) : 0;
    if (id && !existingRow) {
      throw new Error('Entry ' + id + ' was not found.');
    }

    if (existingRow && authUser && authUser.role !== 'ADMIN') {
      var existingRep = String(all.getRange(existingRow, 3).getValue() || '').trim().toUpperCase();
      if (existingRep && existingRep !== authUser.code.toUpperCase()) {
        throw new Error('Permission denied: Regular sales persons can only edit their own entries.');
      }
    }

    var sr = existingRow ? all.getRange(existingRow, 1).getValue() : nextSr_(all);
    if (!id) id = 'RK-' + new Date().getTime() + '-' + Math.floor(Math.random() * 10000);

    var webAppUrl = webAppUrl_();
    var editLink = webAppUrl ? (webAppUrl + '?edit=' + encodeURIComponent(id)) : '';

    var row = [
      sr,
      monthYear,
      salesPerson,
      partyName,
      region,
      poNo,
      toDate_(payload.poDate),
      payload.piNo || '',
      toDate_(payload.piDate),
      payload.invoiceNo || '',
      toDate_(payload.invoiceDate),
      payload.productKeyword || '',
      payload.productName || '',
      toNum_(payload.poValue),
      pv,
      fr,
      gst,
      totalVal,
      commissionType,
      pct,
      commFix,
      commVal,
      totalComm,
      payload.paymentTerms || '',
      payload.paymentStatus || 'PENDING',
      payload.wbBilling || '',
      payload.remark || '',
      payload.accountsRemark || '',
      (payload.revisit === true || payload.revisit === 'YES') ? 'YES' : 'NO',
      editLink,
      new Date(),
      id
    ];

    upsert_(all, existingRow, row);

    var sheets = ss.getSheets();
    for (var i = 0; i < sheets.length; i++) {
      var sh = sheets[i];
      var name = sh.getName();
      if (name === monthYear) continue;
      if (parseMonthTabKey_(name) !== null || FY_MONTHS.indexOf(name) !== -1) {
        var oldRow = findRow_(sh, id);
        if (oldRow) sh.deleteRow(oldRow);
      }
    }

    var monthSheet = getMonthSheet_(ss, monthYear);
    upsert_(monthSheet, findRow_(monthSheet, id), row);
    SpreadsheetApp.flush();

    return {
      ok: true,
      isEdit: !!existingRow,
      srNo: sr,
      responseId: id,
      monthYear: monthYear,
      dashboard: buildDashboardData_(ss, all)
    };
  } finally {
    if (locked) lock.releaseLock();
  }
}

function getDashboardData() {
  var ss = getSS_();
  var all = ss.getSheetByName('All Entries');
  return buildDashboardData_(ss, all);
}

function buildDashboardData_(ss, all) {
  var records = [];
  if (all && all.getLastRow() >= 2) {
    var vals = all.getRange(2, 1, all.getLastRow() - 1, HEADERS.length).getValues();
    for (var i = 0; i < vals.length; i++) {
      var r = vals[i];
      if (!r[0] && !r[3]) continue;
      var parsed = parseMonthYearFields_(String(r[1] || '').toUpperCase().trim());
      records.push({
        srNo: Number(r[0]) || (i + 1),
        monthYear: parsed.monthYear,
        month: parsed.month,
        year: parsed.year,
        salesPerson: String(r[2] || ''),
        partyName: String(r[3] || ''),
        region: String(r[4] || ''),
        poNo: String(r[5] || ''),
        poDate: fmtIsoDate_(r[6]),
        piNo: String(r[7] || ''),
        piDate: fmtIsoDate_(r[8]),
        invoiceNo: String(r[9] || ''),
        invoiceDate: fmtIsoDate_(r[10]),
        productKeyword: String(r[11] || ''),
        productName: String(r[12] || ''),
        poValue: toNum_(r[13]),
        productValue: toNum_(r[14]),
        freightCharges: toNum_(r[15]),
        gstValue: toNum_(r[16]),
        totalValue: toNum_(r[17]),
        commissionType: String(r[18] || ''),
        commissionPct: round2_(toNum_(r[19]) * 100),
        commissionFixed: toNum_(r[20]),
        commissionValuePct: toNum_(r[21]),
        totalCommission: toNum_(r[22]),
        paymentTerms: String(r[23] || ''),
        paymentStatus: String(r[24] || ''),
        wbBilling: String(r[25] || ''),
        remark: String(r[26] || ''),
        accountsRemark: String(r[27] || ''),
        revisit: (String(r[28] || '').toUpperCase() === 'YES' || r[28] === true),
        timestamp: (r.length >= 32 ? r[30] : r[29]) instanceof Date ? Utilities.formatDate(r.length >= 32 ? r[30] : r[29], Session.getScriptTimeZone(), 'dd-MMM-yyyy HH:mm') : String((r.length >= 32 ? r[30] : r[29]) || ''),
        responseId: String((r.length >= 32 ? r[31] : r[30]) || '')
      });
    }
  }

  var sorted = records.slice().sort(function (a, b) { return b.srNo - a.srNo; });
  return {
    sheetUrl: ss.getUrl() || '',
    salesPersons: getSalesPersonsLookup_(ss),
    totalCount: records.length,
    last10: sorted.slice(0, 10),
    allEntries: sorted
  };
}

function parseMonthYearFields_(raw) {
  var m = String(raw || '').toUpperCase().match(/^([A-Z]{3})-(\d{4})$/);
  if (m) return { monthYear: m[1] + '-' + m[2], month: m[1], year: m[2] };
  var yr = String(new Date().getFullYear());
  if (CAL_MONTHS.indexOf(raw) !== -1) return { monthYear: raw + '-' + yr, month: raw, year: yr };
  return { monthYear: raw, month: raw, year: '' };
}

function upsert_(sh, rowNum, row) {
  var targetRow = rowNum ? rowNum : sh.getLastRow() + 1;
  if (rowNum) sh.getRange(rowNum, 1, 1, row.length).setValues([row]);
  else sh.getRange(targetRow, 1, 1, row.length).setValues([row]);

  try {
    sh.getRange(targetRow, 17).setFormula('=ROUND((O' + targetRow + '+P' + targetRow + ')*0.18, 2)');
    sh.getRange(targetRow, 18).setFormula('=ROUND(O' + targetRow + '+P' + targetRow + '+Q' + targetRow + ', 2)');
    sh.getRange(targetRow, 22).setFormula('=IF(OR(S' + targetRow + '="P",S' + targetRow + '="P + F"),ROUND(O' + targetRow + '*T' + targetRow + ', 2),0)');
    sh.getRange(targetRow, 23).setFormula('=ROUND(V' + targetRow + '+IF(OR(S' + targetRow + '="F",S' + targetRow + '="P + F"),U' + targetRow + ',0), 2)');
  } catch (err) {}
}

function getMonthSheet_(ss, monthYear) {
  var sh = ss.getSheetByName(monthYear);
  if (sh) {
    ensureDataSheetSchema_(sh);
    styleDataSheet_(sh);
    return sh;
  }

  var targetKey = parseMonthTabKey_(monthYear);
  var sheets = ss.getSheets();
  var lastCore = -1;
  for (var i = 0; i < sheets.length; i++) {
    if (CORE_SHEETS[sheets[i].getName()]) lastCore = i;
  }
  var insertIdx = lastCore + 1;
  for (var j = 0; j < sheets.length; j++) {
    var k = parseMonthTabKey_(sheets[j].getName());
    if (k !== null && targetKey !== null && k < targetKey) insertIdx = Math.max(insertIdx, j + 1);
  }

  sh = ss.insertSheet(monthYear, Math.min(insertIdx, sheets.length));
  styleDataSheet_(sh);
  return sh;
}

function findRow_(sh, id) {
  var last = sh.getLastRow();
  if (last < 2) return 0;
  var ids = sh.getRange(2, ID_COL, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2;
  }
  return 0;
}

function nextSr_(sh) {
  var last = sh.getLastRow();
  if (last < 2) return 1;
  var vals = sh.getRange(2, 1, last - 1, 1).getValues();
  var max = 0;
  for (var i = 0; i < vals.length; i++) {
    var n = Number(vals[i][0]);
    if (n > max) max = n;
  }
  return max + 1;
}

function sanitizeEditId_(raw) {
  var id = String(raw || '').trim();
  return /^RK-[A-Za-z0-9-]{1,80}$/.test(id) ? id : '';
}

function webAppUrl_() {
  try { return ScriptApp.getService().getUrl() || ''; } catch (err) { return ''; }
}

function toNum_(x) {
  var n = parseFloat(String(x === null || x === undefined ? '' : x).replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
}

function round2_(n) {
  return Math.round(n * 100) / 100;
}

function toDate_(x) {
  if (!x) return '';
  if (x instanceof Date) return x;
  var p = String(x).split('-');
  if (p.length !== 3) return '';
  var dt = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  return isNaN(dt.getTime()) ? '' : dt;
}

function fmtIsoDate_(d) {
  if (!d) return '';
  if (d instanceof Date && !isNaN(d.getTime())) {
    return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(d);
}

function fmtINR_(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtINRCompact_(n) {
  return '₹' + Math.round(Number(n || 0)).toLocaleString('en-IN');
}

// =========================================================================
// EMAIL REPORTING SUBSYSTEM (MONTHLY, QUARTERLY, ANNUAL & ON-DEMAND)
// =========================================================================

/**
 * Computes performance report data based on provided filters.
 */
function generateReportData_(ss, filters) {
  filters = filters || {};
  var allSh = ss.getSheetByName('All Entries');
  var records = [];
  var reps = getSalesPersonsLookup_(ss);

  if (allSh && allSh.getLastRow() >= 2) {
    var rawVals = allSh.getRange(2, 1, allSh.getLastRow() - 1, HEADERS.length).getValues();
    for (var i = 0; i < rawVals.length; i++) {
      var r = rawVals[i];
      if (!r[0] && !r[3]) continue;
      var parsed = parseMonthYearFields_(String(r[1] || '').toUpperCase().trim());
      var fy = getFYFromMonthYear_(parsed.month, parsed.year);
      var qtr = getQuarterFromMonth_(parsed.month);

      records.push({
        srNo: Number(r[0]) || (i + 1),
        monthYear: parsed.monthYear,
        month: parsed.month,
        year: parsed.year,
        quarter: qtr,
        fy: fy,
        salesPerson: String(r[2] || '').trim(),
        partyName: String(r[3] || '').trim(),
        region: String(r[4] || '').trim(),
        poNo: String(r[5] || '').trim(),
        productKeyword: String(r[11] || '').trim(),
        productName: String(r[12] || '').trim(),
        poValue: toNum_(r[13]),
        productValue: toNum_(r[14]),
        freightCharges: toNum_(r[15]),
        gstValue: toNum_(r[16]),
        totalValue: toNum_(r[17]),
        totalCommission: toNum_(r[22]),
        paymentStatus: String(r[24] || '').trim()
      });
    }
  }

  // Filter conditions
  var periodType = String(filters.periodType || 'MONTH').toUpperCase();
  var targetMY = String(filters.monthYear || '').toUpperCase().trim();
  var targetFY = String(filters.fy || '').trim();
  var targetQuarter = String(filters.quarter || '').toUpperCase().trim();
  var targetParty = String(filters.partyName || '').toLowerCase().trim();
  var targetProduct = String(filters.productKeyword || '').toUpperCase().trim();
  var targetRep = String(filters.salesPerson || '').toUpperCase().trim();

  // If monthYear provided, auto-derive FY and Quarter if not set
  if (targetMY && /^[A-Z]{3}-\d{4}$/.test(targetMY)) {
    var parts = targetMY.split('-');
    if (!targetFY) targetFY = getFYFromMonthYear_(parts[0], parts[1]);
    if (!targetQuarter) targetQuarter = getQuarterFromMonth_(parts[0]);
  }

  function matchesEntityFilters(x) {
    if (targetParty && x.partyName.toLowerCase() !== targetParty) return false;
    if (targetProduct && x.productKeyword.toUpperCase() !== targetProduct) return false;
    if (targetRep && x.salesPerson.toUpperCase() !== targetRep) return false;
    return true;
  }

  // Filter target records based on periodType
  var targetRecords = records.filter(function (x) {
    if (!matchesEntityFilters(x)) return false;
    if (periodType === 'MONTH') {
      return x.monthYear === targetMY;
    } else if (periodType === 'QUARTER') {
      return (!targetFY || x.fy === targetFY) && x.quarter === targetQuarter;
    } else if (periodType === 'FY') {
      return x.fy === targetFY;
    }
    return true; // ALL
  });

  // Calculate aggregates helper
  function aggregate(list) {
    var s = {
      orderCount: list.length,
      totalSales: 0,
      totalCommission: 0,
      totalProductVal: 0,
      totalFreight: 0,
      totalGst: 0,
      collectedSales: 0,
      pendingSales: 0,
      pendingCount: 0
    };
    list.forEach(function (x) {
      s.totalSales += x.totalValue;
      s.totalCommission += x.totalCommission;
      s.totalProductVal += x.productValue;
      s.totalFreight += x.freightCharges;
      s.totalGst += x.gstValue;
      if (x.paymentStatus === 'RCD') {
        s.collectedSales += x.totalValue;
      } else {
        s.pendingSales += x.totalValue;
        s.pendingCount += 1;
      }
    });
    s.totalSales = round2_(s.totalSales);
    s.totalCommission = round2_(s.totalCommission);
    s.totalProductVal = round2_(s.totalProductVal);
    s.totalFreight = round2_(s.totalFreight);
    s.totalGst = round2_(s.totalGst);
    s.collectedSales = round2_(s.collectedSales);
    s.pendingSales = round2_(s.pendingSales);
    return s;
  }

  var targetMetrics = aggregate(targetRecords);

  // Multi-period QTD and FYTD aggregates (when periodType === 'MONTH')
  var qtdMetrics = null;
  var fytdMetrics = null;
  if (targetMY && targetFY && targetQuarter) {
    var qtdRecords = records.filter(function (x) {
      return matchesEntityFilters(x) && x.fy === targetFY && x.quarter === targetQuarter;
    });
    qtdMetrics = aggregate(qtdRecords);

    var fytdRecords = records.filter(function (x) {
      return matchesEntityFilters(x) && x.fy === targetFY;
    });
    fytdMetrics = aggregate(fytdRecords);
  }

  // Salesperson breakdown for targetRecords
  var repMap = {};
  reps.forEach(function (sp) {
    repMap[sp.code] = { code: sp.code, name: sp.name, role: sp.role, orders: 0, totalSales: 0, commission: 0, pendingSales: 0 };
  });
  targetRecords.forEach(function (x) {
    var rep = repMap[x.salesPerson];
    if (!rep) {
      rep = { code: x.salesPerson, name: x.salesPerson, role: 'SALES', orders: 0, totalSales: 0, commission: 0, pendingSales: 0 };
      repMap[x.salesPerson] = rep;
    }
    rep.orders += 1;
    rep.totalSales += x.totalValue;
    rep.commission += x.totalCommission;
    if (x.paymentStatus !== 'RCD') rep.pendingSales += x.totalValue;
  });
  var repBreakdown = Object.keys(repMap).map(function (k) {
    var obj = repMap[k];
    obj.totalSales = round2_(obj.totalSales);
    obj.commission = round2_(obj.commission);
    obj.pendingSales = round2_(obj.pendingSales);
    return obj;
  }).filter(function (r) { return r.orders > 0 || !targetRep; });

  // Top Parties (Top 5 by total sales)
  var partyMap = {};
  targetRecords.forEach(function (x) {
    var p = partyMap[x.partyName];
    if (!p) {
      p = { partyName: x.partyName, orders: 0, totalSales: 0, pendingSales: 0 };
      partyMap[x.partyName] = p;
    }
    p.orders += 1;
    p.totalSales += x.totalValue;
    if (x.paymentStatus !== 'RCD') p.pendingSales += x.totalValue;
  });
  var topParties = Object.keys(partyMap).map(function (k) {
    var p = partyMap[k];
    p.totalSales = round2_(p.totalSales);
    p.pendingSales = round2_(p.pendingSales);
    return p;
  }).sort(function (a, b) { return b.totalSales - a.totalSales; }).slice(0, 5);

  // Product breakdown
  var prodMap = {};
  targetRecords.forEach(function (x) {
    var kw = x.productKeyword || 'OTHER';
    var item = prodMap[kw];
    if (!item) {
      item = { keyword: kw, orders: 0, totalSales: 0 };
      prodMap[kw] = item;
    }
    item.orders += 1;
    item.totalSales += x.totalValue;
  });
  var prodBreakdown = Object.keys(prodMap).map(function (k) {
    var item = prodMap[k];
    item.totalSales = round2_(item.totalSales);
    return item;
  }).sort(function (a, b) { return b.totalSales - a.totalSales; });

  return {
    periodType: periodType,
    monthYear: targetMY,
    quarter: targetQuarter,
    fy: targetFY,
    filters: {
      partyName: filters.partyName || 'All Parties',
      productKeyword: filters.productKeyword || 'All Products',
      salesPerson: filters.salesPerson || 'All Sales Persons'
    },
    metrics: targetMetrics,
    qtdMetrics: qtdMetrics,
    fytdMetrics: fytdMetrics,
    repBreakdown: repBreakdown,
    topParties: topParties,
    prodBreakdown: prodBreakdown
  };
}

/**
 * Builds responsive, professionally formatted HTML email.
 */
function buildHtmlReportEmail_(report, webAppUrl, sheetUrl) {
  var m = report.metrics;
  var pLabel = '';
  if (report.periodType === 'MONTH') pLabel = 'Monthly Report — ' + report.monthYear;
  else if (report.periodType === 'QUARTER') pLabel = 'Quarterly Report — ' + report.quarter + ' (' + report.fy + ')';
  else if (report.periodType === 'FY') pLabel = 'Annual Report — ' + report.fy;
  else pLabel = 'All-Time RK Sales Report';

  var filterNotice = '';
  if (report.filters.partyName !== 'All Parties' || report.filters.productKeyword !== 'All Products' || report.filters.salesPerson !== 'All Sales Persons') {
    filterNotice = '<div style="background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:8px 12px;margin-bottom:16px;font-size:12px;color:#1e40af;">' +
      '<strong>Filtered:</strong> Client: <em>' + report.filters.partyName + '</em> | Product: <em>' + report.filters.productKeyword + '</em> | Rep: <em>' + report.filters.salesPerson + '</em>' +
      '</div>';
  }

  // Multi-period table (Month vs QTD vs FYTD)
  var multiPeriodHtml = '';
  if (report.periodType === 'MONTH' && report.qtdMetrics && report.fytdMetrics) {
    multiPeriodHtml =
      '<div style="margin-top:20px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:16px;">' +
        '<div style="font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;margin-bottom:12px;">Multi-Period Performance Matrix</div>' +
        '<table style="width:100%;border-collapse:collapse;font-size:13px;text-align:left;">' +
          '<thead>' +
            '<tr style="border-bottom:2px solid #e2e8f0;color:#475569;">' +
              '<th style="padding:8px 6px;font-weight:600;">Metric</th>' +
              '<th style="padding:8px 6px;font-weight:600;text-align:right;">Month (' + report.monthYear + ')</th>' +
              '<th style="padding:8px 6px;font-weight:600;text-align:right;">' + report.quarter + ' QTD</th>' +
              '<th style="padding:8px 6px;font-weight:600;text-align:right;">' + report.fy + ' FYTD</th>' +
            '</tr>' +
          '</thead>' +
          '<tbody>' +
            '<tr style="border-bottom:1px solid #f1f5f9;">' +
              '<td style="padding:8px 6px;color:#1e293b;font-weight:500;">Total Sales</td>' +
              '<td style="padding:8px 6px;text-align:right;font-weight:bold;color:#0f172a;">' + fmtINR_(m.totalSales) + '</td>' +
              '<td style="padding:8px 6px;text-align:right;font-weight:bold;color:#0f172a;">' + fmtINR_(report.qtdMetrics.totalSales) + '</td>' +
              '<td style="padding:8px 6px;text-align:right;font-weight:bold;color:#0f172a;">' + fmtINR_(report.fytdMetrics.totalSales) + '</td>' +
            '</tr>' +
            '<tr style="border-bottom:1px solid #f1f5f9;">' +
              '<td style="padding:8px 6px;color:#1e293b;font-weight:500;">Total Commission</td>' +
              '<td style="padding:8px 6px;text-align:right;font-weight:bold;color:#0284c7;">' + fmtINR_(m.totalCommission) + '</td>' +
              '<td style="padding:8px 6px;text-align:right;font-weight:bold;color:#0284c7;">' + fmtINR_(report.qtdMetrics.totalCommission) + '</td>' +
              '<td style="padding:8px 6px;text-align:right;font-weight:bold;color:#0284c7;">' + fmtINR_(report.fytdMetrics.totalCommission) + '</td>' +
            '</tr>' +
            '<tr style="border-bottom:1px solid #f1f5f9;">' +
              '<td style="padding:8px 6px;color:#1e293b;font-weight:500;">Orders Count</td>' +
              '<td style="padding:8px 6px;text-align:right;color:#475569;">' + m.orderCount + '</td>' +
              '<td style="padding:8px 6px;text-align:right;color:#475569;">' + report.qtdMetrics.orderCount + '</td>' +
              '<td style="padding:8px 6px;text-align:right;color:#475569;">' + report.fytdMetrics.orderCount + '</td>' +
            '</tr>' +
            '<tr>' +
              '<td style="padding:8px 6px;color:#1e293b;font-weight:500;">Payment Pending</td>' +
              '<td style="padding:8px 6px;text-align:right;font-weight:bold;color:#e11d48;">' + fmtINR_(m.pendingSales) + '</td>' +
              '<td style="padding:8px 6px;text-align:right;font-weight:bold;color:#e11d48;">' + fmtINR_(report.qtdMetrics.pendingSales) + '</td>' +
              '<td style="padding:8px 6px;text-align:right;font-weight:bold;color:#e11d48;">' + fmtINR_(report.fytdMetrics.pendingSales) + '</td>' +
            '</tr>' +
          '</tbody>' +
        '</table>' +
      '</div>';
  }

  // Rep table
  var repRows = report.repBreakdown.map(function (sp) {
    return (
      '<tr style="border-bottom:1px solid #f1f5f9;">' +
        '<td style="padding:8px 6px;font-weight:600;color:#0f172a;">' + sp.code + ' <span style="font-size:11px;font-weight:normal;color:#64748b;">(' + sp.name + ')</span></td>' +
        '<td style="padding:8px 6px;text-align:right;color:#334155;">' + sp.orders + '</td>' +
        '<td style="padding:8px 6px;text-align:right;font-weight:bold;color:#0f172a;">' + fmtINRCompact_(sp.totalSales) + '</td>' +
        '<td style="padding:8px 6px;text-align:right;color:#0284c7;font-weight:600;">' + fmtINRCompact_(sp.commission) + '</td>' +
        '<td style="padding:8px 6px;text-align:right;color:#e11d48;font-weight:600;">' + fmtINRCompact_(sp.pendingSales) + '</td>' +
      '</tr>'
    );
  }).join('');

  // Top Parties table
  var partyRows = report.topParties.map(function (p) {
    return (
      '<tr style="border-bottom:1px solid #f1f5f9;">' +
        '<td style="padding:7px 6px;font-weight:600;color:#1e293b;">' + p.partyName + '</td>' +
        '<td style="padding:7px 6px;text-align:right;color:#475569;">' + p.orders + '</td>' +
        '<td style="padding:7px 6px;text-align:right;font-weight:bold;color:#0f172a;">' + fmtINRCompact_(p.totalSales) + '</td>' +
      '</tr>'
    );
  }).join('');

  // Product table
  var prodRows = report.prodBreakdown.map(function (item) {
    return (
      '<tr style="border-bottom:1px solid #f1f5f9;">' +
        '<td style="padding:7px 6px;font-weight:600;color:#1e293b;">' + item.keyword + '</td>' +
        '<td style="padding:7px 6px;text-align:right;color:#475569;">' + item.orders + '</td>' +
        '<td style="padding:7px 6px;text-align:right;font-weight:bold;color:#0f172a;">' + fmtINRCompact_(item.totalSales) + '</td>' +
      '</tr>'
    );
  }).join('');

  return (
    '<!DOCTYPE html>' +
    '<html>' +
    '<head><meta charset="utf-8"/><title>' + pLabel + '</title></head>' +
    '<body style="margin:0;padding:20px;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">' +
      '<div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.06);border:1px solid #e2e8f0;">' +
        // Brand Header
        '<div style="background-color:#0f172a;color:#ffffff;padding:24px 20px;text-align:center;">' +
          '<h1 style="margin:0;font-size:20px;font-weight:bold;letter-spacing:-0.5px;">RK Sales Master</h1>' +
          '<p style="margin:6px 0 0 0;font-size:14px;color:#94a3b8;font-weight:500;">' + pLabel + '</p>' +
        '</div>' +

        '<div style="padding:20px;">' +
          filterNotice +

          // 4 Executive KPI Cards
          '<table style="width:100%;border-collapse:separate;border-spacing:8px;margin-bottom:12px;">' +
            '<tr>' +
              '<td style="width:50%;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px;vertical-align:top;">' +
                '<div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;">Total Sales</div>' +
                '<div style="font-size:20px;font-weight:bold;color:#0f172a;margin-top:4px;">' + fmtINR_(m.totalSales) + '</div>' +
                '<div style="font-size:11px;color:#64748b;margin-top:2px;">' + m.orderCount + ' orders recorded</div>' +
              '</td>' +
              '<td style="width:50%;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px;vertical-align:top;">' +
                '<div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;">Total Commission</div>' +
                '<div style="font-size:20px;font-weight:bold;color:#0284c7;margin-top:4px;">' + fmtINR_(m.totalCommission) + '</div>' +
                '<div style="font-size:11px;color:#64748b;margin-top:2px;">Prod Val: ' + fmtINRCompact_(m.totalProductVal) + '</div>' +
              '</td>' +
            '</tr>' +
            '<tr>' +
              '<td style="width:50%;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px;vertical-align:top;">' +
                '<div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;">Payment Pending</div>' +
                '<div style="font-size:20px;font-weight:bold;color:#e11d48;margin-top:4px;">' + fmtINR_(m.pendingSales) + '</div>' +
                '<div style="font-size:11px;color:#64748b;margin-top:2px;">' + m.pendingCount + ' pending orders</div>' +
              '</td>' +
              '<td style="width:50%;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px;vertical-align:top;">' +
                '<div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;">Collected (RCD)</div>' +
                '<div style="font-size:20px;font-weight:bold;color:#059669;margin-top:4px;">' + fmtINR_(m.collectedSales) + '</div>' +
                '<div style="font-size:11px;color:#64748b;margin-top:2px;">GST: ' + fmtINRCompact_(m.totalGst) + '</div>' +
              '</td>' +
            '</tr>' +
          '</table>' +

          multiPeriodHtml +

          // Rep Breakdown
          '<div style="margin-top:20px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:16px;">' +
            '<div style="font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;margin-bottom:12px;">Performance By Sales Person</div>' +
            '<table style="width:100%;border-collapse:collapse;font-size:12px;text-align:left;">' +
              '<thead>' +
                '<tr style="border-bottom:2px solid #e2e8f0;color:#475569;">' +
                  '<th style="padding:6px;font-weight:600;">Rep</th>' +
                  '<th style="padding:6px;font-weight:600;text-align:right;">Orders</th>' +
                  '<th style="padding:6px;font-weight:600;text-align:right;">Total ₹</th>' +
                  '<th style="padding:6px;font-weight:600;text-align:right;">Comm ₹</th>' +
                  '<th style="padding:6px;font-weight:600;text-align:right;">Pending ₹</th>' +
                '</tr>' +
              '</thead>' +
              '<tbody>' + (repRows || '<tr><td colspan="5" style="padding:10px;text-align:center;color:#94a3b8;">No rep data for this period</td></tr>') + '</tbody>' +
            '</table>' +
          '</div>' +

          // Two-column layout for Top Clients and Products
          '<table style="width:100%;border-collapse:separate;border-spacing:8px;margin-top:12px;">' +
            '<tr>' +
              '<td style="width:50%;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:14px;vertical-align:top;">' +
                '<div style="font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;margin-bottom:10px;">Top Customers</div>' +
                '<table style="width:100%;border-collapse:collapse;font-size:11px;text-align:left;">' +
                  '<thead><tr style="border-bottom:2px solid #e2e8f0;color:#475569;"><th style="padding:4px;">Party</th><th style="padding:4px;text-align:right;">Orders</th><th style="padding:4px;text-align:right;">Total ₹</th></tr></thead>' +
                  '<tbody>' + (partyRows || '<tr><td colspan="3" style="padding:8px;text-align:center;color:#94a3b8;">No party data</td></tr>') + '</tbody>' +
                '</table>' +
              '</td>' +
              '<td style="width:50%;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:14px;vertical-align:top;">' +
                '<div style="font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;margin-bottom:10px;">Product Distribution</div>' +
                '<table style="width:100%;border-collapse:collapse;font-size:11px;text-align:left;">' +
                  '<thead><tr style="border-bottom:2px solid #e2e8f0;color:#475569;"><th style="padding:4px;">Keyword</th><th style="padding:4px;text-align:right;">Orders</th><th style="padding:4px;text-align:right;">Total ₹</th></tr></thead>' +
                  '<tbody>' + (prodRows || '<tr><td colspan="3" style="padding:8px;text-align:center;color:#94a3b8;">No product data</td></tr>') + '</tbody>' +
                '</table>' +
              '</td>' +
            '</tr>' +
          '</table>' +

          // Action Buttons
          '<div style="margin-top:24px;text-align:center;">' +
            '<a href="' + (webAppUrl || '#') + '" target="_blank" style="display:inline-block;padding:10px 20px;border-radius:8px;background-color:#1e3a8a;color:#ffffff;text-decoration:none;font-weight:bold;font-size:13px;margin:0 6px;">Open Web App</a>' +
            '<a href="' + (sheetUrl || '#') + '" target="_blank" style="display:inline-block;padding:10px 20px;border-radius:8px;background-color:#059669;color:#ffffff;text-decoration:none;font-weight:bold;font-size:13px;margin:0 6px;">Open Google Sheet</a>' +
          '</div>' +
        '</div>' +

        // Footer
        '<div style="background-color:#f1f5f9;border-top:1px solid #e2e8f0;padding:14px 20px;text-align:center;font-size:11px;color:#64748b;">' +
          'Generated automatically by RK Sales Master • ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd-MMM-yyyy HH:mm') +
        '</div>' +
      '</div>' +
    '</body>' +
    '</html>'
  );
}

/**
 * On-demand email report dispatcher.
 * Validates admin authentication and dispatches filtered report.
 */
function sendEmailReport(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('Missing report payload.');
  var ss = getSS_();
  var authCode = String(payload.authCode || '').toUpperCase().trim();
  var authPin = String(payload.authPin || '').trim();

  // Authentication check
  var internal = getSalesPersonsInternal_(ss);
  var authUser = null;
  for (var i = 0; i < internal.length; i++) {
    if (internal[i].code.toUpperCase() === authCode) {
      authUser = internal[i];
      break;
    }
  }
  if (!authUser || !authUser.active || String(authUser.pin).trim() !== authPin) {
    throw new Error('Authentication failed. Please verify your PIN.');
  }
  if (authUser.role !== 'ADMIN') {
    throw new Error('Permission denied: Only Admin can dispatch email reports.');
  }

  // Recipient resolution
  var toEmails = String(payload.toEmails || '').trim();
  if (!toEmails) {
    var adminEmails = getAdminEmails_(ss);
    if (!adminEmails.length) throw new Error('No recipient email specified and no Admin email configured in Lookup tab.');
    toEmails = adminEmails.join(', ');
  }

  var reportData = generateReportData_(ss, payload.filters || {});
  var webAppUrl = webAppUrl_();
  var sheetUrl = ss.getUrl();
  var htmlBody = buildHtmlReportEmail_(reportData, webAppUrl, sheetUrl);

  var periodLabel = reportData.periodType === 'MONTH' ? reportData.monthYear :
    (reportData.periodType === 'QUARTER' ? (reportData.quarter + ' ' + reportData.fy) :
    (reportData.periodType === 'FY' ? reportData.fy : 'All-Time'));

  var subject = 'RK Sales Report — ' + periodLabel + ' (Sales: ' + fmtINRCompact_(reportData.metrics.totalSales) + ')';

  MailApp.sendEmail({
    to: toEmails,
    subject: subject,
    htmlBody: htmlBody
  });

  return {
    ok: true,
    message: 'Report successfully sent to ' + toEmails,
    period: periodLabel,
    totalSales: reportData.metrics.totalSales
  };
}

/**
 * Automated monthly scheduled email report job.
 * Executes on the 1st of every month, computes the previous closed month,
 * active quarter and active FY, and emails all active Admins configured in Lookup.
 */
function sendAutomatedMonthlyEmailReport() {
  var ss = getSS_();
  var adminEmails = getAdminEmails_(ss);
  if (!adminEmails.length) {
    console.warn('sendAutomatedMonthlyEmailReport: No active Admin emails configured in Lookup sheet. Aborting.');
    return { ok: false, message: 'No Admin email found in Lookup tab.' };
  }

  // Calculate previous closed month
  var now = new Date();
  var prevMonthIdx = now.getMonth() - 1;
  var prevYear = now.getFullYear();
  if (prevMonthIdx < 0) {
    prevMonthIdx = 11;
    prevYear -= 1;
  }
  var prevMonthName = CAL_MONTHS[prevMonthIdx];
  var targetMY = prevMonthName + '-' + prevYear;
  var targetFY = getFYFromMonthYear_(prevMonthName, prevYear);
  var targetQuarter = getQuarterFromMonth_(prevMonthName);

  var reportData = generateReportData_(ss, {
    periodType: 'MONTH',
    monthYear: targetMY,
    fy: targetFY,
    quarter: targetQuarter
  });

  var webAppUrl = webAppUrl_();
  var sheetUrl = ss.getUrl();
  var htmlBody = buildHtmlReportEmail_(reportData, webAppUrl, sheetUrl);

  // Check if previous month closed a quarter or FY
  var isQuarterEnd = (prevMonthName === 'JUN' || prevMonthName === 'SEP' || prevMonthName === 'DEC' || prevMonthName === 'MAR');
  var isFyEnd = (prevMonthName === 'MAR');
  var milestoneTag = isFyEnd ? ' [Annual & Q4 Closure]' : (isQuarterEnd ? (' [' + targetQuarter + ' Closure]') : '');

  var subject = 'RK Sales Monthly Report — ' + targetMY + milestoneTag + ' (Sales: ' + fmtINRCompact_(reportData.metrics.totalSales) + ')';

  MailApp.sendEmail({
    to: adminEmails.join(', '),
    subject: subject,
    htmlBody: htmlBody
  });

  console.log('Automated monthly report sent for ' + targetMY + ' to ' + adminEmails.join(', '));
  return { ok: true, monthYear: targetMY, recipients: adminEmails };
}

/**
 * Creates an automated monthly trigger running on the 1st of each month at 08:00 AM.
 */
function setupMonthlyEmailTrigger() {
  removeMonthlyEmailTrigger();
  ScriptApp.newTrigger('sendAutomatedMonthlyEmailReport')
    .timeBased()
    .onMonthDay(1)
    .atHour(8)
    .create();

  try {
    SpreadsheetApp.getUi().alert(
      'Automated Trigger Installed',
      'RK Sales will now automatically generate and email the Monthly & Quarterly report to all configured Admins on the 1st of every month at 08:00 AM.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } catch (e) {}
  return true;
}

/**
 * Removes any existing automated monthly email trigger.
 */
function removeMonthlyEmailTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'sendAutomatedMonthlyEmailReport') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
}

// =========================================================================
// AUTOMATED NIGHTLY BACKUP SUBSYSTEM (30-DAY RETENTION)
// =========================================================================

/**
 * Creates a complete snapshot backup copy of the master spreadsheet
 * in the "RK Sales Backups" Google Drive folder, and deletes backups older than 30 days.
 */
function createDataBackup() {
  var ss = getSS_();
  var now = new Date();
  var tz = Session.getScriptTimeZone();
  var timeStamp = Utilities.formatDate(now, tz, 'yyyy-MM-dd_HHmm');
  var backupName = 'RK_Sales_Backup_' + timeStamp;

  var folderName = 'RK Sales Backups';
  var folders = DriveApp.getFoldersByName(folderName);
  var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);

  var masterFile = DriveApp.getFileById(ss.getId());
  var backupFile = masterFile.makeCopy(backupName, folder);

  // 30-day retention cleanup
  var thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
  var files = folder.getFiles();
  var deletedCount = 0;
  while (files.hasNext()) {
    var f = files.next();
    if (String(f.getName()).indexOf('RK_Sales_Backup_') === 0) {
      var created = f.getDateCreated();
      if (created && created < thirtyDaysAgo) {
        f.setTrashed(true);
        deletedCount++;
      }
    }
  }

  console.log('Backup created: ' + backupName + ' (Retention purged ' + deletedCount + ' old backups)');
  return {
    ok: true,
    fileName: backupName,
    fileId: backupFile.getId(),
    fileUrl: backupFile.getUrl ? backupFile.getUrl() : '',
    folderUrl: folder.getUrl ? folder.getUrl() : '',
    deletedCount: deletedCount
  };
}

/**
 * Installs a nightly Apps Script trigger to run createDataBackup() daily at 1:00 AM.
 */
function setupNightlyBackupTrigger() {
  removeNightlyBackupTrigger();
  ScriptApp.newTrigger('createDataBackup')
    .timeBased()
    .everyDays(1)
    .atHour(1)
    .create();

  try {
    SpreadsheetApp.getUi().alert(
      'Nightly Backup Trigger Installed',
      'RK Sales will automatically back up all data to Google Drive folder "RK Sales Backups" every night at 1:00 AM (30-day retention).',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } catch (e) {}
  return true;
}

/**
 * Removes any active nightly backup trigger.
 */
function removeNightlyBackupTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'createDataBackup') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  return true;
}

/**
 * Admin on-demand backup endpoint from the Web App.
 */
function triggerManualBackup(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('Missing backup payload.');
  var ss = getSS_();
  var authCode = String(payload.authCode || '').toUpperCase().trim();
  var authPin = String(payload.authPin || '').trim();

  var internal = getSalesPersonsInternal_(ss);
  var authUser = null;
  for (var i = 0; i < internal.length; i++) {
    if (internal[i].code.toUpperCase() === authCode) {
      authUser = internal[i];
      break;
    }
  }
  if (!authUser || !authUser.active || String(authUser.pin).trim() !== authPin) {
    throw new Error('Authentication failed. Please verify your PIN.');
  }
  if (authUser.role !== 'ADMIN') {
    throw new Error('Permission denied: Only Admin can trigger on-demand backups.');
  }

  return createDataBackup();
}
