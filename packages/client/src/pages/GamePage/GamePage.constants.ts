import bar from 'src/assets/bar.png';
import bg from 'src/assets/bg.jpg';
import coin from 'src/assets/coin.png';
import pause from 'src/assets/pause.png';
import toggleoff from 'src/assets/toggleoff.png';
import toggleon from 'src/assets/toggleon.png';

import type { TPos } from './GamePage.types';

const DEFAULT_WIDTH = 30;
const DEFAULT_HEIGHT = 30;
const SHIFT_VERTICAL = -150;
const SHIFT_HORIZONTAL = 0;

const SPRITES = {
  BAR: bar,
  PAUSE: pause,
  COIN: coin,
  BG: bg,
  TOGGLEON: toggleon,
  TOGGLEOFF: toggleoff,
};

const PAUSE = {
  x: 20,
  y: 20,
  width: 32,
  height: 32,
};

const TOGGLE = {
  x: 72,
  y: 20,
  width: 32,
  height: 32,
};

const CUBE_SIZES: TPos[] = [
  // прямая вертикальная
  { x: 1, y: 1 },
  { x: 1, y: 2 },
  { x: 1, y: 3 },

  // прямая горизонтальная
  { x: 1, y: 1 },
  { x: 2, y: 1 },
  { x: 3, y: 1 },

  // квадраты
  { x: 2, y: 2 },
  { x: 3, y: 3 },

  // уголки
  { x: 2, y: 2 },
  { x: 2, y: 2 },
  { x: 2, y: 2 },
  { x: 2, y: 2 },

  // подкова
  { x: 2, y: 3 },
  { x: 2, y: 3 },
  { x: 3, y: 2 },
  { x: 3, y: 2 },

  // зигзаг
  { x: 3, y: 3 },
  { x: 3, y: 3 },
  { x: 3, y: 3 },
  { x: 3, y: 3 },

  // т-образные
  { x: 2, y: 3 },
  { x: 2, y: 3 },
  { x: 3, y: 2 },
  { x: 3, y: 2 },

  // крест
  { x: 3, y: 3 },

  // классический тетрисный зиг-заг
  { x: 2, y: 3 },
  { x: 2, y: 3 },
  { x: 3, y: 2 },
  { x: 3, y: 2 },
];

const CUBE_DATAS = [
  // прямая вертикальная
  [2, 0, 0, 0, 0, 0, 0, 0, 0],
  [2, 0, 0, 2, 0, 0, 0, 0, 0],
  [2, 0, 0, 2, 0, 0, 2, 0, 0],

  // прямая горизонтальная
  [3, 0, 0, 0, 0, 0, 0, 0, 0],
  [3, 3, 0, 0, 0, 0, 0, 0, 0],
  [3, 3, 3, 0, 0, 0, 0, 0, 0],

  // квадраты
  [4, 4, 0, 4, 4, 0, 0, 0, 0],
  [4, 4, 4, 4, 4, 4, 4, 4, 4],

  // уголки
  [5, 5, 0, 5, 0, 0, 0, 0, 0],
  [5, 5, 0, 0, 5, 0, 0, 0, 0],
  [5, 0, 0, 5, 5, 0, 0, 0, 0],
  [0, 5, 0, 5, 5, 0, 0, 0, 0],

  // подкова
  [6, 6, 0, 6, 0, 0, 6, 6, 0],
  [6, 6, 0, 0, 6, 0, 6, 6, 0],
  [6, 6, 6, 6, 0, 6, 0, 0, 0],
  [6, 0, 6, 6, 6, 6, 0, 0, 0],

  // зигзаг
  [7, 7, 0, 0, 7, 0, 0, 7, 7],
  [0, 7, 7, 0, 7, 0, 7, 7, 0],
  [7, 0, 0, 7, 7, 7, 0, 0, 7],
  [0, 0, 7, 7, 7, 7, 7, 0, 0],

  // т-образные
  [8, 0, 0, 8, 8, 0, 8, 0, 0],
  [0, 8, 0, 8, 8, 0, 0, 8, 0],
  [8, 8, 8, 0, 8, 0, 0, 0, 0],
  [0, 8, 0, 8, 8, 8, 0, 0, 0],

  // крест
  [0, 9, 0, 9, 9, 9, 0, 9, 0],

  // классический тетрисный зиг-заг
  [10, 0, 0, 10, 10, 0, 0, 10, 0],
  [0, 10, 0, 10, 10, 0, 10, 0, 0],
  [10, 10, 0, 0, 10, 10, 0, 0, 0],
  [0, 10, 10, 10, 10, 0, 0, 0, 0],
];

const CUBE_COLORS = [
  'white',
  'silver',
  'red',
  'blue',
  'green',
  'yellow',
  'purple',
  'orange',
  'cyan',
  'magenta',
  'lime',
  'turquoise',
];

export {
  SPRITES,
  PAUSE,
  TOGGLE,
  DEFAULT_WIDTH,
  DEFAULT_HEIGHT,
  SHIFT_VERTICAL,
  SHIFT_HORIZONTAL,
  CUBE_DATAS,
  CUBE_SIZES,
  CUBE_COLORS,
};
