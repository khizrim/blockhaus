import type { Game } from './engine';

export type RunMode = 'cascade' | 'free' | 'daily';
export type RunResult = {
  endedAt: number;
  mode: RunMode;
  outcome: 'finished' | 'abandoned';
  bestTile: number;
  score: number;
  pieces: number;
  turns: number | null;
  sweeps: number;
};

export function makeRunResult(game: Game, mode: RunMode, endedAt = Date.now()): RunResult {
  const sweeps = game.used ?? 0;
  // Old push-mode saves count a piece laid by a sweep in both counters.
  const push = game.cfg.freeSweeps && game.cfg.sweepCost === 'push';
  return {
    endedAt,
    mode,
    outcome: game.over ? 'finished' : 'abandoned',
    bestTile: game.bestTile,
    score: game.score,
    pieces: game.moves,
    turns: game.turns ?? (push && sweeps > 0 ? null : game.moves + sweeps),
    sweeps,
  };
}

const count = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0;

export function readHistory(raw: unknown): RunResult[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((row): row is RunResult =>
    row !== null && typeof row === 'object' &&
    (row.mode === 'cascade' || row.mode === 'free' || row.mode === 'daily') &&
    (row.outcome === 'finished' || row.outcome === 'abandoned') &&
    count(row.endedAt) && Number.isFinite(new Date(row.endedAt).getTime()) &&
    count(row.bestTile) && count(row.score) && count(row.pieces) && count(row.sweeps) &&
    (row.turns === null || count(row.turns)),
  );
}

export function historyCSV(history: RunResult[]): string {
  const rows = history.map((r) =>
    [new Date(r.endedAt).toISOString(), r.mode, r.outcome, r.bestTile, r.score, r.pieces, r.turns, r.sweeps].join(','),
  );
  return ['ended_at,mode,outcome,best_tile,score,pieces,turns,sweeps', ...rows].join('\n');
}
