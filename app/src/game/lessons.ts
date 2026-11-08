import type { Term } from '@/components/Formula';
import type { Dir, Game, Piece } from './engine';

/* The first game teaches itself on the real board: five set positions, each
   with one thing to do, and only that move is possible: the piece goes in
   only where the lesson wants it, the board slides only the taught way. The
   step is done when the board shows its result, then the next one slides in. The title is the move in a few plain words,
   and `done` is the rule it proved, as a formula; the move itself is played on the board by a
   see-through copy of the piece. First only the task; once the move is
   done, `rule` explains what happened and why, under the formula. */

export type Lesson = {
  title: string;
  /** The mechanic in one short line, on the card after the move. */
  rule: string;
  /** The rule as it reads with sweeps earned by cascades, if it differs. */
  ruleCascade?: string;
  /** The step as a formula in tiles; the last term is what the move makes. */
  formula: Term[];
  /** More rows for the card: the same rule again, or pairs that do not merge. */
  also?: Term[][];
  /** The step brings a new idea and stops on a card that explains it. A
      step that only shows the idea again (false) moves on by itself once
      its formula has been read. */
  card: boolean;
  /** The tile the step makes, shown on its explanation card. */
  result: number;
  board: number[];
  tray: Piece[];
  sweeps: number;
  /** Cells to hint where the piece goes, with the value to hatch there. */
  hint?: [number, number][];
  /** Sweep steps: the only directions the board answers. */
  dirs?: Dir[];
  goal: (g: Game) => boolean;
};

const at = (x: number, y: number) => y * 6 + x;
const board = (tiles: [number, number, number][]) => {
  const b = new Array(36).fill(0);
  for (const [x, y, v] of tiles) b[at(x, y)] = v;
  return b;
};
const piece = (cells: [number, number, number][]): Piece => ({ cells, used: false });
const none = (): Piece => ({ cells: [[0, 0, 1]], used: true });
const has = (v: number) => (g: Game) => g.board.includes(v);

export const LESSONS: Lesson[] = [
  {
    title: 'Поставьте 1 рядом с 2',
    rule: 'Тройку дают только 1 и 2.',
    formula: [1, '+', 2, '=', 3],
    also: [[1, '+', 1, 'no'], [2, '+', 2, 'no']],
    card: true,
    result: 3,
    board: board([[3, 2, 2]]),
    tray: [none(), piece([[0, 0, 1]]), none()],
    sweeps: 0,
    hint: [[at(2, 2), 1]],
    goal: has(3),
  },
  {
    title: 'Сделайте вторую тройку',
    rule: 'Дальше сливаются одинаковые.',
    formula: [3, '+', 3, '=', 6],
    also: [[6, '+', 6, '=', 12]],
    card: true,
    result: 6,
    // The 3 is made where the 2 was, right beside the other 3.
    board: board([[3, 2, 2], [4, 2, 3]]),
    tray: [none(), piece([[0, 0, 1]]), none()],
    sweeps: 0,
    hint: [[at(2, 2), 1]],
    goal: has(6),
  },
  {
    title: 'Начните цепочку с 1',
    rule: 'Большая плитка забирает меньшую, и цепочка идёт дальше.',
    formula: [3, '→', 6, '→', 12, '→', 24],
    card: false,
    result: 24,
    // The bigger tile takes the smaller in, so the chain walks along the
    // tiles it eats: 2, 3, 6 up the column, 12 at its top.
    board: board([[3, 2, 2], [4, 2, 3], [4, 1, 6], [4, 0, 12]]),
    tray: [none(), piece([[0, 0, 1]]), none()],
    sweeps: 0,
    hint: [[at(2, 2), 1]],
    goal: has(24),
  },
  {
    title: 'Положите двойки на единицы',
    rule: 'Каждая клетка фигуры сливается сама.',
    formula: [[2, 2], '+', [1, 1], '=', 6],
    card: false,
    result: 6,
    board: board([[2, 3, 1], [3, 3, 1]]),
    tray: [none(), piece([[0, 0, 2], [1, 0, 2]]), none()],
    sweeps: 0,
    hint: [[at(2, 2), 2], [at(3, 2), 2]],
    goal: has(6),
  },
  {
    title: 'Смахните доску вбок',
    rule: 'Сдвиг стоит фигуры: она въезжает с другого края.',
    ruleCascade: 'Сдвиги лежат под доской: один на каждый лоток и ещё один за каскад из пяти слияний.',
    formula: ['swipe', 1, '+', 2, '=', 3],
    card: true,
    result: 3,
    board: board([[0, 2, 1], [5, 2, 2]]),
    tray: [piece([[0, 0, 2]]), none(), none()],
    sweeps: 2,
    dirs: ['left', 'right'],
    goal: has(3),
  },
];
