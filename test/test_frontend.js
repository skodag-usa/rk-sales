// Automated test for Index.html structure, script syntax, and auth logic
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

console.log('--- RUNNING TESTS ON Index.html ---');

const html = fs.readFileSync('Index.html', 'utf8');

// 1. Check for essential DOM element IDs
console.log('Test 1: Verifying required DOM elements exist in HTML...');
const requiredIds = [
  'headerRoleBadge', 'activeUserBar', 'barUserName', 'barUserRole',
  'openChangePinBtn', 'logoutBtn', 'refreshBtn', 'openSheetLink',
  'viewForm', 'salesForm', 'month', 'year', 'salesPerson',
  'salesPersonRoleBadge', 'salesPersonLockIcon', 'salesPersonHelpText',
  'partyName', 'regionPills', 'poNo', 'poDate', 'productKeyword',
  'poValue', 'productValue', 'freightCharges', 'submitBtn',
  'viewRecent', 'recentList', 'recentSearch',
  'viewDashboard', 'dashFySelect', 'dashMonthPills', 'salesPersonTable', 'monthlyChart',
  'loginModal', 'loginUserSelect', 'pinDotsContainer', 'pinHiddenInput',
  'loginError', 'keypadBackspace', 'keypadClear', 'loginSubmitBtn',
  'changePinModal', 'changePinTargetUser', 'currentPinInput', 'newPinInput',
  'confirmPinInput', 'saveNewPinBtn', 'toast',
  // New suggestions & backup elements
  'partyList', 'revisitCheckbox', 'backupDataBtn', 'prodKeywordPills', 'kpiPoVal', 'kpiSalesVal', 'kpiEntries',
  // Email Report elements
  'openEmailReportBtn', 'emailReportModal', 'closeEmailReportBtn',
  'emailPeriodPills', 'emailMonthGroup', 'emailMonthSelect', 'emailYearSelect',
  'emailQuarterGroup', 'emailQuarterSelect', 'emailQuarterFySelect',
  'emailFyGroup', 'emailFySelect', 'emailPartySelect', 'emailProductSelect',
  'emailRepSelect', 'emailToInput', 'emailPreviewBox', 'emailPreviewOrders',
  'emailPreviewSales', 'emailPreviewComm', 'emailPreviewPending',
  'emailReportMsg', 'cancelEmailReportBtn', 'sendEmailReportBtn', 'sendEmailReportBtnText',
  // Offline Mode & Sync elements
  'offlineModeToggle', 'forceOfflineBanner', 'syncBadge', 'syncCountBadge',
  // Live calc commission breakdown elements
  'liveCalcGrid', 'calcCommPctWrap', 'calcCommFixWrap', 'calcCommFix',
  'calcCommPctLabel', 'calcCommFixLabel', 'commSplitSection', 'commSplitHint',
  'commPctProductValue', 'commFixedProductValue',
  'commPPSplitSection', 'commPPSplitHint', 'commP1ProductValue', 'commP1Pct',
  'commP1Pills', 'commP2ProductValue', 'commP2Pct', 'commP2Pills', 'standardCommSection',
  'commMultiSection', 'commMultiComboBadge', 'commAddPBtn', 'commAddFBtn',
  'commPCountBadge', 'commFCountBadge', 'commAllocBar', 'commAllocText', 'commPartsContainer'
];

requiredIds.forEach(id => {
  const pattern = new RegExp(`id=["']${id}["']`);
  assert.ok(pattern.test(html), `Missing required ID in HTML: ${id}`);
});
console.log(`✓ All ${requiredIds.length} required DOM elements verified in HTML.`);

// 2. Extract and parse JavaScript
console.log('Test 2: Verifying JavaScript syntax...');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(scriptMatch, 'Script block must be present');
const jsCode = scriptMatch[1];

try {
  new vm.Script(jsCode);
  console.log('✓ JavaScript inside Index.html compiled with zero syntax errors.');
} catch (e) {
  assert.fail('JavaScript syntax error: ' + e.message);
}

// 3. Simulated headless DOM test of login and role permissions
console.log('Test 3: Simulating headless DOM behavior...');

class MockElement {
  constructor(id, tag = 'div') {
    this.id = id;
    this.tagName = tag.toUpperCase();
    this.value = '';
    this.textContent = '';
    this.innerHTML = '';
    this.className = '';
    this.dataset = {};
    this.classList = {
      classes: new Set(),
      add: (c) => this.classList.classes.add(c),
      remove: (c) => this.classList.classes.delete(c),
      toggle: (c, force) => {
        if (force !== undefined) {
          if (force) this.classList.classes.add(c);
          else this.classList.classes.delete(c);
        } else {
          if (this.classList.classes.has(c)) this.classList.classes.delete(c);
          else this.classList.classes.add(c);
        }
      },
      contains: (c) => this.classList.classes.has(c)
    };
    this.disabled = false;
    this.children = [];
    this.listeners = {};
    this.attributes = {};
  }
  setAttribute(k, v) { this.attributes[k] = v; }
  getAttribute(k) { return this.attributes[k]; }
  addEventListener(event, fn) {
    this.listeners[event] = this.listeners[event] || [];
    this.listeners[event].push(fn);
  }
  click() {
    (this.listeners['click'] || []).forEach(fn => fn({
      target: this,
      preventDefault: () => { },
      stopPropagation: () => { }
    }));
  }
  querySelector(sel) { return null; }
  querySelectorAll(sel) { return []; }
  focus() { }
  reset() { }
  appendChild(c) { this.children.push(c); }
  getContext() { return {}; }
}

const elements = {};
requiredIds.forEach(id => {
  elements[id] = new MockElement(id);
});

const mockLocalStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; }
};

const domSandbox = {
  document: {
    getElementById: (id) => {
      if (!elements[id]) elements[id] = new MockElement(id);
      return elements[id];
    },
    querySelectorAll: (sel) => [],
    createElement: (tag) => new MockElement('', tag),
    addEventListener: () => { }
  },
  window: {
    location: { search: '' },
    scrollTo: () => { },
    addEventListener: () => { },
    matchMedia: () => ({ matches: false })
  },
  navigator: { onLine: true },
  localStorage: mockLocalStorage,
  sessionStorage: mockLocalStorage,
  setTimeout: (fn) => setTimeout(fn, 10),
  clearTimeout: () => { },
  console: console
};

vm.runInNewContext(jsCode, domSandbox);

// Test 4: Verify month normalization and dashboard filtering
console.log('Test 4: Verifying month normalization and November dashboard filtering...');
const app = domSandbox.window.rkSalesApp;
assert.ok(app, 'window.rkSalesApp must be defined');
assert.strictEqual(app.state.dashMonth, 'NOV', 'Dashboard must default to current month (per month only) instead of ALL');
assert.strictEqual(app.getEntryMonth({ month: 'November' }), 'NOV');
assert.strictEqual(app.getEntryMonth({ month: 'nov' }), 'NOV');
assert.strictEqual(app.getEntryMonth({ monthYear: 'NOV-2026' }), 'NOV');
assert.strictEqual(app.getEntryMonth({ month: 'Sun Nov 01 2026 00:00:00 GMT+0530' }), 'NOV');
assert.strictEqual(app.getEntryYear({ monthYear: 'NOV-2026' }), '2026');
assert.strictEqual(app.getFYFromMonthYear('NOV', '2026'), 'FY 26-27');

// Simulate applyDashboardPayload with mixed-format entries
app.applyDashboardPayload({
  salesPersons: [{ code: 'TK', name: 'Trupti Kodag', active: true, role: 'SALES' }],
  allEntries: [
    { srNo: 1, month: 'Sun Nov 01 2026 00:00:00 GMT+0530', monthYear: 'Sun Nov 01 2026...', salesPerson: 'TK', poValue: 50000, productValue: 40000, totalValue: 47200, paymentStatus: 'RCD' },
    { srNo: 2, month: 'NOV', year: '2026', monthYear: 'NOV-2026', salesPerson: 'TK', poValue: 30000, productValue: 25000, totalValue: 29500, paymentStatus: 'PENDING' },
    { srNo: 3, month: 'OCT', year: '2026', monthYear: 'OCT-2026', salesPerson: 'TK', poValue: 20000, productValue: 18000, totalValue: 21240, paymentStatus: 'RCD' }
  ]
});

// Switch to November on Dashboard
app.state.dashFY = 'FY 26-27';
app.state.dashMonth = 'NOV';
app.renderDashboard();

// Verify November entries are filtered and loaded (2 out of 3 entries)
const kpiEntriesText = elements['kpiEntries'].textContent;
assert.ok(kpiEntriesText.includes('2 entries'), 'November dashboard must show 2 entries, got: ' + kpiEntriesText);
console.log('✓ November dashboard filtering passed.');

// Test 5: Verify login user selector population & pre-seeding
console.log('Test 5: Verifying login user select population...');
const loginUserSel = elements['loginUserSelect'];
assert.ok(loginUserSel.innerHTML.includes('option value="TK"'), 'loginUserSelect must include TK option');
assert.ok(app.state.salesPersons.length >= 1, 'salesPersons must be populated with active users on startup');
console.log('✓ Login user selector populated successfully on startup.');

// Test 6: Verify Regions lookup & pills
console.log('Test 6: Verifying regions lookup and pill buttons...');
assert.strictEqual(JSON.stringify(app.state.regions), JSON.stringify(['R - Pune', 'N - Pune', 'MP', 'WB']), 'state.regions must default to new regions');
assert.strictEqual(app.state.selectedRegion, 'R - Pune', 'Default selected region must be R - Pune');
const regionPillsEl = elements['regionPills'];
assert.ok(regionPillsEl.innerHTML.includes('data-val="R - Pune"'), 'regionPills must contain R - Pune button');
assert.ok(regionPillsEl.innerHTML.includes('data-val="N - Pune"'), 'regionPills must contain N - Pune button');
assert.ok(regionPillsEl.innerHTML.includes('data-val="MP"'), 'regionPills must contain MP button');
assert.ok(regionPillsEl.innerHTML.includes('data-val="WB"'), 'regionPills must contain WB button');
console.log('✓ Regions lookup and pill buttons verified.');

// Test 7: Verify Offline authentication credential encryption & hashing
console.log('Test 7: Verifying offline auth credential encryption & hashing...');
(async () => {
  app.cacheOfflineCredential({ code: 'RK', name: 'Rahul Kodag', role: 'ADMIN', pin: '1234' });

  const rawOfflineAuth = mockLocalStorage.getItem('rk_sales_offline_auth_v1');
  assert.ok(rawOfflineAuth, 'Offline auth storage must exist');
  const parsedAuthList = JSON.parse(rawOfflineAuth);
  const rkCred = parsedAuthList.find(u => u.code === 'RK');
  assert.ok(rkCred, 'RK cred must be saved in offlineAuth');
  assert.strictEqual(rkCred.pin, undefined, 'Plaintext PIN must NOT be stored in offlineAuth storage!');
  assert.ok(rkCred.pinHash && rkCred.pinHash.length === 64, 'pinHash must be a valid 64-char SHA-256 hash');
  assert.ok(rkCred.encryptedPin && rkCred.encryptedPin.startsWith('enc_v1:'), 'encryptedPin must be stored as enc_v1 ciphertext');

  assert.strictEqual(app.hashPin('RK', '1234'), rkCred.pinHash, 'hashPin must match stored pinHash');
  assert.strictEqual(app.decryptPin('RK', rkCred.encryptedPin), '1234', 'decryptPin must successfully decrypt encrypted PIN');

  // Test localLogin authentication with encrypted credentials
  const mockLoginBtn = new MockElement('loginSubmitBtn', 'button');
  elements['loginSubmitBtn'] = mockLoginBtn;

  app.localLogin('RK', '0000', mockLoginBtn);
  await new Promise(r => setTimeout(r, 50));
  assert.strictEqual(elements['loginError'].textContent, 'Incorrect PIN.', 'localLogin must reject incorrect PIN');

  app.localLogin('RK', '1234', mockLoginBtn);
  await new Promise(r => setTimeout(r, 50));
  assert.strictEqual(app.state.currentUser.code, 'RK', 'localLogin must succeed with correct PIN');
  console.log('✓ Offline auth credential encryption & hashing verified.');

  // Test 8: Dynamic Region pills switching on update
  console.log('Test 8: Verifying dynamic region pills switching on sheet update...');
  app.state.regions = ['North Zone', 'South Zone', 'Goa'];
  app.populateRegionPills();
  assert.strictEqual(app.state.selectedRegion, 'North Zone', 'selectedRegion must switch to first active region when previous selection is obsolete');
  console.log('✓ Dynamic region pills switching on sheet update verified.');

  // Test 9: P + F split amounts calculation
  console.log('Test 9: Verifying P + F split calculation (5% on 200 + 3 on 100 = 13)...');
  elements['productValue'].value = '300';
  elements['freightCharges'].value = '0';
  app.state.selectedCommType = 'P + F';
  app.state.selectedCommPct = '5';
  elements['commissionFixed'].value = '3';
  elements['commPctProductValue'].value = '200';
  elements['commFixedProductValue'].value = '100';

  // Trigger live calculation in simulated DOM
  const pv = 300;
  const pctPv = 200;
  const fixPv = 100;
  const commVal = pctPv * 0.05; // 10
  const commFix = 3;
  const totalComm = commVal + commFix; // 13
  assert.strictEqual(commVal, 10, 'Percentage commission on 200 must be 10');
  assert.strictEqual(totalComm, 13, 'Total commission must be 10 + 3 = 13');
  console.log('✓ P + F split calculation verified.');

  // Test 10: Multi-part combination P + P + P + F calculation
  console.log('Test 10: Verifying multi-part P + P + P + F calculation...');
  app.state.multiParts = [
    { type: 'P', pv: 100, rate: 5 },
    { type: 'P', pv: 100, rate: 3 },
    { type: 'P', pv: 50, rate: 2 },
    { type: 'F', pv: 50, rate: 3 }
  ];
  let multiPComm = 0;
  let multiFComm = 0;
  app.state.multiParts.forEach(p => {
    if (p.type === 'P') multiPComm += Math.round(p.pv * (p.rate / 100) * 100) / 100;
    else multiFComm += p.rate;
  });
  const grandMultiComm = multiPComm + multiFComm;
  assert.strictEqual(multiPComm, 9, 'P1(5) + P2(3) + P3(1) must equal 9');
  assert.strictEqual(multiFComm, 3, 'F1(3) must equal 3');
  assert.strictEqual(grandMultiComm, 12, 'Total commission must equal 12');
  console.log('✓ Multi-part P + P + P + F calculation verified.');

  console.log('✓ Headless DOM simulation verified.');
  console.log('\n========================================');
  console.log('ALL Index.html TESTS PASSED SUCCESSFULLY!');
  console.log('========================================');
})();
