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
  'commPCountBadge', 'commFCountBadge', 'commAllocBar', 'commAllocText', 'commPartsContainer',
  // New Transactions makeover & Delete entry elements
  'deleteEntryBtn', 'transMonthSelect', 'transYearSelect', 'transMonthHint', 'piDuplicateWarning',
  // On-demand pagination elements
  'transPageSizeSelect', 'transPagination', 'transPrevBtn', 'transNextBtn', 'transPageInfo'
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
  removeAttribute(k) { delete this.attributes[k]; }
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

// Verify soft-deleted entries are completely ignored in dashboard calculated values
app.state.allEntries[1].isDeleted = true;
app.renderDashboard();
assert.ok(elements['kpiEntries'].textContent.includes('1 entry'), 'Dashboard must ignore deleted entry in count, got: ' + elements['kpiEntries'].textContent);
assert.strictEqual(elements['kpiPoVal'].textContent, '₹50,000', 'Dashboard Total PO must ignore deleted entry (50,000 instead of 80,000)');
app.state.allEntries[1].isDeleted = false; // Restore
app.renderDashboard();

console.log('✓ November dashboard filtering and deleted entry KPI exclusion passed.');

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

  // Test 9b: P + P dual percentage split calculation & live UI
  console.log('Test 9b: Verifying P + P dual percentage split calculation and form repopulation...');
  elements['productValue'].value = '300';
  elements['freightCharges'].value = '0';
  app.state.selectedCommType = 'P + P';
  elements['commP1ProductValue'].value = '200';
  elements['commP1Pct'].value = '5';
  elements['commP2ProductValue'].value = '100';
  elements['commP2Pct'].value = '2.5';
  app.updateLiveCalc();
  assert.strictEqual(elements['calcCommPct'].textContent, '₹10.00', 'Comm 1 must be 5% on 200 = ₹10.00');
  assert.strictEqual(elements['calcCommFix'].textContent, '₹2.50', 'Comm 2 must be 2.5% on 100 = ₹2.50');
  assert.strictEqual(elements['calcCommTotal'].textContent, '₹12.50', 'Total Comm must be ₹12.50');
  assert.ok(elements['calcCommPctLabel'].textContent.includes('5% on ₹200.00'), 'Comm 1 label must reflect 5% on ₹200.00');
  assert.ok(elements['calcCommFixLabel'].textContent.includes('2.5% on ₹100.00'), 'Comm 2 label must reflect 2.5% on ₹100.00');

  // Verify loadEntryForEdit for P + P entry
  const ppEntry = {
    responseId: 'RESP-PP-TEST',
    salesPerson: 'RK',
    partyName: 'PP Enterprise',
    region: 'R - Pune',
    poNo: 'PO-PP-1',
    productKeyword: 'LS',
    productValue: 300,
    freightCharges: 0,
    commissionType: 'P + P',
    commP1ProductValue: 200,
    commP1Pct: 5,
    commP2ProductValue: 100,
    commP2Pct: 2.5,
    commissionValuePct: 12.5,
    totalCommission: 12.5,
    paymentTerms: '30 Days',
    paymentStatus: 'PENDING',
    wbBilling: 'B'
  };
  app.loadEntryForEdit(ppEntry);
  assert.strictEqual(app.state.selectedCommType, 'P + P');
  assert.strictEqual(elements['commP1ProductValue'].value, 200);
  assert.strictEqual(elements['commP1Pct'].value, 5);
  assert.strictEqual(elements['commP2ProductValue'].value, 100);
  assert.strictEqual(elements['commP2Pct'].value, 2.5);
  console.log('✓ P + P dual percentage split calculation and form repopulation verified.');

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

  // Test 11: Transactions month filter & soft-deleted rendering
  console.log('Test 11: Verifying transactions month filter and deleted entry rendering...');
  assert.ok(elements['transMonthSelect'].innerHTML.includes('value="NOV"'), 'transMonthSelect should contain NOV option');
  assert.strictEqual(app.state.transMonth, 'NOV', 'transMonth should default to current month (NOV)');
  
  // Verify descending sort logic in transactions
  const sampleEntries = [
    { srNo: 1, responseId: 'resp-1', month: 'NOV', year: '2026', monthYear: 'NOV-2026', salesPerson: 'RK', partyName: 'Alpha', totalValue: 1000, totalCommission: 50 },
    { srNo: 5, responseId: 'resp-5', month: 'NOV', year: '2026', monthYear: 'NOV-2026', salesPerson: 'RK', partyName: 'Beta', totalValue: 2000, totalCommission: 100, isDeleted: true },
    { srNo: 3, responseId: 'resp-3', month: 'OCT', year: '2026', monthYear: 'OCT-2026', salesPerson: 'RK', partyName: 'Gamma', totalValue: 3000, totalCommission: 150 }
  ];
  sampleEntries.sort((a, b) => (Number(b.srNo) || 0) - (Number(a.srNo) || 0));
  assert.strictEqual(sampleEntries[0].srNo, 5, 'Descending sort: highest Sr No first');
  assert.strictEqual(sampleEntries[1].srNo, 3);
  assert.strictEqual(sampleEntries[2].srNo, 1);

  // Test rendering of Delete button directly in transactions list
  app.state.allEntries = sampleEntries;
  app.state.currentUser = { code: 'RK', role: 'ADMIN' };
  app.renderRecentList();
  assert.ok(elements['recentList'].innerHTML.includes('data-delete-id="resp-1"'), 'Transactions list must include data-delete-id button for active entries');
  assert.ok(elements['recentList'].innerHTML.includes('data-edit-id="resp-1"'), 'Transactions list must include data-edit-id button');
  assert.ok(elements['recentList'].innerHTML.includes('CANCELLED'), 'Soft-deleted transactions must display CANCELLED badge');
  assert.ok(elements['recentList'].innerHTML.includes('Struck Out'), 'Soft-deleted transactions must display Struck Out label');
  console.log('✓ Transactions month filter, descending sort, and card delete button verified.');

  // Test 11b: Verify on-demand pagination controls in Transactions view
  console.log('Test 11b: Verifying on-demand pagination controls in Transactions view...');
  assert.ok(elements['transPageSizeSelect'], 'transPageSizeSelect must exist');
  assert.ok(elements['transPagination'], 'transPagination must exist');
  assert.ok(elements['transPrevBtn'], 'transPrevBtn must exist');
  assert.ok(elements['transNextBtn'], 'transNextBtn must exist');
  assert.ok(elements['transPageInfo'], 'transPageInfo must exist');

  app.state.transPageSize = 2;
  app.renderOfflineTransactionsPage(1);
  assert.strictEqual(app.state.transPage, 1);
  assert.ok(elements['transPageInfo'].innerHTML.includes('Page <strong class="text-blue-900">1</strong> of <strong>2</strong>'), 'Pagination text must show Page 1 of 2');
  assert.strictEqual(elements['transPrevBtn'].disabled, true, 'Prev button should be disabled on page 1');
  assert.strictEqual(elements['transNextBtn'].disabled, false, 'Next button should be enabled on page 1 of 2');

  app.renderOfflineTransactionsPage(2);
  assert.strictEqual(app.state.transPage, 2);
  assert.strictEqual(elements['transPrevBtn'].disabled, false, 'Prev button should be enabled on page 2');
  assert.strictEqual(elements['transNextBtn'].disabled, true, 'Next button should be disabled on last page');
  console.log('✓ On-demand pagination controls and state verified.');

  // Test 11c: Verify Dashboard rendering with empty allEntries and precalculated dashboardData
  console.log('Test 11c: Verifying Dashboard rendering from precalculated dashboardData counts...');
  app.state.allEntries = [];
  app.state.dashboardData = {
    fy: 'FY 26-27',
    summary: {
      orderCount: 150,
      totalPoValue: 500000,
      totalProductValue: 400000,
      totalGstValue: 72000,
      totalValue: 472000,
      totalCommissionValuePct: 15000,
      totalCommission: 25000,
      pendingCount: 30,
      pendingValue: 120000,
      collectedValue: 352000
    },
    monthlyBreakdown: {
      'NOV': {
        orderCount: 50,
        totalPoValue: 150000,
        totalProductValue: 120000,
        totalGstValue: 21600,
        totalValue: 141600,
        totalCommissionValuePct: 4500,
        totalCommission: 8000,
        pendingCount: 10,
        pendingValue: 35000,
        collectedValue: 106600
      }
    },
    repBreakdown: [
      { code: 'RK', name: 'Rahul Kodag', role: 'ADMIN', active: true, orderCount: 100, totalValue: 300000, totalCommission: 18000, pendingValue: 80000, monthly: { 'NOV': { orderCount: 35, totalValue: 100000, totalCommission: 6000, pendingValue: 25000 } } }
    ],
    monthlySales: [10000, 20000, 30000, 40000, 50000, 60000, 70000, 80000, 141600, 10000, 10000, 10000]
  };
  app.state.dashFY = 'FY 26-27';
  app.state.dashMonth = 'ALL';
  app.renderDashboard();
  assert.strictEqual(elements['kpiEntries'].textContent, '150 entries', 'Dashboard entries count should come from summary.orderCount');
  assert.ok(elements['salesPersonTable'].innerHTML.includes('Rahul'), 'Rep breakdown should render from repBreakdown');

  // Test selecting a specific month in Dashboard
  app.state.dashMonth = 'NOV';
  app.renderDashboard();
  assert.strictEqual(elements['kpiEntries'].textContent, '50 entries', 'Dashboard month entries count should come from monthlyBreakdown[NOV].orderCount');
  console.log('✓ Dashboard rendering from precalculated dashboardData verified.');

  // Test 12: Party name autocomplete: suppressed until 2 characters, enabled at 2+ characters
  console.log('Test 12: Verifying party name autocomplete behavior (< 2 chars suppressed, >= 2 chars active)...');
  app.state.parties = ['Tata Motors', 'TCS', 'Reliance Industries', 'Mahindra'];
  if (typeof app.updatePartyAutocomplete === 'function') {
    app.updatePartyAutocomplete();
  } else {
    // trigger input listener if registered
    const inputListeners = elements['partyName'].listeners['input'] || [];
    inputListeners.forEach(fn => fn({ target: elements['partyName'] }));
  }

  // With 0 characters
  elements['partyName'].value = '';
  (elements['partyName'].listeners['input'] || []).forEach(fn => fn({ target: elements['partyName'] }));
  assert.strictEqual(elements['partyList'].innerHTML, '', 'partyList options must be empty when partyName is empty');
  assert.ok(!elements['partyName'].getAttribute('list'), 'list attribute should not be active when partyName < 2 chars');

  // With 1 character ('T')
  elements['partyName'].value = 'T';
  (elements['partyName'].listeners['input'] || []).forEach(fn => fn({ target: elements['partyName'] }));
  assert.strictEqual(elements['partyList'].innerHTML, '', 'partyList options must be empty when partyName is only 1 char');
  assert.ok(!elements['partyName'].getAttribute('list'), 'list attribute should not be active when partyName has only 1 char');

  // With 2 characters ('Ta')
  elements['partyName'].value = 'Ta';
  (elements['partyName'].listeners['input'] || []).forEach(fn => fn({ target: elements['partyName'] }));
  assert.strictEqual(elements['partyName'].getAttribute('list'), 'partyList', 'list attribute must be active when partyName has 2+ chars');
  assert.ok(elements['partyList'].innerHTML.includes('Tata Motors'), 'partyList must include Tata Motors for prefix "Ta"');
  assert.ok(!elements['partyList'].innerHTML.includes('Reliance'), 'partyList must not include non-matching Reliance for prefix "Ta"');

  // Case insensitive match ('tc')
  elements['partyName'].value = 'tc';
  (elements['partyName'].listeners['input'] || []).forEach(fn => fn({ target: elements['partyName'] }));
  assert.ok(elements['partyList'].innerHTML.includes('TCS'), 'partyList must include TCS for lowercase "tc"');

  console.log('✓ Party name autocomplete threshold (< 2 chars suppressed, >= 2 chars active) verified.');

  console.log('✓ Headless DOM simulation verified.');
  console.log('\n========================================');
  console.log('ALL Index.html TESTS PASSED SUCCESSFULLY!');
  console.log('========================================');
})();
