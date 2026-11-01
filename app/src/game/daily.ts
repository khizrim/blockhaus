import engine, { type Game } from './engine';
import { Platform, Share } from 'react-native';

/* The game of the day: a short game with its own rules. Everyone who plays
   on a date gets the same prepared board and the same random stream, seeded
   by the date. Thirty pieces, then it ends; the score earns a medal. One run
   a day; finishing it keeps the streak going. */

/** Thirty pieces on a board that starts with six tiles. */
export const DAILY = { pieceLimit: 30, startTiles: 6 };

/* Medal lines from the simulator (400 seeded runs of this format; rechecked
   on 2026-11-01 for sweeps that push the next piece in, which spend pieces of
   the thirty, so silver and gold came down a little): bronze is
   about a casual player's best quarter, silver a regular player's median,
   gold the top tenth of a strong one. */
export const MEDALS = [
  // `tile`: the board colour the medal wears on screen (umber, 0 = grey, yellow);
  // the emoji stay for the text people paste into chats.
  { at: 250, name: 'бронза', of: 'бронзы', emoji: '🥉', rank: 1, tile: 9 },
  { at: 330, name: 'серебро', of: 'серебра', emoji: '🥈', rank: 2, tile: 0 },
  { at: 420, name: 'золото', of: 'золота', emoji: '🥇', rank: 3, tile: 3 },
] as const;
export type Medal = (typeof MEDALS)[number];
export const medalOf = (score: number): Medal | null => [...MEDALS].reverse().find((m) => score >= m.at) ?? null;
export const nextMedal = (score: number): Medal | null => MEDALS.find((m) => score < m.at) ?? null;

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
  return { game: engine.newGame(DAILY, stream.next), stream };
}

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
export function dayLabel(key: string): string {
  const [, m, d] = key.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

/** Minutes until the next game of the day, the player's midnight. */
export function minutesLeft(now = new Date()): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return Math.max(1, Math.ceil((next.getTime() - now.getTime()) / 60000));
}

/** How long until the next game of the day: «7 ч 20 мин», «40 мин». */
export function untilTomorrow(now = new Date()): string {
  const mins = minutesLeft(now);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h} ч${m ? ` ${m} мин` : ''}` : `${m} мин`;
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
  const m = medalOf(r.score);
  return [
    `Blockhaus, игра дня ${dayLabel(key)}`,
    `${m ? `${m.emoji} ` : ''}${r.score.toLocaleString('ru-RU')} очков за ${DAILY.pieceLimit} фигур · серия ${streak} ${days}`,
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
