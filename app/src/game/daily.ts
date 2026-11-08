import engine, { type Game } from './engine';

/* The game of the day: a short game with its own rules. Everyone who plays
   on a date gets the same prepared board and the same random stream, seeded
   by the date. Thirty pieces, then it ends. One run a day. */

/** Thirty pieces on a board that starts with six tiles. */
export const DAILY = engine.DAILY;

/* Weekday rules: some days of the week bend one rule of the game of the
   day (engine.WEEKDAY), the same for everyone. */
export type DayRule = 'domino' | 'stone' | 'still' | 'big';
export const RULES: Record<DayRule, { name: string; about: string }> = {
  domino: { name: 'День домино', about: 'Все фигуры — домино.' },
  stone: { name: 'День камней', about: 'В середине доски два камня. На них нельзя ставить, сдвиг упирается в них.' },
  still: { name: 'День без сдвигов', about: 'Свайпы не работают, только постановка.' },
  big: { name: 'День больших плиток', about: 'Доска начинается с крупных плиток.' },
};
const weekday = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
};
/** The rule bent on this date, or null on a plain day. */
export function ruleOf(key: string): DayRule | null {
  const w = (engine.WEEKDAY as Record<number, { rule: DayRule }>)[weekday(key)];
  return w ? w.rule : null;
}
/** The game of the day's config on this date. */
export function dailyConfig(key: string): Record<string, unknown> {
  const w = (engine.WEEKDAY as Record<number, Record<string, unknown>>)[weekday(key)];
  return { ...DAILY, ...(w ?? {}) };
}
/** Local date as YYYY-MM-DD: the day changes at the player's midnight. */
export function dayKey(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** The date as a number, mixed so neighbouring days do not start alike. */
function seedOf(key: string): number {
  let h = 2166136261;
  for (const ch of `blockhaus:${key}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

/** A seeded stream that counts its draws, so a saved run can be replayed to
    the same point after the app restarts. */
export function dayStream(key: string, skip = 0) {
  const base = engine.seeded(seedOf(key));
  for (let i = 0; i < skip; i++) base();
  const s = { draws: skip, next: () => (s.draws++, base()) };
  return s;
}

export function newDailyGame(key: string): { game: Game; stream: ReturnType<typeof dayStream> } {
  const stream = dayStream(key);
  return { game: engine.newGame(dailyConfig(key), stream.next), stream };
}

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
export function dayLabel(key: string): string {
  const [, m, d] = key.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}
