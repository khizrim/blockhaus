import { Easing, FadeInDown, FadeOut, ReduceMotion, useReducedMotion, type WithTimingConfig } from 'react-native-reanimated';
import type { TextStyle } from 'react-native';

import { font } from './tokens';

/* The rules the screens are built on.

   Space: an 8pt grid for layout, 4pt steps only for small inner gaps.
   Type: one text family (Onest) in three weights, a 12/14/16 base and two
   title steps. Dela Gothic One is the wordmark and the final score, nothing else.
   Motion: four durations (100, 150, 200, 300), ease-out to enter, ease-in to
   leave. The interface (dialogs, cards, buttons, menus) never overshoots and
   never loops. The board is the one exception, and has its own two curves
   below: a tile that is struck settles past rest and back, as a block does.
   Every animation follows the system's reduced-motion setting. The rules in
   full: .ux-profile.md at the root of the repository. */

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

export const dur = { micro: 100, fast: 150, base: 200, slow: 300 } as const;

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

/** A dialog or a card arriving: it fades up 8pt (down, when `from` is
    negative), ease-out. */
export const rise = (delay = 0, from = 8) =>
  FadeInDown.delay(delay)
    .duration(dur.slow)
    .easing(Easing.out(Easing.cubic))
    .withInitialValues({ opacity: 0, transform: [{ translateY: from }] })
    .reduceMotion(ReduceMotion.System);
/** A card leaving: a quick fade, ease-in. */
export const sink = () => FadeOut.duration(dur.fast).easing(Easing.in(Easing.cubic)).reduceMotion(ReduceMotion.System);

/* ---------- the board's own motion ----------
   Only on the board and the pieces of the board's language (the track, the
   tray, the strip, the lesson formula). Same duration scale, plus `hit`, the
   instant of contact before a settle. */

/** The instant a tile is struck or the board meets a wall, before it settles. */
export const hit = 50;
/** A tile, square or number kicked up in scale coming back to rest: past it
    and back, once. Merges, milestones, the score, new tray pieces. */
export const pop = (duration: number = dur.slow): WithTimingConfig => ({
  duration,
  easing: Easing.out(Easing.back(2.2)),
  reduceMotion: ReduceMotion.System,
});
/** Something travelling that stops: the board leaning back, a piece riding
    in, a lifted tile dropping into its socket. A softer overshoot than `pop`. */
export const rest = (duration: number = dur.slow): WithTimingConfig => ({
  duration,
  easing: Easing.out(Easing.back(1.5)),
  reduceMotion: ReduceMotion.System,
});

/** True when the system asks for reduced motion. JS-driven effects (count-ups,
    timers) read this; Reanimated animations follow the system on their own. */
export const useCalm = useReducedMotion;
