const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../prototype/engine.js');
const { N, idx } = E;

const empty = () => new Array(N * N).fill(0);
const piece = (v, shape = [[0, 0]]) => ({ cells: shape.map(([x, y]) => [x, y, v]), used: false });

test('pairing follows the Threes economy', () => {
  assert.ok(E.pairs(1, 2) && E.pairs(2, 1));
  assert.ok(!E.pairs(1, 1) && !E.pairs(2, 2));
  assert.ok(E.pairs(3, 3) && E.pairs(48, 48));
  assert.ok(!E.pairs(3, 6) && !E.pairs(2, 3));
  assert.equal(E.merged(1, 2), 3);
  assert.equal(E.merged(12, 12), 24);
});

test('a placement beside a partner merges into the laid cell', () => {
  const b = empty();
  b[idx(1, 0)] = 2;
  const { steps } = E.applyPlacement(b, piece(1), 0, 0);
  assert.equal(steps.length, 1);
  assert.equal(b[idx(0, 0)], 3);
  assert.equal(b[idx(1, 0)], 0);
});

test('merges cascade up the ladder', () => {
  // A 1 dropped in the middle of a 2, a 3, a 6 and a 12 eats all four.
  const b = empty();
  b[idx(0, 1)] = 2; b[idx(2, 1)] = 3; b[idx(1, 0)] = 6; b[idx(1, 2)] = 12;
  const { steps } = E.applyPlacement(b, piece(1), 1, 1);
  assert.deepEqual(steps.map(s => s.level), [3, 6, 12, 24]);
  assert.equal(b[idx(1, 1)], 24);
  assert.equal(b.filter(Boolean).length, 1);
});

test('same low values never merge', () => {
  const b = empty();
  b[idx(1, 0)] = 2;
  const { steps } = E.applyPlacement(b, piece(2, [[0, 0], [0, 1]]), 0, 0);
  assert.equal(steps.length, 0);
  assert.equal(b.filter(v => v === 2).length, 3);
});

test('fits rejects occupied and out-of-bounds cells', () => {
  const b = empty();
  b[idx(2, 2)] = 1;
  const tri = piece(1, [[0, 0], [1, 0], [2, 0]]);
  assert.ok(E.fits(b, tri, 0, 0));
  assert.ok(!E.fits(b, tri, 4, 0));
  assert.ok(!E.fits(b, tri, 0, 2));
});

test('a sweep slides and merges each pair once', () => {
  const b = empty();
  // Row 0: 3 3 3 3 _ _  -> 6 6 _ _ _ _
  for (let x = 0; x < 4; x++) b[idx(x, 0)] = 3;
  // Row 1: _ 1 _ 2 _ _  -> 3 _ _ _ _ _
  b[idx(1, 1)] = 1; b[idx(3, 1)] = 2;
  const { made, moved } = E.applySweep(b, 'left');
  assert.ok(moved);
  assert.deepEqual(b.slice(0, 6), [6, 6, 0, 0, 0, 0]);
  assert.deepEqual(b.slice(6, 12), [3, 0, 0, 0, 0, 0]);
  assert.equal(made.length, 3);
});

test('with sweepChain a merged tile merges again along its line', () => {
  const row = (vals, dir = 'left') => {
    const b = empty();
    vals.forEach((v, x) => { b[idx(x, 0)] = v; });
    const { made } = E.applySweep(b, dir, true);
    return { row: b.slice(0, 6), levels: made.map(m => m.level) };
  };
  // 1 2 3: the new 3 meets the old one and makes a 6.
  assert.deepEqual(row([1, 2, 3]), { row: [6, 0, 0, 0, 0, 0], levels: [3, 6] });
  // 3 3 6 12: the fold runs the whole line.
  assert.deepEqual(row([3, 3, 6, 12]), { row: [24, 0, 0, 0, 0, 0], levels: [6, 12, 24] });
  // 6 3 3: a pair further out folds back into the tile at the wall.
  assert.deepEqual(row([6, 3, 3]), { row: [12, 0, 0, 0, 0, 0], levels: [6, 12] });
  // 3 3 3 3 still makes two 6s side by side, then they meet: 12.
  assert.deepEqual(row([3, 3, 3, 3]).row, [12, 0, 0, 0, 0, 0]);
  // Pushed right, the fold starts from the right wall: the 3s make a 6,
  // which stops beside the 12 it can't pair with.
  assert.deepEqual(row([3, 3, 12, 0, 0, 0], 'right').row, [0, 0, 0, 0, 6, 12]);
  // Tiles that never pair just slide.
  assert.deepEqual(row([1, 1, 2]).row, [1, 3, 0, 0, 0, 0]);
});

test('without sweepChain a sweep still merges each tile once (2048 rule)', () => {
  const b = empty();
  [1, 2, 3].forEach((v, x) => { b[idx(x, 0)] = v; });
  E.applySweep(b, 'left', false);
  assert.deepEqual(b.slice(0, 6), [3, 3, 0, 0, 0, 0]);
});

test('the shipped game folds lines when it sweeps', () => {
  const g = E.newGame({}, E.seeded(3));
  g.board = empty();
  [3, 3, 6].forEach((v, x) => { g.board[idx(x, 0)] = v; });
  const res = E.sweep(g, 'left');
  assert.deepEqual(g.board.slice(0, 5), [12, 0, 0, 0, 0]);
  assert.equal(res.made.length, 2);
});

test('free sweeps never run out, and each slides a new low tile in from the far edge', () => {
  const g = E.newGame({}, E.seeded(1));
  assert.ok(g.cfg.freeSweeps);
  g.board = empty();
  g.board[idx(2, 2)] = 6;
  const before = g.sweeps;
  for (const dir of ['left', 'right', 'left', 'right']) {
    const res = E.sweep(g, dir);
    assert.ok(res);
    // The new tile lands on the edge the tiles moved away from.
    const x = res.spawned.at % N;
    assert.equal(x, dir === 'left' ? N - 1 : 0);
    assert.ok([1, 2].includes(res.spawned.value));
  }
  assert.equal(g.sweeps, before);
});

test('with free sweeps the game ends only when no sweep can change anything', () => {
  const g = E.newGame({}, E.seeded(4));
  // A full board of 6s and 12s that never pair: no piece fits, nothing slides.
  for (let i = 0; i < g.board.length; i++) g.board[i] = ((i % 6) + ((i / 6) | 0)) % 2 ? 6 : 12;
  assert.ok(!E.anyMove(g));
  // One hole: a sweep slides tiles into it, so the game goes on.
  g.board[idx(0, 0)] = 0;
  g.tray = [piece(1, [[0, 0], [1, 0]]), piece(2, [[0, 0], [0, 1]]), piece(1, [[0, 0], [1, 0]])];
  assert.ok(E.anyMove(g));
});

test('the shipped goal is 384', () => {
  const g = E.newGame({}, E.seeded(3));
  g.board[idx(1, 0)] = 192; g.board[idx(0, 1)] = 192;
  g.tray[0] = piece(192);
  E.place(g, 0, 0, 0);
  assert.equal(g.bestTile, 384);
  assert.ok(g.won);
  assert.equal(E.rank(768), 11);
});
test('a 768 is the last rung', () => {
  const g = E.newGame({}, E.seeded(3));
  g.board[idx(1, 0)] = 384; g.board[idx(0, 1)] = 384;
  g.tray[0] = piece(384);
  E.place(g, 0, 0, 0);
  assert.equal(g.bestTile, 768);
  assert.ok(g.won);
  assert.equal(E.rank(768), 11);
});

test('a limited sweep that moves nothing is refused and costs nothing', () => {
  const g = E.newGame(E.LIMITED, E.seeded(1));
  g.board[idx(0, 0)] = 1;
  assert.equal(E.sweep(g, 'left'), null);
  assert.equal(g.sweeps, g.cfg.sweepsPerTray);
  assert.ok(E.sweep(g, 'right'));
  assert.equal(g.sweeps, g.cfg.sweepsPerTray - 1);
});

test('the tray refills and sweeps reset once all three pieces are used', () => {
  const g = E.newGame(E.LIMITED, E.seeded(2));
  g.sweeps = 0;
  const first = g.tray;
  let slot = 0;
  for (let y = 0; y < N && slot < 3; y += 3) for (let x = 0; x < N && slot < 3; x += 3) {
    if (E.place(g, slot, x, y)) slot++;
  }
  assert.equal(slot, 3);
  assert.notEqual(g.tray, first);
  assert.equal(g.sweeps, g.cfg.sweepsPerTray);
  assert.equal(g.moves, 3);
});

test('with limited sweeps, reaching 192 wins', () => {
  const g = E.newGame(E.LIMITED, E.seeded(3));
  g.board[idx(1, 0)] = 96; g.board[idx(0, 1)] = 96;
  g.tray[0] = piece(96);
  E.place(g, 0, 0, 0);
  assert.equal(g.bestTile, 192);
  assert.ok(g.won);
});

test('the game ends when nothing in hand fits and no sweep helps', () => {
  const g = E.newGame(E.LIMITED, E.seeded(4));
  g.board.fill(3);
  g.board[idx(0, 0)] = 0;
  g.tray = [piece(1, [[0, 0], [1, 0]]), piece(2, [[0, 0], [0, 1]]), piece(1, [[0, 0], [1, 0]])];
  g.sweeps = 0;
  assert.ok(!E.anyMove(g));
  g.tray[1] = piece(2);
  assert.ok(E.anyMove(g));
});

test('a sweep in hand that would move tiles keeps the game going', () => {
  const g = E.newGame(E.LIMITED, E.seeded(4));
  g.board.fill(3);
  g.board[idx(0, 0)] = 0;
  g.tray = [piece(1, [[0, 0], [1, 0]]), piece(2, [[0, 0], [0, 1]]), piece(1, [[0, 0], [1, 0]])];
  g.sweeps = 1;
  assert.ok(E.anyMove(g), 'the hole can be swept, so the game is not over');
  // A full board of 6s and 12s that never pair: nothing slides, sweeps do not help.
  for (let i = 0; i < g.board.length; i++) g.board[i] = ((i % 6) + ((i / 6) | 0)) % 2 ? 6 : 12;
  assert.ok(!E.anyMove(g));
});

test('every tray holds both 1s and 2s', () => {
  const rng = E.seeded(5);
  for (let k = 0; k < 500; k++) {
    const vals = new Set(E.dealTray(E.DEFAULTS, empty(), rng).flatMap(p => p.cells.map(c => c[2])));
    assert.ok(vals.has(1) && vals.has(2));
  }
});

test('the need dealer leans toward the value the board is short of', () => {
  const b = empty();
  for (let i = 0; i < 12; i++) b[i] = 2;
  const cfg = { ...E.DEFAULTS, dealer: 'need' };
  assert.ok(E.chanceOfOnes(cfg, b) > 0.8);
  assert.equal(E.chanceOfOnes(cfg, empty()), 0.5);
  assert.equal(E.chanceOfOnes(E.ORIGINAL, b), 0.5);
});

test('balanced trays keep 1-cells and 2-cells within the slack', () => {
  const rng = E.seeded(6);
  const cfg = { ...E.ORIGINAL, balancedTray: 1 };
  for (let k = 0; k < 500; k++) {
    let ones = 0, twos = 0;
    for (const p of E.dealTray(cfg, empty(), rng)) for (const c of p.cells) c[2] === 1 ? ones++ : twos++;
    // A flip moves a whole piece, so a gap can stay if no flip narrows it.
    assert.ok(Math.abs(ones - twos) <= 3, `${ones} vs ${twos}`);
  }
});

test('seeded games replay identically', () => {
  const a = E.newGame({}, E.seeded(42)), b = E.newGame({}, E.seeded(42));
  assert.deepEqual(a.tray, b.tray);
});

test('a chain of two merges earns a sweep, up to the cap', () => {
  const g = E.newGame(E.LIMITED, E.seeded(9));
  g.board = new Array(N * N).fill(0);
  // 1 next to 2 makes 3, which meets the 3 beside it: two merges.
  g.board[idx(1, 0)] = 2; g.board[idx(0, 1)] = 3;
  g.tray = [piece(1), piece(1), piece(1)];
  g.sweeps = 1;
  const res = E.place(g, 0, 0, 0);
  assert.equal(res.steps.length, 2);
  assert.ok(res.bonus);
  assert.equal(g.sweeps, 2);
  g.sweeps = g.cfg.sweepsMax;
  g.board[idx(4, 4)] = 2; g.board[idx(3, 5)] = 3;
  const again = E.place(g, 1, 3, 4);
  assert.equal(again.steps.length, 2);
  assert.ok(!again.bonus);
  assert.equal(g.sweeps, g.cfg.sweepsMax);
});

test('a piece limit ends the game after that many placements', () => {
  const g = E.newGame({ pieceLimit: 2 }, E.seeded(11));
  g.board = new Array(N * N).fill(0);
  g.tray = [piece(3), piece(6), piece(12)];
  E.place(g, 0, 0, 0);
  assert.ok(!g.over);
  E.place(g, 1, 3, 3);
  assert.ok(g.over);
  assert.equal(E.place(g, 2, 5, 5), null);
});
