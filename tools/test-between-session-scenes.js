'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = { window: {} };
const source = fs.readFileSync('between-sessions-data-post-relay.js', 'utf8');
vm.runInNewContext(source, context, { timeout: 2000 });
const periods = context.window.BETWEEN_SESSION_PERIODS;
assert.ok(periods && typeof periods === 'object');
const period = periods['post-relay-2237-325'];
assert.ok(period, 'Approved post-relay period must exist');
assert.equal(period.label, 'After the Relay Station');
assert.match(period.dates, /2237-325/);

const expected = {
  john: ['The Last Step', 'Community, Work, and Equipment', 'Learning to Fly'],
  prue: ['Seeking Help', 'Checking In'],
  cassidy: ['The Water Test', 'A Fair Exchange']
};
const expectedCounts = { john: [2,4,3], prue: [4,6], cassidy: [2,3] };
let sceneCount = 0;
for (const [pc, titles] of Object.entries(expected)) {
  const character = period.characters[pc];
  assert.ok(character?.name, pc + ': missing PC record');
  assert.equal(character.scenes.length, titles.length, pc + ': expected scene count');
  character.scenes.forEach((scene, i) => {
    assert.equal(scene.title, titles[i], pc + ': approved title');
    assert.equal(scene.paragraphs.length, expectedCounts[pc][i], pc + ': approved paragraph layout');
    for (const paragraph of scene.paragraphs) {
      assert.ok(paragraph.trim(), pc + ': empty paragraph');
      assert.doesNotMatch(paragraph, /WARDEN-ONLY|WARDEN NOTE|PROV\/|SUPERSEDED|DO NOT PUBLISH|APPROVED REPLACEMENT/i, 'Private review note leaked');
    }
    sceneCount++;
  });
}
assert.equal(sceneCount, 7);
const { john, prue, cassidy } = period.characters;
assert.match(john.scenes[0].paragraphs[0], /smiling\. “The response finally came back,”/);
assert.match(john.scenes[0].paragraphs[1], /something\. “Once that’s done/);
assert.ok(prue.scenes[1].paragraphs.some(x => x.includes('Nobody comes to mind at the moment')));
assert.ok(!prue.scenes.some(s => /Keeping Watch/.test(s.title)), 'Superseded draft must not appear');
assert.match(cassidy.scenes[1].paragraphs[1], /Carie Murie/);
assert.ok(!cassidy.scenes[0].paragraphs.join(' ').includes("It's a starting point for the next stage"));
const page = fs.readFileSync('between-sessions.html', 'utf8');
assert.ok(page.includes('between-sessions-data-post-relay.js'), 'Player page must load the published source');
assert.ok(page.indexOf('between-sessions-data-m7m8.js') < page.indexOf('between-sessions-data-post-relay.js'));
assert.ok(page.indexOf('between-sessions-data-post-relay.js') < page.indexOf('src="between-sessions.js'));
console.log('PASS: all seven current approved PC scenes, correct paragraphs, source order, and Warden-only exclusion.');
