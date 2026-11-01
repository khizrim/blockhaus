import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { Field } from '@/components/Field';
import { useTheme } from '@/design/theme';

/** One part of a formula: a tile, a piece of several tiles side by side, or
    a sign. 'no' closes a pair that does not merge; 'swipe' is the gesture. */
export type Term = number | number[] | '+' | '=' | '→' | 'no' | 'swipe';

/* A rule written in tiles instead of words: [1] + [2] = [3]. The tiles are
   drawn as tray pieces, at the tray's cell and line, so a formula is made of
   the same things the player holds, at the same size everywhere. Signs are
   bars of the board's line weight, half a cell tall. The last term is what
   the move makes; while the move is still to do it waits as an empty cell,
   and pops in its colour when the board proves it. */
export function Formula({ terms, cell: want, gap, open = false, fit }: { terms: Term[]; cell: number; gap: number; open?: boolean; fit?: number }) {
  const { c } = useTheme();
  // Shrink to fit `fit` px: tiles count a cell, signs half, the swipe one, spaces a quarter.
  const units = terms.reduce<number>((u, t) => u + (typeof t === 'number' ? 1 : Array.isArray(t) ? t.length : t === 'swipe' ? 1 : 0.5), 0) + (terms.length - 1) * 0.25;
  const cell = fit ? Math.min(want, Math.floor((fit - gap) / units)) : want;
  const s = Math.round(cell * 0.5);
  const t = Math.max(2, Math.round(gap * 0.8));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Math.round(cell * 0.25) }}>
      {terms.map((term, k) => {
        if (typeof term === 'number' || Array.isArray(term)) {
          const vs = typeof term === 'number' ? [term] : term;
          return <Tiles key={k} vs={vs} cell={cell} gap={gap} empty={k === terms.length - 1 && open} />;
        }
        return <Sign key={k} kind={term} s={s} t={t} color={term === 'no' ? c.tile[2] : c.text} />;
      })}
    </View>
  );
}

function Tiles({ vs, cell, gap, empty }: { vs: number[]; cell: number; gap: number; empty: boolean }) {
  const k = useSharedValue(1);
  const was = useRef(empty);
  useEffect(() => {
    // The result arriving: the cell fills and pops, as a milestone does.
    if (was.current && !empty) k.value = withSequence(withTiming(1.25, { duration: 0 }), withTiming(1, { duration: 360, easing: Easing.out(Easing.back(2.6)) }));
    was.current = empty;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empty]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: k.value }] }));
  return (
    <Animated.View style={st}>
      <Field variant="piece" w={vs.length} h={1} values={empty ? vs.map(() => 0) : vs} cell={cell} gap={gap} />
    </Animated.View>
  );
}

/** Signs as bars: plus, equals, a red cross, an arrow, the two-way swipe. */
function Sign({ kind, s, t, color }: { kind: Exclude<Term, number | number[]>; s: number; t: number; color: string }) {
  const bar = (st: object) => <View style={[{ position: 'absolute', backgroundColor: color }, st]} />;
  const mid = (s - t) / 2;
  // An arrowhead: a square's two sides, turned 45°, its corner at x.
  const hs = Math.round(s * 0.42);
  const head = (x: number, dir: 1 | -1) => (
    <View
      style={{
        position: 'absolute',
        left: x - hs / 2 - (dir * hs) / 2 + (dir * t) / 2,
        top: (s - hs) / 2,
        width: hs,
        height: hs,
        borderColor: color,
        borderTopWidth: t,
        borderRightWidth: t,
        transform: [{ rotate: dir === 1 ? '45deg' : '-135deg' }],
      }}
    />
  );
  const w = kind === 'swipe' ? s * 2 : s;
  return (
    <View style={{ width: w, height: s }}>
      {kind === '+' ? (
        <>
          {bar({ left: 0, top: mid, width: s, height: t })}
          {bar({ left: mid, top: 0, width: t, height: s })}
        </>
      ) : kind === '=' ? (
        <>
          {bar({ left: 0, top: s * 0.28 - t / 2, width: s, height: t })}
          {bar({ left: 0, top: s * 0.72 - t / 2, width: s, height: t })}
        </>
      ) : kind === 'no' ? (
        <>
          {bar({ left: -s * 0.1, top: mid, width: s * 1.2, height: t, transform: [{ rotate: '45deg' }] })}
          {bar({ left: -s * 0.1, top: mid, width: s * 1.2, height: t, transform: [{ rotate: '-45deg' }] })}
        </>
      ) : kind === '→' ? (
        <>
          {bar({ left: 0, top: mid, width: s - t, height: t })}
          {head(s, 1)}
        </>
      ) : (
        <>
          {bar({ left: t, top: mid, width: w - t * 2, height: t })}
          {head(0, -1)}
          {head(w, 1)}
        </>
      )}
    </View>
  );
}
