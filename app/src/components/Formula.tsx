import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { Socket } from '@/components/Block';
import { Field } from '@/components/Field';
import { useTheme } from '@/design/theme';

/** One part of a formula: a tile, a piece of several tiles side by side, or
    a sign. 'no' closes a pair that does not merge; 'swipe' is the gesture. */
export type Term = number | number[] | { grid: number[][] } | '+' | '=' | '→' | 'no' | 'swipe' | 'swipeV' | 'stud';
type Sym = '+' | '=' | '→' | 'no' | 'swipe' | 'swipeV';

/* A rule written in tiles instead of words: [1] + [2] = [3]. The tiles are
   drawn as tray pieces, at the tray's cell and line, so a formula is made of
   the same things the player holds, at the same size everywhere. Signs are
   rounded strokes, half a cell tall. The last term is what
   the move makes; while the move is still to do it waits as an empty cell,
   and pops in its colour when the board proves it. */
export function Formula({ terms, cell: want, gap, open = false, fit }: { terms: Term[]; cell: number; gap: number; open?: boolean; fit?: number }) {
  const { c } = useTheme();
  // Shrink to fit `fit` px: tiles count a cell, signs half, the swipe one, spaces a quarter.
  const units = terms.reduce<number>((u, t) => u + (typeof t === 'number' || t === 'stud' ? 1 : Array.isArray(t) ? t.length : typeof t === 'object' ? 1 : t === 'swipe' ? 1 : 0.5), 0) + (terms.length - 1) * 0.25;
  const cell = fit ? Math.min(want, Math.floor((fit - gap) / units)) : want;
  const s = Math.round(cell * 0.5);
  const t = Math.max(2, Math.round(gap * 0.8));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Math.round(cell * 0.25) }}>
      {terms.map((term, k) => {
        const last = k === terms.length - 1 && open;
        if (typeof term === 'number' || Array.isArray(term)) {
          const vs = typeof term === 'number' ? [term] : term;
          return <Tiles key={k} vs={[vs]} cell={cell} gap={gap} empty={last} />;
        }
        // A piece of several rows (the 2×2 square) at half the cell, so it
        // stands as tall as one tile of the line.
        if (typeof term === 'object') return <Tiles key={k} vs={term.grid} cell={Math.round(cell / 2)} gap={Math.max(2, Math.round(gap / 2))} empty={last} />;
        // The sweep a chain earns: the yellow stud of the sweep key, at tile size.
        if (term === 'stud') return <StudTerm key={k} cell={cell} gap={gap} empty={last} />;
        return <Sign key={k} kind={term as Sym} s={s} t={t} color={term === 'no' ? c.tile[2] : c.text} />;
      })}
    </View>
  );
}

function Tiles({ vs, cell, gap, empty }: { vs: number[][]; cell: number; gap: number; empty: boolean }) {
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
      <Field variant="piece" w={vs[0].length} h={vs.length} values={vs.flat().map((v) => (empty ? 0 : v))} cell={cell} gap={gap} />
    </Animated.View>
  );
}

function StudTerm({ cell, gap, empty }: { cell: number; gap: number; empty: boolean }) {
  const k = useSharedValue(1);
  const was = useRef(empty);
  useEffect(() => {
    if (was.current && !empty) k.value = withSequence(withTiming(1.25, { duration: 0 }), withTiming(1, { duration: 360, easing: Easing.out(Easing.back(2.6)) }));
    was.current = empty;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empty]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: k.value }] }));
  const size = cell - gap;
  const s = Math.round(size * 0.62);
  return (
    <Animated.View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, st]}>
      <Socket size={size} style={{ position: 'absolute' }} />
      {empty ? null : (
        <View
          style={{
            width: s,
            height: s,
            borderRadius: Math.round(s * 0.28),
            backgroundColor: '#FFD43B',
            backgroundImage: 'linear-gradient(180deg, #FFE27A, #FFD43B)',
            boxShadow: `0 ${Math.max(2, Math.round(s * 0.12))}px 0 #C9A21F, inset 0 1px 0 rgba(255,255,255,0.8)`,
            transform: [{ translateY: -2 }],
          }}
        />
      )}
    </Animated.View>
  );
}

/** Signs drawn with one rounded stroke, like moulded plastic: plus, equals,
    a red cross, an arrow, the two-way swipe. */
function Sign({ kind, s, color }: { kind: Sym; s: number; t?: number; color: string }) {
  // The up-and-down swipe is the side-to-side one turned a quarter.
  if (kind === 'swipeV') return <View style={{ width: s, height: s * 2, alignItems: 'center', justifyContent: 'center' }}><View style={{ transform: [{ rotate: '90deg' }] }}><Sign kind="swipe" s={s} color={color} /></View></View>;
  const w = kind === 'swipe' ? s * 2 : s;
  const sw = Math.max(2.4, s * 0.12);
  const m = sw / 2 + 1;
  const h = s / 2;
  const a = s * 0.28; // arrowhead arm
  let d = '';
  if (kind === '+') d = `M${m} ${h}H${s - m}M${h} ${m}V${s - m}`;
  else if (kind === '=') d = `M${m} ${s * 0.32}H${s - m}M${m} ${s * 0.68}H${s - m}`;
  else if (kind === 'no') d = `M${m + 1} ${m + 1}L${s - m - 1} ${s - m - 1}M${s - m - 1} ${m + 1}L${m + 1} ${s - m - 1}`;
  else if (kind === '→') d = `M${m} ${h}H${s - m}M${s - m - a} ${h - a}L${s - m} ${h}L${s - m - a} ${h + a}`;
  else d = `M${m} ${h}H${w - m}M${m + a} ${h - a}L${m} ${h}L${m + a} ${h + a}M${w - m - a} ${h - a}L${w - m} ${h}L${w - m - a} ${h + a}`;
  return (
    <Svg width={w} height={s}>
      <Path d={d} stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}
