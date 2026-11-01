import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { TileNum } from '@/components/TileNum';
import { Arrow, CloseIcon } from '@/components/ui';
import { Enamel } from '@/design/depth';
import { useTheme } from '@/design/theme';
import { rank } from '@/design/tokens';

/** One part of a formula: a tile, a piece of several tiles side by side, or
    a sign. 'no' closes a pair that does not merge; 'swipe' is the gesture. */
export type Term = number | number[] | '+' | '=' | '→' | 'no' | 'swipe';

/* A rule written in tiles instead of words: [1] + [2] = [3]. The last term
   is what the move makes; while the move is still to do it waits as an
   empty framed slot, like the next milestone on the track, and pops in its
   colour when the board proves it. */
export function Formula({ terms, size: want, open = false, fit }: { terms: Term[]; size: number; open?: boolean; fit?: number }) {
  const { c } = useTheme();
  // Shrink to fit `fit` px: tiles count whole, signs 0.42, swipe 0.84, gaps 0.22.
  const units = terms.reduce<number>((u, t) => u + (typeof t === 'number' ? 1 : Array.isArray(t) ? t.length + 0.06 : t === 'swipe' ? 0.84 : 0.42), 0) + (terms.length - 1) * 0.22;
  const size = fit ? Math.min(want, Math.floor(fit / units)) : want;
  const sign = Math.round(size * 0.42);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Math.round(size * 0.22) }}>
      {terms.map((t, k) => {
        const last = k === terms.length - 1;
        if (t === '+' || t === '=') return <Sign key={k} kind={t} s={sign} color={c.muted} />;
        if (t === '→') return <Arrow key={k} dir="right" color={c.muted} s={sign} />;
        if (t === 'no') return <CloseIcon key={k} color={c.tile[2]} s={sign} />;
        if (t === 'swipe')
          return (
            <View key={k} style={{ flexDirection: 'row' }}>
              <Arrow dir="left" color={c.text} s={sign} />
              <Arrow dir="right" color={c.text} s={sign} />
            </View>
          );
        const vs = typeof t === 'number' ? [t] : t;
        return (
          <View key={k} style={{ flexDirection: 'row', gap: 2 }}>
            {vs.map((v, j) => (
              <Slot key={j} v={v} size={size} empty={last && open} />
            ))}
          </View>
        );
      })}
    </View>
  );
}

function Sign({ kind, s, color }: { kind: '+' | '='; s: number; color: string }) {
  const t = Math.max(2, Math.round(s * 0.16));
  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
      {kind === '+' ? (
        <>
          <View style={{ position: 'absolute', width: s, height: t, backgroundColor: color }} />
          <View style={{ position: 'absolute', width: t, height: s, backgroundColor: color }} />
        </>
      ) : (
        <>
          <View style={{ position: 'absolute', top: s * 0.3 - t / 2, width: s, height: t, backgroundColor: color }} />
          <View style={{ position: 'absolute', top: s * 0.7 - t / 2, width: s, height: t, backgroundColor: color }} />
        </>
      )}
    </View>
  );
}

function Slot({ v, size, empty }: { v: number; size: number; empty: boolean }) {
  const { c, isDark } = useTheme();
  const rk = rank(v);
  const k = useSharedValue(1);
  const was = useRef(empty);
  useEffect(() => {
    // The result arriving: the slot fills and pops, as a milestone does.
    if (was.current && !empty) k.value = withSequence(withTiming(1.3, { duration: 0 }), withTiming(1, { duration: 360, easing: Easing.out(Easing.back(2.6)) }));
    was.current = empty;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empty]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: k.value }] }));
  const frame = Math.max(2, Math.round(size * 0.08));
  const fill = empty ? c.canvas : c.tile[rk];
  return (
    <Animated.View style={[{ width: size, height: size, padding: frame, backgroundColor: c.line }, st]}>
      <View style={{ flex: 1, backgroundColor: fill, alignItems: 'center', justifyContent: 'center' }}>
        <Enamel fill={fill} size={size} empty={empty} dark={isDark} />
        {empty ? null : <TileNum v={v} color={c.ink[rk]} size={Math.round(size * (v >= 10 ? 0.4 : 0.5))} />}
      </View>
    </Animated.View>
  );
}
