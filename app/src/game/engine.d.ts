/* Types for engine.js, a verbatim copy of prototype/engine.js (the file the
   prototype, the tests and the balance simulator run). test/engine-copy.test.js
   fails if the two drift apart. */

export type Cell = [number, number, number];
export type Piece = { cells: Cell[]; used: boolean };
export type Step = { absorbed: number[]; anchor: number; level: number };
export type Config = Record<string, unknown>;

export type Game = {
  cfg: Config & { goal: number; sweepsPerTray: number };
  rng: () => number;
  board: number[];
  tray: Piece[];
  sweeps: number;
  score: number;
  merges: number;
  bestTile: number;
  moves: number;
  won: boolean;
  over: boolean;
};

export type PlaceResult = { laid: number[]; steps: Step[]; refilled: boolean };
export type SweepResult = { made: { at: number; level: number }[]; moved: boolean };
export type Dir = 'left' | 'right' | 'up' | 'down';

declare const engine: {
  N: number;
  DEFAULTS: Config;
  pairs(a: number, b: number): boolean;
  merged(a: number, b: number): number;
  rank(v: number): number;
  fits(board: number[], piece: Piece, ox: number, oy: number): boolean;
  size(piece: Piece): { w: number; h: number };
  applyPlacement(board: number[], piece: Piece, ox: number, oy: number): { laid: number[]; steps: Step[] };
  applySweep(board: number[], dir: Dir): SweepResult;
  dealTray(cfg: Config, board: number[], rng: () => number): Piece[];
  newGame(config?: Config, rng?: () => number): Game;
  place(g: Game, slot: number, ox: number, oy: number): PlaceResult | null;
  sweep(g: Game, dir: Dir): SweepResult | null;
  anyMove(g: Game): boolean;
  canPlaceAnywhere(board: number[], piece: Piece): boolean;
  seeded(seed: number): () => number;
};
export default engine;
