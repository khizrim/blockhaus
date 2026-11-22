const test = require('node:test');
const assert = require('node:assert/strict');
const daily = require('../app/src/game/daily.js');
const engine = require('../prototype/engine.js');

function turn(game) {
  for (let slot = 0; slot < game.tray.length; slot++) {
    for (let y = 0; y < engine.N; y++) {
      for (let x = 0; x < engine.N; x++) {
        if (engine.place(game, slot, x, y)) return;
      }
    }
  }
  assert.ok(['left', 'up', 'right', 'down'].some((dir) => engine.sweep(game, dir)));
}

test('daily keys use the local calendar; each date gets its calibrated medals', () => {
  assert.equal(daily.dayKey(new Date(2026, 10, 22, 0, 1)), '2026-11-22');
  for (let d = 16; d <= 22; d++) {
    const key = '2026-11-' + d;
    const [bronze, silver, gold] = daily.medalsFor(key);
    assert.deepEqual([bronze - 1, bronze, silver, gold].map((n) => daily.medalFor(key, n)), [0, 1, 2, 3]);
  }
});

test('same daily survives serialization with its exact board, trays and random stream', () => {
  const run = daily.newDailyGame('2026-11-22');
  const other = daily.newDailyGame(run.key);
  assert.deepEqual(daily.saveDaily(other), daily.saveDaily(run));
  assert.notDeepEqual(daily.newDailyGame('2026-11-23').game.board, run.game.board);
  for (let i = 0; i < 8; i++) turn(run.game);
  const restored = daily.restoreDaily(JSON.parse(JSON.stringify(daily.saveDaily(run))));
  while (!run.game.over) {
    turn(run.game);
    turn(restored.game);
    assert.deepEqual(daily.saveDaily(restored), daily.saveDaily(run));
  }
  assert.ok(run.game.moves <= 30);
  assert.ok(daily.restoreDaily(daily.saveDaily(run)).game.over);
  assert.equal(engine.sweep(run.game, 'left'), null);
});

test('daily stops when the 30th piece is placed even on an open board', () => {
  const { game } = daily.newDailyGame('2026-11-22');
  game.moves = 29;
  game.board.fill(0);
  turn(game);
  assert.equal(game.moves, 30);
  assert.ok(game.over);
});

test('legacy daily saves preserve known turns and leave ambiguous push counts unknown', () => {
  const saved = daily.saveDaily(daily.newDailyGame('2026-11-22'));
  delete saved.game.turns;
  saved.game.moves = 5;
  assert.equal(daily.restoreDaily(saved).game.turns, 5);
  saved.game.used = 1;
  assert.equal(daily.restoreDaily(saved).game.turns, undefined);
});
