// The app runs a copy of the rules engine (Metro cannot reach outside app/).
// The copy must stay byte-for-byte the file the tests and the simulator run.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

test('app/src/game/engine.js is identical to prototype/engine.js', () => {
  const a = fs.readFileSync(path.join(__dirname, '..', 'prototype', 'engine.js'), 'utf8');
  const b = fs.readFileSync(path.join(__dirname, '..', 'app', 'src', 'game', 'engine.js'), 'utf8');
  assert.strictEqual(b, a, 'run: cp prototype/engine.js app/src/game/engine.js');
});
