import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import engine, { type Dir, type Game, type Piece, type PlaceResult, type SweepResult } from './engine';
import { dailyConfig, dayKey, dayStream, medalOf, newDailyGame, prevDay } from './daily';
import { LESSONS } from './lessons';
import { POSTERS, TASK_POINTS, rankOf, tasksFor, type MetaSnapshot, type MoveEvent, type RankInfo, type Task, type TaskState } from './meta';

/* The one running game and the player's record, shared by every screen and
   saved after every move, so closing the app never loses a game. */

export type Stats = { best: number; bestTile: number; played: number; wins: number; /** Every point of every game: the workshop's. */ total: number };
/** How sweeps work in the free game: free (each pushes a piece in) or earned by cascades. */
export type Rules = 'free' | 'cascade';
const rulesConfig = (r: Rules) => (r === 'cascade' ? engine.CASCADE : undefined);

const KEY = 'blockhaus:v1';
const EMPTY: Stats = { best: 0, bestTile: 0, played: 0, wins: 0, total: 0 };
// `used`: sweeps made in this game, for the tasks and posters that ask for none.
const FIELDS = ['board', 'tray', 'next', 'sweeps', 'score', 'merges', 'bestTile', 'moves', 'won', 'over', 'used'] as const;

type GameFields = Pick<Game, (typeof FIELDS)[number]>;
export type DailyResult = { score: number; bestTile: number; board: number[] };
type SavedDaily = { key: string; draws: number; game: GameFields; winSeen: boolean; result: DailyResult | null };
/** `shield`: a gold medal keeps the streak through one missed day (one at most). */
export type Streak = { last: string; count: number; best: number; shield?: number };
type Saved = {
  game: GameFields; stats: Stats; winSeen: boolean; learned?: boolean; daily?: SavedDaily; streak?: Streak; dailyIntro?: boolean;
  /** Rules of the free game on the board, and the ones the next free game starts with. */
  gameRules?: Rules; rules?: Rules;
  /** The player chose the rules in the settings (before 2026-11-02 `rules` was always written, as 'free'). */
  rulesPicked?: boolean;
  tasks?: TaskState; posters?: Record<string, string>;
};
/** Something the player just earned, for the board to show. */
export type News = { id: number; kind: 'task' | 'poster'; ref: string; title: string };

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
  /** Days in a row with a finished game of the day; 0 once a day is missed. */
  streak: Streak;
  /** Put today's game of the day on the board, starting it if needed. */
  startDaily: () => void;
  /** Back to the free game; the daily run waits where it was. */
  leaveDaily: () => void;
  /** The card that explains the game of the day was shown once. */
  dailyIntro: boolean;
  markDailyIntro: () => void;
  /** Rules of the free game on the board, and of the next one. */
  rules: Rules;
  nextRules: Rules;
  setRules: (r: Rules) => void;
  rank: RankInfo;
  tasks: { list: Task[]; progress: number[]; done: boolean[] };
  /** Posters on the wall, by id: the day each was earned. */
  posters: Record<string, string>;
  news: News | null;
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
  const [streak, setStreak] = useState<Streak>({ last: '', count: 0, best: 0 });
  const [dailyIntro, setDailyIntro] = useState(false);
  // Sweeps earned by cascades are the main rules since 2026-11-02: with free
  // sweeps, swiping at random went as far as thinking.
  const [nextRules, setNextRules] = useState<Rules>('cascade');
  const [rulesPicked, setRulesPicked] = useState(false);
  const [tasks, setTasks] = useState<TaskState>({ key: '', progress: [0, 0, 0] });
  const [posters, setPosters] = useState<Record<string, string>>({});
  const [news, setNews] = useState<News | null>(null);
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
  const postersRef = useRef(posters);
  postersRef.current = posters;
  const totalRef = useRef(stats.total);
  totalRef.current = stats.total;
  const rulesOf = (g: Game): Rules => (g.cfg.freeSweeps === false && g.cfg.chainBonus === engine.CASCADE.chainBonus && g.cfg.sweepsPerTray === engine.CASCADE.sweepsPerTray ? 'cascade' : 'free');

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw) return;
        const s = JSON.parse(raw) as Saved;
        gRef.current = restore(s.game, undefined, rulesConfig(s.gameRules ?? 'free'));
        if (s.rules && s.rulesPicked) {
          setNextRules(s.rules);
          setRulesPicked(true);
        }
        if (s.tasks) setTasks(s.tasks);
        if (s.posters) setPosters(s.posters);
        setStats({ ...EMPTY, ...s.stats });
        setWinSeen(!!s.winSeen);
        setLearned(!!s.learned || (s.stats?.played ?? 0) > 0);
        if (s.streak) setStreak(s.streak);
        setDailyIntro(!!s.dailyIntro);
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
      JSON.stringify({ game: fields(g), stats, winSeen: ws, learned, daily, streak, dailyIntro, gameRules: rulesOf(g), rules: nextRules, rulesPicked, tasks, posters } satisfies Saved),
    ).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, version, stats, winSeen, learned, lesson, mode, streak, dailyIntro, nextRules, rulesPicked, tasks, posters]);

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

  /** The daily run ended: keep its result and carry the streak. */
  const finishDaily = useCallback((g: Game) => {
    const d = dailyRef.current;
    if (!d || d.result) return;
    d.result = { score: g.score, bestTile: g.bestTile, board: g.board.slice() };
    const gold = (medalOf(g.score, d.key)?.rank ?? 0) >= 3;
    setStreak((s) => {
      if (s.last === d.key) return s;
      // A shield carries the streak over one missed day, and is spent.
      const kept = s.last === prevDay(d.key) || (!!s.shield && s.last === prevDay(prevDay(d.key)));
      const spent = kept && s.last !== prevDay(d.key);
      const count = kept ? s.count + 1 : 1;
      const shield = gold ? 1 : spent ? 0 : (s.shield ?? 0);
      return { last: d.key, count, best: Math.max(s.best, count), shield };
    });
  }, []);

  /* The meta after each move: workshop points, the day's tasks, posters. */
  const newsId = useRef(0);
  const tell = (n: Omit<News, 'id'>) => setNews({ ...n, id: ++newsId.current });
  const meta = useCallback(
    (g: Game, s0: number, e: Omit<MoveEvent, 'bestTile' | 'score' | 'sweepsUsed' | 'daily' | 'cascadeMode' | 'won'>) => {
      if (lesson !== null) return;
      const today = dayKey();
      const ev: MoveEvent = { ...e, bestTile: g.bestTile, score: g.score, sweepsUsed: g.used ?? 0, daily: mode === 'daily', cascadeMode: rulesOf(g) === 'cascade', won: g.won };
      // Read and written through refs: several moves can land before React
      // renders, and each must build on the last.
      let bonus = 0;
      const list = tasksFor(today);
      const t = tasksRef.current;
      const prev = t.key === today ? t.progress : [0, 0, 0];
      const next = mode === 'daily' ? prev : list.map((task, i) => Math.min(task.goal, task.measure(ev, prev[i])));
      next.forEach((p, i) => {
        if (p >= list[i].goal && prev[i] < list[i].goal) {
          bonus += TASK_POINTS;
          tell({ kind: 'task', ref: list[i].id, title: list[i].text });
        }
      });
      tasksRef.current = { key: today, progress: next };
      setTasks(tasksRef.current);
      const tasksDone = next.filter((p, i) => p >= list[i].goal).length;
      const total = totalRef.current + g.score - s0 + bonus;
      totalRef.current = total;
      setStats((st) => ({ ...st, total }));
      const d = dailyRef.current;
      const snap: MetaSnapshot = {
        rank: rankOf(total).level,
        streak: streak.count,
        tasksDone,
        dailyGold: !!d?.result && (medalOf(d.result.score, d.key)?.rank ?? 0) >= 3,
      };
      let have = postersRef.current;
      for (const p of POSTERS) {
        if (have[p.id] || !p.check(ev, snap)) continue;
        have = { ...have, [p.id]: today };
        tell({ kind: 'poster', ref: p.id, title: p.title });
      }
      if (have !== postersRef.current) {
        postersRef.current = have;
        setPosters(have);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lesson, mode, streak.count],
  );

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
      const s0 = g.score;
      const res = engine.place(g, slot, ox, oy);
      if (res) {
        afterMove(g);
        meta(g, s0, { kind: 'place', merges: res.steps.length, pushed: 0 });
        bump();
      }
      return res;
    },
    [afterMove, meta],
  );

  const sweep = useCallback(
    (dir: Dir) => {
      const g = gRef.current;
      const s0 = g.score;
      const res = engine.sweep(g, dir);
      if (res) {
        g.used = (g.used ?? 0) + 1;
        afterMove(g);
        meta(g, s0, { kind: 'sweep', merges: res.made.length, pushed: res.pushed?.steps.length ?? 0 });
        bump();
      }
      return res;
    },
    [afterMove, meta],
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
    // A streak lives while its last day is today or yesterday, or the day
    // before with a shield in hand.
    const alive = streak.last === today || streak.last === prevDay(today) || (!!streak.shield && streak.last === prevDay(prevDay(today)));
    const list = tasksFor(today);
    const progress = tasks.key === today ? tasks.progress : [0, 0, 0];
    return {
      ready,
      mode,
      daily: { key: today, started: !!d && d.game.moves > 0, done: !!d?.result, result: d?.result ?? null },
      streak: alive ? streak : { ...streak, count: 0 },
      startDaily,
      leaveDaily,
      dailyIntro,
      markDailyIntro: () => setDailyIntro(true),
      rules: rulesOf(g),
      nextRules,
      setRules: (r: Rules) => {
        setNextRules(r);
        setRulesPicked(true);
      },
      rank: rankOf(stats.total),
      tasks: { list, progress, done: list.map((t, i) => progress[i] >= t.goal) },
      posters,
      news,
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
        setTasks({ key: '', progress: [0, 0, 0] });
        setPosters({});
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
  }, [ready, version, stats, winSeen, place, sweep, newGame, learned, lesson, startLesson, finishLessons, mode, streak, startDaily, leaveDaily, dailyIntro, nextRules, tasks, posters, news]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGame(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useGame outside GameProvider');
  return s;
}
