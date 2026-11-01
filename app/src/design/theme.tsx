import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { setFeedback } from '@/sound/sfx';

import type { DepthKind } from './depth';
import { dark, light, type Palette } from './tokens';

export type ThemeMode = 'system' | 'light' | 'dark';

/* Preferences, kept on the device. Sound and music wait for the saved values
   before they start, so a player who turned the music off never hears it
   swell for a moment at launch. */
const KEY = 'blockhaus:prefs';
type Prefs = {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  sound: boolean;
  setSound: (v: boolean) => void;
  haptics: boolean;
  setHaptics: (v: boolean) => void;
  hints: boolean;
  setHints: (v: boolean) => void;
  music: boolean;
  setMusic: (v: boolean) => void;
  /** Prototype: how much volume the board and the identity get. */
  depth: DepthKind;
  setDepth: (d: DepthKind) => void;
};

type Theme = Prefs & { c: Palette; isDark: boolean };

const Ctx = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>('system');
  const [sound, setSound] = useState(true);
  const [haptics, setHaptics] = useState(true);
  const [hints, setHints] = useState(true);
  const [music, setMusic] = useState(true);
  const [depth, setDepth] = useState<DepthKind>('flat');
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        const p = raw ? (JSON.parse(raw) as Partial<Record<'mode' | 'sound' | 'haptics' | 'hints' | 'music' | 'depth', unknown>>) : {};
        if (p.mode === 'system' || p.mode === 'light' || p.mode === 'dark') setMode(p.mode);
        if (typeof p.sound === 'boolean') setSound(p.sound);
        if (typeof p.haptics === 'boolean') setHaptics(p.haptics);
        if (typeof p.hints === 'boolean') setHints(p.hints);
        if (typeof p.music === 'boolean') setMusic(p.music);
        if (p.depth === 'flat' || p.depth === 'relief' || p.depth === 'paper' || p.depth === 'block') setDepth(p.depth);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);
  useEffect(() => {
    if (!loaded) return;
    setFeedback({ sound, haptics, music });
    AsyncStorage.setItem(KEY, JSON.stringify({ mode, sound, haptics, hints, music, depth })).catch(() => {});
  }, [loaded, mode, sound, haptics, hints, music, depth]);
  const isDark = mode === 'dark' || (mode === 'system' && system === 'dark');
  const value = useMemo(
    () => ({ mode, setMode, sound, setSound, haptics, setHaptics, hints, setHints, music, setMusic, depth, setDepth, isDark, c: isDark ? dark : light }),
    [mode, sound, haptics, hints, music, depth, isDark],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): Theme {
  const t = useContext(Ctx);
  if (!t) throw new Error('useTheme outside ThemeProvider');
  return t;
}
