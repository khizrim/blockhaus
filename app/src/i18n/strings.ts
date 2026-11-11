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
  goBack: 'Ой, нет',
  soundOn: 'Включить звук',
  soundOff: 'Выключить звук',
  ladder: 'Лесенка плиток',
  record: (s: string) => `Рекорд ${s}`,
  newRecord: 'Новый рекорд!',
  // Menu
  play: 'Играть',
  resume: 'Продолжить',
  resumeLabel: (s: string, n: number) => `Продолжить партию, ${points(n, s)}`,
  newGame: 'Новая игра',
  newGameAsk: 'С чистой доски?',
  newGameYes: 'Да, с чистой',
  lostGame: (s: string, n: number) => `Партия на ${points(n, s)} исчезнет. Не жалко?`,
  skipSplash: 'Пропустить заставку',
  // Pause
  restartAsk: 'Начать заново?',
  restartYes: 'Да, заново',
  restart: 'Заново',
  skipLessons: 'Я и так умею',
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
  keepPlaying: 'Ещё немного',
  noRoom: (n: number) => `Места нет. ${points(n, String(n))}.`,
  again: 'Ещё разок',
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
  resetText: (s: string) => `Рекорд ${s} и текущая партия исчезнут насовсем. Вернуть их не выйдет.`,
  resetYes: 'Стереть',
  resetNo: 'Пусть живут',
  // How to play
  howto: 'Как играть',
  replay: 'Показать ещё раз',
  step: (k: number, n: number) => `Шаг ${k} из ${n}`,
  next: 'Дальше',
  gotIt: 'Ясно, играем',
  rulesPages: (goal: number) => [
    {
      title: 'Ставьте фигуры',
      text: 'Тащите фигуру из лотка на свободные клетки. В лотке три фигуры, а порядок выбираете вы.',
    },
    {
      title: '1 + 2 = 3',
      text: 'Единица и двойка дружат: поставьте их рядом, и выйдет 3. Большая плитка забирает меньшую, так что тройка встанет на место двойки. Из двух равных остаётся та, что лежала первой. А две единицы или две двойки просто стоят рядом и скучают.',
    },
    {
      title: 'Равные удваиваются',
      text: 'С тройки начинается самое интересное: 3 и 3 дают 6, 6 и 6 дают 12. Слияния бегут цепочкой, и чем она длиннее, тем щедрее: третье и четвёртое слияние платят вдвое, пятое и дальше втрое.',
    },
    {
      title: 'Сдвиг',
      text: 'Смахните доску, и всё съедет в одну сторону, а пары по пути сольются. Сдвиги лежат жёлтыми фишками на клавише справа вверху. Один дают за каждый лоток, ещё один за каскад из пяти слияний. Больше двух в карман не влезает.',
    },
    {
      title: `Соберите ${goal}`,
      text: `Доберитесь по лесенке до ${goal}, и победа ваша. Игра кончается, когда фигурам негде встать, а сдвиги ничего не сливают. После ${goal} можно играть дальше, на очки и для удовольствия.`,
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
  goBack: 'Oops, no',
  soundOn: 'Turn sound on',
  soundOff: 'Turn sound off',
  ladder: 'Tile ladder',
  record: (s) => `Best ${s}`,
  newRecord: 'New best!',
  play: 'Play',
  resume: 'Continue',
  resumeLabel: (s, n) => `Continue the game, ${pts(n, s)}`,
  newGame: 'New game',
  newGameAsk: 'Fresh board?',
  newGameYes: 'Fresh start',
  lostGame: (s, n) => `Your ${pts(n, s)} game will vanish. Sure?`,
  skipSplash: 'Skip intro',
  restartAsk: 'Start over?',
  restartYes: 'Yes, start over',
  restart: 'Restart',
  skipLessons: 'I know how to play',
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
  keepPlaying: 'Just a bit more',
  noRoom: (n) => `No room left. ${pts(n, String(n))}.`,
  again: 'One more go',
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
  hintsNote: 'The board nudges you if you pause',
  help: 'Help',
  learn: 'Play the tutorial',
  rules: 'Rules',
  best: 'Best score',
  recordTitle: 'Record',
  reset: 'Reset progress',
  resetAsk: 'Wipe it all?',
  resetText: (s) => `Your best of ${s} and the current game will be gone for good. No take-backs.`,
  resetYes: 'Wipe it',
  resetNo: 'Keep them',
  howto: 'How to play',
  replay: 'Show again',
  step: (k, n) => `Step ${k} of ${n}`,
  next: 'Next',
  gotIt: "Got it, let's play",
  rulesPages: (goal) => [
    {
      title: 'Place pieces',
      text: 'Drag a piece from the tray onto empty cells. The tray holds three, and the order is up to you.',
    },
    {
      title: '1 + 2 = 3',
      text: 'A 1 and a 2 get along: put them side by side and you get a 3. The bigger tile takes the smaller, so the 3 lands where the 2 was. Of two equal tiles, the one that was there first stays. Two 1s or two 2s just sit next to each other, bored.',
    },
    {
      title: 'Equals double',
      text: 'From 3 on, the fun begins: 3 and 3 make 6, 6 and 6 make 12. Merges run in chains, and longer chains pay better: the third and fourth merges score double, the fifth and beyond triple.',
    },
    {
      title: 'Sweep',
      text: 'Swipe the board and everything slides one way, merging pairs as it goes. Sweeps are the yellow chips on the key at the top right. You get one per tray and one more for a cascade of five merges. Your pocket holds two at most.',
    },
    {
      title: `Make ${goal}`,
      text: `Climb the ladder to ${goal} and the win is yours. The game ends when no piece fits and no sweep merges anything. After ${goal}, keep playing for points, and for fun.`,
    },
  ],
};
