import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import engine, { type Dir, type Game, type Piece, type PlaceResult, type SweepResult } from './engine';
import { FIRST_TRAY, LESSONS } from './lessons';
import { newDailyGame, restoreDaily, saveDaily, type DailyRun, type SavedDaily } from './daily';
import { makeRunResult, readHistory, type RunResult } from './history';

/* The one running game and the player's record, shared by every screen and
   saved after every move, so closing the app never loses a game. */

export type Stats = { best: number; bestTile: number; played: number; total: number };
/** How sweeps work in the free game: free (each pushes a piece in) or earned by cascades. */
export type Rules = 'free' | 'cascade';
const rulesConfig = (r: Rules) => (r === 'cascade' ? engine.CASCADE : undefined);

const KEY = 'blockhaus:v1';
const EMPTY: Stats = { best: 0, bestTile: 0, played: 0, total: 0 };
// `used`: sweeps made in this game.
const FIELDS = ['board', 'tray', 'next', 'sweeps', 'score', 'merges', 'bestTile', 'moves', 'won', 'over', 'used', 'turns'] as const;
const rulesOf = (g: Game): Rules => g.cfg.freeSweeps === false ? 'cascade' : 'free';

type GameFields = Pick<Game, (typeof FIELDS)[number]>;
type Saved = {
  game: GameFields; stats: Stats; learned?: boolean;
  history?: RunResult[];
  daily?: SavedDaily;
  previousBestTile?: number;
  /** Rules of the free game on the board, and the ones the next free game starts with. */
  gameRules?: Rules; rules?: Rules;
  /** The player chose the rules in the settings (before 2026-11-02 `rules` was always written, as 'free'). */
  rulesPicked?: boolean;
};

type Store = {
  ready: boolean;
  game: Game;
  /** Bumps on every change, for memo keys. */
  version: number;
  stats: Stats;
  history: RunResult[];
  previousBestTile: number;
  mode: 'classic' | 'daily';
  dailyRun: DailyRun | null;
  startDaily: (key: string) => void;
  leaveDaily: () => void;
  /** A game worth continuing: started and not over. */
  inProgress: boolean;
  /** The first-game lesson was finished or skipped. */
  learned: boolean;
  /** Index of the lesson on the board, or null in a normal game. */
  lesson: number | null;
  startLesson: (k: number) => void;
  /** Leave the lessons. Finished (`carry`): the game goes on from the lesson
      board. Skipped: back to the game put aside, else a new one. */
  finishLessons: (carry?: boolean) => void;
  place: (slot: number, ox: number, oy: number) => PlaceResult | null;
  sweep: (dir: Dir) => SweepResult | null;
  newGame: () => void;
  resetProgress: () => void;
  /** Rules of the game on the board. */
  rules: Rules;
  /** Prototype only: put a still position on the board. */
  loadPosition: (p: { board: number[]; tray: (Piece | { cells: [number, number, number][]; used?: boolean } | null)[]; score: number; merges: number; sweeps: number }) => void;
};

const Ctx = createContext<Store | null>(null);

function restore(s: GameFields, cfg?: Record<string, unknown>): Game {
  const g = engine.newGame(cfg);
  for (const f of FIELDS) if (s[f] !== undefined) (g as Record<string, unknown>)[f] = s[f];
  if (s.turns === undefined) {
    const pushed = g.cfg.freeSweeps && g.cfg.sweepCost === 'push' && (g.used ?? 0) > 0;
    g.turns = pushed ? undefined : g.moves + (g.used ?? 0);
  }
  return g;
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(() => engine.newGame(engine.CASCADE));
  const gRef = useRef<Game>(initial);
  const dailyRef = useRef<DailyRun | null>(null);
  const baseline = useRef(0);
  const [mode, setMode] = useState<'classic' | 'daily'>('classic');
  const [history, setHistory] = useState<RunResult[]>([]);
  const writes = useRef(Promise.resolve());
  const [frame, setFrame] = useState({
    version: 0, game: initial, classic: initial,
    dailyRun: null as DailyRun | null, previousBestTile: 0,
  });
  const { version } = frame;
  const [stats, setStats] = useState<Stats>(EMPTY);
  const [ready, setReady] = useState(false);
  const [learned, setLearned] = useState(false);
  const [lesson, setLesson] = useState<number | null>(null);
  const saved = useRef<Game | null>(null);
  const bump = useCallback(() => {
    const game = gRef.current;
    const classic = saved.current ?? game;
    const dailyRun = dailyRef.current;
    const previousBestTile = baseline.current;
    setFrame((prior) => ({ version: prior.version + 1, game, classic, dailyRun, previousBestTile }));
  }, []);
  // Sweeps earned by cascades: the one rule set since the plastic redesign
  // (2026-11-08); the free-sweeps option was dropped with the other extras.
  const nextRules: Rules = 'cascade';

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw) return;
        const s = JSON.parse(raw) as Saved;
        gRef.current = restore(s.game, rulesConfig(s.gameRules ?? 'free'));
        // Preserve the personal record from older saves; the old win count is obsolete.
        const { best, bestTile, played, total } = { ...EMPTY, ...s.stats };
        setStats({ best, bestTile, played, total });
        baseline.current = s.previousBestTile ?? bestTile;
        setHistory(readHistory(s.history));
        setLearned(!!s.learned || (s.stats?.played ?? 0) > 0);
        if (s.daily) dailyRef.current = restoreDaily(s.daily);
      })
      .catch(() => {})
      .finally(() => {
        setReady(true);
        bump();
      });
  }, [bump]);

  // Save after every change once loaded.
  useEffect(() => {
    if (!ready) return;
    // During the lesson, the free game is the one put aside.
    const g = frame.classic;
    const fields = (x: Game) => Object.fromEntries(FIELDS.map((f) => [f, x[f]])) as GameFields;
    const json = JSON.stringify({
      game: fields(g), stats, learned, history, previousBestTile: frame.previousBestTile,
      daily: frame.dailyRun ? saveDaily(frame.dailyRun) : undefined, gameRules: rulesOf(g),
    } satisfies Saved);
    writes.current = writes.current.then(() => AsyncStorage.setItem(KEY, json)).catch(() => {});
  }, [ready, frame, stats, learned, history]);

  /** Fold a finished or abandoned game into the record. */
  const record = useCallback((g: Game, daily = false) => {
    if (!g.moves && !g.used) return;
    const result = makeRunResult(g, daily ? 'daily' : rulesOf(g));
    setHistory((rows) => [result, ...rows]);
    if (daily) return;
    setStats((s) => ({
      ...s,
      best: Math.max(s.best, result.score),
      bestTile: Math.max(s.bestTile, result.bestTile),
      played: s.played + 1,
    }));
  }, []);

  const afterMove = useCallback(
    (g: Game) => {
      if (!g.over || lesson !== null) return;
      record(g, mode === 'daily');
    },
    [record, lesson, mode],
  );

  const place = useCallback(
    (slot: number, ox: number, oy: number) => {
      const g = mode === 'daily' ? dailyRef.current!.game : gRef.current;
      const res = engine.place(g, slot, ox, oy);
      if (res) {
        if (g.turns !== undefined) g.turns++;
        afterMove(g);
        bump();
      }
      return res;
    },
    [afterMove, mode, bump],
  );

  const sweep = useCallback(
    (dir: Dir) => {
      const g = mode === 'daily' ? dailyRef.current!.game : gRef.current;
      const res = engine.sweep(g, dir);
      if (res) {
        g.used = (g.used ?? 0) + 1;
        if (g.turns !== undefined) g.turns++;
        afterMove(g);
        bump();
      }
      return res;
    },
    [afterMove, mode, bump],
  );

  const newGame = useCallback(() => {
    const g = saved.current ?? gRef.current;
    if (!g.over) record(g);
    baseline.current = Math.max(stats.bestTile, g.bestTile);
    setMode('classic');
    setLesson(null);
    saved.current = null;
    gRef.current = engine.newGame(rulesConfig(nextRules));
    bump();
  }, [record, nextRules, stats.bestTile, bump]);

  const startDaily = useCallback((key: string) => {
    if (!ready) return;
    if (lesson !== null) {
      gRef.current = saved.current ?? engine.newGame(engine.CASCADE);
      saved.current = null;
      setLesson(null);
    }
    const prior = dailyRef.current;
    if (prior?.key !== key) {
      const next = newDailyGame(key);
      if (prior && !prior.game.over) record(prior.game, true);
      dailyRef.current = next;
    }
    setMode('daily');
    bump();
  }, [ready, lesson, record, bump]);
  const leaveDaily = useCallback(() => setMode('classic'), []);

  const startLesson = useCallback(
    (k: number) => {
      const L = LESSONS[k];
      if (!L) return;
      setMode('classic');
      if (lesson === null) saved.current = gRef.current;
      // The real rules, the ones the next game is played by; a lesson's tray
      // holds only what it teaches.
      // The score runs on through the lessons instead of starting over each step.
      const carry = lesson !== null ? gRef.current.score : 0;
      const g = engine.newGame(rulesConfig(nextRules));
      // A lesson's tray is never dealt again, so it brings no sweep of its
      // own: the studs on the sweep key are only the ones a chain earned.
      g.cfg = { ...g.cfg, sweepsPerTray: 0 };
      g.score = carry;
      g.board = L.board.slice();
      g.tray = L.tray.map((p) => ({ cells: p.cells.map((c) => [...c] as [number, number, number]), used: p.used }));
      g.sweeps = L.sweeps;
      g.bestTile = Math.max(...g.board);
      gRef.current = g;
      setLesson(k);
      bump();
    },
    [lesson, nextRules, bump],
  );

  const finishLessons = useCallback((carry = false) => {
    setLearned(true);
    setLesson(null);
    const put = saved.current && (saved.current.moves || saved.current.used) && !saved.current.over ? saved.current : null;
    if (put && !carry) gRef.current = put;
    else if (!carry) {
      baseline.current = stats.bestTile;
      gRef.current = engine.newGame(rulesConfig(nextRules));
    }
    else {
      /* The game goes on from the lessons' last board and key: the same
         tiles, the same studs, a fresh tray and the score from 0. Finished
         lessons always hand over this way, also when they were replayed
         with a game put aside (2026-11-09, Khizri: the board after the
         lessons was still another one): that game goes into the record. */
      if (put) record(put);
      baseline.current = Math.max(stats.bestTile, put?.bestTile ?? 0);
      const L = gRef.current;
      const g = engine.newGame(rulesConfig(nextRules));
      g.board = L.board.map((v) => (v === engine.STONE ? 0 : v));
      g.sweeps = L.sweeps;
      g.tray = FIRST_TRAY.map((p) => ({ cells: p.cells.map((c) => [...c] as [number, number, number]), used: false }));
      // The next tray, after the lessons' singles: small pieces only (1 and
      // 2 cells), so long pieces do not arrive all at once.
      const small = (g.cfg.shapes as [[number, number][], number][]).filter(([sh]) => sh.length <= 2);
      if (g.cfg.peek && small.length) g.next = engine.dealShapes({ ...g.cfg, shapes: small }, g.rng);
      g.bestTile = Math.max(...g.board);
      gRef.current = g;
    }
    saved.current = null;
    bump();
  }, [nextRules, record, stats.bestTile, bump]);

  const value = useMemo<Store>(() => {
    const { classic, dailyRun, previousBestTile } = frame;
    const g = mode === 'daily' && dailyRun ? dailyRun.game : frame.game;
    return {
      ready,
      rules: rulesOf(g),
      game: g,
      history, previousBestTile, mode, dailyRun, startDaily, leaveDaily,
      version,
      stats: {
        ...stats,
        // The running game counts toward the record as it goes.
        best: Math.max(stats.best, classic.score),
        bestTile: Math.max(stats.bestTile, classic.bestTile),
      },
      inProgress: lesson === null && (classic.moves > 0 || !!classic.used) && !classic.over,
      learned,
      lesson,
      startLesson,
      finishLessons,
      place,
      sweep,
      newGame,
      resetProgress: () => {
        setStats(EMPTY);
        setHistory([]);
        setMode('classic');
        setLesson(null);
        saved.current = null;
        dailyRef.current = null;
        baseline.current = 0;
        setLearned(false);
        gRef.current = engine.newGame(engine.CASCADE);
        bump();
      },
      loadPosition: (p) => {
        const ng = engine.newGame();
        ng.board = p.board.slice();
        ng.tray = p.tray.map((t) => ({ cells: (t ?? { cells: [[0, 0, 1]] }).cells.map((c) => [...c] as [number, number, number]), used: false }));
        ng.score = p.score;
        ng.merges = p.merges;
        ng.sweeps = p.sweeps;
        ng.moves = 1;
        ng.bestTile = Math.max(...p.board);
        ng.won = ng.bestTile >= ng.cfg.goal;
        ng.over = !engine.anyMove(ng);
        gRef.current = ng;
        bump();
      },
    };
  }, [ready, frame, version, stats, place, sweep, newGame, learned, lesson, startLesson, finishLessons, history, mode, startDaily, leaveDaily, bump]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGame(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useGame outside GameProvider');
  return s;
}
