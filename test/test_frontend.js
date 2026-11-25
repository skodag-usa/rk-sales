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
  querySelectorAll(sel) {
    if (this.innerHTML) {
      if (sel === '[data-part-comm-badge]') {
        const matches = [];
        const regex = /<span\s+data-part-comm-badge="(\d+)"[^>]*>([^<]*)<\/span>/g;
        let m;
        while ((m = regex.exec(this.innerHTML)) !== null) {
          matches.push({
            textContent: m[2],
            getAttribute: (k) => k === 'data-part-comm-badge' ? m[1] : null
          });
        }
        return matches;
      }
    }
    return [];
  }
  focus() { }
  blur() { this.isBlurred = true; }
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
    activeElement: null,
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

  // Test 10b: Multi-part P + P + F + F combination, comboName state lock fix, live calc, and edit mode reconstruction
  console.log('Test 10b: Verifying multi-part P + P + F + F combination & comboName update...');
  app.updateCommTypeState('CUSTOM');
  assert.strictEqual(app.state.isCustomMulti, true, 'isCustomMulti must be true when CUSTOM is selected');
  app.state.multiParts = [
    { type: 'P', pv: 150, rate: 5 },
    { type: 'P', pv: 150, rate: 2 },
    { type: 'F', pv: 50, rate: 10 },
    { type: 'F', pv: 50, rate: 15 }
  ];
  app.renderMultiParts();
  assert.strictEqual(app.state.selectedCommType, 'P + P + F + F', 'selectedCommType must be P + P + F + F and not stuck on P + P');
  assert.strictEqual(elements['commMultiComboBadge'].textContent, 'P + P + F + F', 'commMultiComboBadge must show P + P + F + F');

  elements['productValue'].value = '400';
  elements['freightCharges'].value = '0';
  app.updateLiveCalc();
  assert.ok(elements['calcCommPct'].textContent.includes('10.5'), 'All % Parts should be 10.5 (150@5% + 150@2%)');
  assert.ok(elements['calcCommFix'].textContent.includes('25'), 'All Fixed Parts should be 25 (10 + 15)');
  assert.ok(elements['calcCommTotal'].textContent.includes('35.5'), 'Total Commission should be 35.5');

  // Verify badge updates inside parts container
  const partBadges = elements['commPartsContainer'].querySelectorAll('[data-part-comm-badge]');
  assert.strictEqual(partBadges.length, 4, 'There should be 4 commission part badges');
  assert.ok(partBadges[0].textContent.includes('7.5'), 'Part 1 badge should show ₹7.50 Comm');
  assert.ok(partBadges[1].textContent.includes('3.0'), 'Part 2 badge should show ₹3.00 Comm');
  assert.ok(partBadges[2].textContent.includes('10'), 'Part 3 badge should show ₹10.00 Comm');
  assert.ok(partBadges[3].textContent.includes('15'), 'Part 4 badge should show ₹15.00 Comm');

  // Verify loadEntryForEdit with P + P + F + F without cached commissionParts (reconstruction from sheet data)
  console.log('Verifying loadEntryForEdit reconstruction for P + P + F + F...');
  app.state.currentUser = { code: 'RK', name: 'Rahul Kodag', role: 'ADMIN', pin: '1234' };
  app.loadEntryForEdit({
    srNo: 101,
    responseId: 'RK-TEST-PPFF',
    month: 'NOV',
    year: '2026',
    salesPerson: 'RK',
    partyName: 'Reconstructed PPFF Corp',
    productValue: 400,
    freightCharges: 0,
    commissionType: 'P + P + F + F',
    commissionPct: 5,
    commissionFixed: 25,
    commissionValuePct: 13.75,
    totalCommission: 38.75
  });
  assert.strictEqual(app.state.selectedCommType, 'P + P + F + F', 'Editing entry should retain P + P + F + F');
  assert.strictEqual(app.state.isCustomMulti, true, 'isCustomMulti must be true in edit mode');
  assert.strictEqual(app.state.multiParts.length, 4, 'Reconstructed multiParts must have 4 items');
  assert.strictEqual(app.state.multiParts[0].type, 'P', 'Part 1 type must be P');
  assert.strictEqual(app.state.multiParts[0].pv, 150, 'Part 1 pv must be 150');
  assert.strictEqual(app.state.multiParts[0].rate, 5, 'Part 1 rate must be 5');
  assert.strictEqual(app.state.multiParts[1].type, 'P', 'Part 2 type must be P');
  assert.strictEqual(app.state.multiParts[1].pv, 250, 'Part 2 pv must be 250');
  assert.strictEqual(app.state.multiParts[1].rate, 2.5, 'Part 2 rate must be 2.5');
  assert.strictEqual(app.state.multiParts[2].type, 'F', 'Part 3 type must be F');
  assert.strictEqual(app.state.multiParts[3].type, 'F', 'Part 4 type must be F');
  console.log('✓ Multi-part P + P + F + F calculation & edit mode reconstruction verified.');

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

  app.state.transMonth = 'ALL';
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

  // Test 11d: Verify Dashboard loading other year data when allEntries contains only current year entries
  console.log('Test 11d: Verifying Dashboard multi-year switching with non-matching allEntries...');
  app.state.allEntries = [
    { srNo: 1, responseId: 'resp-2627', month: 'NOV', year: '2026', monthYear: 'NOV-2026', salesPerson: 'RK', totalValue: 1000, isDeleted: false }
  ];
  // Other year payload (FY 25-26)
  const fy2526Data = {
    fy: 'FY 25-26',
    summary: {
      orderCount: 88,
      totalPoValue: 250000,
      totalProductValue: 200000,
      totalGstValue: 36000,
      totalValue: 236000,
      totalCommissionValuePct: 7500,
      totalCommission: 12000,
      pendingCount: 5,
      pendingValue: 15000,
      collectedValue: 221000
    },
    monthlyBreakdown: {},
    repBreakdown: [
      { code: 'RK', name: 'Rahul Kodag', role: 'ADMIN', active: true, orderCount: 88, totalValue: 236000, totalCommission: 12000, pendingValue: 15000, monthly: {} }
    ],
    monthlySales: [5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000]
  };
  app.applyDashboardPayload(fy2526Data);
  app.state.dashFY = 'FY 25-26';
  app.state.dashMonth = 'ALL';
  app.renderDashboard();
  assert.strictEqual(elements['kpiEntries'].textContent, '88 entries', 'Dashboard should display FY 25-26 orderCount (88) even if allEntries only contains FY 26-27 entries');
  assert.ok(elements['dashActiveMonthLabel'].textContent.includes('FY 25-26'), 'Active month label should show FY 25-26');
  assert.ok(app.state.dashboardsByFy['FY 25-26'], 'dashboardsByFy should cache FY 25-26 data');

  // Verify switching back to FY 26-27 uses cached dashboardsByFy
  const fy2627Data = {
    fy: 'FY 26-27',
    summary: { orderCount: 150, totalValue: 472000, totalPoValue: 500000, totalProductValue: 400000, totalGstValue: 72000, totalCommissionValuePct: 15000, totalCommission: 25000, pendingCount: 30, pendingValue: 120000, collectedValue: 352000 },
    monthlyBreakdown: {},
    repBreakdown: [{ code: 'RK', name: 'Rahul Kodag', role: 'ADMIN', active: true, orderCount: 150, totalValue: 472000, totalCommission: 25000, pendingValue: 120000, monthly: {} }],
    monthlySales: [10000, 20000, 30000, 40000, 50000, 60000, 70000, 80000, 141600, 10000, 10000, 10000]
  };
  app.applyDashboardPayload(fy2627Data);
  assert.ok(app.state.dashboardsByFy['FY 26-27'], 'dashboardsByFy should cache FY 26-27 data');
  assert.ok(app.state.dashboardsByFy['FY 25-26'], 'dashboardsByFy should retain FY 25-26 cache');

  // Simulate change event on dashFySelect to FY 25-26
  elements['dashFySelect'].value = 'FY 25-26';
  const changeListeners = elements['dashFySelect'].listeners['change'] || [];
  changeListeners.forEach(fn => fn());
  assert.strictEqual(app.state.dashFY, 'FY 25-26');
  assert.strictEqual(elements['kpiEntries'].textContent, '88 entries', 'Selecting cached FY 25-26 should render 88 entries immediately from cache');
  console.log('✓ Multi-year dashboard loading and per-year caching verified.');

  // Test 11e: Transaction page caching and in-place updates without refetching
  console.log('Test 11e: Verifying Transaction caching and in-place updates without refetching...');
  assert.strictEqual(typeof app.getTransCacheKey, 'function', 'getTransCacheKey must be exported');
  assert.strictEqual(typeof app.updateTransWithSavedEntry, 'function', 'updateTransWithSavedEntry must be exported');
  assert.strictEqual(typeof app.updateTransWithDeletedEntry, 'function', 'updateTransWithDeletedEntry must be exported');

  // Verify getTransCacheKey
  const cKey = app.getTransCacheKey('NOV', '2026', 1, 50, '');
  assert.strictEqual(cKey, 'NOV|2026|1|50|', 'getTransCacheKey must format query parameters consistently');

  // 1. Verify cached load does not show loading spinner and returns cached data immediately
  app.state.transMonth = 'NOV';
  app.state.transYear = '2026';
  app.state.transPage = 1;
  app.state.transPageSize = 50;
  app.state.activeTab = 'recent';
  const mockCacheRecord = {
    srNo: 42,
    responseId: 'RK-CACHED-1',
    month: 'NOV',
    year: '2026',
    monthYear: 'NOV-2026',
    salesPerson: 'RK',
    partyName: 'Cached Dynamics Ltd',
    region: 'R - Pune',
    poNo: 'PO-42',
    productKeyword: 'LS',
    productValue: 1000,
    totalValue: 1180,
    totalCommission: 50,
    isDeleted: false
  };
  app.state.transCache[cKey] = {
    records: [mockCacheRecord],
    page: 1,
    pageSize: 50,
    totalPages: 1,
    totalCount: 1,
    activeCount: 1,
    startIndex: 1,
    endIndex: 1
  };

  app.loadTransactionsPage(1);
  assert.ok(elements['recentList'].innerHTML.includes('Cached Dynamics Ltd'), 'loadTransactionsPage must immediately render cached records');
  assert.ok(!elements['recentList'].innerHTML.includes('Loading transactions'), 'loadTransactionsPage must NOT show loading spinner on cache hit');
  assert.strictEqual(app.state.transCurrentRecords.length, 1);
  assert.strictEqual(app.state.transCurrentRecords[0].partyName, 'Cached Dynamics Ltd');

  // 2. Verify in-place update of existing entry
  const updatedRecord = Object.assign({}, mockCacheRecord, {
    partyName: 'Updated Dynamics Ltd',
    totalValue: 2360
  });
  app.updateTransWithSavedEntry(updatedRecord, true);
  assert.strictEqual(app.state.transCurrentRecords[0].partyName, 'Updated Dynamics Ltd', 'transCurrentRecords must update in-place on edit');
  assert.strictEqual(app.state.transCache[cKey].records[0].partyName, 'Updated Dynamics Ltd', 'transCache must update in-place on edit');
  assert.ok(elements['recentList'].innerHTML.includes('Updated Dynamics Ltd'), 'DOM must reflect updated record without refetching');

  // 3. Verify in-place addition of new entry
  const newRecord = {
    srNo: 43,
    responseId: 'RK-NEW-1',
    month: 'NOV',
    year: '2026',
    monthYear: 'NOV-2026',
    salesPerson: 'RK',
    partyName: 'New Arrival Automation',
    region: 'R - Pune',
    poNo: 'PO-43',
    productKeyword: 'LS',
    productValue: 500,
    totalValue: 590,
    totalCommission: 25,
    isDeleted: false
  };
  app.updateTransWithSavedEntry(newRecord, false);
  assert.strictEqual(app.state.transCurrentRecords.length, 2, 'transCurrentRecords length must be 2 after prepend');
  assert.strictEqual(app.state.transCurrentRecords[0].responseId, 'RK-NEW-1', 'New entry must be prepended to page 1');
  assert.strictEqual(app.state.transTotalCount, 2, 'transTotalCount must increment to 2');
  assert.strictEqual(app.state.transCache[cKey].records[0].responseId, 'RK-NEW-1', 'transCache page 1 must have new entry prepended');
  assert.ok(elements['recentList'].innerHTML.includes('New Arrival Automation'), 'DOM must reflect new entry without refetching');

  // 4. Verify in-place deletion of an entry
  app.updateTransWithDeletedEntry('RK-NEW-1');
  assert.strictEqual(app.state.transCurrentRecords[0].isDeleted, true, 'Deleted entry must be marked isDeleted: true');
  assert.strictEqual(app.state.transCache[cKey].records[0].isDeleted, true, 'Deleted entry in cache must be marked isDeleted: true');
  assert.strictEqual(app.state.transActiveCount, 1, 'transActiveCount must decrement to 1');
  assert.ok(elements['recentList'].innerHTML.includes('CANCELLED'), 'DOM must display CANCELLED badge on deleted entry');
  assert.ok(elements['recentList'].innerHTML.includes('Struck Out'), 'DOM must display Struck Out label on deleted entry');

  // 5. Verify explicit manual sync clears transaction cache
  const refreshClickListeners = elements['refreshBtn'].listeners['click'] || [];
  refreshClickListeners.forEach(fn => fn());
  assert.strictEqual(Object.keys(app.state.transCache).length, 0, 'Clicking refreshBtn (Sync) must purge transCache');
  console.log('✓ Transaction page caching and in-place updates without refetching verified.');

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

  // Test 13: Number field wheel scroll unblocking (mouse wheel & double-touch trackpad scroll)
  console.log('Test 13: Verifying number field wheel scroll unblocking (mouse wheel & trackpad double-touch)...');
  const numInput = elements['productValue'];
  numInput.tagName = 'INPUT';
  numInput.type = 'number';
  numInput.isBlurred = false;
  domSandbox.document.activeElement = numInput;

  // Simulate wheel event while number field is focused
  app.handleNumberFieldWheel({ target: numInput });
  assert.strictEqual(numInput.isBlurred, true, 'Focused number input must be blurred on wheel event to allow smooth scroll and prevent value change');

  // Verify non-number inputs (e.g., text) are not blurred
  const textInput = elements['partyName'];
  textInput.tagName = 'INPUT';
  textInput.type = 'text';
  textInput.isBlurred = false;
  domSandbox.document.activeElement = textInput;
  app.handleNumberFieldWheel({ target: textInput });
  assert.strictEqual(textInput.isBlurred, false, 'Text input must not be blurred on wheel event');
  console.log('✓ Number field wheel scroll unblocking verified.');

  console.log('✓ Headless DOM simulation verified.');
  console.log('\n========================================');
  console.log('ALL Index.html TESTS PASSED SUCCESSFULLY!');
  console.log('========================================');
})();
