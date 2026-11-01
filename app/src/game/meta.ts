import engine from './engine';

/* What carries over between games: the workshop rank, the three tasks of
   the day, the posters on the wall. All of it lives on the device and is
   fed by the same move results the board plays. */

/* ---------- the workshop rank ----------
   Every point from every game goes into the workshop. A rank takes
   2000 × 1.6^n points more than the last one: the first comes in two or
   three games, each later one takes 1.6 times longer. The names follow the
   Bauhaus workshop: apprentice, journeyman, master. */
export const RANKS = ['Ученик', 'Подмастерье', 'Мастер', 'Мастер формы', 'Мастер цвета', 'Старый мастер'];
const step = (n: number) => Math.round(2000 * 1.6 ** n);

export type RankInfo = { level: number; name: string; into: number; need: number };
export function rankOf(total: number): RankInfo {
  let level = 0;
  let left = total;
  while (left >= step(level)) {
    left -= step(level);
    level++;
  }
  const base = RANKS[Math.min(level, RANKS.length - 1)];
  const name = level >= RANKS.length ? `${base} ${level - RANKS.length + 2}` : base;
  return { level, name, into: left, need: step(level) };
}

/* ---------- events ----------
   One move, as the meta sees it. */
export type MoveEvent = {
  kind: 'place' | 'sweep';
  /** Merges of a placed piece's cascade, or of the sweep's slide. */
  merges: number;
  /** Merges of the piece a free sweep pushed in. */
  pushed: number;
  bestTile: number;
  score: number;
  /** Sweeps used in this game so far, this move included. */
  sweepsUsed: number;
  daily: boolean;
  /** The game runs on sweeps earned by cascades. */
  cascadeMode: boolean;
  won: boolean;
};

/* ---------- the three tasks of the day ----------
   Each day three tasks from three groups, the same for everyone, for the
   free game: one about cascades, one about tiles, one about the whole
   game. They change at the player's midnight. */
export type Task = { id: string; text: string; goal: number; /** How far a move gets it, given the best so far. */ measure: (e: MoveEvent, prev: number) => number };

const cascade = (n: number): Task => ({ id: `cascade${n}`, text: `Каскад из ${n} слияний одной фигурой`, goal: 1, measure: (e, p) => Math.max(p, e.kind === 'place' && e.merges >= n ? 1 : 0) });
const sweepMerges = (n: number): Task => ({ id: `sweep${n}`, text: `${n} слияния одним сдвигом`, goal: 1, measure: (e, p) => Math.max(p, e.kind === 'sweep' && e.merges >= n ? 1 : 0) });
const tile = (v: number): Task => ({ id: `tile${v}`, text: `Плитка ${v}`, goal: 1, measure: (e, p) => Math.max(p, e.bestTile >= v ? 1 : 0) });
const tileStill = (v: number): Task => ({ id: `still${v}`, text: `Плитка ${v} без единого сдвига`, goal: 1, measure: (e, p) => Math.max(p, e.bestTile >= v && e.sweepsUsed === 0 ? 1 : 0) });
const score = (n: number): Task => ({ id: `score${n}`, text: `${n.toLocaleString('ru-RU')} очков за партию`, goal: 1, measure: (e, p) => Math.max(p, e.score >= n ? 1 : 0) });
const places = (n: number): Task => ({ id: `place${n}`, text: `Поставить ${n} фигур`, goal: n, measure: (e, p) => p + (e.kind === 'place' ? 1 : 0) });
const cascades = (n: number): Task => ({ id: `cascades${n}`, text: `${n} каскада из трёх слияний`, goal: n, measure: (e, p) => p + (e.kind === 'place' && e.merges >= 3 ? 1 : 0) });

const GROUPS: Task[][] = [
  [cascade(4), cascade(5), cascades(3), sweepMerges(3)],
  [tile(96), tile(192), tileStill(24), tileStill(48)],
  [score(1000), score(1500), score(2000), places(60), places(100)],
];

function hash(s: string): number {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}
export function tasksFor(key: string): Task[] {
  const r = engine.seeded(hash(`tasks:${key}`));
  return GROUPS.map((g) => g[Math.floor(r() * g.length)]);
}
/** Points a finished task brings to the workshop. */
export const TASK_POINTS = 300;
export type TaskState = { key: string; progress: number[] };

/* ---------- the posters ----------
   Twelve posters for twelve feats. Some say what they want; the secret ones
   show only a frame until found. Each poster is its own composition, drawn
   from its seed, with its number in the corner. */
export type PosterDef = { id: string; title: string; hint: string; secret?: boolean; v: number; seed: number; check: (e: MoveEvent | null, s: MetaSnapshot) => boolean };
export type MetaSnapshot = { rank: number; streak: number; tasksDone: number; dailyGold: boolean };

export const POSTERS: PosterDef[] = [
  { id: 't192', title: 'Первая 192', hint: 'Собрать плитку 192', v: 192, seed: 3, check: (e) => !!e && e.bestTile >= 192 },
  { id: 't384', title: 'Цель', hint: 'Собрать плитку 384', v: 384, seed: 5, check: (e) => !!e && e.bestTile >= 384 },
  { id: 't768', title: 'Дальше цели', hint: 'Собрать плитку 768', secret: true, v: 768, seed: 7, check: (e) => !!e && e.bestTile >= 768 },
  { id: 'c5', title: 'Каскад', hint: 'Каскад из 5 слияний одной фигурой', v: 5, seed: 11, check: (e) => !!e && e.kind === 'place' && e.merges >= 5 },
  { id: 's4', title: 'Один жест', hint: 'Четыре слияния одним сдвигом', secret: true, v: 4, seed: 17, check: (e) => !!e && e.kind === 'sweep' && e.merges >= 4 },
  { id: 'still48', title: 'Тишина', hint: 'Плитка 48 без единого сдвига', v: 48, seed: 19, check: (e) => !!e && e.bestTile >= 48 && e.sweepsUsed === 0 },
  { id: 'y1919', title: '1919', hint: 'Набрать 1919 очков', secret: true, v: 1919, seed: 23, check: (e) => !!e && !e.daily && e.score >= 1919 },
  { id: 'gold', title: 'Золото', hint: 'Золото в игре дня', v: 3, seed: 29, check: (_, s) => s.dailyGold },
  { id: 'week', title: 'Неделя', hint: 'Серия игр дня 7 дней', v: 7, seed: 31, check: (_, s) => s.streak >= 7 },
  { id: 'tasks', title: 'Три из трёх', hint: 'Все три задания за день', v: 3, seed: 37, check: (_, s) => s.tasksDone >= 3 },
  { id: 'master', title: 'Мастер', hint: 'Ранг «Мастер»', v: 2, seed: 41, check: (_, s) => s.rank >= 2 },
  { id: 'earned', title: 'Заработанный сдвиг', hint: 'Победа в режиме «сдвиги за каскады»', secret: true, v: 384, seed: 43, check: (e) => !!e && e.cascadeMode && e.won },
];

/** A poster's composition: a 6×6 board of colour fields, the same every time. */
export function posterBoard(seed: number): number[] {
  const r = engine.seeded(seed * 7919);
  const ladder = [1, 2, 3, 6, 12, 24, 48, 96, 192];
  const b = new Array(36).fill(0);
  // A few rectangles of one colour each, laid over paper.
  for (let k = 0; k < 6; k++) {
    const w = 1 + Math.floor(r() * 3);
    const h = 1 + Math.floor(r() * 3);
    const x = Math.floor(r() * (7 - w));
    const y = Math.floor(r() * (7 - h));
    const v = ladder[Math.floor(r() * (k < 3 ? 3 : ladder.length))];
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) b[yy * 6 + xx] = v;
  }
  return b;
}

/* ---------- palettes of the masters ----------
   Only the look of the tiles. Each opens at a rank. */
export type PaletteId = 'mondrian' | 'itten' | 'albers' | 'kandinsky';
export const PALETTES: { id: PaletteId; name: string; rank: number }[] = [
  { id: 'mondrian', name: 'Мондриан', rank: 0 },
  { id: 'itten', name: 'Иттен', rank: 1 },
  { id: 'albers', name: 'Альберс', rank: 2 },
  { id: 'kandinsky', name: 'Кандинский', rank: 3 },
];
