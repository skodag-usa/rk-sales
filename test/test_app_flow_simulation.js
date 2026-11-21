// test/test_app_flow_simulation.js
// Complete headless browser & DOM workflow simulation test for Index.html
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

console.log('--- RUNNING COMPREHENSIVE END-TO-END APPLICATION FLOW SIMULATION ---');

const html = fs.readFileSync('Index.html', 'utf8');
const jsMatch = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(jsMatch, 'Script block must be present');
const jsCode = jsMatch[1];

class MockElement {
  constructor(id, tag = 'div') {
    this.id = id;
    this.tagName = tag.toUpperCase();
    this.value = '';
    this.textContent = '';
    this.innerHTML = '';
    this.className = '';
    this.dataset = {};
    this.checked = false;
    this.disabled = false;
    this.children = [];
    this.listeners = {};
    this.attributes = {};
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
  }
  setAttribute(k, v) { this.attributes[k] = v; }
  getAttribute(k) { return this.attributes[k]; }
  closest(sel) { return this; }
  addEventListener(event, fn) {
    this.listeners[event] = this.listeners[event] || [];
    this.listeners[event].push(fn);
  }
  click() {
    (this.listeners['click'] || []).forEach(fn => fn({
      target: this,
      preventDefault: () => {},
      stopPropagation: () => {},
      closest: () => this
    }));
  }
  dispatchEvent(evt) {
    evt.preventDefault = evt.preventDefault || (() => {});
    evt.stopPropagation = evt.stopPropagation || (() => {});
    (this.listeners[evt.type] || []).forEach(fn => fn(evt));
  }
  querySelector(sel) {
    // support simple option[value="..."] query
    const m = sel && sel.match(/option\[value="([^"]+)"\]/);
    if (m) {
      return this.children.find(c => c.value === m[1]) || null;
    }
    return null;
  }
  querySelectorAll(sel) {
    if (sel.includes('button')) {
      return this.children.filter(c => c.tagName === 'BUTTON');
    }
    return [];
  }
  focus() {}
  reset() {}
  appendChild(c) { this.children.push(c); }
  getContext() { return {}; }
}

const elements = {};
function getEl(id) {
  if (!elements[id]) elements[id] = new MockElement(id);
  return elements[id];
}

const mockStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; }
};

const domSandbox = {
  document: {
    getElementById: (id) => getEl(id),
    querySelectorAll: (sel) => [],
    createElement: (tag) => new MockElement('', tag),
    addEventListener: () => {}
  },
  window: {
    location: { search: '' },
    scrollTo: () => {},
    addEventListener: () => {},
    matchMedia: () => ({ matches: false })
  },
  navigator: { onLine: true },
  localStorage: mockStorage,
  sessionStorage: mockStorage,
  setTimeout: (fn) => setTimeout(fn, 5),
  clearTimeout: () => {},
  console: console
};

const pillDefs = {
  regionPills: ['Pune', 'Aurangabad', 'Nagpur', 'Kolhapur', 'Nashik', '__OTHER__'],
  commTypePills: ['P', 'F', 'P + F'],
  commPctPills: ['5', '4', '3', '2.5', '2', '1.5', '1', '0', '__OTHER__'],
  termsPills: ['PI', 'CR', 'PDC', '__OTHER__'],
  statusPills: ['RCD', 'PENDING', 'PARTIAL'],
  wbPills: ['WB', 'B'],
  prodKeywordPills: ['LS', 'BC', 'RP', 'LM', 'GB', 'DC', 'SP', 'VF', 'KK', 'SN', 'OT'],
  emailPeriodPills: ['MONTH', 'QUARTER', 'FY', 'ALL']
};

for (const [containerId, vals] of Object.entries(pillDefs)) {
  const container = getEl(containerId);
  vals.forEach(v => {
    const btn = new MockElement('', 'button');
    btn.setAttribute('data-val', v);
    btn.textContent = v;
    container.appendChild(btn);
  });
}

vm.runInNewContext(jsCode, domSandbox);
const app = domSandbox.window.rkSalesApp;
assert.ok(app, 'rkSalesApp must be attached to window');

async function runSimulation() {
  // ==========================================
  // TEST STEP 1: AUTHENTICATION & PIN KEYPAD
  // ==========================================
  console.log('Step 1: Testing Authentication & PIN validation...');
  // Attempt login with invalid PIN
  getEl('loginUserSelect').value = 'TK';
  app.state.enteredPin = '0000';
  getEl('loginSubmitBtn').click();
  await new Promise(r => setTimeout(r, 200));

  assert.strictEqual(getEl('loginError').textContent, 'Incorrect PIN.');
  assert.strictEqual(app.state.currentUser, null, 'User should not be logged in after bad PIN');

  // Enter correct PIN '1111'
  app.state.enteredPin = '1111';
  getEl('loginSubmitBtn').click();
  await new Promise(r => setTimeout(r, 200));

  assert.ok(app.state.currentUser, 'User should be logged in');
  assert.strictEqual(app.state.currentUser.code, 'TK');
  assert.strictEqual(app.state.currentUser.role, 'SALES');
  assert.strictEqual(getEl('barUserName').textContent, 'Trupti Kodag (TK)');
  assert.strictEqual(getEl('barUserRole').textContent, 'SALES');
  console.log('✓ Authentication verified (bad PIN rejected, correct PIN authenticated).');

// ==========================================
// TEST STEP 2: NEW ENTRY FORM DEFAULTS
// ==========================================
console.log('Step 2: Testing Form Defaults & Auto-Calculations...');
// Reset form to verify defaults
getEl('resetFormBtn').click();

assert.strictEqual(getEl('poNo').value, 'VERBAL', 'Default PO No must be VERBAL');
assert.strictEqual(getEl('piNo').value, '2627-', 'Default PI No must be 2627-');
assert.strictEqual(getEl('productKeyword').value, 'LS', 'Default Product Keyword must be LS');
assert.strictEqual(app.state.selectedCommType, 'P', 'Default Commission Type must be P');
assert.strictEqual(app.state.selectedStatus, 'RCD', 'Default Payment Status must be RCD');
assert.strictEqual(getEl('revisitCheckbox').checked, false, 'Default Revisit must be false');

// Auto-sync: PO Value -> Product Value
getEl('poValue').value = '50000';
getEl('poValue').dispatchEvent({ type: 'input' });
assert.strictEqual(getEl('productValue').value, '50000', 'Product Value should auto-sync to PO Value');

// Override Product Value
getEl('productValue').value = '40000';
getEl('productValue').dataset.userEdited = 'true';
getEl('productValue').dispatchEvent({ type: 'input' });
getEl('freightCharges').value = '2000';
getEl('freightCharges').dispatchEvent({ type: 'input' });

// Live Calculations:
// Product = 40000, Freight = 2000
// Subtotal = 42000
// GST (18%) = 42000 * 0.18 = 7560
// Total Value = 42000 + 7560 = 49560
// Commission % (5% on 40000) = 2000
// Total Commission = 2000
assert.strictEqual(getEl('calcGst').textContent, '₹7,560.00');
assert.strictEqual(getEl('calcTotal').textContent, '₹49,560.00');
assert.strictEqual(getEl('calcCommPct').textContent, '₹2,000.00');
assert.strictEqual(getEl('calcCommTotal').textContent, '₹2,000.00');
console.log('✓ Form defaults and live calculations verified.');

// ==========================================
// TEST STEP 3: SUBMIT ENTRY IN PREVIEW MODE
// ==========================================
console.log('Step 3: Submitting sales entry in preview mode...');
getEl('partyName').value = 'Tata Motors';
getEl('month').value = 'NOV';
getEl('year').value = '2026';
getEl('poDate').value = '2026-11-20';
getEl('piDate').value = '2026-11-21';
getEl('remark').value = 'Urgent priority';
getEl('revisitCheckbox').checked = true;

getEl('salesForm').dispatchEvent({ type: 'submit' });

// Verify entry was added to state and storage
assert.strictEqual(app.state.allEntries.length, 1);
const saved = app.state.allEntries[0];
assert.strictEqual(saved.srNo, 1);
assert.strictEqual(saved.partyName, 'Tata Motors');
assert.strictEqual(saved.month, 'NOV');
assert.strictEqual(saved.year, '2026');
assert.strictEqual(saved.monthYear, 'NOV-2026');
assert.strictEqual(saved.totalValue, 49560);
assert.strictEqual(saved.totalCommission, 2000);
assert.strictEqual(saved.revisit, true);
console.log('✓ Sales entry submitted and stored accurately in preview mode.');

// ==========================================
// TEST STEP 4: EDIT ENTRY RE-POPULATION
// ==========================================
console.log('Step 4: Testing edit entry re-population...');
// Trigger loadEntryForEdit on saved entry
const editBtn = new MockElement('editBtn');
editBtn.setAttribute('data-edit-id', saved.responseId);
getEl('recentList').dispatchEvent({
  type: 'click',
  target: editBtn
});

// Verify all fields are re-populated
assert.strictEqual(getEl('responseId').value, saved.responseId);
assert.strictEqual(getEl('partyName').value, 'Tata Motors');
assert.strictEqual(getEl('month').value, 'NOV');
assert.strictEqual(getEl('year').value, '2026');
assert.strictEqual(Number(getEl('poValue').value), 50000);
assert.strictEqual(Number(getEl('productValue').value), 40000);
assert.strictEqual(getEl('revisitCheckbox').checked, true, 'Revisit checkbox must populate true');
console.log('✓ Entry re-population for edit verified.');

// ==========================================
// TEST STEP 5: MONTHLY DASHBOARD & MONTH FILTERING
// ==========================================
console.log('Step 5: Testing Monthly Dashboard month filtering (Crucial Bug Verification)...');
// Inject a second entry with Date object / legacy string format to simulate Google Sheets
app.state.allEntries.push(app.normalizeEntry({
  srNo: 2,
  month: 'Sun Nov 01 2026 00:00:00 GMT+0530',
  year: '',
  monthYear: 'Sun Nov 01 2026 00:00:00 GMT+0530 (IST)',
  poDate: '2026-11-05',
  salesPerson: 'TK',
  partyName: 'Reliance Industries',
  poValue: 100000,
  productValue: 90000,
  freightCharges: 5000,
  gstValue: 17100,
  totalValue: 112100,
  commissionValuePct: 4500,
  totalCommission: 4500,
  paymentStatus: 'RCD'
}));

// Inject a third entry in October
app.state.allEntries.push(app.normalizeEntry({
  srNo: 3,
  month: 'OCT',
  year: '2026',
  monthYear: 'OCT-2026',
  poDate: '2026-10-15',
  salesPerson: 'TK',
  partyName: 'Mahindra & Mahindra',
  poValue: 20000,
  productValue: 20000,
  freightCharges: 0,
  gstValue: 3600,
  totalValue: 23600,
  commissionValuePct: 1000,
  totalCommission: 1000,
  paymentStatus: 'PENDING'
}));

// 5A: ALL Months selected
app.state.dashFY = 'FY 26-27';
app.state.dashMonth = 'ALL';
app.renderDashboard();
assert.ok(getEl('kpiEntries').textContent.includes('3 entries'), 'ALL must show all 3 entries');
assert.strictEqual(getEl('kpiPoVal').textContent, '₹1,70,000'); // 50k + 100k + 20k = 170k

// 5B: NOV Month selected -> MUST SHOW THE 2 NOVEMBER ENTRIES (NOT 0!)
app.state.dashMonth = 'NOV';
app.renderDashboard();
assert.ok(getEl('kpiEntries').textContent.includes('2 entries'), 'NOV must show 2 November entries, got: ' + getEl('kpiEntries').textContent);
assert.strictEqual(getEl('kpiPoVal').textContent, '₹1,50,000', 'Total PO for NOV must be 150k (50k + 100k)');
assert.strictEqual(getEl('kpiSalesVal').textContent, '₹1,30,000', 'Total Product for NOV must be 130k (40k + 90k)');

// 5C: OCT Month selected -> MUST SHOW 1 ENTRY
app.state.dashMonth = 'OCT';
app.renderDashboard();
assert.ok(getEl('kpiEntries').textContent.includes('1 entry'), 'OCT must show 1 entry');
assert.strictEqual(getEl('kpiPoVal').textContent, '₹20,000');

// 5D: DEC Month selected -> MUST SHOW 0 ENTRIES
app.state.dashMonth = 'DEC';
app.renderDashboard();
assert.ok(getEl('kpiEntries').textContent.includes('0 entries'), 'DEC must show 0 entries');
console.log('✓ Monthly Dashboard month filtering passed 100% (ALL, NOV, OCT, DEC).');

// ==========================================
// TEST STEP 6: ADMIN ROLE PERMISSIONS
// ==========================================
console.log('Step 6: Testing Admin Role Permissions & Features...');
// Login as Admin RK
app.state.currentUser = { code: 'RK', name: 'Rahul Kodag', role: 'ADMIN', pin: '1234' };
getEl('salesPerson').disabled = false; // Admin can assign to any salesperson

// Admin can open email report modal
getEl('openEmailReportBtn').click();
assert.strictEqual(getEl('emailReportModal').classList.contains('hidden'), false, 'Email Report Modal should open for Admin');

// Change Email Report period to MONTH (NOV-2026)
getEl('emailMonthSelect').value = 'NOV';
getEl('emailYearSelect').value = '2026';
getEl('emailPeriodPills').dispatchEvent({ type: 'click', target: getEl('emailPeriodPills').children[0] });
assert.strictEqual(getEl('emailPreviewOrders').textContent, 2, 'Email preview should show 2 November orders');
console.log('✓ Admin features and Email Report preview verified.');

  console.log('\n======================================================');
  console.log('ALL APP FLOW SIMULATION TESTS PASSED SUCCESSFULLY 100%!');
  console.log('======================================================');
}

runSimulation().catch(err => {
  console.error('Simulation failed:', err);
  process.exit(1);
});
