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
     (One grammar for the formulas: + joins what the move lays to what it
     meets, → is a merge of the chain; the stud enters a formula only on
     the last step, after the swipe has shown what it is for.)

     3  4×4  choose the chain     two cells are open; the board shows, while
                                  the piece is held, how far each one runs and
                                  whether it earns a sweep. The short one plays
                                  out and the step comes back.
     4  4×4  build, then fire     the 2 may go to three cells and merges
                                  with nothing in any of them; only beside the
                                  3 does it finish the ladder. The 1 then goes
                                  beside it: a run to 24, or one short merge
                                  and the step comes back. A real choice.
     5  6×6  the swipe            spends a stud: 24 + 24 = 48
     6  6×6  the 2×2 square       four 1s at once, a chain of three: its stud
                                  sets into the socket the swipe emptied, so
                                  the lessons end on a full key (2026-11-09,
                                  after the game designer's review: earned,
                                  spent, earned again). The game goes on
                                  from this board: no new board, no reset.

   Only the taught moves are possible: a piece goes in only at its step's
   cells, the board slides only the taught way. Cells outside the plate hold
   engine stones, so nothing goes there and a sweep stops at the edge of the
   plate as at a wall; the board draws them as no socket at all. There is no
   text on screen: above the board the move waits as a formula in tiles with
   an empty last cell, and the cell fills when the board proves it. Each step's
   sentence, for screen readers only, is in the strings (i18n, `lessons`),
   in the same order. */

export type Lesson = {
  /** The step as a formula in tiles; the last term is what the move makes. */
  formula: Term[];
  /** What the line above the board asks before the move: the first merge
      the move makes, its result an empty cell. While the move plays, the
      line writes each merge of the chain as it lands, one pair at a time
      (2026-11-11, Khizri: a newcomer asked why there is no 4, why 6 comes
      right after 3; long arrow chains were hard to read). */
  task?: Term[];
  /** The plate: the open cells, [x0, y0, x1, y1] inclusive. */
  open: [number, number, number, number];
  board: number[];
  tray: Piece[];
  sweeps: number;
  /** The moves of the step, in order: the tray slot to play and the cells
      its top-left may go to. More than one cell is a choice. 'best': the
      free cell beside the piece just placed where this one runs the longest
      chain (so it follows wherever the player built). `right`: of a
      choice, the cell that proves the step; the lesson shows the move there
      once the player has missed it or has stood still too long. */
  moves?: { slot: number; at: number[] | 'best'; right?: number }[];
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


export const LESSONS: Lesson[] = [
  {
    // Поставьте 1 рядом с 2
    formula: [1, '+', 2, '=', 3],
    task: [1, '+', 2, '=', 3],
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
    // Поставьте 2 к единице, и тройки сольются
    formula: [2, '+', 1, '→', 3, '→', 6],
    task: [2, '+', 1, '=', 3],
    open: TINY,
    // The 2 takes the 1 into a 3, and that 3 sits by the first 3.
    board: board(TINY, [[2, 2, 3], [3, 3, 1]]),
    tray: [none(), piece([[0, 0, 2]]), none()],
    sweeps: 0,
    moves: [{ slot: 1, at: [at(2, 3)] }],
    goal: has(6),
  },
  {
    // Выберите клетку, где цепочка длиннее: три слияния дают сдвиг
    formula: [1, '→', 3, '→', 6, '→', 12],
    task: [1, '+', 2, '=', 3],
    open: MID,
    // By the lone 2 the 1 makes one 3. By the 2 under the 3 it runs
    // 1 + 2 = 3, 3 + 3 = 6, 6 + 6 = 12 and earns a sweep.
    board: board(MID, [[2, 2, 6], [3, 2, 3], [3, 3, 2], [1, 4, 2]]),
    tray: [none(), piece([[0, 0, 1]]), none()],
    sweeps: 0,
    moves: [{ slot: 1, at: [at(1, 3), at(4, 3)], right: at(4, 3) }],
    goal: has(12),
  },
  {
    // Достройте лесенку двойкой, потом запустите её единицей
    formula: [1, '→', 3, '→', 6, '→', 12, '→', 24],
    task: [2, '+', 1, '=', 3],
    open: MID,
    // Three cells for the 2, none of them merges: the player has to see
    // that only the one under the 3 makes the ladder. The 1 then goes
    // beside the 2 wherever it went.
    board: board(MID, [[2, 2, 12], [1, 4, 2], [3, 2, 6], [4, 2, 3]]),
    tray: [piece([[0, 0, 2]]), none(), piece([[0, 0, 1]])],
    sweeps: 1,
    moves: [
      { slot: 0, at: [at(1, 1), at(4, 3), at(3, 4)], right: at(4, 3) },
      { slot: 2, at: 'best' },
    ],
    goal: has(24),
  },
  {
    // Смахните доску влево
    formula: ['swipe', 24, '+', 24, '=', 48],
    open: FULL,
    // A 24 comes in with the last ring, across the row from the other.
    board: board(FULL, [[2, 2, 24], [1, 4, 2], [5, 2, 24]]),
    tray: [none(), none(), none()],
    sweeps: 2,
    dirs: ['left'],
    goal: has(48),
  },
  {
    // Квадрат ставит четыре блока сразу и возвращает сдвиг
    formula: [{ grid: [[1, 1], [1, 1]] }, '=', 'stud'],
    open: FULL,
    // A 2 and a 3 come in under the 48. Two of the square's 1s find the
    // two 2s and their 3s make a 6: three merges, and the stud fills the
    // socket the swipe emptied. The new 3 waits under the 6 for the game.
    board: board(FULL, [[0, 2, 48], [0, 3, 2], [0, 4, 2], [0, 5, 3]]),
    tray: [none(), piece([[0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]]), none()],
    sweeps: 1,
    moves: [{ slot: 1, at: [at(1, 3)] }],
    goal: (g) => g.sweeps >= 2,
  },
];

/** The lessons do not hand over to a new board: the first game goes on from
    the last step's board, with its full key (2026-11-09, Khizri: «Хочется,
    чтобы игра продолжалась дальше с тем же набором и с той же доской»).
    Step 6 leaves 48, a 6 with a 3 under it and two 1s; the first tray holds
    a 2 and two 1s (fixed, so the opening is the same for everyone), so the first thing the player can do alone is what step 4
    taught: lay the 2 by the 3 where it merges with nothing, then fire the 1
    between them, 1 → 3 → 6 → 12. */
export const FIRST_TRAY: Piece[] = [piece([[0, 0, 2]]), piece([[0, 0, 1]]), piece([[0, 0, 1]])];
/** The first game's own first move, lit on the board as the lessons lit
    theirs but not enforced: the 2 goes under the 6, by the 3, where it
    merges with nothing; then a 1 between them. After the game designer's
    second review: the drag preview alone pulls the 2 to the loose 1s. */
export const FIRST_MOVES: { v: number; at: number }[] = [
  { v: 2, at: at(1, 5) },
  { v: 1, at: at(1, 4) },
];
