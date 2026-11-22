'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const raw = fs.readFileSync('special-requests.js', 'utf8');
const context = { window: {} };
vm.runInNewContext(raw, context, { timeout: 2000 });
const records = context.window.HubSpecialRequests;
assert.ok(Array.isArray(records), 'Special Request source data must be an array');
assert.equal(records.length, 150, 'Only 150 player-safe unapproved source candidates may be public');
const keys = new Set();
const counts = {};
for (const item of records) {
  assert.match(item.id, /^SRC-\d{4}$/, 'Each source candidate has a stable identifier');
  assert.ok(item.item && item.source && item.sourcePrice, 'Name, source and source price are required');
  assert.ok(!keys.has(item.item.trim().toLowerCase()), 'Source candidate names cannot repeat');
  keys.add(item.item.trim().toLowerCase());
  assert.ok(!('catalogRow' in item), 'Source items must never contain live catalog row IDs');
  assert.ok(!('canPurchase' in item), 'Source data must not grant purchase permission');
  assert.ok(!('mechanics' in item), 'Unreviewed source rules must not be published verbatim');
  counts[item.source] = (counts[item.source] || 0) + 1;
}
assert.equal(counts['Cold Storage v0.1'] || 0, 0);
assert.equal(counts['Heat Signature v1.3'], 44);
assert.equal(counts['Armory Expanded v2'], 106);
assert.ok(!records.some(item => /^(Paradox Box|Pocket Jump|Dimensional Shifter|Singularity Grenade|Surgery Theater|Xenograft Module|Genetic Biolab)$/i.test(item.item)), 'Do not expose Warden-only rejected concepts or already-adopted ship upgrades');
assert.ok(!records.some(item => /NON-RETAIL SPECIMEN|NON-RETAIL RESOURCE/.test(item.group)), 'Specimen and ore roll tables must remain Warden-only');

const js = fs.readFileSync('purchases.js', 'utf8');
const html = fs.readFileSync('purchases.html', 'utf8');
assert.match(html, /special-requests\.js\?v=/);
assert.ok(html.indexOf('special-requests.js') < html.indexOf('purchases.js'), 'Source data loads before purchases');
assert.match(js, /specialToggle\.addEventListener\('change'/);
assert.match(js, /if \(special !== showSpecialRequests\) return false;/);
assert.match(js, /sourceStatus: 'unapproved'/);
assert.match(js, /requestOnly: true/);
assert.match(js, /const button = sourceOnly\s*\?/);
assert.match(js, /isSpecialRequest\(currentItem\)/);
assert.match(js, /isSpecialRequest\(item\) \|\| showSpecialRequests/);
assert.match(js, /const previews = SPECIAL_REQUEST_ITEMS\.filter/);
assert.ok(!js.includes("selectedCategory = 'SPECIAL REQUEST';"), 'Source-only filter must be opt-in');

// Execute the actual filtering and eligibility helpers with representative per-PC states.
const extract = name => {
  const match = js.match(new RegExp('    function ' + name + '\\(item\\) \\{[\\s\\S]*?\\n    \\}'));
  assert.ok(match, 'Missing helper ' + name);
  return match[0];
};
const filteredMatch = js.match(/    function filteredItems\(\) \{[\s\S]*?\n    \}/);
assert.ok(filteredMatch, 'Missing filteredItems');
const evaluateFilter = (finance, items, showSpecialRequests, selectedCategory = 'ALL', searchText = '') => {
  const make = new Function('finance', 'items', 'showSpecialRequests', 'selectedCategory', 'searchText', 'credit',
    extract('affordability') + '\n' + extract('isSpecialRequest') + '\n' + filteredMatch[0] +
    '\nreturn { classified: items.map(item => ({ name: item.item, special: isSpecialRequest(item) })), visible: filteredItems() };');
  return make(finance, items, showSpecialRequests, selectedCategory, searchText, amount => amount + 'cr');
};
const examples = [
  { item:'Cash Buy', category:'TOOLS', price:100, canPurchase:true, catalogRow:8 },
  { item:'Finance Buy', category:'TOOLS', price:190, canPurchase:true, catalogRow:9 },
  { item:'Over Cap', category:'TOOLS', price:400, canPurchase:true, catalogRow:10 },
  { item:'Missing Permit', category:'TOOLS', price:15, canPurchase:false, catalogRow:11 },
  { item:'Unfinalized Source', category:'WEAPONS', sourceStatus:'unapproved', requestOnly:true, price:0, canPurchase:false, catalogRow:null },
  { item:'Clinic Appointment', category:'PHARMACEUTICALS', serviceOnly:true, canPurchase:false },
  { item:'No Checkout Row', category:'TOOLS', price:2, canPurchase:true }
];
const finances = { personalBalance:120, financingAvailable:100 };
const buyable = evaluateFilter(finances, examples, false);
const requests = evaluateFilter(finances, examples, true);
assert.deepEqual(buyable.visible.map(item => item.item), ['Cash Buy', 'Finance Buy']);
assert.deepEqual(requests.visible.map(item => item.item), ['Clinic Appointment', 'Missing Permit', 'No Checkout Row', 'Over Cap', 'Unfinalized Source']);
assert.equal(buyable.visible.length + requests.visible.length, examples.length, 'The two modes must partition items without overlap');
assert.deepEqual(evaluateFilter(finances, examples, true, 'WEAPONS').visible.map(item => item.item), ['Unfinalized Source']);
assert.deepEqual(evaluateFilter(finances, examples, false, 'TOOLS').visible.map(item => item.item), ['Cash Buy', 'Finance Buy']);
const changedFinance = evaluateFilter({personalBalance:500, financingAvailable:100}, examples, true);
assert.ok(!changedFinance.visible.some(item => item.item === 'Over Cap'), 'Refreshed finance may unlock a previous shortfall');
assert.match(js, /selectedCategory = 'ALL';\s*renderCategories\(\);\s*renderItems\(\);/, 'Switching modes must reset the category filter');
console.log('PASS: exclusive purchasable/Special Request views, per-PC access, financing and clinic exemptions.');
console.log('PASS: 150 player-safe Special Request previews, opt-in toggle, de-duplication and purchase blockers.');
