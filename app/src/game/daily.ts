import engine, { type Game } from './engine';
import { Platform, Share } from 'react-native';

/* The game of the day: everyone who plays on a date starts from the same
   board and draws from the same random stream, seeded by the date. One run a
   day; finishing it keeps the streak going. */

/** Local date as YYYY-MM-DD: the day changes at the player's midnight. */
export function dayKey(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function prevDay(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d - 1));
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
  return { game: engine.newGame(undefined, stream.next), stream };
}

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
export function dayLabel(key: string): string {
  const [, m, d] = key.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

/* The board as coloured squares, for sharing in any chat: the Mondrian in
   miniature. Emoji have no magenta or teal, so 48 and up take the darks. */
const SQUARE: Record<number, string> = { 0: '⬜', 1: '🟦', 2: '🟥', 3: '🟨', 6: '🟧', 12: '🟩', 24: '🟪', 48: '🟫', 96: '⬛' };
const square = (v: number) => (v >= 192 ? '⭐' : (SQUARE[v] ?? '⬛'));

/** Russian plural: 1 день, 2 дня, 5 дней, 21 день. */
export function plural(n: number, one: string, few: string, many: string): string {
  const d = n % 10;
  const t = n % 100;
  if (d === 1 && t !== 11) return one;
  if (d >= 2 && d <= 4 && (t < 12 || t > 14)) return few;
  return many;
}

export function shareText(key: string, r: { score: number; bestTile: number; board: number[] }, streak: number): string {
  const rows = [];
  for (let y = 0; y < engine.N; y++) rows.push(r.board.slice(y * engine.N, (y + 1) * engine.N).map(square).join(''));
  const days = plural(streak, 'день', 'дня', 'дней');
  return [
    `Blockhaus, игра дня ${dayLabel(key)}`,
    `${r.score.toLocaleString('ru-RU')} очков · плитка ${r.bestTile} · серия ${streak} ${days}`,
    '',
    ...rows,
  ].join('\n');
}

/** The system share sheet; on a browser without one, the clipboard. */
export async function shareOrCopy(text: string): Promise<'shared' | 'copied' | 'failed'> {
  const nav = (globalThis as { navigator?: { share?: (d: { text: string }) => Promise<void>; clipboard?: { writeText: (t: string) => Promise<void> } } }).navigator;
  if (Platform.OS === 'web') {
    try {
      if (nav?.share) {
        await nav.share({ text });
        return 'shared';
      }
      await nav?.clipboard?.writeText(text);
      return nav?.clipboard ? 'copied' : 'failed';
    } catch {
      return 'failed';
    }
  }
  try {
    await Share.share({ message: text });
    return 'shared';
  } catch {
    return 'failed';
  }
}
