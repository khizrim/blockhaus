import { memo, useEffect } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { enter, layer } from '@/design/system';
import { useTheme } from '@/design/theme';
import { mix, rank } from '@/design/tokens';
import { Block, numSize, plateStyle, RADIUS, Socket } from './Block';
import { TileNum } from './TileNum';

/* The one drawing used everywhere: the board, pieces in the tray, the held
   piece. Plastic blocks (2026-11-08): the board is a white plate with a
   sunken socket in every cell; a tile is a glossy block sitting in its
   socket. A piece is the same blocks with no plate. Every block is one size,
   the cell minus the gap. */

export type CellLook = {
  /** Not a partner of the held piece: faded toward the socket. */
  dim?: boolean;
  /** Where a held piece would land: its silhouette in the socket. */
  ghost?: number;
  /** About to be absorbed by a merge. */
  absorb?: boolean;
  /** Bumped to replay the merge squash on this cell. */
  pop?: number;
  /** Bumped to replay the landing drop on this cell. */
  land?: number;
  /** Draw as a flat dark silhouette (drop shadows). */
  shadow?: boolean;
  /** Delay for the first appearance, for staggered intros. */
  enterDelay?: number;
  /** Leaning toward (or away from) a held piece, in parts of a cell. */
  lean?: [number, number];
};

type Props = {
  w: number;
  h: number;
  /** Row-major. null: no cell (transparent), 0: empty socket, >0: a tile, <0: a stone. */
  values: (number | null)[];
  cell: number;
  gap: number;
  /** 'board': on the plate, every cell a socket. 'piece': blocks only. */
  variant?: 'board' | 'piece';
  numbers?: boolean;
  look?: (i: number) => CellLook | undefined;
  /** Kept for callers; blocks are always drawn one by one. */
  sameKey?: (i: number) => number | null;
  /** The part of a board that is a plate, [x0, y0, x1, y1] in cells, inclusive
      (the lessons' growing board). The plate grows to a new size in a step. */
  open?: [number, number, number, number];
  style?: ViewStyle;
};

export const Field = memo(function Field({ w, h, values, cell, gap, variant = 'board', numbers = true, look, open, style }: Props) {
  const { c } = useTheme();
  const board = variant === 'board';
  const hg = gap / 2;
  const pad = board ? hg : 0;
  const size = cell - gap;
  // The plate reaches past the outer sockets by a rim wider than half a gap.
  const rim = board ? Math.max(0, Math.round(cell * 0.14) - hg) : 0;

  /* The plate and the sockets are one still layer under everything that
     moves (see `layer`): drawn first, so a block that squashes or lifts
     past its cell is never covered by the next cell's socket. */
  const sockets = [];
  const cells = [];
  for (let i = 0; i < w * h; i++) {
    const v = values[i];
    if (v === null || v === undefined) continue;
    const x = i % w;
    const y = (i / w) | 0;
    const left = pad + x * cell + hg;
    const top = pad + y * cell + hg;
    const lk = look?.(i);
    if (board || v === 0) sockets.push(<SocketCell key={i} left={left} top={top} size={size} enterDelay={lk?.enterDelay} />);
    cells.push(<Cell key={i} v={v} left={left} top={top} size={size} numbers={numbers} look={lk} c={c} />);
  }

  return (
    <View style={[{ width: w * cell + pad * 2, height: h * cell + pad * 2 }, style]}>
      {board || sockets.length ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, board ? layer : null]}>
          {board ? <Plate open={open ?? [0, 0, w - 1, h - 1]} cell={cell} pad={pad} rim={rim} c={c} /> : null}
          {sockets}
        </View>
      ) : null}
      {cells}
    </View>
  );
});

/* The plate under the sockets. When its size changes it grows ring by ring
   the way a toy baseplate unfolds: quick, with a small overshoot, while the
   new sockets come up through it (their cells mount with the plate). */
function Plate({ open, cell, pad, rim, c }: { open: [number, number, number, number]; cell: number; pad: number; rim: number; c: ReturnType<typeof useTheme>['c'] }) {
  const box = (o: typeof open) => ({ l: o[0] * cell - rim, t: o[1] * cell - rim, w: (o[2] - o[0] + 1) * cell + pad * 2 + rim * 2, h: (o[3] - o[1] + 1) * cell + pad * 2 + rim * 2 });
  const b = box(open);
  const l = useSharedValue(b.l);
  const t = useSharedValue(b.t);
  const pw = useSharedValue(b.w);
  const ph = useSharedValue(b.h);
  useEffect(() => {
    const go = { duration: 300, easing: Easing.out(Easing.back(1.4)) };
    l.value = withTiming(b.l, go);
    t.value = withTiming(b.t, go);
    pw.value = withTiming(b.w, go);
    ph.value = withTiming(b.h, go);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b.l, b.t, b.w, b.h]);
  const st = useAnimatedStyle(() => ({ left: l.value, top: t.value, width: pw.value, height: ph.value }));
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute' }, plateStyle(c, Math.round(cell * 0.26)), st]} />;
}

/* A socket that opens with a growing plate sinks in as the plate reaches it;
   every other socket simply is there. Memoised on its place alone, so the
   still layer is not redrawn while the game re-renders around it. */
const SocketCell = memo(function SocketCell({ left, top, size, enterDelay }: { left: number; top: number; size: number; enterDelay?: number }) {
  const appear = useSharedValue(enterDelay !== undefined ? 0 : 1);
  useEffect(() => {
    if (enterDelay !== undefined) appear.value = withDelay(enterDelay, withTiming(1, enter()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const sockIn = useAnimatedStyle(() => ({ opacity: appear.value, transform: [{ scale: 0.6 + appear.value * 0.4 }] }));
  const box: ViewStyle = { position: 'absolute', left, top, width: size, height: size };
  if (enterDelay === undefined) return <Socket size={size} style={box} />;
  return (
    <Animated.View pointerEvents="none" style={[box, sockIn]}>
      <Socket size={size} />
    </Animated.View>
  );
});

/* The game hands every cell a fresh look object on each render; compare
   what is in it, so a held piece moving over the board re-renders only the
   cells whose look changed, not all 36. */
const sameLook = (a?: CellLook, b?: CellLook) =>
  a === b ||
  (!!a && !!b &&
    a.dim === b.dim && a.ghost === b.ghost && a.absorb === b.absorb && a.pop === b.pop && a.land === b.land &&
    a.shadow === b.shadow && a.enterDelay === b.enterDelay &&
    (a.lean?.[0] ?? 0) === (b.lean?.[0] ?? 0) && (a.lean?.[1] ?? 0) === (b.lean?.[1] ?? 0));
const sameCell = (a: CellProps, b: CellProps) =>
  a.v === b.v && a.left === b.left && a.top === b.top && a.size === b.size && a.numbers === b.numbers && a.c === b.c && sameLook(a.look, b.look);

type CellProps = {
  v: number;
  left: number;
  top: number;
  size: number;
  numbers: boolean;
  look?: CellLook;
  c: ReturnType<typeof useTheme>['c'];
};

const Cell = memo(function Cell({ v, left, top, size, numbers, look, c }: CellProps) {
  const rk = rank(v);
  const appear = useSharedValue(look?.enterDelay !== undefined ? 0 : 1);
  const sx = useSharedValue(1);
  const sy = useSharedValue(1);
  const dy = useSharedValue(0);
  const lx = useSharedValue(0);
  const ly = useSharedValue(0);
  const leanX = look?.lean?.[0] ?? 0;
  const leanY = look?.lean?.[1] ?? 0;
  useEffect(() => {
    lx.value = withTiming(leanX * size, { duration: 120, easing: Easing.out(Easing.quad) });
    ly.value = withTiming(leanY * size, { duration: 120, easing: Easing.out(Easing.quad) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leanX, leanY]);

  useEffect(() => {
    if (look?.enterDelay !== undefined) appear.value = withDelay(look.enterDelay, withTiming(1, enter()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* A merge: the block that stays takes the hit, squashes 8% and overshoots
     3% on the way back. Timed with the note and the haptic. */
  useEffect(() => {
    if (!look?.pop) return;
    const out = { duration: 70, easing: Easing.out(Easing.quad) };
    const back = { duration: 150, easing: Easing.out(Easing.cubic) };
    sx.value = withSequence(withTiming(1.08, out), withTiming(0.98, back), withTiming(1, back));
    sy.value = withSequence(withTiming(0.92, out), withTiming(1.03, back), withTiming(1, back));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [look?.pop]);

  /* A landing: a short fall, then a 6% squash against the socket. */
  useEffect(() => {
    if (!look?.land) return;
    dy.value = withSequence(withTiming(-size * 0.12, { duration: 0 }), withTiming(0, { duration: 60, easing: Easing.in(Easing.quad) }));
    sx.value = withSequence(withTiming(1, { duration: 60 }), withTiming(1.06, { duration: 50 }), withTiming(1, { duration: 140, easing: Easing.out(Easing.cubic) }));
    sy.value = withSequence(withTiming(1, { duration: 60 }), withTiming(0.94, { duration: 50 }), withTiming(1, { duration: 140, easing: Easing.out(Easing.cubic) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [look?.land]);

  const anim = useAnimatedStyle(() => ({
    opacity: Math.min(1, appear.value * 1.5),
    transform: [{ translateX: lx.value }, { translateY: dy.value + ly.value + (1 - appear.value) * size * 0.3 }, { scaleX: sx.value }, { scaleY: sy.value * (0.6 + appear.value * 0.4) }],
  }));

  const box: ViewStyle = { position: 'absolute', left, top, width: size, height: size };
  const r = Math.round(size * RADIUS);
  let block: React.ReactNode = null;
  if (look?.shadow) {
    block = <View style={{ width: size, height: size, borderRadius: r, backgroundColor: 'rgba(0,0,0,0.16)' }} />;
  } else if (v !== 0) {
    const dim = look?.dim && v > 0;
    block = (
      <Block
        v={v}
        size={size}
        numbers={numbers}
        fill={dim ? mix(c.tile[rk], c.canvas, 0.3) : undefined}
        ink={dim ? c.faint : undefined}
        style={look?.absorb ? { opacity: 0.85 } : undefined}
      />
    );
  }

  return (
    <>
      {/* Where a held piece will land, and what it will make: the socket
          itself lights up in the tile's colour, a ring and the number, so it
          never reads as a block already standing there. */}
      {look?.ghost ? (
        <View
          pointerEvents="none"
          style={[
            box,
            {
              borderRadius: r,
              borderWidth: Math.max(2, Math.round(size * 0.06)),
              borderColor: c.tile[rank(look.ghost)],
              backgroundColor: mix(c.tile[rank(look.ghost)], c.canvas, 0.12),
              alignItems: 'center',
              justifyContent: 'center',
            },
          ]}>
          {numbers && look.ghost > 0 ? <TileNum v={look.ghost} size={numSize(size)} color={c.tile[rank(look.ghost)]} /> : null}
        </View>
      ) : null}
      {block ? (
        <Animated.View pointerEvents="none" style={[box, { transformOrigin: 'bottom' }, anim]}>
          {block}
        </Animated.View>
      ) : null}
    </>
  );
}, sameCell);
