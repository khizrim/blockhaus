import type { Term } from '@/components/Formula';
import engine, { type Dir, type Game, type Piece } from './engine';

/* The first game teaches itself on a board that grows (2026-11-09, after
   Threes' tutorial: learn by doing, one thing at a time, on a tiny board),
   and it teaches above all to build chains and to think in them.

   It starts as a plate of 2×2 sockets in the middle of the board. The board
   is never reset between steps: what the last move made stays, and the next
   step's new tiles pop in around it. Twice the plate grows a ring, to 4×4
   and then to the full 6×6, and new tiles arrive with the ring.

     1  2×2  1 + 2 = 3            a lone 1 shoves the held 1 away
     2  2×2  3 + 3 = 6            the 2 finds the 1, their 3 finds the 3:
                                  the first chain happens on its own
     3  4×4  choose the chain     two cells are open; the board shows, while
                                  the piece is held, how far each one runs and
                                  whether it earns a sweep. The short one plays
                                  out and the step comes back.
     4  4×4  build, then fire     a 2 that merges with nothing finishes the
                                  ladder 3, 6, 12; the 1 then runs it to 24
     5  4×4  the 2×2 square       four 1s at once, six merges
     6  6×6  the swipe            brings the far tiles together: 24 + 24 = 48,
                                  and the two 6s fold into a 12

   Only the taught moves are possible: a piece goes in only at its step's
   cells, the board slides only the taught way. Cells outside the plate hold
   engine stones, so nothing goes there and a sweep stops at the edge of the
   plate as at a wall; the board draws them as no socket at all. There is no
   text on screen: above the board the move waits as a formula in tiles with
   an empty last cell, and the cell fills when the board proves it. `title`
   is for screen readers only. */

export type Lesson = {
  title: string;
  /** The step as a formula in tiles; the last term is what the move makes. */
  formula: Term[];
  /** The plate: the open cells, [x0, y0, x1, y1] inclusive. */
  open: [number, number, number, number];
  board: number[];
  tray: Piece[];
  sweeps: number;
  /** The moves of the step, in order: the tray slot to play and the cells
      its top-left may go to. More than one cell is a choice. */
  moves?: { slot: number; at: number[] }[];
  /** Sweep steps: the only directions the board answers. */
  dirs?: Dir[];
  goal: (g: Game) => boolean;
};

const N = 6;
const at = (x: number, y: number) => y * N + x;
const board = (open: Lesson['open'], tiles: [number, number, number][]) => {
  const b = new Array(N * N).fill(engine.STONE);
  for (let y = open[1]; y <= open[3]; y++) for (let x = open[0]; x <= open[2]; x++) b[at(x, y)] = 0;
  for (const [x, y, v] of tiles) b[at(x, y)] = v;
  return b;
};
const piece = (cells: [number, number, number][]): Piece => ({ cells, used: false });
const none = (): Piece => ({ cells: [[0, 0, 1]], used: true });
const has = (v: number) => (g: Game) => g.board.includes(v);

const TINY: Lesson['open'] = [2, 2, 3, 3];
const MID: Lesson['open'] = [1, 1, 4, 4];
const FULL: Lesson['open'] = [0, 0, 5, 5];

const count = (v: number, n: number) => (g: Game) => g.board.filter((x) => x === v).length >= n;

export const LESSONS: Lesson[] = [
  {
    title: 'Поставьте 1 рядом с 2',
    formula: [1, '+', 2, '=', 3],
    open: TINY,
    // The lone 1 sits diagonal to the hole: held there, the 1 is shoved
    // away from it and pulled to the 2, so 1 + 1 fails before it is tried.
    board: board(TINY, [[2, 2, 2], [3, 3, 1]]),
    tray: [none(), piece([[0, 0, 1]]), none()],
    sweeps: 0,
    moves: [{ slot: 1, at: [at(3, 2)] }],
    goal: has(3),
  },
  {
    title: 'Поставьте 2 к единице, и тройки сольются',
    formula: [3, '+', 3, '=', 6],
    open: TINY,
    // The 2 takes the 1 into a 3, and that 3 sits by the first 3.
    board: board(TINY, [[2, 2, 3], [3, 3, 1]]),
    tray: [none(), piece([[0, 0, 2]]), none()],
    sweeps: 0,
    moves: [{ slot: 1, at: [at(2, 3)] }],
    goal: has(6),
  },
  {
    title: 'Выберите клетку, где цепочка длиннее: три слияния дают сдвиг',
    formula: [3, '→', 6, '→', 12, '=', 'stud'],
    open: MID,
    // By the lone 2 the 1 makes one 3. By the 2 under the 3 it runs
    // 1 + 2 = 3, 3 + 3 = 6, 6 + 6 = 12 and earns a sweep.
    board: board(MID, [[2, 2, 6], [3, 2, 3], [3, 3, 2], [1, 4, 2]]),
    tray: [none(), piece([[0, 0, 1]]), none()],
    sweeps: 0,
    moves: [{ slot: 1, at: [at(1, 3), at(4, 3)] }],
    goal: has(12),
  },
  {
    title: 'Достройте лесенку двойкой, потом запустите её единицей',
    formula: [3, '→', 6, '→', 12, '→', 24],
    open: MID,
    // The 2 goes in under the 3 and merges with nothing: it is the last rung.
    // The 1 beside it then climbs the whole ladder.
    board: board(MID, [[2, 2, 12], [1, 4, 2], [3, 2, 6], [4, 2, 3]]),
    tray: [piece([[0, 0, 2]]), none(), piece([[0, 0, 1]])],
    sweeps: 1,
    moves: [
      { slot: 0, at: [at(4, 3)] },
      { slot: 2, at: [at(3, 3), at(4, 4)] },
    ],
    goal: has(24),
  },
  {
    title: 'Квадрат ставит четыре блока сразу',
    formula: [{ grid: [[1, 1], [1, 1]] }, '=', [6, 6]],
    open: MID,
    // Each 1 finds a 2; the 3s pair off into two 6s.
    board: board(MID, [[2, 2, 24], [1, 4, 2], [1, 3, 2], [4, 3, 2], [4, 4, 2]]),
    tray: [none(), piece([[0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]]), none()],
    sweeps: 2,
    moves: [{ slot: 1, at: [at(2, 3)] }],
    goal: count(6, 2),
  },
  {
    title: 'Смахните доску вбок',
    formula: ['swipe', 24, '+', 24, '=', 48],
    open: FULL,
    // A 24 comes in with the last ring, across the board from the other.
    board: board(FULL, [[2, 2, 24], [1, 4, 6], [4, 4, 6], [5, 2, 24]]),
    tray: [none(), none(), none()],
    sweeps: 2,
    dirs: ['left', 'right'],
    goal: has(48),
  },
];
