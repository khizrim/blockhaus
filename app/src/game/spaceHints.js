const { N, fits, size, neighbours, pairs } = require('./engine.js');

// Only counts 0, 1 and 2 are displayed. A third fit ends the search.
function availablePlaces(board, piece) {
  const { w, h } = size(piece);
  let count = 0;
  for (let y = 0; y <= N - h; y++) {
    for (let x = 0; x <= N - w; x++) {
      if (fits(board, piece, x, y) && ++count === 3) return count;
    }
  }
  return count;
}

function trappedLowTiles(board) {
  const trapped = new Set();
  board.forEach((v, i) => {
    if (v !== 1 && v !== 2) return;
    // An open side can still receive the opposite low tile on a placement.
    if (neighbours(i).every(j => board[j] !== 0 && !pairs(v, board[j]))) trapped.add(i);
  });
  return trapped;
}

module.exports = { availablePlaces, trappedLowTiles };
