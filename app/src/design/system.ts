import { Easing, ReduceMotion, useReducedMotion, type WithTimingConfig } from 'react-native-reanimated';
import type { TextStyle } from 'react-native';

import { font } from './tokens';

/* The rules the screens are built on.

   Space: an 8pt grid for layout, 4pt steps only for small inner gaps.
   Type: one text family (Onest) in three weights, a 12/14/16 base and two
   title steps. Dela Gothic One is the wordmark and nothing else.
   Motion: three durations, ease-out to enter, ease-in to leave, no springs or
   loops. Every animation follows the system's reduced-motion setting. */

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, x3: 48 } as const;

/** Minimum hit target for anything tappable. */
export const HIT = 44;

const t = (fontFamily: string, fontSize: number, lineHeight: number, extra?: TextStyle): TextStyle => ({
  fontFamily,
  fontSize,
  lineHeight,
  ...extra,
});

export const type = {
  /** Screen and dialog titles. */
  title: t(font.bodySemi, 24, 30, { letterSpacing: -0.2 }),
  /** Section headings, card titles. */
  heading: t(font.bodySemi, 20, 24),
  body: t(font.body, 16, 24),
  bodyStrong: t(font.bodySemi, 16, 24),
  secondary: t(font.body, 14, 20),
  secondaryStrong: t(font.bodyMedium, 14, 20),
  meta: t(font.bodyMedium, 12, 16),
  /** Big numbers: the score, end-of-game totals. */
  number: t(font.bodySemi, 40, 44, { fontVariant: ['tabular-nums'], letterSpacing: -0.5 }),
  stat: t(font.bodySemi, 20, 24, { fontVariant: ['tabular-nums'] }),
};

export const dur = { fast: 150, base: 200, slow: 300 } as const;

export const enter = (duration: number = dur.base): WithTimingConfig => ({
  duration,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
});
export const exit = (duration: number = dur.fast): WithTimingConfig => ({
  duration,
  easing: Easing.in(Easing.cubic),
  reduceMotion: ReduceMotion.System,
});

/** True when the system asks for reduced motion. JS-driven effects (count-ups,
    timers) read this; Reanimated animations follow the system on their own. */
export const useCalm = useReducedMotion;
