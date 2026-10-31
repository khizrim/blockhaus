import engine, { type Dir } from './engine';

/* Where every tile goes in a sweep, for the animation. The engine only
   returns the new board; this walks the same lanes the same way (engine
   lanes + pairs), recording each tile's journey, so the screen can slide
   tiles to where the engine put them. A test checks the two agree. */

export type Move = { from: number; to: number; value: number; merges: boolean };

const N = engine.N;

function lanes(dir: Dir): number[][] {
  const out: number[][] = [];
  for (let a = 0; a < N; a++) {
    const lane: number[] = [];
    for (let b = 0; b < N; b++) {
      if (dir === 'left') lane.push(a * N + b);
      else if (dir === 'right') lane.push(a * N + (N - 1 - b));
      else if (dir === 'up') lane.push(b * N + a);
      else lane.push((N - 1 - b) * N + a);
    }
    out.push(lane);
  }
  return out;
}

export function slideMoves(board: number[], dir: Dir): Move[] {
  const moves: Move[] = [];
  for (const lane of lanes(dir)) {
    const tiles = lane.filter((i) => board[i] !== 0);
    let slot = 0;
    for (let k = 0; k < tiles.length; k++) {
      const a = tiles[k];
      const b = tiles[k + 1];
      if (b !== undefined && engine.pairs(board[a], board[b])) {
        moves.push({ from: a, to: lane[slot], value: board[a], merges: true });
        moves.push({ from: b, to: lane[slot], value: board[b], merges: true });
        k++;
      } else {
        moves.push({ from: a, to: lane[slot], value: board[a], merges: false });
      }
      slot++;
    }
  }
  return moves;
}
