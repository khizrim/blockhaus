import { getLocales } from 'expo-localization';

import { en, ru, type Strings } from './strings';

export type Lang = 'ru' | 'en';
export type LangPref = 'system' | Lang;
export type { Strings };

/* The app speaks Russian to those whose phone or browser is set to Russian
   or a language where Russian is widely read, and English to everyone else. */
const RUSSIAN = new Set(['ru', 'be', 'kk', 'ky']);

export function deviceLang(): Lang {
  try {
    for (const l of getLocales()) {
      const code = l.languageCode?.toLowerCase();
      if (!code) continue;
      return RUSSIAN.has(code) ? 'ru' : 'en';
    }
  } catch {}
  return 'en';
}

export const strings = (lang: Lang): Strings => (lang === 'en' ? en : ru);
