/* Every word the app says, in Russian and English. The board itself has no
   words; what is here are buttons, settings, confirmations, the rules and
   the screen reader's labels. A new string goes into both tables: `en` is
   typed after `ru`, so a missing one fails the typecheck. */

/** Russian plural: 1 очко, 2 очка, 5 очков. */
function ru3(n: number, one: string, few: string, many: string) {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b === 1) return one;
  if (b >= 2 && b <= 4) return few;
  return many;
}
const points = (n: number, s: string) => `${s} ${ru3(n, 'очко', 'очка', 'очков')}`;

export const ru = {
  locale: 'ru-RU',
  // Common
  settings: 'Настройки',
  back: 'Назад',
  close: 'Закрыть',
  toMenu: 'В меню',
  goBack: 'Вернуться',
  soundOn: 'Включить звук',
  soundOff: 'Выключить звук',
  ladder: 'Лесенка плиток',
  record: (s: string) => `Рекорд ${s}`,
  newRecord: 'Новый рекорд',
  // Menu
  play: 'Играть',
  resume: 'Продолжить',
  resumeLabel: (s: string, n: number) => `Продолжить партию, ${points(n, s)}`,
  newGame: 'Новая игра',
  newGameAsk: 'Начать новую игру?',
  newGameYes: 'Начать новую',
  lostGame: (s: string, n: number) => `Текущая партия на ${points(n, s)} пропадёт.`,
  skipSplash: 'Пропустить заставку',
  // Pause
  restartAsk: 'Начать заново?',
  restartYes: 'Начать заново',
  restart: 'Заново',
  skipLessons: 'Пропустить обучение',
  // Game
  pause: 'Пауза',
  score: (n: number) => `Очки: ${n}`,
  board: 'Доска. Смахните, чтобы сдвинуть',
  sweepLeft: 'Сдвиг влево',
  sweepRight: 'Сдвиг вправо',
  sweepUp: 'Сдвиг вверх',
  sweepDown: 'Сдвиг вниз',
  piece: (k: number) => `Фигура ${k}`,
  emptySlot: (k: number) => `Пустой слот ${k}`,
  bestTile: (v: number) => `Лучшая плитка ${v}`,
  noBestTile: 'Лучшей плитки пока нет',
  nextPiece: 'Следующая фигура',
  sweeps: 'Сдвиги',
  sweepsHeld: (n: number) => `Сдвиги: ${n}`,
  lessons: [
    'Поставьте 1 рядом с 2',
    'Поставьте 2 к единице, и тройки сольются',
    'Выберите клетку, где цепочка длиннее: три слияния дают сдвиг',
    'Достройте лесенку двойкой, потом запустите её единицей',
    'Смахните доску влево',
    'Квадрат ставит четыре блока сразу и возвращает сдвиг',
  ],
  // Win and game over
  won: (goal: number, n: number) => `Вы собрали ${goal}. ${points(n, String(n))}.`,
  keepPlaying: 'Играть дальше',
  noRoom: (n: number) => `Места нет. ${points(n, String(n))}.`,
  again: 'Ещё раз',
  // Settings
  theme: 'Тема',
  system: 'Как в системе',
  light: 'Светлая',
  dark: 'Тёмная',
  language: 'Язык',
  game: 'Игра',
  sound: 'Звук',
  music: 'Музыка',
  haptics: 'Вибрация',
  hints: 'Подсказки',
  hintsNote: 'Доска покажет ход, если долго думать',
  help: 'Помощь',
  learn: 'Пройти обучение',
  rules: 'Правила',
  best: 'Лучший счёт',
  recordTitle: 'Рекорд',
  reset: 'Сбросить прогресс',
  resetAsk: 'Сбросить прогресс?',
  resetText: (s: string) => `Рекорд ${s} и текущая партия будут удалены. Вернуть их не получится.`,
  resetYes: 'Удалить прогресс',
  resetNo: 'Оставить',
  // How to play
  howto: 'Как играть',
  replay: 'Показать ещё раз',
  step: (k: number, n: number) => `Шаг ${k} из ${n}`,
  next: 'Дальше',
  gotIt: 'Понятно',
  rulesPages: (goal: number) => [
    {
      title: 'Ставьте фигуры',
      text: 'Перетащите фигуру из лотка на свободные клетки. В лотке три фигуры, ставить можно в любом порядке.',
    },
    {
      title: '1 + 2 = 3',
      text: 'Клетка, вставшая рядом с парой, сливается с ней, и большая плитка забирает меньшую: 1 у двойки даёт 3 там, где была двойка. Из двух равных остаётся та, что уже лежала. Две единицы или две двойки просто стоят рядом.',
    },
    {
      title: 'Равные удваиваются',
      text: 'Начиная с тройки, равные плитки сливаются в следующую: 3 и 3 дают 6, 6 и 6 дают 12. Слияния идут цепочкой, и длинная цепочка дороже: третье и четвёртое слияние приносят очки вдвое, пятое и дальше втрое.',
    },
    {
      title: 'Сдвиг',
      text: 'Смахните доску, и всё съедет в одну сторону, а пары по пути сольются. Сдвиги лежат жёлтыми фишками на клавише справа вверху: один даётся на каждый лоток и ещё один за каскад из пяти слияний, больше двух не накопить.',
    },
    {
      title: `Соберите ${goal}`,
      text: `Дойдите по лесенке до ${goal}, чтобы победить. Игра кончается, когда ни одна фигура не встаёт на доску и ни один сдвиг ничего не сливает. После ${goal} можно играть дальше на очки.`,
    },
  ],
};

export type Strings = typeof ru;

const pts = (n: number, s: string) => `${s} ${n === 1 ? 'point' : 'points'}`;

export const en: Strings = {
  locale: 'en-US',
  settings: 'Settings',
  back: 'Back',
  close: 'Close',
  toMenu: 'Menu',
  goBack: 'Go back',
  soundOn: 'Turn sound on',
  soundOff: 'Turn sound off',
  ladder: 'Tile ladder',
  record: (s) => `Best ${s}`,
  newRecord: 'New best',
  play: 'Play',
  resume: 'Continue',
  resumeLabel: (s, n) => `Continue the game, ${pts(n, s)}`,
  newGame: 'New game',
  newGameAsk: 'Start a new game?',
  newGameYes: 'Start new',
  lostGame: (s, n) => `The current game with ${pts(n, s)} will be lost.`,
  skipSplash: 'Skip intro',
  restartAsk: 'Start over?',
  restartYes: 'Start over',
  restart: 'Restart',
  skipLessons: 'Skip tutorial',
  pause: 'Pause',
  score: (n) => `Score: ${n}`,
  board: 'Board. Swipe to sweep',
  sweepLeft: 'Sweep left',
  sweepRight: 'Sweep right',
  sweepUp: 'Sweep up',
  sweepDown: 'Sweep down',
  piece: (k) => `Piece ${k}`,
  emptySlot: (k) => `Empty slot ${k}`,
  bestTile: (v) => `Best tile ${v}`,
  noBestTile: 'No best tile yet',
  nextPiece: 'Next piece',
  sweeps: 'Sweeps',
  sweepsHeld: (n) => `Sweeps: ${n}`,
  lessons: [
    'Put the 1 next to the 2',
    'Put the 2 by the 1, and the threes merge',
    'Pick the cell with the longer chain: three merges earn a sweep',
    'Finish the ladder with the 2, then fire it with the 1',
    'Swipe the board left',
    'A square places four blocks at once and gives a sweep back',
  ],
  won: (goal, n) => `You made ${goal}. ${pts(n, String(n))}.`,
  keepPlaying: 'Keep playing',
  noRoom: (n) => `No room left. ${pts(n, String(n))}.`,
  again: 'Play again',
  theme: 'Theme',
  system: 'System',
  light: 'Light',
  dark: 'Dark',
  language: 'Language',
  game: 'Game',
  sound: 'Sound',
  music: 'Music',
  haptics: 'Vibration',
  hints: 'Hints',
  hintsNote: 'The board shows a move if you pause',
  help: 'Help',
  learn: 'Play the tutorial',
  rules: 'Rules',
  best: 'Best score',
  recordTitle: 'Record',
  reset: 'Reset progress',
  resetAsk: 'Reset progress?',
  resetText: (s) => `Your best score of ${s} and the current game will be deleted. This can't be undone.`,
  resetYes: 'Delete progress',
  resetNo: 'Keep',
  howto: 'How to play',
  replay: 'Show again',
  step: (k, n) => `Step ${k} of ${n}`,
  next: 'Next',
  gotIt: 'Got it',
  rulesPages: (goal) => [
    {
      title: 'Place pieces',
      text: 'Drag a piece from the tray onto empty cells. The tray holds three pieces, and you can place them in any order.',
    },
    {
      title: '1 + 2 = 3',
      text: 'A tile placed next to its pair merges with it, and the bigger tile takes the smaller: a 1 by a 2 makes a 3 where the 2 was. Of two equal tiles, the one already on the board stays. Two 1s or two 2s just sit side by side.',
    },
    {
      title: 'Equals double',
      text: 'From 3 up, equal tiles merge into the next one: 3 and 3 make 6, 6 and 6 make 12. Merges run in chains, and a long chain pays more: the third and fourth merges score double, the fifth and on score triple.',
    },
    {
      title: 'Sweep',
      text: 'Swipe the board and everything slides one way, merging pairs along the way. Sweeps are the yellow chips on the key at the top right: you get one for each tray and one more for a cascade of five merges, and you can hold two at most.',
    },
    {
      title: `Make ${goal}`,
      text: `Climb the ladder to ${goal} to win. The game ends when no piece fits on the board and no sweep merges anything. After ${goal} you can keep playing for points.`,
    },
  ],
};
