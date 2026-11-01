/* Types for engine.js, a verbatim copy of prototype/engine.js (the file the
   prototype, the tests and the balance simulator run). test/engine-copy.test.js
   fails if the two drift apart. */

export type Cell = [number, number, number];
export type Piece = { cells: Cell[]; used: boolean };
export type Step = { absorbed: number[]; anchor: number; level: number };
export type Config = Record<string, unknown>;

export type Game = {
  cfg: Config & { sweepChain?: boolean; freeSweeps?: boolean; sweepCost?: 'spawn' | 'merge' | 'push' | 'tilt' | 'none'; goal: number; sweepsPerTray: number; sweepsMax: number; chainBonus: number; pieceLimit: number };
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

export type PlaceResult = { laid: number[]; steps: Step[]; refilled: boolean; /** The chain earned a sweep. */ bonus: boolean };
export type SweepResult = { made: { at: number; level: number }[]; moved: boolean; /** With free sweeps: the new low tile slid in at the far edge. */ spawned?: { at: number; value: number } | null;
  /** The board right after the slide, before a pushed piece. */
  swept?: number[];
  /** With push sweeps: the first unused tray piece, laid at (ox, oy) on the far edge. */
  pushed?: (PlaceResult & { slot: number; piece: Piece; ox: number; oy: number }) | null;
};
export type Dir = 'left' | 'right' | 'up' | 'down';

declare const engine: {
  N: number;
  DEFAULTS: Config & { goal: number };
  /** The balance before free sweeps: two per tray, goal 192. */
  LIMITED: Config;
  pairs(a: number, b: number): boolean;
  merged(a: number, b: number): number;
  rank(v: number): number;
  fits(board: number[], piece: Piece, ox: number, oy: number): boolean;
  size(piece: Piece): { w: number; h: number };
  applyPlacement(board: number[], piece: Piece, ox: number, oy: number): { laid: number[]; steps: Step[] };
  applySweep(board: number[], dir: Dir, chain?: boolean): SweepResult;
  /** Folds one lane (values nearest the wall first): each result tile, the inputs that went into it and its merge levels in order. */
  collapse(vals: number[], chain?: boolean): { v: number; from: number[]; levels: number[] }[];
  lanes(dir: Dir): number[][];
  dealTray(cfg: Config, board: number[], rng: () => number): Piece[];
  newGame(config?: Config, rng?: () => number): Game;
  place(g: Game, slot: number, ox: number, oy: number): PlaceResult | null;
  sweep(g: Game, dir: Dir): SweepResult | null;
  anyMove(g: Game): boolean;
  canSweep(g: Game): boolean;
  canPlaceAnywhere(board: number[], piece: Piece): boolean;
  seeded(seed: number): () => number;
};
export default engine;
