const test = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../prototype/engine.js');
const { availablePlaces, trappedLowTiles } = require('../app/src/game/spaceHints.js');

const N = engine.N;
const piece = (...xy) => ({ cells: xy.map(([x, y]) => [x, y, 1]), used: false });

test('counts distinct legal spots in the dealt orientation and stops at three', () => {
  const horizontal = piece([0, 0], [1, 0]);
  const vertical = piece([0, 0], [0, 1]);
  const board = Array(N * N).fill(3);
  board[N - 1] = board[N] = 0;
  assert.equal(availablePlaces(board, horizontal), 0); // no row wrapping
  board[N + 1] = 0;
  assert.equal(availablePlaces(board, horizontal), 1);
  assert.equal(availablePlaces(board, vertical), 0);
  board[N + 2] = 0;
  assert.equal(availablePlaces(board, horizontal), 2);
  board[N + 3] = board[N + 4] = 0;
  assert.equal(availablePlaces(board, horizontal), 3);
  assert.equal(availablePlaces(board, piece([0, 0], [1, 0], [0, 1], [1, 1])), 0);
});

test('only enclosed ones and twos without a partner are trapped', () => {
  const board = Array(N * N).fill(engine.STONE);
  board[N - 1] = 1;
  board[N] = 2;
  board[2 * N + 3] = 1;
  board[2 * N + 4] = 2;
  board[3 * N + 1] = 1;
  board[3 * N + 2] = 0;
  board[0] = 3;
  assert.deepEqual([...trappedLowTiles(board)], [N - 1, N]);
});
