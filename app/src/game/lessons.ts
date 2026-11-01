import type { Dir, Game, Piece } from './engine';

/* The first game teaches itself on the real board: five set positions, each
   with one thing to do, and only that move is possible: the piece goes in
   only where the lesson wants it, the board slides only the taught way. The
   step is done when the board shows its result, then the next one slides in. The title is the move in a few plain words,
   and `done` is the rule it proved, as a formula; the move itself is played on the board by a
   see-through copy of the piece. `rule` says the mechanic itself, under the
   title, so the player learns why the move works, not only where to put it. */

export type Lesson = {
  title: string;
  /** The mechanic this step teaches, in one or two plain sentences, shown under the title. */
  rule: string;
  done: string;
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
    rule: '1 и 2 складываются в 3. Две единицы или две двойки не сливаются.',
    done: '1 + 2 = 3',
    board: board([[3, 2, 2]]),
    tray: [none(), piece([[0, 0, 1]]), none()],
    sweeps: 0,
    hint: [[at(2, 2), 1]],
    goal: has(3),
  },
  {
    title: 'Сделайте вторую тройку',
    rule: 'Дальше сливаются только одинаковые: 3 и 3 дают 6, 6 и 6 дают 12.',
    done: '3 + 3 = 6',
    board: board([[1, 2, 3], [3, 2, 2]]),
    tray: [none(), piece([[0, 0, 1]]), none()],
    sweeps: 0,
    hint: [[at(2, 2), 1]],
    goal: has(6),
  },
  {
    title: 'Поставьте 1 в центр',
    rule: 'Новая плитка сразу ищет пару среди соседей, и слияния идут цепочкой.',
    done: '3 → 6 → 12 → 24',
    board: board([[1, 2, 3], [3, 2, 2], [2, 1, 6], [2, 3, 12]]),
    tray: [none(), piece([[0, 0, 1]]), none()],
    sweeps: 0,
    hint: [[at(2, 2), 1]],
    goal: has(24),
  },
  {
    title: 'Каждой 1 своя 2',
    rule: 'Фигуру ставят целиком, и каждая её клетка ищет пару сама.',
    done: '3 + 3 = 6, сразу',
    board: board([[2, 3, 1], [3, 3, 1]]),
    tray: [none(), piece([[0, 0, 2], [1, 0, 2]]), none()],
    sweeps: 0,
    hint: [[at(2, 2), 2], [at(3, 2), 2]],
    goal: has(6),
  },
  {
    title: 'Смахните доску вбок',
    rule: 'Свайп сдвигает всё к краю и сливает пары. С другого края въезжает первая фигура из лотка.',
    done: '1 + 2 = 3 у края',
    board: board([[0, 2, 1], [5, 2, 2]]),
    tray: [piece([[0, 0, 6]]), none(), none()],
    sweeps: 2,
    dirs: ['left', 'right'],
    goal: has(3),
  },
];
