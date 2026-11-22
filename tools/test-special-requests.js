'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const raw = fs.readFileSync('special-requests.js', 'utf8');
const context = { window: {} };
vm.runInNewContext(raw, context, { timeout: 2000 });
const records = context.window.HubSpecialRequests;
assert.ok(Array.isArray(records), 'Special Request source data must be an array');
assert.equal(records.length, 200, 'All 200 unapproved source candidates must be present');
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
assert.equal(counts['Cold Storage v0.1'], 40);
assert.equal(counts['Heat Signature v1.3'], 53);
assert.equal(counts['Armory Expanded v2'], 107);

const js = fs.readFileSync('purchases.js', 'utf8');
const html = fs.readFileSync('purchases.html', 'utf8');
assert.match(html, /special-requests\.js\?v=/);
assert.ok(html.indexOf('special-requests.js') < html.indexOf('purchases.js'), 'Source data loads before purchases');
assert.match(js, /specialToggle\.addEventListener\('change'/);
assert.match(js, /if \(special && !showSpecialRequests\) return false;/);
assert.match(js, /sourceStatus: 'unapproved'/);
assert.match(js, /requestOnly: true/);
assert.match(js, /const button = sourceOnly\s*\?/);
assert.match(js, /currentItem\.sourceStatus === 'unapproved'/);
assert.match(js, /item\.sourceStatus === 'unapproved' \|\| item\.requestOnly/);
assert.match(js, /const previews = SPECIAL_REQUEST_ITEMS\.filter/);
assert.ok(!js.includes("selectedCategory = 'SPECIAL REQUEST';"), 'Source-only filter must be opt-in');
console.log('PASS: 200 unique Special Request previews, opt-in toggle, de-duplication and purchase blockers.');
