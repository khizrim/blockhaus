import { memo, useEffect } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { enter } from '@/design/system';
import { useTheme } from '@/design/theme';
import { mix, rank } from '@/design/tokens';
import { Block, plateStyle, RADIUS, Socket } from './Block';

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
  style?: ViewStyle;
};

export const Field = memo(function Field({ w, h, values, cell, gap, variant = 'board', numbers = true, look, style }: Props) {
  const { c } = useTheme();
  const board = variant === 'board';
  const hg = gap / 2;
  const pad = board ? hg : 0;
  const size = cell - gap;
  // The plate reaches past the outer sockets by a rim wider than half a gap.
  const rim = board ? Math.max(0, Math.round(cell * 0.14) - hg) : 0;

  const cells = [];
  for (let i = 0; i < w * h; i++) {
    const v = values[i];
    if (v === null || v === undefined) continue;
    const x = i % w;
    const y = (i / w) | 0;
    cells.push(
      <Cell key={i} v={v} left={pad + x * cell + hg} top={pad + y * cell + hg} size={size} board={board} numbers={numbers} look={look?.(i)} c={c} />,
    );
  }

  return (
    <View style={[{ width: w * cell + pad * 2, height: h * cell + pad * 2 }, style]}>
      {board ? (
        <View
          pointerEvents="none"
          style={[{ position: 'absolute', left: -rim, top: -rim, right: -rim, bottom: -rim }, plateStyle(c, Math.round(cell * 0.26))]}
        />
      ) : null}
      {cells}
    </View>
  );
});

type CellProps = {
  v: number;
  left: number;
  top: number;
  size: number;
  board: boolean;
  numbers: boolean;
  look?: CellLook;
  c: ReturnType<typeof useTheme>['c'];
};

const Cell = memo(function Cell({ v, left, top, size, board, numbers, look, c }: CellProps) {
  const rk = rank(v);
  const appear = useSharedValue(look?.enterDelay !== undefined ? 0 : 1);
  const sx = useSharedValue(1);
  const sy = useSharedValue(1);
  const dy = useSharedValue(0);

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
    transform: [{ translateY: dy.value + (1 - appear.value) * size * 0.3 }, { scaleX: sx.value }, { scaleY: sy.value * (0.6 + appear.value * 0.4) }],
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
      {board ? <Socket size={size} style={box} /> : null}
      {look?.ghost ? (
        <View pointerEvents="none" style={[box, { borderRadius: r, backgroundColor: c.tile[rank(look.ghost)], opacity: 0.32 }]} />
      ) : null}
      {block ? (
        <Animated.View pointerEvents="none" style={[box, { transformOrigin: 'bottom' }, anim]}>
          {block}
        </Animated.View>
      ) : null}
    </>
  );
});
