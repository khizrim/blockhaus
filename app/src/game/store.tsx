import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import engine, { type Dir, type Game, type Piece, type PlaceResult, type SweepResult } from './engine';
import { FIRST_TRAY, LESSONS } from './lessons';

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
type Saved = {
  game: GameFields; stats: Stats; winSeen: boolean; learned?: boolean;
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
  /** The win screen was shown for this game; later merges don't show it again. */
  winSeen: boolean;
  /** A game worth continuing: started and not over. */
  inProgress: boolean;
  /** In the lessons, with a free game put aside to go back to. */
  resumes: boolean;
  /** The first-game lesson was finished or skipped. */
  learned: boolean;
  /** Index of the lesson on the board, or null in a normal game. */
  lesson: number | null;
  startLesson: (k: number) => void;
  /** Leave the lessons: back to the game put aside, else a new one, which
      goes on from the lesson board when `carry` (the lessons were finished). */
  finishLessons: (carry?: boolean) => void;
  place: (slot: number, ox: number, oy: number) => PlaceResult | null;
  sweep: (dir: Dir) => SweepResult | null;
  newGame: () => void;
  markWinSeen: () => void;
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
  // Sweeps earned by cascades: the one rule set since the plastic redesign
  // (2026-11-08); the free-sweeps option was dropped with the other extras.
  const nextRules: Rules = 'cascade';
  const rulesOf = (g: Game): Rules => (g.cfg.freeSweeps === false && g.cfg.chainBonus === engine.CASCADE.chainBonus && g.cfg.sweepsPerTray === engine.CASCADE.sweepsPerTray ? 'cascade' : 'free');

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw) return;
        const s = JSON.parse(raw) as Saved;
        gRef.current = restore(s.game, rulesConfig(s.gameRules ?? 'free'));
        setStats({ ...EMPTY, ...s.stats });
        setWinSeen(!!s.winSeen);
        setLearned(!!s.learned || (s.stats?.played ?? 0) > 0);
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
    // During the lesson, the free game is the one put aside.
    const g = lesson === null ? gRef.current : (saved.current ?? engine.newGame());
    const fields = (x: Game) => Object.fromEntries(FIELDS.map((f) => [f, x[f]])) as GameFields;
    AsyncStorage.setItem(
      KEY,
      JSON.stringify({ game: fields(g), stats, winSeen, learned, gameRules: rulesOf(g) } satisfies Saved),
    ).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, version, stats, winSeen, learned, lesson]);

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

  const afterMove = useCallback(
    (g: Game) => {
      if (!g.over || lesson !== null) return;
      record(g);
    },
    [record, lesson],
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

  const newGame = useCallback(() => {
    const g = gRef.current;
    if (!g.over && lesson === null) record(g);
    setLesson(null);
    saved.current = null;
    gRef.current = engine.newGame(rulesConfig(nextRules));
    setWinSeen(false);
    bump();
  }, [record, lesson, nextRules]);

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
    [lesson, nextRules],
  );

  const finishLessons = useCallback((carry = false) => {
    setLearned(true);
    setLesson(null);
    if (saved.current && saved.current.moves > 0 && !saved.current.over) gRef.current = saved.current;
    else if (!carry) gRef.current = engine.newGame(rulesConfig(nextRules));
    else {
      /* The first game goes on from the lessons' last board and key: the
         same tiles, the same studs, a fresh tray and the score from 0. */
      const L = gRef.current;
      const g = engine.newGame(rulesConfig(nextRules));
      g.board = L.board.map((v) => (v === engine.STONE ? 0 : v));
      g.sweeps = L.sweeps;
      g.tray = [...FIRST_TRAY.map((p) => ({ cells: p.cells.map((c) => [...c] as [number, number, number]), used: false })), g.tray[2]];
      g.bestTile = Math.max(...g.board);
      gRef.current = g;
    }
    saved.current = null;
    setWinSeen(false);
    bump();
  }, [nextRules]);

  const value = useMemo<Store>(() => {
    const g = gRef.current;
    return {
      ready,
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
      inProgress: lesson === null && g.moves > 0 && !g.over,
      resumes: lesson !== null && !!saved.current && saved.current.moves > 0 && !saved.current.over,
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
  }, [ready, version, stats, winSeen, place, sweep, newGame, learned, lesson, startLesson, finishLessons]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGame(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useGame outside GameProvider');
  return s;
}
