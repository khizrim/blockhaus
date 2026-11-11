import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState, Platform, useColorScheme } from 'react-native';

import { deviceLang, strings, type Lang, type LangPref, type Strings } from '@/i18n';

import { setFeedback } from '@/sound/sfx';

import { dark, light, type Palette } from './tokens';

export type ThemeMode = 'system' | 'light' | 'dark';

/* Preferences, kept on the device. Sound and music wait for the saved values
   before they start, so a player who turned the music off never hears it
   swell for a moment at launch. */
const KEY = 'blockhaus:prefs';
type Prefs = {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  /** The language picked in settings; 'system' follows the device. */
  langPref: LangPref;
  setLangPref: (l: LangPref) => void;
  sound: boolean;
  setSound: (v: boolean) => void;
  haptics: boolean;
  setHaptics: (v: boolean) => void;
  hints: boolean;
  setHints: (v: boolean) => void;
  music: boolean;
  setMusic: (v: boolean) => void;
  /** The sound key: on while any sound or music plays. */
  audible: boolean;
  /** The sound key's tap: effects and music together. */
  setAudible: (v: boolean) => void;
};

type Theme = Prefs & { c: Palette; isDark: boolean; lang: Lang; t: Strings };

const Ctx = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>('system');
  const [langPref, setLangPref] = useState<LangPref>('system');
  const [device, setDevice] = useState<Lang>(deviceLang);
  // The device language can change while the app sleeps in the background.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s === 'active' && setDevice(deviceLang()));
    return () => sub.remove();
  }, []);
  const [sound, setSound] = useState(true);
  const [haptics, setHaptics] = useState(true);
  const [hints, setHints] = useState(true);
  const [music, setMusic] = useState(true);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        const p = raw ? (JSON.parse(raw) as Partial<Record<'mode' | 'lang' | 'sound' | 'haptics' | 'hints' | 'music', unknown>>) : {};
        if (p.mode === 'system' || p.mode === 'light' || p.mode === 'dark') setMode(p.mode);
        if (p.lang === 'system' || p.lang === 'ru' || p.lang === 'en') setLangPref(p.lang);
        if (typeof p.sound === 'boolean') setSound(p.sound);
        if (typeof p.haptics === 'boolean') setHaptics(p.haptics);
        if (typeof p.hints === 'boolean') setHints(p.hints);
        if (typeof p.music === 'boolean') setMusic(p.music);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);
  useEffect(() => {
    if (!loaded) return;
    setFeedback({ sound, haptics, music });
    AsyncStorage.setItem(KEY, JSON.stringify({ mode, lang: langPref, sound, haptics, hints, music })).catch(() => {});
  }, [loaded, mode, langPref, sound, haptics, hints, music]);
  /* The key acts inside the tap itself, not a render later: a browser lets
     audio start only from a tap, and the music must not swell for a moment
     before it goes quiet. */
  const setAudible = useCallback(
    (v: boolean) => {
      setFeedback({ sound: v, haptics, music: v });
      setSound(v);
      setMusic(v);
    },
    [haptics],
  );
  const audible = sound || music;
  const isDark = mode === 'dark' || (mode === 'system' && system === 'dark');
  const lang = langPref === 'system' ? device : langPref;
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') document.documentElement.lang = lang;
  }, [lang]);
  const value = useMemo(
    () => ({ mode, setMode, langPref, setLangPref, lang, t: strings(lang), sound, setSound, haptics, setHaptics, hints, setHints, music, setMusic, audible, setAudible, isDark, c: isDark ? dark : light }),
    [mode, langPref, lang, sound, haptics, hints, music, isDark, setAudible],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): Theme {
  const t = useContext(Ctx);
  if (!t) throw new Error('useTheme outside ThemeProvider');
  return t;
}
