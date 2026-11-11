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
  rulesPages: (goal: number) => [
    {
      title: 'Ставьте фигуры',
      text: 'Перетащите фигуру из лотка на свободные клетки. В лотке три фигуры, порядок выбираете вы.',
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
      title: 'Сдвиг',
      text: 'Смахните доску, и всё съедет в одну сторону, а пары по пути сольются. Сдвиги лежат жёлтыми фишками на клавише справа вверху. Один даётся за каждый лоток, ещё один за каскад из пяти слияний. Больше двух не накопить.',
    },
    {
      title: `Соберите ${goal}`,
      text: `Доберитесь по лесенке до ${goal}, и победа ваша. Игра кончается, когда фигурам негде встать, а сдвиги ничего не сливают. После ${goal} можно играть дальше на очки.`,
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
  rulesPages: (goal) => [
    {
      title: 'Place pieces',
      text: 'Drag a piece from the tray onto empty cells. The tray holds three, in whatever order you like.',
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
      title: 'Sweep',
      text: 'Swipe the board and everything slides one way, merging pairs as it goes. Sweeps are the yellow chips on the key at the top right. You get one per tray and one more for a cascade of five merges. You can hold two at most.',
    },
    {
      title: `Make ${goal}`,
      text: `Climb the ladder to ${goal} and the win is yours. The game ends when no piece fits and no sweep merges anything. After ${goal}, keep playing for points.`,
    },
  ],
};
