import engine, { type Dir } from './engine';

/* Where every tile goes in a sweep, for the animation. The engine only
   returns the new board; this folds the same lanes with the engine's own
   collapse(), recording each tile's journey, so the screen slides tiles to
   exactly where the engine put them. */

export type Move = { from: number; to: number; value: number; merges: boolean };

export function slideMoves(board: number[], dir: Dir, chain: boolean): Move[] {
  const moves: Move[] = [];
  // Stones cut the lanes: tiles stop at them as at the wall.
  for (const lane of engine.laneRuns(board, dir)) {
    const tiles = lane.filter((i) => board[i] !== 0);
    engine.collapse(tiles.map((i) => board[i]), chain).forEach((t, slot) => {
      for (const k of t.from) moves.push({ from: tiles[k], to: lane[slot], value: board[tiles[k]], merges: t.levels.length > 0 });
    });
  }
  return moves;
}
