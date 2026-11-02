/* Types for engine.js, a verbatim copy of prototype/engine.js (the file the
   prototype, the tests and the balance simulator run). test/engine-copy.test.js
   fails if the two drift apart. */

export type Cell = [number, number, number];
export type Piece = { cells: Cell[]; used: boolean };
export type Step = { absorbed: number[]; anchor: number; level: number; /** Points it scored: the level, times the multiplier for its place in a placed piece's cascade (cfg.chainScore). */ pts: number };
export type Config = Record<string, unknown>;

export type Game = {
  cfg: Config & { sweepChain?: boolean; freeSweeps?: boolean; sweepCost?: 'spawn' | 'merge' | 'push' | 'tilt' | 'none'; stones?: number[]; chainScore?: number[]; absorb?: 'big' | 'new'; goal: number; sweepsPerTray: number; sweepsMax: number; chainBonus: number; pieceLimit: number };
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
  /** Kept by the app, not the engine: sweeps made in this game. */
  used?: number;
};

export type PlaceResult = { laid: number[]; steps: Step[]; refilled: boolean; /** The chain earned a sweep. */ bonus: boolean };
export type SweepResult = { made: { at: number; level: number; pts: number }[]; moved: boolean; /** With free sweeps: the new low tile slid in at the far edge. */ spawned?: { at: number; value: number } | null;
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
  /** Sweeps earned by cascades: one per tray, one more for a cascade of four merges, two at most. */
  CASCADE: Config;
  /** The game of the day: thirty pieces, six start tiles. */
  DAILY: { pieceLimit: number; startTiles: number };
  /** Weekday rules of the game of the day, by Date.getDay(). */
  WEEKDAY: Record<number, Config & { rule: string }>;
  /** A cell that is taken but holds no tile. */
  STONE: number;
  /** The lanes of a sweep cut at stones. */
  laneRuns(board: number[], dir: Dir): number[][];
  pairs(a: number, b: number): boolean;
  merged(a: number, b: number): number;
  rank(v: number): number;
  fits(board: number[], piece: Piece, ox: number, oy: number): boolean;
  size(piece: Piece): { w: number; h: number };
  applyPlacement(board: number[], piece: Piece, ox: number, oy: number, absorb?: 'big' | 'new'): { laid: number[]; steps: Step[] };
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
