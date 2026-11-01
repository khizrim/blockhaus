/* Still positions for designing screens. No rules run in this app yet: every
   board and tray here is hand-placed, but each is a position the real game
   could reach (no touching pairs left unmerged). */

export const N = 6;

export type Piece = { cells: [number, number, number][]; used?: boolean };

export type Scene = {
  key: string;
  title: string;
  board: number[];
  tray: (Piece | null)[];
  score: number;
  merges: number;
  sweeps: number;
};

const rows = (...r: string[]) => r.join(' ').trim().split(/\s+/).map(Number);

const L2: Piece = { cells: [[0, 0, 2], [1, 0, 2], [1, 1, 2]] };
const I2: Piece = { cells: [[0, 0, 2], [1, 0, 2], [2, 0, 2]] };
const D1: Piece = { cells: [[0, 0, 1], [0, 1, 1]] };
const S1: Piece = { cells: [[0, 0, 1]] };
const S2: Piece = { cells: [[0, 0, 2]] };
const D3: Piece = { cells: [[0, 0, 3], [1, 0, 3]] };
const L1: Piece = { cells: [[0, 0, 1], [0, 1, 1], [1, 1, 1]] };

export const scenes: Scene[] = [
  {
    key: 'play',
    title: 'Середина',
    board: rows(
      '0 0 0 3 1 0',
      '0 2 0 6 3 0',
      '2 2 12 0 2 3',
      '6 0 0 2 0 2',
      '0 0 12 0 6 2',
      '0 0 0 6 0 2',
    ),
    tray: [L2, { ...D1, used: true }, I2],
    score: 129,
    merges: 29,
    sweeps: 2,
  },
  {
    key: 'early',
    title: 'Первый лоток',
    board: rows(
      '0 0 0 0 0 0',
      '0 0 1 0 0 0',
      '0 0 1 0 2 0',
      '0 0 0 0 2 0',
      '0 3 0 0 0 0',
      '0 0 0 0 0 0',
    ),
    tray: [S1, D3, S2],
    score: 6,
    merges: 1,
    sweeps: 2,
  },
  {
    key: 'late',
    title: 'Тесно',
    board: rows(
      '48 24 6 12 2 2',
      '3 12 24 3 0 2',
      '6 1 1 6 12 0',
      '3 1 0 3 24 6',
      '12 6 2 2 12 3',
      '24 3 2 0 6 1',
    ),
    tray: [{ ...S1, used: true }, L1, { ...S2, used: true }],
    score: 1840,
    merges: 212,
    sweeps: 0,
  },
  {
    key: 'won',
    title: '96 собрано',
    board: rows(
      '96 24 3 1 1 0',
      '12 6 12 0 0 2',
      '3 0 6 0 3 2',
      '1 0 0 0 0 6',
      '1 0 2 2 0 0',
      '0 3 0 0 12 0',
    ),
    tray: [S2, null, D1],
    score: 2410,
    merges: 260,
    sweeps: 1,
  },
  {
    key: 'milestone',
    title: 'Веха за ход',
    // Two 24s in the top row: a swipe left makes the first 48 of the game.
    board: rows(
      '24 0 0 24 0 0',
      '6 0 3 0 0 0',
      '12 0 0 0 2 0',
      '3 0 1 0 0 0',
      '0 0 0 6 0 0',
      '2 0 0 0 0 1',
    ),
    tray: [S1, D3, S2],
    score: 320,
    merges: 40,
    sweeps: 2,
  },
];

export const sceneByKey = (k?: string) => scenes.find((s) => s.key === k) ?? scenes[0];

export function pieceGrid(p: Piece) {
  const w = Math.max(...p.cells.map((c) => c[0])) + 1;
  const h = Math.max(...p.cells.map((c) => c[1])) + 1;
  const values: (number | null)[] = Array(w * h).fill(null);
  for (const [x, y, v] of p.cells) values[y * w + x] = v;
  return { w, h, values };
}

/** The menu's own composition: a still Mondrian made of fields. */
export const COVER = {
  w: 7,
  h: 5,
  values: rows(
    '2 2 2 0 1 1 1',
    '2 2 2 0 3 3 0',
    '0 0 0 0 3 3 6',
    '12 12 1 1 0 0 6',
    '12 12 0 24 24 24 0',
  ),
};
