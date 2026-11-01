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
  /** What just happened and the mechanic behind it, shown only after the move proves the step. */
  rule: string;
  done: string;
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
    rule: 'Единица и двойка сложились в 3. Только так: две единицы или две двойки не сливаются.',
    done: '1 + 2 = 3',
    result: 3,
    board: board([[3, 2, 2]]),
    tray: [none(), piece([[0, 0, 1]]), none()],
    sweeps: 0,
    hint: [[at(2, 2), 1]],
    goal: has(3),
  },
  {
    title: 'Сделайте вторую тройку',
    rule: 'Две тройки слились в 6. Дальше сливаются только одинаковые: 6 и 6 дадут 12.',
    done: '3 + 3 = 6',
    result: 6,
    board: board([[1, 2, 3], [3, 2, 2]]),
    tray: [none(), piece([[0, 0, 1]]), none()],
    sweeps: 0,
    hint: [[at(2, 2), 1]],
    goal: has(6),
  },
  {
    title: 'Поставьте 1 в центр',
    rule: 'Новая 3 нашла соседку, вышло 6, потом 12 и 24. Слияния идут цепочкой.',
    done: '3 → 6 → 12 → 24',
    result: 24,
    board: board([[1, 2, 3], [3, 2, 2], [2, 1, 6], [2, 3, 12]]),
    tray: [none(), piece([[0, 0, 1]]), none()],
    sweeps: 0,
    hint: [[at(2, 2), 1]],
    goal: has(24),
  },
  {
    title: 'Каждой 1 своя 2',
    rule: 'Каждая двойка нашла свою единицу. Клетки фигуры сливаются каждая сама по себе.',
    done: '3 + 3 = 6, сразу',
    result: 6,
    board: board([[2, 3, 1], [3, 3, 1]]),
    tray: [none(), piece([[0, 0, 2], [1, 0, 2]]), none()],
    sweeps: 0,
    hint: [[at(2, 2), 2], [at(3, 2), 2]],
    goal: has(6),
  },
  {
    title: 'Смахните доску вбок',
    rule: 'Всё съехало к краю, 1 и 2 слились. С другого края въехала первая фигура из лотка.',
    done: '1 + 2 = 3 у края',
    result: 3,
    board: board([[0, 2, 1], [5, 2, 2]]),
    tray: [piece([[0, 0, 6]]), none(), none()],
    sweeps: 2,
    dirs: ['left', 'right'],
    goal: has(3),
  },
];
