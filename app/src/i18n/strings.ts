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
  newGameAsk: 'С чистой доски?',
  newGameYes: 'Начать новую',
  lostGame: (s: string, n: number) => `Партия на ${points(n, s)} пропадёт.`,
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
  tileGoal: (v: number) => `Соберите ${v}`,
  tileRecord: (v: number) => `Рекордная плитка ${v}`,
  newTileRecord: (v: number) => `Новый рекорд · ${v}`,
  noBestTile: 'Лучшей плитки пока нет',
  nextPiece: 'Следующая фигура',
  spacesNow: (n: number) => `${n} ${ru3(n, 'место', 'места', 'мест')}`,
  trappedLowTiles: (n: number) => `Единицы и двойки без свободной стороны или пары: ${n}`,
  sweeps: 'Сдвиги',
  sweepsHeld: (n: number) => `Сдвиги: ${n}`,
  lessons: [
    'Поставьте 1 рядом с 2',
    'Поставьте 2 к единице, и тройки сольются',
    'Смахните вверх. Единица и двойка сольются в тройку и освободят клетку.',
    'Поставьте единицу так, чтобы получить 12. За три слияния вы получите сдвиг.',
    'Достройте лесенку двойкой, потом запустите её единицей',
    'Смахните влево, чтобы соединить две плитки 24. Ещё один сдвиг останется про запас.',
    'На 48 открываются фигуры из трёх клеток. Приставьте уголок к двум двойкам, чтобы пополнить запас сдвигов.',
  ],
  // Game over
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
  hintsNote: 'Доска подскажет ход, если вы задумаетесь',
  help: 'Помощь',
  learn: 'Пройти обучение',
  rules: 'Правила',
  best: 'Лучший счёт',
  recordTitle: 'Рекорд',
  reset: 'Сбросить прогресс',
  resetAsk: 'Стереть всё?',
  resetText: (s: string) => `Рекорд ${s} и текущая партия исчезнут насовсем.`,
  resetYes: 'Стереть',
  resetNo: 'Оставить',
  // How to play
  howto: 'Как играть',
  replay: 'Показать ещё раз',
  step: (k: number, n: number) => `Шаг ${k} из ${n}`,
  next: 'Дальше',
  gotIt: 'Понятно',
  rulesPages: () => [
    {
      title: 'Ставьте фигуры',
      text: 'В лотке три фигуры. Перетаскивайте их на свободные клетки в любом порядке. Сначала вам выпадают одиночки и домино. Соберите 48, чтобы открыть фигуры из трёх клеток, а на 192 появится квадрат.',
    },
    {
      title: '1 + 2 = 3',
      text: 'Поставьте 1 рядом с 2, и получится 3. Большая плитка забирает меньшую, поэтому тройка встанет на место двойки. Из двух равных остаётся та, что лежала раньше. Две единицы или две двойки не сливаются.',
    },
    {
      title: 'Равные удваиваются',
      text: 'Дальше равные плитки сливаются в следующую: 3 и 3 дают 6, 6 и 6 дают 12. Слияния идут цепочкой, и длинная цепочка выгоднее: третье и четвёртое слияние приносят вдвое больше очков, пятое и дальше втрое.',
    },
    {
      title: 'Сдвигайте поле',
      text: 'Смахните влево, чтобы соединить 1 и 2 в верхнем ряду и освободить клетку. Жёлтые фишки показывают запас. Если он пуст, новый лоток даёт один сдвиг. За три слияния подряд при выкладке вы получите ещё один. Можно накопить три и приберечь один для тесного поля.',
    },
    {
      title: 'Побейте свой рекорд',
      text: 'В основной игре цель — следующая плитка после вашего рекорда. Если вы уже собирали 96, попробуйте собрать 192. Партия продолжается, пока есть ходы.',
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
  newGameAsk: 'Start fresh?',
  newGameYes: 'Start fresh',
  lostGame: (s, n) => `Your ${pts(n, s)} game will be lost.`,
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
  tileGoal: (v) => `Make ${v}`,
  tileRecord: (v) => `Tile record ${v}`,
  newTileRecord: (v) => `New best · ${v}`,
  noBestTile: 'No best tile yet',
  nextPiece: 'Next piece',
  spacesNow: (n: number) => `${n} ${n === 1 ? 'spot' : 'spots'}`,
  trappedLowTiles: (n: number) => `Ones and twos without an open side or a partner: ${n}`,
  sweeps: 'Sweeps',
  sweepsHeld: (n) => `Sweeps: ${n}`,
  lessons: [
    'Put the 1 next to the 2',
    'Put the 2 by the 1, and the threes merge',
    'Swipe up. The 1 and 2 merge into a 3 and free a cell.',
    'Place the 1 where it will make a 12. Three merges earn a sweep.',
    'Finish the ladder with the 2, then fire it with the 1',
    'Swipe left to bring the two 24s together. You still have one sweep in reserve.',
    'At 48, three-cell pieces enter the tray. Fit the corner next to the two 2s to earn another sweep.',
  ],
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
  hintsNote: 'The board suggests a move if you pause',
  help: 'Help',
  learn: 'Play the tutorial',
  rules: 'Rules',
  best: 'Best score',
  recordTitle: 'Record',
  reset: 'Reset progress',
  resetAsk: 'Wipe everything?',
  resetText: (s) => `Your best of ${s} and the current game will be gone for good.`,
  resetYes: 'Wipe',
  resetNo: 'Keep',
  howto: 'How to play',
  replay: 'Show again',
  step: (k, n) => `Step ${k} of ${n}`,
  next: 'Next',
  gotIt: 'Got it',
  rulesPages: () => [
    {
      title: 'Place pieces',
      text: 'Drag the three pieces from the tray onto empty cells in any order. You start with singles and dominoes. Make a 48 to unlock three-cell pieces and a 192 to unlock the square.',
    },
    {
      title: '1 + 2 = 3',
      text: 'Put a 1 next to a 2 to make a 3. The bigger tile takes the smaller, so the 3 lands where the 2 was. Of two equal tiles, the one placed earlier stays. Two 1s or two 2s don\'t merge.',
    },
    {
      title: 'Equals double',
      text: 'From there, equal tiles merge into the next one: 3 and 3 make 6, 6 and 6 make 12. Merges run in chains, and longer chains pay more: the third and fourth merges score double, the fifth and beyond triple.',
    },
    {
      title: 'Sweep the board',
      text: 'Swipe left to bring the 1 and 2 together in the top row and free a cell. The yellow chips show your sweeps. An empty key gets one with the next tray. Three merges in a single placement earn another. You can hold three and save one for a tight spot.',
    },
    {
      title: 'Beat your best',
      text: 'In the main game, aim for the tile above your personal best. If you’ve made a 96 before, go for 192. Keep playing as long as you have a move.',
    },
  ],
};
