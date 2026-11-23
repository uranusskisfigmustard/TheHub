'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const raw = fs.readFileSync('special-requests.js', 'utf8');
const context = { window: {} };
vm.runInNewContext(raw, context, { timeout: 2000 });
const records = context.window.HubSpecialRequests;
assert.ok(Array.isArray(records), 'Special Request source data must be an array');
assert.equal(records.length, 68, 'Only 68 player-safe unapproved source candidates may be public');
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
assert.equal(counts['Heat Signature v1.3'] || 0, 0);
assert.equal(counts['Armory Expanded v2'], 68);
assert.ok(!records.some(item => /^(Paradox Box|Pocket Jump|Dimensional Shifter|Singularity Grenade|Surgery Theater|Xenograft Module|Genetic Biolab)$/i.test(item.item)), 'Do not expose Warden-only rejected concepts or already-adopted ship upgrades');
assert.ok(!records.some(item => /NON-RETAIL SPECIMEN|NON-RETAIL RESOURCE/.test(item.group)), 'Specimen and ore roll tables must remain Warden-only');
const reviewedAndWithheld = new Set(['SRC-0088', 'SRC-0089', 'SRC-0090', 'SRC-0091', 'SRC-0092', 'SRC-0093', 'SRC-0094', 'SRC-0095', 'SRC-0096', 'SRC-0097', 'SRC-0098', 'SRC-0099', 'SRC-0100', 'SRC-0101', 'SRC-0102', 'SRC-0103', 'SRC-0104', 'SRC-0105', 'SRC-0106', 'SRC-0107', 'SRC-0108', 'SRC-0109', 'SRC-0110', 'SRC-0111', 'SRC-0112', 'SRC-0113', 'SRC-0114', 'SRC-0115', 'SRC-0116', 'SRC-0117', 'SRC-0118', 'SRC-0119', 'SRC-0120', 'SRC-0121', 'SRC-0122', 'SRC-0123', 'SRC-0124', 'SRC-0125', 'SRC-0126', 'SRC-0127', 'SRC-0128', 'SRC-0129', 'SRC-0130', 'SRC-0131', 'SRC-0132']);
assert.ok(!records.some(item => reviewedAndWithheld.has(item.id)), 'Reviewed adopted or rejected items must not remain in unapproved source preview');

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
console.log('PASS: 68 player-safe Special Request previews, opt-in toggle, de-duplication and purchase blockers.');
