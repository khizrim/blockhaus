import type { Game } from './engine';

export type DailyRun = { key: string; game: Game; stream: { draws: number; next: () => number } };
export type SavedDaily = { key: string; game: Omit<Game, 'cfg' | 'rng'>; draws: number };
export function dayKey(date?: Date): string;
export function ruleOf(key: string): 'plain' | 'stone' | 'big' | 'still' | 'domino';
export function medalsFor(key: string): readonly number[];
export function medalFor(key: string, score: number): number;
export function namesFor(locale: string): readonly string[];
export function dailyProgress(key: string, moves: number, score: number, locale: string): string;
export function newDailyGame(key: string): DailyRun;
export function saveDaily(run: DailyRun): SavedDaily;
export function restoreDaily(saved: SavedDaily): DailyRun;
