import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import engine, { type Dir, type Game, type Piece, type PlaceResult, type SweepResult } from './engine';
import { LESSONS } from './lessons';

/* The one running game and the player's record, shared by every screen and
   saved after every move, so closing the app never loses a game. */

export type Stats = { best: number; bestTile: number; played: number; wins: number };

const KEY = 'blockhaus:v1';
const EMPTY: Stats = { best: 0, bestTile: 0, played: 0, wins: 0 };
const FIELDS = ['board', 'tray', 'sweeps', 'score', 'merges', 'bestTile', 'moves', 'won', 'over'] as const;

type Saved = { game: Pick<Game, (typeof FIELDS)[number]>; stats: Stats; winSeen: boolean; learned?: boolean };

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
  /** Prototype only: put a still position on the board. */
  loadPosition: (p: { board: number[]; tray: (Piece | { cells: [number, number, number][]; used?: boolean } | null)[]; score: number; merges: number; sweeps: number }) => void;
};

const Ctx = createContext<Store | null>(null);

function restore(s: Saved['game']): Game {
  const g = engine.newGame();
  for (const f of FIELDS) (g as Record<string, unknown>)[f] = s[f];
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

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw) return;
        const s = JSON.parse(raw) as Saved;
        gRef.current = restore(s.game);
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
    // During the lesson the saved game is the one put aside, if any.
    const g = lesson === null ? gRef.current : (saved.current ?? engine.newGame());
    const game = Object.fromEntries(FIELDS.map((f) => [f, g[f]])) as Saved['game'];
    AsyncStorage.setItem(KEY, JSON.stringify({ game, stats, winSeen, learned } satisfies Saved)).catch(() => {});
  }, [ready, version, stats, winSeen, learned, lesson]);

  const bump = () => setVersion((v) => v + 1);

  /** Fold a finished or abandoned game into the record. */
  const record = useCallback((g: Game) => {
    if (g.moves === 0) return;
    setStats((s) => ({
      best: Math.max(s.best, g.score),
      bestTile: Math.max(s.bestTile, g.bestTile),
      played: s.played + 1,
      wins: s.wins + (g.won ? 1 : 0),
    }));
  }, []);

  const place = useCallback(
    (slot: number, ox: number, oy: number) => {
      const g = gRef.current;
      const res = engine.place(g, slot, ox, oy);
      if (res) {
        if (g.over && lesson === null) record(g);
        bump();
      }
      return res;
    },
    [record, lesson],
  );

  const sweep = useCallback(
    (dir: Dir) => {
      const g = gRef.current;
      const res = engine.sweep(g, dir);
      if (res) {
        if (g.over && lesson === null) record(g);
        bump();
      }
      return res;
    },
    [record, lesson],
  );

  const newGame = useCallback(() => {
    const g = gRef.current;
    if (!g.over && lesson === null) record(g);
    setLesson(null);
    saved.current = null;
    gRef.current = engine.newGame();
    setWinSeen(false);
    bump();
  }, [record, lesson]);

  const startLesson = useCallback(
    (k: number) => {
      const L = LESSONS[k];
      if (!L) return;
      if (lesson === null) saved.current = gRef.current;
      const g = engine.newGame();
      g.board = L.board.slice();
      g.tray = L.tray.map((p) => ({ cells: p.cells.map((c) => [...c] as [number, number, number]), used: p.used }));
      g.sweeps = L.sweeps;
      g.bestTile = Math.max(...g.board);
      gRef.current = g;
      setLesson(k);
      bump();
    },
    [lesson],
  );

  const finishLessons = useCallback(() => {
    setLearned(true);
    setLesson(null);
    gRef.current = saved.current && saved.current.moves > 0 && !saved.current.over ? saved.current : engine.newGame();
    saved.current = null;
    setWinSeen(false);
    bump();
  }, []);

  const value = useMemo<Store>(() => {
    const g = gRef.current;
    return {
      ready,
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
        ng.won = ng.bestTile >= 192;
        ng.over = !engine.anyMove(ng);
        gRef.current = ng;
        setWinSeen(false);
        bump();
      },
    };
  }, [ready, version, stats, winSeen, place, sweep, newGame, learned, lesson, startLesson, finishLessons]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGame(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useGame outside GameProvider');
  return s;
}
