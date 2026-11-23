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
 *   Dashboard, Report, Lookup, and one tab per month (NOV-2026).
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
var CORE_SHEETS = { Dashboard: true, Report: true, Lookup: true };
var DEFAULT_SALES_PERSONS = [
  ['RK', 'Rahul Kodag', 'YES', '1234', 'ADMIN', 'rahulkodag@example.com'],
  ['TK', 'Trupti Kodag', 'YES', '1111', 'SALES', ''],
  ['SC', 'Swapnil Chikhale', 'YES', '2222', 'SALES', ''],
  ['OT', 'Other', 'YES', '3333', 'SALES', ''],
  ['ADMIN', 'Administrator', 'YES', '9999', 'ADMIN', 'admin@example.com']
];
var DEFAULT_REGIONS = ['R - Pune', 'N - Pune', 'MP', 'WB'];
var HEADERS = [
  'Sr. No.', 'MONTH', 'Sales Person', 'Party Name', 'Region',
  'Po No.', 'Po Date', 'PI No.', 'PI Date', 'Invoice No.', 'Invoice Date',
  'Product Keyword', 'Product Name', 'PO Value', 'Product Value', 'Freight Charges',
  'GST Value', 'Total Value', 'Commission Type', 'Commission %', 'Commission Fixed',
  'Commission Value %', 'Total Commission', 'Payment Terms', 'Paymet Status',
  'WB/Billing', 'Remark', 'Accounts Remark', 'Revisit', 'Edit Link', 'Timestamp', 'Response ID'
];
var ID_COL = HEADERS.length;

function doGet(e) {
  var pwaAsset = e && e.parameter ? String(e.parameter.pwa || '') : '';
  if (pwaAsset === 'manifest') {
    var appUrl = ScriptApp.getService().getUrl() || './';
    var iconSvg = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">' +
      '<defs>' +
      '<linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">' +
      '<stop offset="0%" stop-color="#090d16"/><stop offset="50%" stop-color="#0f172a"/><stop offset="100%" stop-color="#1e293b"/>' +
      '</linearGradient>' +
      '<linearGradient id="tg" x1="0%" y1="0%" x2="100%" y2="100%">' +
      '<stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#e2e8f0"/>' +
      '</linearGradient>' +
      '<linearGradient id="ag" x1="0%" y1="100%" x2="100%" y2="0%">' +
      '<stop offset="0%" stop-color="#059669"/><stop offset="50%" stop-color="#10b981"/><stop offset="100%" stop-color="#34d399"/>' +
      '</linearGradient>' +
      '</defs>' +
      '<rect x="16" y="16" width="480" height="480" rx="104" fill="url(#bg)" stroke="#334155" stroke-width="4"/>' +
      '<path d="M 116 135 L 116 365 M 116 135 L 210 135 C 260 135, 260 230, 210 230 L 116 230 M 180 225 L 260 365" fill="none" stroke="url(#tg)" stroke-width="42" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M 296 135 L 296 365 M 405 145 L 302 250 M 336 220 L 420 365" fill="none" stroke="url(#tg)" stroke-width="42" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M 96 385 C 190 380, 260 320, 395 130" fill="none" stroke="url(#ag)" stroke-width="16" stroke-linecap="round"/>' +
      '<polygon points="405,105 425,160 370,140" fill="#34d399"/>' +
      '<rect x="166" y="405" width="180" height="42" rx="21" fill="#0f172a" stroke="#0ea5e9" stroke-width="2"/>' +
      '<text x="256" y="433" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,Inter,sans-serif" font-size="20" font-weight="800" fill="#38bdf8" letter-spacing="4">SALES</text>' +
      '</svg>'
    );
    return ContentService.createTextOutput(JSON.stringify({
      name: 'RK Sales',
      short_name: 'RK Sales',
      description: 'Offline-first sales entry and dashboard',
      start_url: appUrl,
      scope: appUrl,
      display: 'standalone',
      background_color: '#f1f5f9',
      theme_color: '#0f172a',
      icons: [
        {
          src: iconSvg,
          sizes: '512x512',
          type: 'image/svg+xml',
          purpose: 'any maskable'
        }
      ]
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
    "const CACHE = 'rk-sales-pwa-v2';",
    "const STATIC_ASSETS = [",
    "  'https://cdn.tailwindcss.com/3.4.17',",
    "  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',",
    "  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'",
    "];",
    "",
    "self.addEventListener('install', function (e) {",
    "  e.waitUntil(",
    "    caches.open(CACHE).then(async function (c) {",
    "      try { await c.addAll(STATIC_ASSETS); } catch (_) {}",
    "      try { await c.add(location.href.replace(/[?&]pwa=sw/, '').replace(/[?&]$/, '')); } catch (_) {}",
    "    })",
    "  );",
    "  self.skipWaiting();",
    "});",
    "",
    "self.addEventListener('activate', function (e) {",
    "  e.waitUntil(",
    "    caches.keys().then(function (keys) {",
    "      return Promise.all(",
    "        keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })",
    "      );",
    "    }).then(function () {",
    "      return self.clients.claim();",
    "    })",
    "  );",
    "});",
    "",
    "function isStaticAsset(url) {",
    "  return STATIC_ASSETS.some(function (cdn) { return url.startsWith(cdn); }) ||",
    "    url.indexOf('fonts.gstatic.com') !== -1 ||",
    "    url.indexOf('cdn.jsdelivr.net') !== -1 ||",
    "    url.indexOf('cdn.tailwindcss.com') !== -1 ||",
    "    /\\.(css|js|woff2?|ttf|png|jpe?g|gif|svg|ico)$/i.test(url);",
    "}",
    "",
    "self.addEventListener('fetch', function (e) {",
    "  if (e.request.method !== 'GET') return;",
    "  var url = e.request.url;",
    "",
    "  // 1. Cache-first strategy for static assets",
    "  if (isStaticAsset(url)) {",
    "    e.respondWith(",
    "      caches.match(e.request).then(function (cached) {",
    "        if (cached) return cached;",
    "        return fetch(e.request).then(function (res) {",
    "          if (res && res.status === 200) {",
    "            var copy = res.clone();",
    "            caches.open(CACHE).then(function (c) { c.put(e.request, copy); });",
    "          }",
    "          return res;",
    "        }).catch(function () { return caches.match(e.request); });",
    "      })",
    "    );",
    "    return;",
    "  }",
    "",
    "  // 2. Network-first strategy for data, document and navigation requests",
    "  e.respondWith(",
    "    fetch(e.request).then(function (res) {",
    "      if (res && res.status === 200) {",
    "        var copy = res.clone();",
    "        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });",
    "      }",
    "      return res;",
    "    }).catch(function () {",
    "      return caches.match(e.request).then(function (fallback) {",
    "        return fallback || caches.match('/') || caches.match(location.href.replace(/[?&]pwa=sw/, '').replace(/[?&]$/, ''));",
    "      });",
    "    })",
    "  );",
    "});",
    "",
    "// 3. Message listener for background sync and skipWaiting",
    "self.addEventListener('message', function (e) {",
    "  if (!e.data) return;",
    "  if (e.data.type === 'SKIP_WAITING') {",
    "    self.skipWaiting();",
    "  }",
    "  if (e.data.type === 'SYNC_NOW' || e.data.type === 'BACKGROUND_SYNC') {",
    "    e.waitUntil(",
    "      self.clients.matchAll({ type: 'window' }).then(function (clients) {",
    "        clients.forEach(function (client) {",
    "          client.postMessage({ type: 'SYNC_TRIGGERED', timestamp: Date.now() });",
    "        });",
    "      })",
    "    );",
    "  }",
    "});",
    "",
    "// Background Sync API support where available",
    "self.addEventListener('sync', function (e) {",
    "  if (e.tag === 'rk-sales-sync' || e.tag === 'pending-sync') {",
    "    e.waitUntil(",
    "      self.clients.matchAll({ type: 'window' }).then(function (clients) {",
    "        clients.forEach(function (client) {",
    "          client.postMessage({ type: 'SYNC_TRIGGERED', tag: e.tag });",
    "        });",
    "      })",
    "    );",
    "  }",
    "});"
  ].join('\n');
}

function bootJson_(editId) {
  var payload = { editId: sanitizeEditId_(editId) };
  try {
    var ss = getSS_();
    if (ss) {
      payload.salesPersons = getSalesPersonsLookup_(ss);
      payload.regions = getRegionsLookup_(ss);
    }
  } catch (e) {
    // Graceful fallback if spreadsheet is not immediately available during boot
  }
  return JSON.stringify(payload).replace(/</g, '\\u003c');
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('RK Sales')
    .addItem('Set up sheets', 'setupRKSalesSheets')
    .addItem('Show web app link', 'showWebAppLink')
    .addItem('Refresh sheet formatting (All tabs)', 'applyFormattingToAllSheets')
    .addItem('Update month sheet totals', 'updateAllMonthSheetsSummaryRows')
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
 * Returns active regions from the spreadsheet.
 * Flexibly auto-detects:
 * 1. Dedicated sheet: 'Region', 'Regions', 'Region Lookup', 'Regions Lookup', 'Territory', 'Territories'
 * 2. 'Lookup' sheet: searches row 1 for header containing 'REGION' (e.g. Region, Regions, Region Name, Territory, Zone)
 * 3. 'Lookup' sheet: Column H & I (fallback)
 * Initializes Column H & I in 'Lookup' only if no region configuration is found anywhere.
 */
function getRegionsLookup_(ss) {
  if (!ss) return DEFAULT_REGIONS.slice();

  function extractRegionsFromValues_(vals, regColIdx, activeColIdx) {
    var list = [];
    for (var i = 0; i < vals.length; i++) {
      var row = vals[i];
      var reg = String(row[regColIdx] || '').trim();
      if (!reg) continue;
      var upperReg = reg.toUpperCase();
      if (upperReg === 'REGION' || upperReg === 'REGIONS' || upperReg === 'REGION NAME' || upperReg === 'TERRITORY' || upperReg === 'ZONE') {
        continue;
      }
      var isActive = true;
      if (activeColIdx >= 0 && activeColIdx < row.length) {
        var activeVal = String(row[activeColIdx] === '' || row[activeColIdx] === null || row[activeColIdx] === undefined ? 'YES' : row[activeColIdx]).toUpperCase().trim();
        isActive = (activeVal !== 'NO' && activeVal !== 'FALSE' && activeVal !== 'N' && activeVal !== '0');
      }
      if (isActive && list.indexOf(reg) === -1) {
        list.push(reg);
      }
    }
    return list;
  }

  // 1. Check for dedicated region sheets
  var dedicatedNames = ['Region', 'Regions', 'Region Lookup', 'Regions Lookup', 'Territory', 'Territories'];
  for (var d = 0; d < dedicatedNames.length; d++) {
    var regSheet = ss.getSheetByName(dedicatedNames[d]);
    if (regSheet) {
      var rLast = regSheet.getLastRow();
      var cLast = regSheet.getLastColumn();
      if (rLast >= 1 && cLast >= 1) {
        var allVals = regSheet.getRange(1, 1, rLast, cLast).getValues();
        var headerRow = allVals[0] || [];
        var rCol = 0;
        var aCol = -1;
        for (var c = 0; c < headerRow.length; c++) {
          var h = String(headerRow[c] || '').trim().toUpperCase();
          if (h.indexOf('REGION') !== -1 || h === 'TERRITORY' || h === 'ZONE' || h === 'NAME') {
            rCol = c;
          }
          if (h === 'ACTIVE' || h === 'STATUS' || h === 'IS ACTIVE' || h === 'IS_ACTIVE') {
            aCol = c;
          }
        }
        var foundFromDedicated = extractRegionsFromValues_(allVals, rCol, aCol);
        if (foundFromDedicated.length > 0) {
          return foundFromDedicated;
        }
      }
    }
  }

  // 2. Check in 'Lookup' sheet
  var sh = ss.getSheetByName('Lookup');
  if (!sh) {
    getSalesPersonsInternal_(ss);
    sh = ss.getSheetByName('Lookup');
  }
  if (!sh) return DEFAULT_REGIONS.slice();

  var lastRow = sh.getLastRow();
  var lastCol = sh.getLastColumn();

  if (lastRow >= 1 && lastCol >= 1) {
    var numColsToScan = Math.min(lastCol, 26);
    var headers = sh.getRange(1, 1, 1, numColsToScan).getValues()[0] || [];
    var matchedCol = -1;
    var matchedActiveCol = -1;

    for (var hc = 0; hc < headers.length; hc++) {
      var hText = String(headers[hc] || '').trim().toUpperCase();
      if (hText.indexOf('REGION') !== -1 || hText === 'TERRITORY' || hText === 'ZONE') {
        matchedCol = hc + 1; // 1-based column
        if (hc + 1 < headers.length) {
          var nextH = String(headers[hc + 1] || '').trim().toUpperCase();
          if (nextH === 'ACTIVE' || nextH === 'STATUS' || nextH === 'IS ACTIVE') {
            matchedActiveCol = hc + 2;
          }
        }
        break;
      }
    }

    if (matchedCol > 0 && lastRow >= 2) {
      var colsToRead = matchedActiveCol > 0 ? (matchedActiveCol - matchedCol + 1) : 1;
      var regionVals = sh.getRange(2, matchedCol, lastRow - 1, colsToRead).getValues();
      var extracted = extractRegionsFromValues_(regionVals, 0, matchedActiveCol > 0 ? (colsToRead - 1) : -1);
      if (extracted.length > 0) {
        return extracted;
      }
    }
  }

  // 3. Fallback: Check if Column H & I exist and have data
  if (lastCol >= 8 && lastRow >= 2) {
    var colHVals = sh.getRange(2, 8, lastRow - 1, Math.min(2, Math.max(1, lastCol - 7))).getValues();
    var hList = extractRegionsFromValues_(colHVals, 0, colHVals[0].length > 1 ? 1 : -1);
    if (hList.length > 0) {
      return hList;
    }
  }

  // 4. Default initialization in Column H & I if sheet has no regions at all
  if (lastCol < 8 || !sh.getRange(1, 8).getValue()) {
    sh.getRange(1, 8, 1, 2).setValues([['Region', 'Active']]).setFontWeight('bold').setBackground('#d9ead3');
    var initRegs = DEFAULT_REGIONS.map(function (reg) { return [reg, 'YES']; });
    sh.getRange(2, 8, initRegs.length, 2).setValues(initRegs);
    try {
      sh.getRange('I2:I50').setDataValidation(
        SpreadsheetApp.newDataValidation().requireValueInList(['YES', 'NO'], true).build()
      );
    } catch (e) {}
  }

  return DEFAULT_REGIONS.slice();
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
  var oldAll = ss.getSheetByName('All Entries');
  if (oldAll && typeof ss.deleteSheet === 'function') {
    try { ss.deleteSheet(oldAll); } catch (e) {}
  }
  getSalesPersonsInternal_(ss);
  getRegionsLookup_(ss);

  var setupSheets = ss.getSheets();
  for (var si = 0; si < setupSheets.length; si++) {
    var setupSheet = setupSheets[si];
    if (parseMonthTabKey_(setupSheet.getName()) !== null || FY_MONTHS.indexOf(setupSheet.getName()) !== -1) {
      ensureDataSheetSchema_(setupSheet);
      styleDataSheet_(setupSheet);
      updateMonthSheetSummaryRow_(setupSheet);
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

  if (dash && String(dash.getRange('A3').getValue()) === 'Total entries') {
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
    updateDashboardSheet_(ss);
  }

  try {
    SpreadsheetApp.getUi().alert('RK Sales sheets are ready.\n\n' + ss.getUrl());
  } catch (err) {}
  return ss.getUrl();
}

function styleDataSheet_(sh) {
  sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold').setBackground('#fff2cc');
  sh.setFrozenRows(1);
  sh.getRange('B:B').setNumberFormat('@');
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

  var serialRange = sh.getRange('A2:A');
  var partyRange = sh.getRange('D2:D');
  var invoiceRange = sh.getRange('J2:J');
  var commissionTypeRange = sh.getRange('S2:S');
  var commissionPctRange = sh.getRange('T2:T');
  var commissionFixedRange = sh.getRange('U2:U');
  var commissionValueRange = sh.getRange('V2:V');
  var remarkRange = sh.getRange('AA2:AA');

  var rules = [
    // 1. Need to Revisit / Commission Doubt flagged: Light Pink background (#F8BBD0) on Sr. No. (Column A)
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=OR($AC2="YES",$AC2=TRUE)')
      .setBackground('#F8BBD0')
      .setRanges([serialRange])
      .build(),

    // 2. Open PO: Invoice value (Invoice No) not filled: Light Green background (#D9EAD3) on Party Name (Column D) & Invoice No (Column J)
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=AND($A2<>"",$A2<>"TOTAL",$J2="")')
      .setBackground('#D9EAD3')
      .setRanges([partyRange, invoiceRange])
      .build(),

    // 3. Commission % other than 5%: Yellow background (#FFF59D) on Commission % (Column T) & Commission Value % (Column V)
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=AND($T2<>"",$S2<>"F",ROUND($T2,4)<>0.05)')
      .setBackground('#FFF59D')
      .setRanges([commissionPctRange, commissionValueRange])
      .build(),

    // 4. Commission Type is F or P + F: Yellow background (#FFF59D) on Commission Type (Column S) & Commission Fixed (Column U)
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=OR($S2="F",$S2="P + F")')
      .setBackground('#FFF59D')
      .setRanges([commissionTypeRange, commissionFixedRange])
      .build(),

    // 5. WB/Billing is WB: Blue text color (#1565C0) on Remark (Column AA)
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$Z2="WB"')
      .setFontColor('#1565C0')
      .setRanges([remarkRange])
      .build()
  ];
  if (typeof sh.setConditionalFormatRules === 'function') {
    sh.setConditionalFormatRules(rules);
  }
}

/**
 * Applies the cell-level conditional formatting rules consistently across
 * all monthly (MMM-YYYY) tabs.
 */
function applyFormattingToAllSheets() {
  var ss = getSS_();
  var oldAll = ss.getSheetByName('All Entries');
  if (oldAll && typeof ss.deleteSheet === 'function') {
    try { ss.deleteSheet(oldAll); } catch (e) {}
  }
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var sh = sheets[i];
    if (parseMonthTabKey_(sh.getName()) !== null || FY_MONTHS.indexOf(sh.getName()) !== -1) {
      ensureDataSheetSchema_(sh);
      styleDataSheet_(sh);
      updateMonthSheetSummaryRow_(sh);
    }
  }
  try {
    SpreadsheetApp.getUi().alert(
      'Formatting Updated',
      'Applied cell-level conditional formatting to all monthly tabs successfully.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } catch (e) {}
  return true;
}

function normalizeMonthYear_(payload) {
  var raw = String(payload.monthYear || payload.month || '').trim();
  if (raw) {
    var parsed = parseMonthYearFields_(raw, payload.poDate);
    if (parsed && parsed.monthYear && /^[A-Z]{3}-\d{4}$/.test(parsed.monthYear)) {
      return parsed.monthYear;
    }
  }
  var mo = String(payload.month || '').toUpperCase().trim();
  var yr = String(payload.year || '').trim();
  if (CAL_MONTHS.indexOf(mo) !== -1 && /^\d{4}$/.test(yr)) return mo + '-' + yr;
  if (payload.poDate) {
    var pParsed = parseMonthYearFields_('', payload.poDate);
    if (pParsed && pParsed.monthYear && /^[A-Z]{3}-\d{4}$/.test(pParsed.monthYear)) {
      return pParsed.monthYear;
    }
  }
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

function findEntryById_(ss, id, hintMonthYear) {
  if (!ss || !id) return null;

  var hint = String(hintMonthYear || '').toUpperCase().trim();
  var targetHint = '';
  if (hint && !CORE_SHEETS[hint]) {
    if (parseMonthTabKey_(hint) !== null || FY_MONTHS.indexOf(hint) !== -1 || hint === 'All Entries') {
      targetHint = hint;
    } else {
      var parsed = parseMonthYearFields_(hint);
      if (parsed && parsed.monthYear && parseMonthTabKey_(parsed.monthYear) !== null) {
        targetHint = parsed.monthYear;
      }
    }
  }

  if (targetHint) {
    var hintSheet = ss.getSheetByName(targetHint);
    if (hintSheet) {
      var rowNum = findRow_(hintSheet, id);
      if (rowNum > 0) {
        return { sheet: hintSheet, sheetName: targetHint, rowNum: rowNum };
      }
    }
  }

  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var sh = sheets[i];
    var name = sh.getName();
    if (CORE_SHEETS[name]) continue;
    if (targetHint && name === targetHint) continue;
    if (parseMonthTabKey_(name) !== null || FY_MONTHS.indexOf(name) !== -1 || name === 'All Entries') {
      var rNum = findRow_(sh, id);
      if (rNum > 0) {
        return { sheet: sh, sheetName: name, rowNum: rNum };
      }
    }
  }
  return null;
}

function saveEntry(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('Missing entry.');
  var lock = LockService.getScriptLock();
  var locked = false;
  try {
    lock.waitLock(30000);
    locked = true;

    var ss = getSS_();

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
    var hintMY = payload.originalMonthYear || payload.monthYear || '';
    var existingEntry = id ? findEntryById_(ss, id, hintMY) : null;
    if (id && !existingEntry) {
      throw new Error('Entry ' + id + ' was not found.');
    }

    if (existingEntry && authUser && authUser.role !== 'ADMIN') {
      var existingRep = String(existingEntry.sheet.getRange(existingEntry.rowNum, 3).getValue() || '').trim().toUpperCase();
      if (existingRep && existingRep !== authUser.code.toUpperCase()) {
        throw new Error('Permission denied: Regular sales persons can only edit their own entries.');
      }
    }

    var sr = existingEntry ? existingEntry.sheet.getRange(existingEntry.rowNum, 1).getValue() : nextSr_(ss);
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

    // Remove from other month sheets if month was changed or relocated
    var sheets = ss.getSheets();
    for (var i = 0; i < sheets.length; i++) {
      var sh = sheets[i];
      var name = sh.getName();
      if (name === monthYear) continue;
      if (parseMonthTabKey_(name) !== null || FY_MONTHS.indexOf(name) !== -1 || name === 'All Entries') {
        var oldRow = findRow_(sh, id);
        if (oldRow) {
          sh.deleteRow(oldRow);
          if (parseMonthTabKey_(name) !== null || FY_MONTHS.indexOf(name) !== -1) {
            updateMonthSheetSummaryRow_(sh);
          }
        }
      }
    }

    // Save only into the target month sheet
    var monthSheet = getMonthSheet_(ss, monthYear);
    removeMonthSheetSummaryRow_(monthSheet);
    var existingMonthRow = findRow_(monthSheet, id);
    upsert_(monthSheet, existingMonthRow, row);
    updateMonthSheetSummaryRow_(monthSheet);
    updateDashboardSheet_(ss);
    invalidateDashboardCache_(monthYear);
    SpreadsheetApp.flush();

    return {
      ok: true,
      isEdit: !!existingEntry,
      srNo: sr,
      responseId: id,
      monthYear: monthYear,
      dashboard: buildDashboardData_(ss)
    };
  } finally {
    if (locked) lock.releaseLock();
  }
}

function updateDashboardSheet_(ss) {
  var dash = ss ? ss.getSheetByName('Dashboard') : null;
  if (!dash) return;
  var data = buildDashboardData_(ss, { all: true });
  var records = data.allEntries || [];
  var totalPo = 0, totalSales = 0, totalGst = 0, totalVal = 0, totalCommVal = 0, totalComm = 0;
  var pendingEntries = 0, pendingVal = 0, collectedVal = 0;
  for (var i = 0; i < records.length; i++) {
    var r = records[i];
    totalPo += (r.poValue || 0);
    totalSales += (r.productValue || 0);
    totalGst += (r.gstValue || 0);
    totalVal += (r.totalValue || 0);
    totalCommVal += (r.commissionValuePct || 0);
    totalComm += (r.totalCommission || 0);
    if (r.paymentStatus === 'RCD') {
      collectedVal += (r.totalValue || 0);
    } else {
      pendingEntries++;
      pendingVal += (r.totalValue || 0);
    }
  }
  dash.getRange('B3:B12').setValues([
    [records.length],
    [round2_(totalPo)],
    [round2_(totalSales)],
    [round2_(totalGst)],
    [round2_(totalVal)],
    [round2_(totalCommVal)],
    [round2_(totalComm)],
    [pendingEntries],
    [round2_(pendingVal)],
    [round2_(collectedVal)]
  ]);
  var last10Rows = [];
  var l10 = data.last10 || [];
  for (var j = 0; j < l10.length; j++) {
    var t = l10[j];
    last10Rows.push([
      t.srNo, t.monthYear, t.salesPerson, t.partyName, t.region,
      t.productKeyword, t.productName, t.productValue, t.totalValue,
      t.totalCommission, t.paymentTerms, t.paymentStatus
    ]);
  }
  if (dash.getLastRow() >= 16) {
    var clearRng = dash.getRange(16, 1, Math.max(1, dash.getLastRow() - 15), 12);
    if (typeof clearRng.clearContent === 'function') clearRng.clearContent();
  }
  if (last10Rows.length > 0) {
    dash.getRange(16, 1, last10Rows.length, 12).setValues(last10Rows);
  }
}

function getDashboardData(options) {
  var ss = getSS_();
  return getDashboardDataWithSS_(ss, options);
}

function getDashboardDataWithSS_(ss, options) {
  options = options || {};
  var isAll = options.all === true;
  var targetFY = isAll ? 'ALL' : (options.fy || getCurrentFY_(ss));
  var cacheKey = 'DASHBOARD_' + targetFY;

  var cache = null;
  try {
    if (typeof CacheService !== 'undefined' && CacheService.getScriptCache) {
      cache = CacheService.getScriptCache();
    }
  } catch (e) {}

  if (options.skipCache && cache) {
    try {
      cache.remove(cacheKey);
      cache.remove('DASHBOARD_ALL');
    } catch (e) {}
  }

  // Metadata lookups (salesPersons and regions) are always freshly retrieved
  // so edits to Lookup or Region sheets reflect immediately without waiting for cache TTL.
  var freshSalesPersons = getSalesPersonsLookup_(ss);
  var freshRegions = getRegionsLookup_(ss);

  if (cache && !options.skipCache) {
    try {
      var cached = cache.get(cacheKey);
      if (cached) {
        var parsed = JSON.parse(cached);
        parsed.salesPersons = freshSalesPersons;
        parsed.regions = freshRegions;
        return parsed;
      }
    } catch (e) {}
  }

  var data = buildDashboardData_(ss, { fy: targetFY, all: isAll });
  data.salesPersons = freshSalesPersons;
  data.regions = freshRegions;

  if (cache) {
    try {
      var serialized = JSON.stringify(data);
      if (serialized.length < 100000) {
        cache.put(cacheKey, serialized, 600); // 10 minutes TTL
      }
    } catch (e) {}
  }

  return data;
}

function invalidateDashboardCache_(optFY) {
  try {
    if (typeof CacheService !== 'undefined' && CacheService.getScriptCache) {
      var cache = CacheService.getScriptCache();
      if (cache) {
        var keys = ['DASHBOARD_ALL'];
        if (optFY) keys.push('DASHBOARD_' + optFY);
        var curFY = getCurrentFY_();
        if (curFY) keys.push('DASHBOARD_' + curFY);
        if (typeof cache.removeAll === 'function') {
          cache.removeAll(keys);
        } else if (typeof cache.remove === 'function') {
          for (var k = 0; k < keys.length; k++) {
            cache.remove(keys[k]);
          }
        }
      }
    }
  } catch (e) {}
}

function getCurrentFY_(ss) {
  var now = new Date();
  var mo = CAL_MONTHS[now.getMonth()];
  var yr = now.getFullYear();
  var curFY = getFYFromMonthYear_(mo, yr);

  if (!ss || typeof ss.getSheets !== 'function') return curFY;

  var sheets = ss.getSheets();
  var curFYFound = false;
  var latestKey = 0;
  var latestFY = null;

  for (var i = 0; i < sheets.length; i++) {
    var name = sheets[i].getName();
    if (CORE_SHEETS[name]) continue;
    var key = parseMonthTabKey_(name);
    if (key !== null) {
      var m = name.toUpperCase().match(/^([A-Z]{3})-(\d{4})$/);
      if (m) {
        var sheetFY = getFYFromMonthYear_(m[1], m[2]);
        if (sheetFY === curFY) curFYFound = true;
        if (key > latestKey) {
          latestKey = key;
          latestFY = sheetFY;
        }
      }
    }
  }

  if (curFYFound || !latestFY) return curFY;
  return latestFY;
}

function buildDashboardData_(ss, options) {
  options = options || {};
  var isAll = options.all === true;
  var targetFY = isAll ? 'ALL' : (options.fy || getCurrentFY_(ss));
  var records = getAllMonthRecords_(ss, isAll ? null : targetFY);

  var totalPo = 0;
  var totalSales = 0;
  var totalGst = 0;
  var totalVal = 0;
  var totalCommVal = 0;
  var totalComm = 0;
  var pendingEntries = 0;
  var pendingVal = 0;
  var collectedVal = 0;

  for (var i = 0; i < records.length; i++) {
    var r = records[i];
    totalPo += (r.poValue || 0);
    totalSales += (r.productValue || 0);
    totalGst += (r.gstValue || 0);
    totalVal += (r.totalValue || 0);
    totalCommVal += (r.commissionValuePct || 0);
    totalComm += (r.totalCommission || 0);
    if (r.paymentStatus === 'RCD') {
      collectedVal += (r.totalValue || 0);
    } else {
      pendingEntries++;
      pendingVal += (r.totalValue || 0);
    }
  }

  var summary = {
    orderCount: records.length,
    totalPoValue: round2_(totalPo),
    totalProductValue: round2_(totalSales),
    totalGstValue: round2_(totalGst),
    totalValue: round2_(totalVal),
    totalCommissionValuePct: round2_(totalCommVal),
    totalCommission: round2_(totalComm),
    pendingCount: pendingEntries,
    pendingValue: round2_(pendingVal),
    collectedValue: round2_(collectedVal)
  };

  return {
    sheetUrl: (ss && ss.getUrl) ? (ss.getUrl() || '') : '',
    salesPersons: getSalesPersonsLookup_(ss),
    regions: getRegionsLookup_(ss),
    totalCount: records.length,
    last10: records.slice(0, 10),
    allEntries: records,
    summary: summary,
    kpi: summary,
    fy: targetFY,
    isAll: isAll
  };
}

var FULL_MONTH_NAMES_ = {
  'JANUARY': 'JAN', 'FEBRUARY': 'FEB', 'MARCH': 'MAR', 'APRIL': 'APR',
  'MAY': 'MAY', 'JUNE': 'JUN', 'JULY': 'JUL', 'AUGUST': 'AUG',
  'SEPTEMBER': 'SEP', 'OCTOBER': 'OCT', 'NOVEMBER': 'NOV', 'DECEMBER': 'DEC'
};

function parseMonthYearFields_(raw, fallbackDate) {
  // 1. Native Date object (e.g. from Google Sheets getValues())
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    var dMo = CAL_MONTHS[raw.getMonth()];
    var dYr = String(raw.getFullYear());
    return { monthYear: dMo + '-' + dYr, month: dMo, year: dYr };
  }

  var curYr = String(new Date().getFullYear());

  if (raw !== null && raw !== undefined) {
    var str = String(raw).trim();

    // 2. Direct match for MMM-YYYY (e.g. "NOV-2026")
    var m1 = str.toUpperCase().match(/^([A-Z]{3})-(\d{4})$/);
    if (m1 && CAL_MONTHS.indexOf(m1[1]) !== -1) {
      return { monthYear: m1[1] + '-' + m1[2], month: m1[1], year: m1[2] };
    }

    // 3. Match MMM-YY (e.g. "NOV-26")
    var m2 = str.toUpperCase().match(/^([A-Z]{3})-(\d{2})$/);
    if (m2 && CAL_MONTHS.indexOf(m2[1]) !== -1) {
      var fullYr = '20' + m2[2];
      return { monthYear: m2[1] + '-' + fullYr, month: m2[1], year: fullYr };
    }

    // 4. Match with space, slash, or underscore (e.g. "NOV 2026", "NOV/2026", "NOV_2026")
    var m3 = str.toUpperCase().match(/^([A-Z]{3})[\s/_]+(\d{2,4})$/);
    if (m3 && CAL_MONTHS.indexOf(m3[1]) !== -1) {
      var yr3 = m3[2].length === 2 ? ('20' + m3[2]) : m3[2];
      return { monthYear: m3[1] + '-' + yr3, month: m3[1], year: yr3 };
    }

    // 5. Match standalone 3-letter month (e.g. "NOV")
    var sUpper = str.toUpperCase();
    if (CAL_MONTHS.indexOf(sUpper) !== -1) {
      return { monthYear: sUpper + '-' + curYr, month: sUpper, year: curYr };
    }

    // 6. Match full month name with or without year (e.g. "NOVEMBER 2026", "NOVEMBER-2026", "NOVEMBER")
    for (var fName in FULL_MONTH_NAMES_) {
      if (sUpper.indexOf(fName) !== -1) {
        var code = FULL_MONTH_NAMES_[fName];
        var yMatch = sUpper.match(/(\d{4})/) || sUpper.match(/[-/\s](\d{2})$/);
        var fYr = yMatch ? (yMatch[1].length === 2 ? ('20' + yMatch[1]) : yMatch[1]) : curYr;
        return { monthYear: code + '-' + fYr, month: code, year: fYr };
      }
    }

    // 7. Try parsing str as Date (e.g. "Sun Nov 01 2026...", "2026-11-01", "01/11/2026")
    if (str.length >= 8) {
      var parsedDate = new Date(str);
      if (!isNaN(parsedDate.getTime())) {
        var pMo = CAL_MONTHS[parsedDate.getMonth()];
        var pYr = String(parsedDate.getFullYear());
        if (pMo && pYr && pYr.length === 4) {
          return { monthYear: pMo + '-' + pYr, month: pMo, year: pYr };
        }
      }
    }
  }

  // 8. Fallback to fallbackDate (e.g. poDate from r[6]) if provided
  if (fallbackDate) {
    var fDate = (fallbackDate instanceof Date && !isNaN(fallbackDate.getTime())) ? fallbackDate : new Date(fallbackDate);
    if (!isNaN(fDate.getTime())) {
      var fbMo = CAL_MONTHS[fDate.getMonth()];
      var fbYr = String(fDate.getFullYear());
      if (fbMo && fbYr) {
        return { monthYear: fbMo + '-' + fbYr, month: fbMo, year: fbYr };
      }
    }
  }

  return { monthYear: String(raw || ''), month: String(raw || ''), year: '' };
}

function upsert_(sh, rowNum, row) {
  var targetRow = rowNum ? rowNum : sh.getLastRow() + 1;
  var rowRange = sh.getRange(targetRow, 1, 1, row.length);

  // Clear any existing manual/direct background or text color overrides so conditional formatting governs
  try {
    if (typeof rowRange.setBackground === 'function') rowRange.setBackground(null);
    if (typeof rowRange.setFontColor === 'function') rowRange.setFontColor('#000000');
  } catch (fmtErr) {}

  rowRange.setValues([row]);

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

function isSummaryRow_(sh, rowNum) {
  if (!sh || rowNum < 2) return false;
  try {
    var val = String(sh.getRange(rowNum, 1).getValue() || '').toUpperCase().trim();
    if (val === 'TOTAL') return true;
    var pVal = String(sh.getRange(rowNum, 4).getValue() || '').toUpperCase().trim();
    if (pVal === 'TOTAL' && String(sh.getRange(rowNum, ID_COL).getValue() || '').trim() === '') return true;
  } catch (e) {}
  return false;
}

function removeMonthSheetSummaryRow_(sh) {
  if (!sh) return;
  var last = sh.getLastRow();
  while (last >= 2 && isSummaryRow_(sh, last)) {
    sh.deleteRow(last);
    last = sh.getLastRow();
  }
}

function updateMonthSheetSummaryRow_(sh) {
  if (!sh) return;
  removeMonthSheetSummaryRow_(sh);
  var last = sh.getLastRow();
  if (last < 2) return; // No data rows present

  var totalRow = last + 1;
  var rowData = new Array(HEADERS.length);
  for (var i = 0; i < HEADERS.length; i++) rowData[i] = '';
  rowData[0] = 'TOTAL';
  rowData[3] = 'TOTAL';

  var range = sh.getRange(totalRow, 1, 1, HEADERS.length);
  range.setValues([rowData]);

  // Set formulas:
  // Col 14 (N): Total PO Value
  // Col 15 (O): Total Product Value
  // Col 23 (W): Total Commission
  sh.getRange(totalRow, 14).setFormula('=SUM(N2:N' + last + ')');
  sh.getRange(totalRow, 15).setFormula('=SUM(O2:O' + last + ')');
  sh.getRange(totalRow, 23).setFormula('=SUM(W2:W' + last + ')');

  try {
    range.setFontWeight('bold');
    range.setBackground('#F1F5F9');
    range.setFontColor('#0F172A');
  } catch (fmtErr) {}

  try {
    sh.getRange(totalRow, 14).setNumberFormat('₹#,##0.00');
    sh.getRange(totalRow, 15).setNumberFormat('₹#,##0.00');
    sh.getRange(totalRow, 23).setNumberFormat('₹#,##0.00');
  } catch (numErr) {}
}

function updateAllMonthSheetsSummaryRows(optSS) {
  var ss = optSS || getSS_();
  var sheets = ss.getSheets();
  var updated = 0;
  for (var i = 0; i < sheets.length; i++) {
    var sh = sheets[i];
    var name = sh.getName();
    if (parseMonthTabKey_(name) !== null || FY_MONTHS.indexOf(name) !== -1) {
      updateMonthSheetSummaryRow_(sh);
      updated++;
    }
  }
  return { ok: true, updatedSheets: updated };
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

function nextSr_(target) {
  var props = null;
  try {
    if (typeof PropertiesService !== 'undefined' && PropertiesService.getScriptProperties) {
      props = PropertiesService.getScriptProperties();
    }
  } catch (e) {}

  if (props) {
    try {
      var stored = props.getProperty('MAX_SR_NO');
      if (stored !== null && stored !== undefined && /^\d+$/.test(String(stored).trim())) {
        var currentMax = parseInt(String(stored).trim(), 10);
        var nextVal = currentMax + 1;
        props.setProperty('MAX_SR_NO', String(nextVal));
        return nextVal;
      }
    } catch (e) {}
  }

  // If not set in PropertiesService, compute max across existing month sheets once
  var ss = null;
  if (!target) {
    try { ss = getSS_(); } catch (e) {}
  } else if (typeof target.getSheets === 'function') {
    ss = target;
  } else if (typeof target.getParent === 'function') {
    ss = target.getParent();
  }

  var max = 0;
  if (ss) {
    var sheets = ss.getSheets();
    for (var s = 0; s < sheets.length; s++) {
      var sh = sheets[s];
      var name = sh.getName();
      if (CORE_SHEETS[name]) continue;
      if (parseMonthTabKey_(name) !== null || FY_MONTHS.indexOf(name) !== -1 || name === 'All Entries') {
        var last = sh.getLastRow();
        if (last < 2) continue;
        var vals = sh.getRange(2, 1, last - 1, 1).getValues();
        for (var i = 0; i < vals.length; i++) {
          var val = vals[i][0];
          if (String(val).toUpperCase() === 'TOTAL') continue;
          var n = Number(val);
          if (!isNaN(n) && n > max) max = n;
        }
      }
    }
    var resVal = max + 1;
    if (props) {
      try { props.setProperty('MAX_SR_NO', String(resVal)); } catch (e) {}
    }
    return resVal;
  }

  // Fallback for single isolated sheet mock without getParent
  if (target && typeof target.getLastRow === 'function') {
    var lastRow = target.getLastRow();
    if (lastRow < 2) {
      if (props) { try { props.setProperty('MAX_SR_NO', '1'); } catch (e) {} }
      return 1;
    }
    var rowVals = target.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var j = 0; j < rowVals.length; j++) {
      var rowVal = rowVals[j][0];
      if (String(rowVal).toUpperCase() === 'TOTAL') continue;
      var num = Number(rowVal);
      if (!isNaN(num) && num > max) max = num;
    }
    var resValSingle = max + 1;
    if (props) {
      try { props.setProperty('MAX_SR_NO', String(resValSingle)); } catch (e) {}
    }
    return resValSingle;
  }

  if (props) {
    try { props.setProperty('MAX_SR_NO', '1'); } catch (e) {}
  }
  return 1;
}

function getAllMonthRecords_(ss, targetFY) {
  var records = [];
  if (!ss) return records;
  var sheets = ss.getSheets();
  var seenIds = {};

  for (var s = 0; s < sheets.length; s++) {
    var sh = sheets[s];
    var name = sh.getName();
    if (CORE_SHEETS[name]) continue;
    var tabKey = parseMonthTabKey_(name);
    var isLegacyMonth = FY_MONTHS.indexOf(name) !== -1;

    if (tabKey !== null || isLegacyMonth) {
      if (targetFY && targetFY !== 'ALL' && tabKey !== null) {
        var mMatch = name.toUpperCase().match(/^([A-Z]{3})-(\d{4})$/);
        if (mMatch) {
          var sFY = getFYFromMonthYear_(mMatch[1], mMatch[2]);
          if (sFY !== targetFY) {
            continue; // Skip month tabs not in target FY
          }
        }
      }

      var last = sh.getLastRow();
      if (last < 2) continue;
      var vals = sh.getRange(2, 1, last - 1, HEADERS.length).getValues();
      for (var i = 0; i < vals.length; i++) {
        var r = vals[i];
        if (!r[0] && !r[3]) continue;
        if (String(r[0]).toUpperCase() === 'TOTAL' || String(r[3]).toUpperCase() === 'TOTAL') continue;
        var respId = String((r.length >= 32 ? r[31] : r[30]) || '');
        if (respId && seenIds[respId]) continue;
        if (respId) seenIds[respId] = true;

        var parsed = parseMonthYearFields_(r[1], r[6]);
        var fy = getFYFromMonthYear_(parsed.month, parsed.year);
        var qtr = getQuarterFromMonth_(parsed.month);

        if (targetFY && targetFY !== 'ALL' && fy !== targetFY) {
          continue;
        }

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
          poDate: fmtIsoDate_(r[6]),
          piNo: String(r[7] || ''),
          piDate: fmtIsoDate_(r[8]),
          invoiceNo: String(r[9] || ''),
          invoiceDate: fmtIsoDate_(r[10]),
          productKeyword: String(r[11] || '').trim(),
          productName: String(r[12] || '').trim(),
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
          paymentStatus: String(r[24] || '').trim(),
          wbBilling: String(r[25] || ''),
          remark: String(r[26] || ''),
          accountsRemark: String(r[27] || ''),
          revisit: (String(r[28] || '').toUpperCase() === 'YES' || r[28] === true),
          timestamp: (r.length >= 32 ? r[30] : r[29]) instanceof Date ? Utilities.formatDate(r.length >= 32 ? r[30] : r[29], Session.getScriptTimeZone(), 'dd-MMM-yyyy HH:mm') : String((r.length >= 32 ? r[30] : r[29]) || ''),
          responseId: respId
        });
      }
    }
  }

  // Fallback: If no records found in month sheets, check for legacy All Entries tab
  if (records.length === 0 && (!targetFY || targetFY === 'ALL')) {
    var all = ss.getSheetByName('All Entries');
    if (all && all.getLastRow() >= 2) {
      var allVals = all.getRange(2, 1, all.getLastRow() - 1, HEADERS.length).getValues();
      for (var j = 0; j < allVals.length; j++) {
        var ar = allVals[j];
        if (!ar[0] && !ar[3]) continue;
        if (String(ar[0]).toUpperCase() === 'TOTAL' || String(ar[3]).toUpperCase() === 'TOTAL') continue;
        var aRespId = String((ar.length >= 32 ? ar[31] : ar[30]) || '');
        if (aRespId && seenIds[aRespId]) continue;
        if (aRespId) seenIds[aRespId] = true;

        var aParsed = parseMonthYearFields_(ar[1], ar[6]);
        var aFy = getFYFromMonthYear_(aParsed.month, aParsed.year);
        var aQtr = getQuarterFromMonth_(aParsed.month);

        records.push({
          srNo: Number(ar[0]) || (j + 1),
          monthYear: aParsed.monthYear,
          month: aParsed.month,
          year: aParsed.year,
          quarter: aQtr,
          fy: aFy,
          salesPerson: String(ar[2] || '').trim(),
          partyName: String(ar[3] || '').trim(),
          region: String(ar[4] || '').trim(),
          poNo: String(ar[5] || '').trim(),
          poDate: fmtIsoDate_(ar[6]),
          piNo: String(ar[7] || ''),
          piDate: fmtIsoDate_(ar[8]),
          invoiceNo: String(ar[9] || ''),
          invoiceDate: fmtIsoDate_(ar[10]),
          productKeyword: String(ar[11] || '').trim(),
          productName: String(ar[12] || '').trim(),
          poValue: toNum_(ar[13]),
          productValue: toNum_(ar[14]),
          freightCharges: toNum_(ar[15]),
          gstValue: toNum_(ar[16]),
          totalValue: toNum_(ar[17]),
          commissionType: String(ar[18] || ''),
          commissionPct: round2_(toNum_(ar[19]) * 100),
          commissionFixed: toNum_(ar[20]),
          commissionValuePct: toNum_(ar[21]),
          totalCommission: toNum_(ar[22]),
          paymentTerms: String(ar[23] || ''),
          paymentStatus: String(ar[24] || '').trim(),
          wbBilling: String(ar[25] || ''),
          remark: String(ar[26] || ''),
          accountsRemark: String(ar[27] || ''),
          revisit: (String(ar[28] || '').toUpperCase() === 'YES' || ar[28] === true),
          timestamp: (ar.length >= 32 ? ar[30] : ar[29]) instanceof Date ? Utilities.formatDate(ar.length >= 32 ? ar[30] : ar[29], Session.getScriptTimeZone(), 'dd-MMM-yyyy HH:mm') : String((ar.length >= 32 ? ar[30] : ar[29]) || ''),
          responseId: aRespId
        });
      }
    }
  }

  records.sort(function (a, b) { return b.srNo - a.srNo; });
  return records;
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
  var records = getAllMonthRecords_(ss);
  var reps = getSalesPersonsLookup_(ss);

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
function buildHtmlReportEmail_(report, webAppUrl, sheetUrl, optMonthTabInfo) {
  var monthTabInfo = optMonthTabInfo || null;
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

  // Month sheet tab section if monthTabInfo is present
  var monthTabSectionHtml = '';
  if (monthTabInfo && monthTabInfo.rows && monthTabInfo.rows.length > 0) {
    var tabRowsHtml = monthTabInfo.rows.map(function (row) {
      if (row.isTotal) {
        return (
          '<tr style="background:#f1f5f9;font-weight:bold;border-top:2px solid #cbd5e1;color:#0f172a;">' +
            '<td style="padding:6px 4px;">' + (row.srNo || 'TOTAL') + '</td>' +
            '<td style="padding:6px 4px;" colspan="3">MONTH TOTAL SUMMARY</td>' +
            '<td style="padding:6px 4px;text-align:right;">' + fmtINRCompact_(row.poValue) + '</td>' +
            '<td style="padding:6px 4px;text-align:right;">' + fmtINRCompact_(row.productValue) + '</td>' +
            '<td style="padding:6px 4px;text-align:right;color:#0284c7;">' + fmtINRCompact_(row.commission) + '</td>' +
            '<td style="padding:6px 4px;text-align:right;">—</td>' +
          '</tr>'
        );
      }
      return (
        '<tr style="border-bottom:1px solid #f1f5f9;">' +
          '<td style="padding:6px 4px;color:#64748b;">' + (row.srNo || '') + '</td>' +
          '<td style="padding:6px 4px;font-weight:600;color:#1e293b;">' + (row.party || '—') + '</td>' +
          '<td style="padding:6px 4px;color:#475569;">' + (row.poNo || '—') + '</td>' +
          '<td style="padding:6px 4px;color:#475569;">' + (row.product || '—') + '</td>' +
          '<td style="padding:6px 4px;text-align:right;font-weight:600;color:#0f172a;">' + fmtINRCompact_(row.poValue) + '</td>' +
          '<td style="padding:6px 4px;text-align:right;font-weight:600;color:#0f172a;">' + fmtINRCompact_(row.productValue) + '</td>' +
          '<td style="padding:6px 4px;text-align:right;color:#0284c7;font-weight:600;">' + fmtINRCompact_(row.commission) + '</td>' +
          '<td style="padding:6px 4px;text-align:right;color:' + (row.status === 'RCD' ? '#059669' : '#e11d48') + ';font-weight:600;">' + (row.status || 'PENDING') + '</td>' +
        '</tr>'
      );
    }).join('');

    monthTabSectionHtml =
      '<div style="margin-top:20px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:16px;">' +
        '<div style="margin-bottom:12px;">' +
          '<span style="font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;color:#0f766e;">Monthly Sheet Tab Data (' + monthTabInfo.name + ')</span>' +
        '</div>' +
        '<table style="width:100%;border-collapse:collapse;font-size:11px;text-align:left;">' +
          '<thead>' +
            '<tr style="border-bottom:2px solid #e2e8f0;color:#475569;">' +
              '<th style="padding:6px 4px;font-weight:600;">Sr</th>' +
              '<th style="padding:6px 4px;font-weight:600;">Party</th>' +
              '<th style="padding:6px 4px;font-weight:600;">PO No</th>' +
              '<th style="padding:6px 4px;font-weight:600;">Product</th>' +
              '<th style="padding:6px 4px;font-weight:600;text-align:right;">PO ₹</th>' +
              '<th style="padding:6px 4px;font-weight:600;text-align:right;">Prod ₹</th>' +
              '<th style="padding:6px 4px;font-weight:600;text-align:right;">Comm ₹</th>' +
              '<th style="padding:6px 4px;font-weight:600;text-align:right;">Status</th>' +
            '</tr>' +
          '</thead>' +
          '<tbody>' + tabRowsHtml + '</tbody>' +
        '</table>' +
        '<div style="margin-top:12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:8px 12px;font-size:11px;color:#166534;">' +
          '<strong>📎 Sheet Tab Attached with Live Formulas &amp; Totals:</strong> Includes full month dataset with formulas (GST, Total Value, Commission, and Total Sums).' +
        '</div>' +
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
            '<a href="' + (webAppUrl || '#') + '" target="_blank" style="display:inline-block;padding:10px 18px;border-radius:8px;background-color:#1e3a8a;color:#ffffff;text-decoration:none;font-weight:bold;font-size:13px;margin:4px 3px;">Open Web App</a>' +
            '<a href="' + (sheetUrl || '#') + '" target="_blank" style="display:inline-block;padding:10px 18px;border-radius:8px;background-color:#059669;color:#ffffff;text-decoration:none;font-weight:bold;font-size:13px;margin:4px 3px;">Open Google Sheet</a>' +
            (monthTabInfo && monthTabInfo.url ? '<a href="' + monthTabInfo.url + '" target="_blank" style="display:inline-block;padding:10px 18px;border-radius:8px;background-color:#0d9488;color:#ffffff;text-decoration:none;font-weight:bold;font-size:13px;margin:4px 3px;">Open ' + monthTabInfo.name + ' Tab</a>' : '') +
          '</div>' +
          monthTabSectionHtml +
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
  var targetMY = reportData.periodType === 'MONTH' ? reportData.monthYear : null;
  var monthTabInfo = targetMY ? getMonthTabInfo_(ss, targetMY) : null;
  var htmlBody = buildHtmlReportEmail_(reportData, webAppUrl, sheetUrl, monthTabInfo);

  var periodLabel = reportData.periodType === 'MONTH' ? reportData.monthYear :
    (reportData.periodType === 'QUARTER' ? (reportData.quarter + ' ' + reportData.fy) :
    (reportData.periodType === 'FY' ? reportData.fy : 'All-Time'));

  var subject = 'RK Sales Report — ' + periodLabel + ' (Sales: ' + fmtINRCompact_(reportData.metrics.totalSales) + ')';

  var attachments = [];
  if (monthTabInfo && monthTabInfo.sheet) {
    var xlsxAttachment = createMonthTabExcelAttachment_(ss, monthTabInfo.sheet, monthTabInfo.name);
    if (xlsxAttachment) attachments.push(xlsxAttachment);
    var tabAttachment = createMonthTabAttachment_(monthTabInfo.sheet, monthTabInfo.name);
    if (tabAttachment) attachments.push(tabAttachment);
  }

  var mailOpts = {
    to: toEmails,
    subject: subject,
    htmlBody: htmlBody
  };
  if (attachments.length > 0) {
    mailOpts.attachments = attachments;
  }

  MailApp.sendEmail(mailOpts);

  return {
    ok: true,
    message: 'Report successfully sent to ' + toEmails,
    period: periodLabel,
    totalSales: reportData.metrics.totalSales,
    hasAttachment: attachments.length > 0
  };
}

/**
 * Ensures a month sheet exists.
 */
function ensureMonthSheetData_(ss, monthYear) {
  if (!ss || !monthYear) return null;
  var sh = ss.getSheetByName(monthYear);
  if (!sh) {
    sh = getMonthSheet_(ss, monthYear);
  }
  return sh;
}

/**
 * Retrieves sheet tab metadata, direct URL, and row records for email embedding.
 */
function getMonthTabInfo_(ss, monthYear) {
  if (!ss || !monthYear) return null;
  var sh = ensureMonthSheetData_(ss, monthYear);
  if (!sh) return null;

  var gid = (typeof sh.getSheetId === 'function') ? sh.getSheetId() : null;
  var baseSheetUrl = ss.getUrl() || '';
  var tabUrl = baseSheetUrl + (gid !== null ? ('#gid=' + gid) : '');

  var rows = [];
  var lastRow = sh.getLastRow();
  var lastCol = sh.getLastColumn() || HEADERS.length;
  if (lastRow >= 2) {
    var rawVals = sh.getRange(2, 1, lastRow - 1, lastCol).getValues();
    var sumPo = 0;
    var sumProd = 0;
    var sumComm = 0;
    for (var i = 0; i < rawVals.length; i++) {
      var r = rawVals[i];
      var isTotal = String(r[0] || '').toUpperCase().trim() === 'TOTAL';
      if (isTotal) {
        var pVal = toNum_(r[13]) || sumPo;
        var prodVal = toNum_(r[14]) || sumProd;
        var cVal = toNum_(r[22]) || sumComm;
        rows.push({
          srNo: 'TOTAL',
          month: monthYear,
          rep: '',
          party: 'TOTAL',
          poNo: '',
          poDate: '',
          product: '',
          poValue: pVal,
          productValue: prodVal,
          totalValue: '',
          commission: cVal,
          status: '',
          isTotal: true
        });
      } else {
        var pv = toNum_(r[13]);
        var prdv = toNum_(r[14]);
        var cv = toNum_(r[22]);
        sumPo += pv;
        sumProd += prdv;
        sumComm += cv;
        rows.push({
          srNo: r[0],
          month: r[1],
          rep: r[2],
          party: r[3],
          poNo: r[5],
          poDate: r[6],
          product: r[11],
          poValue: r[13],
          productValue: r[14],
          totalValue: r[17],
          commission: r[22],
          status: r[24],
          isTotal: false
        });
      }
    }
  }

  return {
    name: monthYear,
    sheet: sh,
    gid: gid,
    url: tabUrl,
    rows: rows
  };
}

/**
 * Creates a spreadsheet attachment blob of the month sheet data with all live formulas and totals.
 */
function createMonthTabAttachment_(sh, monthYear) {
  if (!sh || typeof Utilities === 'undefined' || typeof Utilities.newBlob !== 'function') return null;
  var lastRow = sh.getLastRow();
  var lastCol = sh.getLastColumn() || HEADERS.length;
  if (lastRow < 1) return null;

  var vals = sh.getRange(1, 1, lastRow, lastCol).getValues();
  var formulas = (typeof sh.getRange(1, 1, lastRow, lastCol).getFormulas === 'function')
    ? sh.getRange(1, 1, lastRow, lastCol).getFormulas()
    : [];

  var csvLines = vals.map(function (row, rIdx) {
    return row.map(function (cell, cIdx) {
      var formula = (formulas[rIdx] && formulas[rIdx][cIdx]) ? String(formulas[rIdx][cIdx]).trim() : '';
      var valToOutput = (formula && formula.indexOf('=') === 0) ? formula : cell;
      var str = String(valToOutput === null || valToOutput === undefined ? '' : valToOutput).replace(/"/g, '""');
      return '"' + str + '"';
    }).join(',');
  });
  var csvContent = csvLines.join('\r\n');
  return Utilities.newBlob(csvContent, 'text/csv', 'RK_Sales_' + monthYear + '.csv');
}

/**
 * In live Apps Script, exports native Microsoft Excel (.xlsx) file with full formatting and formulas.
 */
function createMonthTabExcelAttachment_(ss, sh, monthYear) {
  try {
    if (typeof UrlFetchApp !== 'undefined' && typeof ScriptApp !== 'undefined' && typeof ScriptApp.getOAuthToken === 'function') {
      var ssId = (ss && typeof ss.getId === 'function') ? ss.getId() : '';
      var gid = (sh && typeof sh.getSheetId === 'function') ? sh.getSheetId() : '';
      if (ssId) {
        var exportUrl = 'https://docs.google.com/spreadsheets/d/' + ssId + '/export?format=xlsx' + (gid !== '' ? ('&gid=' + gid) : '');
        var resp = UrlFetchApp.fetch(exportUrl, {
          headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
          muteHttpExceptions: true
        });
        if (resp && resp.getResponseCode && resp.getResponseCode() === 200) {
          return Utilities.newBlob(resp.getBlob().getBytes(), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'RK_Sales_' + monthYear + '.xlsx');
        }
      }
    }
  } catch (e) {
    console.warn('Native XLSX export unavailable, using CSV formula export: ' + e);
  }
  return null;
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
  var monthTabInfo = getMonthTabInfo_(ss, targetMY);
  var htmlBody = buildHtmlReportEmail_(reportData, webAppUrl, sheetUrl, monthTabInfo);

  // Check if previous month closed a quarter or FY
  var isQuarterEnd = (prevMonthName === 'JUN' || prevMonthName === 'SEP' || prevMonthName === 'DEC' || prevMonthName === 'MAR');
  var isFyEnd = (prevMonthName === 'MAR');
  var milestoneTag = isFyEnd ? ' [Annual & Q4 Closure]' : (isQuarterEnd ? (' [' + targetQuarter + ' Closure]') : '');

  var subject = 'RK Sales Monthly Report — ' + targetMY + milestoneTag + ' (Sales: ' + fmtINRCompact_(reportData.metrics.totalSales) + ')';

  var attachments = [];
  if (monthTabInfo && monthTabInfo.sheet) {
    var xlsxAttachment = createMonthTabExcelAttachment_(ss, monthTabInfo.sheet, monthTabInfo.name);
    if (xlsxAttachment) attachments.push(xlsxAttachment);
    var tabAttachment = createMonthTabAttachment_(monthTabInfo.sheet, monthTabInfo.name);
    if (tabAttachment) attachments.push(tabAttachment);
  }

  var mailOpts = {
    to: adminEmails.join(', '),
    subject: subject,
    htmlBody: htmlBody
  };
  if (attachments.length > 0) {
    mailOpts.attachments = attachments;
  }

  MailApp.sendEmail(mailOpts);

  console.log('Automated monthly report sent for ' + targetMY + ' to ' + adminEmails.join(', '));
  return { ok: true, monthYear: targetMY, recipients: adminEmails, hasAttachment: attachments.length > 0 };
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
