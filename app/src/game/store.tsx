import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import engine, { type Dir, type Game, type Piece, type PlaceResult, type SweepResult } from './engine';
import { dailyConfig, dayKey, dayStream, newDailyGame } from './daily';
import { LESSONS } from './lessons';

/* The one running game and the player's record, shared by every screen and
   saved after every move, so closing the app never loses a game. */

export type Stats = { best: number; bestTile: number; played: number; wins: number; total: number };
/** How sweeps work in the free game: free (each pushes a piece in) or earned by cascades. */
export type Rules = 'free' | 'cascade';
const rulesConfig = (r: Rules) => (r === 'cascade' ? engine.CASCADE : undefined);

const KEY = 'blockhaus:v1';
const EMPTY: Stats = { best: 0, bestTile: 0, played: 0, wins: 0, total: 0 };
// `used`: sweeps made in this game.
const FIELDS = ['board', 'tray', 'next', 'sweeps', 'score', 'merges', 'bestTile', 'moves', 'won', 'over', 'used'] as const;

type GameFields = Pick<Game, (typeof FIELDS)[number]>;
export type DailyResult = { score: number; bestTile: number; board: number[] };
type SavedDaily = { key: string; draws: number; game: GameFields; winSeen: boolean; result: DailyResult | null };
type Saved = {
  game: GameFields; stats: Stats; winSeen: boolean; learned?: boolean; daily?: SavedDaily;
  /** Rules of the free game on the board, and the ones the next free game starts with. */
  gameRules?: Rules; rules?: Rules;
  /** The player chose the rules in the settings (before 2026-11-02 `rules` was always written, as 'free'). */
  rulesPicked?: boolean;
};

/** Today's game of the day, as screens see it. */
export type Daily = { key: string; started: boolean; done: boolean; result: DailyResult | null };

type Store = {
  ready: boolean;
  game: Game;
  /** Bumps on every change, for memo keys. */
  version: number;
  stats: Stats;
  /** The win screen was shown for this game; later merges don't show it again. */
  winSeen: boolean;
  /** A game worth continuing: started and not over. */
  inProgress: boolean;
  /** The first-game lesson was finished or skipped. */
  learned: boolean;
  /** Index of the lesson on the board, or null in a normal game. */
  lesson: number | null;
  startLesson: (k: number) => void;
  /** Leave the lessons for a fresh game. */
  finishLessons: () => void;
  place: (slot: number, ox: number, oy: number) => PlaceResult | null;
  sweep: (dir: Dir) => SweepResult | null;
  newGame: () => void;
  markWinSeen: () => void;
  resetProgress: () => void;
  /** Which game is on the board: the free one or the game of the day. */
  mode: 'classic' | 'daily';
  daily: Daily;
  /** Put today's game of the day on the board, starting it if needed. */
  startDaily: () => void;
  /** Back to the free game; the daily run waits where it was. */
  leaveDaily: () => void;
  /** Rules of the game on the board. */
  rules: Rules;
  /** Prototype only: put a still position on the board. */
  loadPosition: (p: { board: number[]; tray: (Piece | { cells: [number, number, number][]; used?: boolean } | null)[]; score: number; merges: number; sweeps: number }) => void;
};

const Ctx = createContext<Store | null>(null);

function restore(s: GameFields, rng?: () => number, cfg?: Record<string, unknown>): Game {
  // Built on a throwaway stream (newGame deals a tray), then handed the real
  // one, so a replayed daily stream is not advanced by the restore itself.
  const g = engine.newGame(cfg);
  for (const f of FIELDS) if (s[f] !== undefined) (g as Record<string, unknown>)[f] = s[f];
  if (rng) g.rng = rng;
  return g;
}

export function GameProvider({ children }: { children: ReactNode }) {
  const gRef = useRef<Game>(engine.newGame());
  const [version, setVersion] = useState(0);
  const [stats, setStats] = useState<Stats>(EMPTY);
  const [winSeen, setWinSeen] = useState(false);
  const [ready, setReady] = useState(false);
  const [learned, setLearned] = useState(false);
  const [lesson, setLesson] = useState<number | null>(null);
  const saved = useRef<Game | null>(null);
  const [mode, setMode] = useState<'classic' | 'daily'>('classic');
  /** The free game, put aside while the daily is on the board. */
  const classic = useRef<{ game: Game; winSeen: boolean } | null>(null);
  const dailyRef = useRef<{ key: string; game: Game; stream: ReturnType<typeof dayStream>; winSeen: boolean; result: DailyResult | null } | null>(null);
  // Sweeps earned by cascades: the one rule set since the plastic redesign
  // (2026-11-08); the free-sweeps option was dropped with the other extras.
  const nextRules: Rules = 'cascade';
  const rulesOf = (g: Game): Rules => (g.cfg.freeSweeps === false && g.cfg.chainBonus === engine.CASCADE.chainBonus && g.cfg.sweepsPerTray === engine.CASCADE.sweepsPerTray ? 'cascade' : 'free');

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw) return;
        const s = JSON.parse(raw) as Saved;
        gRef.current = restore(s.game, undefined, rulesConfig(s.gameRules ?? 'free'));
        setStats({ ...EMPTY, ...s.stats });
        setWinSeen(!!s.winSeen);
        setLearned(!!s.learned || (s.stats?.played ?? 0) > 0);
        if (s.daily) {
          // Replay the day's stream to where the run left off.
          const stream = dayStream(s.daily.key, s.daily.draws);
          dailyRef.current = { key: s.daily.key, game: restore(s.daily.game, stream.next, dailyConfig(s.daily.key)), stream, winSeen: s.daily.winSeen, result: s.daily.result };
        }
      })
      .catch(() => {})
      .finally(() => {
        setReady(true);
        setVersion((v) => v + 1);
      });
  }, []);

  // Save after every change once loaded.
  useEffect(() => {
    if (!ready) return;
    // During the lesson or the daily, the free game is the one put aside.
    const g = mode === 'daily' ? classic.current!.game : lesson === null ? gRef.current : (saved.current ?? engine.newGame());
    const fields = (x: Game) => Object.fromEntries(FIELDS.map((f) => [f, x[f]])) as GameFields;
    const d = dailyRef.current;
    if (d && mode === 'daily') d.winSeen = winSeen;
    const daily = d ? { key: d.key, draws: d.stream.draws, game: fields(d.game), winSeen: d.winSeen, result: d.result } : undefined;
    const ws = mode === 'daily' ? classic.current!.winSeen : winSeen;
    AsyncStorage.setItem(
      KEY,
      JSON.stringify({ game: fields(g), stats, winSeen: ws, learned, daily, gameRules: rulesOf(g) } satisfies Saved),
    ).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, version, stats, winSeen, learned, lesson, mode]);

  const bump = () => setVersion((v) => v + 1);

  /** Fold a finished or abandoned game into the record. */
  const record = useCallback((g: Game) => {
    if (g.moves === 0) return;
    setStats((s) => ({
      ...s,
      best: Math.max(s.best, g.score),
      bestTile: Math.max(s.bestTile, g.bestTile),
      played: s.played + 1,
      wins: s.wins + (g.won ? 1 : 0),
    }));
  }, []);

  /** The daily run ended: keep its result. */
  const finishDaily = useCallback((g: Game) => {
    const d = dailyRef.current;
    if (!d || d.result) return;
    d.result = { score: g.score, bestTile: g.bestTile, board: g.board.slice() };
  }, []);

  const afterMove = useCallback(
    (g: Game) => {
      if (!g.over || lesson !== null) return;
      record(g);
      if (mode === 'daily') finishDaily(g);
    },
    [record, lesson, mode, finishDaily],
  );

  const place = useCallback(
    (slot: number, ox: number, oy: number) => {
      const g = gRef.current;
      const res = engine.place(g, slot, ox, oy);
      if (res) {
        afterMove(g);
        bump();
      }
      return res;
    },
    [afterMove],
  );

  const sweep = useCallback(
    (dir: Dir) => {
      const g = gRef.current;
      const res = engine.sweep(g, dir);
      if (res) {
        g.used = (g.used ?? 0) + 1;
        afterMove(g);
        bump();
      }
      return res;
    },
    [afterMove],
  );

  const startDaily = useCallback(() => {
    if (mode === 'daily' || lesson !== null) return;
    const key = dayKey();
    if (!dailyRef.current || dailyRef.current.key !== key) {
      const { game, stream } = newDailyGame(key);
      dailyRef.current = { key, game, stream, winSeen: false, result: null };
    }
    classic.current = { game: gRef.current, winSeen };
    gRef.current = dailyRef.current.game;
    setWinSeen(dailyRef.current.winSeen);
    setMode('daily');
    bump();
  }, [mode, lesson, winSeen]);

  const leaveDaily = useCallback(() => {
    if (mode !== 'daily' || !classic.current) return;
    if (dailyRef.current) dailyRef.current.winSeen = winSeen;
    gRef.current = classic.current.game;
    setWinSeen(classic.current.winSeen);
    classic.current = null;
    setMode('classic');
    bump();
  }, [mode, winSeen]);

  const newGame = useCallback(() => {
    // The daily is one run a day: it never restarts.
    if (mode === 'daily') return;
    const g = gRef.current;
    if (!g.over && lesson === null) record(g);
    setLesson(null);
    saved.current = null;
    gRef.current = engine.newGame(rulesConfig(nextRules));
    setWinSeen(false);
    bump();
  }, [record, lesson, mode, nextRules]);

  const startLesson = useCallback(
    (k: number) => {
      const L = LESSONS[k];
      if (!L) return;
      if (lesson === null) saved.current = gRef.current;
      // The real rules, the ones the next game is played by; a lesson's tray
      // holds only what it teaches.
      // The score runs on through the lessons instead of starting over each step.
      const carry = lesson !== null ? gRef.current.score : 0;
      const g = engine.newGame(rulesConfig(nextRules));
      g.score = carry;
      g.board = L.board.slice();
      g.tray = L.tray.map((p) => ({ cells: p.cells.map((c) => [...c] as [number, number, number]), used: p.used }));
      g.sweeps = L.sweeps;
      g.bestTile = Math.max(...g.board);
      gRef.current = g;
      setLesson(k);
      bump();
    },
    [lesson, nextRules],
  );

  const finishLessons = useCallback(() => {
    setLearned(true);
    setLesson(null);
    gRef.current = saved.current && saved.current.moves > 0 && !saved.current.over ? saved.current : engine.newGame(rulesConfig(nextRules));
    saved.current = null;
    setWinSeen(false);
    bump();
  }, [nextRules]);

  const value = useMemo<Store>(() => {
    const g = gRef.current;
    const today = dayKey();
    const d = dailyRef.current?.key === today ? dailyRef.current : null;
    return {
      ready,
      mode,
      daily: { key: today, started: !!d && d.game.moves > 0, done: !!d?.result, result: d?.result ?? null },
      startDaily,
      leaveDaily,
      rules: rulesOf(g),
      game: g,
      version,
      stats: {
        ...stats,
        // The running game counts toward the record as it goes.
        best: Math.max(stats.best, g.score),
        bestTile: Math.max(stats.bestTile, g.bestTile),
      },
      winSeen,
      inProgress: mode === 'classic' && lesson === null && g.moves > 0 && !g.over,
      learned,
      lesson,
      startLesson,
      finishLessons,
      place,
      sweep,
      newGame,
      markWinSeen: () => setWinSeen(true),
      resetProgress: () => {
        setStats(EMPTY);
        setLearned(false);
        gRef.current = engine.newGame();
        setWinSeen(false);
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
        setWinSeen(false);
        bump();
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, version, stats, winSeen, place, sweep, newGame, learned, lesson, startLesson, finishLessons, mode, startDaily, leaveDaily]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGame(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useGame outside GameProvider');
  return s;
}
