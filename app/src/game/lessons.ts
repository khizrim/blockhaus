import type { Game, Piece } from './engine';

/* The first game teaches itself on the real board: five set positions, each
   with one thing to do. The step is done when the board shows its result,
   then the next position slides in. Text is short on purpose: the board and
   the hatched hint cell do the explaining. */

export type Lesson = {
  title: string;
  text: string;
  done: string;
  board: number[];
  tray: Piece[];
  sweeps: number;
  /** Cells to hint where the piece goes, with the value to hatch there. */
  hint?: [number, number][];
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
    title: '1 + 2 = 3',
    text: 'Перетащите единицу из лотка вплотную к двойке.',
    done: 'Единица и двойка сложились в тройку.',
    board: board([[3, 2, 2]]),
    tray: [none(), piece([[0, 0, 1]]), none()],
    sweeps: 0,
    hint: [[at(2, 2), 1]],
    goal: has(3),
  },
  {
    title: 'Равные удваиваются',
    text: 'От тройки и выше сливаются одинаковые: 3 и 3 дают 6. Поставьте единицу между двойкой и тройкой.',
    done: 'Получилась тройка, и она тут же слилась с соседней в 6.',
    board: board([[1, 2, 3], [3, 2, 2]]),
    tray: [none(), piece([[0, 0, 1]]), none()],
    sweeps: 0,
    hint: [[at(2, 2), 1]],
    goal: has(6),
  },
  {
    title: 'Цепочки',
    text: 'Плитка после слияния снова ищет пару среди соседей. Поставьте единицу в центр креста.',
    done: '3, 6, 12, 24: одна единица собрала целый ряд.',
    board: board([[1, 2, 3], [3, 2, 2], [2, 1, 6], [2, 3, 12]]),
    tray: [none(), piece([[0, 0, 1]]), none()],
    sweeps: 0,
    hint: [[at(2, 2), 1]],
    goal: has(24),
  },
  {
    title: 'Фигуры',
    text: 'В фигуре каждая клетка ищет свою пару. Положите двойки на единицы.',
    done: 'Две тройки встали рядом и слились в 6.',
    board: board([[2, 3, 1], [3, 3, 1]]),
    tray: [none(), piece([[0, 0, 2], [1, 0, 2]]), none()],
    sweeps: 0,
    hint: [[at(2, 2), 2], [at(3, 2), 2]],
    goal: has(6),
  },
  {
    title: 'Сдвиг',
    text: 'Смахните доску влево или вправо. Всё съедет к краю, а пары по пути сольются. Два сдвига на каждый лоток.',
    done: 'Единица и двойка встретились у края.',
    board: board([[0, 2, 1], [5, 2, 2]]),
    tray: [none(), none(), none()],
    sweeps: 2,
    goal: has(3),
  },
];
