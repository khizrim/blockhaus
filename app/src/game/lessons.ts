import type { Term } from '@/components/Formula';
import type { Dir, Game, Piece } from './engine';

/* The first game teaches itself on the real board: five set positions, each
   with one thing to do, and only that move is possible: the piece goes in
   only where the lesson wants it, the board slides only the taught way. The
   step is done when the board shows its result, then the next one slides in. The title is the move in a few plain words;
   once it is done the line becomes the formula it proved. There are no
   explanation cards (2026-11-08): what does not merge is felt on the board,
   where a like tile beside the hole shoves the held piece away. */

export type Lesson = {
  title: string;
  /** The step as a formula in tiles; the last term is what the move makes. */
  formula: Term[];
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
    formula: [1, '+', 2, '=', 3],
    // A lone 1 waits on the far side of the hole: while the player holds
    // the 1 there, it shoves away and the 2 pulls in, so 1 + 1 is felt to
    // fail before anything is said.
    board: board([[1, 2, 1], [3, 2, 2]]),
    tray: [none(), piece([[0, 0, 1]]), none()],
    sweeps: 0,
    hint: [[at(2, 2), 1]],
    goal: has(3),
  },
  {
    title: 'Сделайте вторую тройку',
    formula: [3, '+', 3, '=', 6],
    // The 3 is made where the 2 was, right beside the other 3.
    board: board([[3, 2, 2], [4, 2, 3]]),
    tray: [none(), piece([[0, 0, 1]]), none()],
    sweeps: 0,
    hint: [[at(2, 2), 1]],
    goal: has(6),
  },
  {
    title: 'Начните цепочку с 1',
    formula: [3, '→', 6, '→', 12, '→', 24],
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
    formula: [[2, 2], '+', [1, 1], '=', 6],
    // A lone 2 beside the left cell shoves the held 2s away: 2 + 2 is
    // pushed apart the same way.
    board: board([[1, 2, 2], [2, 3, 1], [3, 3, 1]]),
    tray: [none(), piece([[0, 0, 2], [1, 0, 2]]), none()],
    sweeps: 0,
    hint: [[at(2, 2), 2], [at(3, 2), 2]],
    goal: has(6),
  },
  {
    title: 'Смахните доску вбок',
    formula: ['swipe', 1, '+', 2, '=', 3],
    board: board([[0, 2, 1], [5, 2, 2]]),
    tray: [piece([[0, 0, 2]]), none(), none()],
    sweeps: 2,
    dirs: ['left', 'right'],
    goal: has(3),
  },
];
