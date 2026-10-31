import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { setFeedback } from '@/sound/sfx';

import { dark, light, type Palette } from './tokens';

export type ThemeMode = 'system' | 'light' | 'dark';

/* Prototype-only preferences. Nothing is persisted yet: the toggles exist so
   the screens can be designed around them. */
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
  useEffect(() => setFeedback({ sound, haptics, music }), [sound, haptics, music]);
  const isDark = mode === 'dark' || (mode === 'system' && system === 'dark');
  const value = useMemo(
    () => ({ mode, setMode, sound, setSound, haptics, setHaptics, hints, setHints, music, setMusic, isDark, c: isDark ? dark : light }),
    [mode, sound, haptics, hints, music, isDark],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): Theme {
  const t = useContext(Ctx);
  if (!t) throw new Error('useTheme outside ThemeProvider');
  return t;
}
