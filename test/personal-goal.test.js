const test = require('node:test');
const assert = require('node:assert/strict');
const { personalGoal, milestoneMarks } = require('../app/src/game/personal-goal.js');

test('the first target is 24, then every personal best unlocks the next rung', () => {
  assert.deepEqual([0, 2, 6, 12, 24, 192, 768, 1536].map(personalGoal),
    [24, 24, 24, 24, 48, 384, 1536, 3072]);
});

test('a sweep celebrates its largest new record once, regardless of merge order', () => {
  assert.deepEqual(milestoneMarks([48, 96, 48, 96], 24), [false, true, false, false]);
  assert.deepEqual(milestoneMarks([6, 12], 0), [false, false]);
  assert.deepEqual(milestoneMarks([48, 96], 96), [false, false]);
  assert.deepEqual(milestoneMarks([], 24), []);
});
