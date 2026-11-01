import { memo, useEffect, useId } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';

import { Enamel, panelEnamel } from '@/design/depth';
import { dur, enter } from '@/design/system';
import { useTheme } from '@/design/theme';
import { font, mix, rank } from '@/design/tokens';
import { TileNum } from './TileNum';

/* The one drawing used everywhere: the board, pieces in the tray, the logo,
   tutorial diagrams. Tiles of one value that touch read as one field. Each
   cell is drawn inset from its own square on the sides that face another
   field, and flush on sides that continue its own, where a thin fold is drawn
   instead. */

export type CellLook = {
  /** Faded into the canvas: not a partner of the held piece. */
  dim?: boolean;
  /** Where a held piece would land, hatched in its colour. */
  ghost?: number;
  /** About to be absorbed by a merge: canvas frame inside. */
  absorb?: boolean;
  /** Bumped to replay the merge pop on this cell. */
  pop?: number;
  /** Bumped to replay the landing drop on this cell. */
  land?: number;
  /** Draw as a flat silhouette in the line colour (drop shadows). */
  shadow?: boolean;
  /** Delay for the first appearance, for staggered intros. */
  enterDelay?: number;
};

type Props = {
  w: number;
  h: number;
  /** Row-major. null: no cell (transparent), 0: empty canvas, >0: a tile. */
  values: (number | null)[];
  cell: number;
  gap: number;
  /** 'board': framed panel, half gaps between fields. 'piece': each cell carries
      the full line on its outer edges, no frame. */
  variant?: 'board' | 'piece';
  numbers?: boolean;
  look?: (i: number) => CellLook | undefined;
  /** Group fields by this instead of the value, e.g. to treat every tile as its own field. */
  sameKey?: (i: number) => number | null;
  style?: ViewStyle;
};

export const Field = memo(function Field({
  w,
  h,
  values,
  cell,
  gap,
  variant = 'board',
  numbers = true,
  look,
  sameKey,
  style,
}: Props) {
  const { c, isDark } = useTheme();
  const board = variant === 'board';
  const hg = board ? gap / 2 : gap;
  const pad = board ? hg : 0;
  const key = sameKey ?? ((i: number) => values[i]);

  const cells = [];
  for (let i = 0; i < w * h; i++) {
    const v = values[i];
    if (v === null || v === undefined) continue;
    const x = i % w;
    const y = (i / w) | 0;
    const same = (dx: number, dy: number) => {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) return false;
      const k = key(ny * w + nx);
      return k !== null && k !== undefined && k === key(i);
    };
    cells.push(
      <Cell
        key={i}
        v={v}
        x={x}
        y={y}
        cell={cell}
        hg={hg}
        pad={pad}
        board={board}
        numbers={numbers}
        t={same(0, -1)}
        r={same(1, 0)}
        b={same(0, 1)}
        l={same(-1, 0)}
        tl={same(-1, -1)}
        tr={same(1, -1)}
        bl={same(-1, 1)}
        br={same(1, 1)}
        look={look?.(i)}
        gap={gap}
        palette={c}
        dark={isDark}
      />,
    );
  }

  return (
    <View
      style={[
        {
          width: w * cell + pad * 2,
          height: h * cell + pad * 2,
          backgroundColor: board ? c.line : 'transparent',
        },
        board ? panelEnamel(c.bg, isDark) : null,
        style,
      ]}>
      {cells}
    </View>
  );
});

type CellProps = {
  v: number;
  x: number;
  y: number;
  cell: number;
  hg: number;
  pad: number;
  gap: number;
  board: boolean;
  numbers: boolean;
  t: boolean;
  r: boolean;
  b: boolean;
  l: boolean;
  tl: boolean;
  tr: boolean;
  bl: boolean;
  br: boolean;
  look?: CellLook;
  palette: ReturnType<typeof useTheme>['c'];
  dark: boolean;
};

const Cell = memo(function Cell(p: CellProps) {
  const { v, cell, hg, palette: c, look } = p;
  const rk = rank(v);
  const scale = useSharedValue(look?.enterDelay !== undefined ? 0 : 1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (look?.enterDelay !== undefined) {
      scale.value = withDelay(look.enterDelay, withTiming(1, enter()));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Feedback without shrinking the tile: the fill never moves, so the board's
     lines never show through. A merge flashes the tile and kicks its number
     up; a landing flashes softer and drops the number into place. Timed to
     land with the sound and the haptic of the same event. */
  const flash = useSharedValue(0);
  const num = useSharedValue(1);
  const drop = useSharedValue(0);
  const kick = { duration: 280, easing: Easing.out(Easing.back(2.2)) };

  useEffect(() => {
    if (!look?.pop) return;
    flash.value = withSequence(withTiming(0.6, { duration: 0 }), withTiming(0, { duration: 320, easing: Easing.out(Easing.quad) }));
    num.value = withSequence(withTiming(1.55, { duration: 0 }), withTiming(1, kick));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [look?.pop]);

  useEffect(() => {
    if (!look?.land) return;
    flash.value = withSequence(withTiming(0.35, { duration: 0 }), withTiming(0, { duration: 240, easing: Easing.out(Easing.quad) }));
    drop.value = withSequence(withTiming(-0.18, { duration: 0 }), withTiming(0, kick));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [look?.land]);

  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: opacity.value }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));
  const numStyle = useAnimatedStyle(() => ({ transform: [{ translateY: drop.value * cell }, { scale: num.value }] }));

  let fill = v > 0 ? c.tile[rk] : c.canvas;
  let ink = v > 0 ? c.ink[rk] : 'transparent';
  if (look?.shadow) {
    fill = c.line;
    ink = 'transparent';
  }
  if (look?.dim && v > 0) {
    fill = mix(c.tile[rk], c.canvas, 0.22);
    ink = c.faint;
  }

  const inset = (same: boolean) => (same ? 0 : hg);
  const long = v >= 100;
  const corner = (pos: ViewStyle) => (
    <View pointerEvents="none" style={[{ position: 'absolute', width: hg, height: hg, backgroundColor: c.line }, pos]} />
  );

  return (
    <View
      style={{
        position: 'absolute',
        left: p.pad + p.x * cell,
        top: p.pad + p.y * cell,
        width: cell,
        height: cell,
        backgroundColor: p.board ? undefined : c.line,
      }}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: inset(p.t),
            right: inset(p.r),
            bottom: inset(p.b),
            left: inset(p.l),
            backgroundColor: fill,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          },
          anim,
        ]}>
        {look?.ghost ? <Hatch color={c.tile[rank(look.ghost)]} base={c.canvas} /> : null}
        {/* Folds on the left and top edge only, so two cells never double one up. */}
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              borderLeftWidth: p.l ? 1 : 0,
              borderTopWidth: p.t ? 1 : 0,
              borderColor: c.fold,
            },
          ]}
        />
        {!look?.shadow && !look?.ghost ? (
          <Enamel fill={fill} open={{ t: !p.t, r: !p.r, b: !p.b, l: !p.l }} size={cell} empty={v <= 0} dark={p.dark} />
        ) : null}
        {look?.absorb ? (
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { borderWidth: p.gap, borderColor: c.canvas }]}>
            <View style={[StyleSheet.absoluteFill, { borderWidth: 2, borderColor: c.line }]} />
          </View>
        ) : null}
        {v > 0 ? <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF' }, flashStyle]} /> : null}
        {p.numbers && v > 0 ? (
          <Animated.View style={numStyle}>
            <TileNum v={v} color={ink} size={Math.max(12, Math.round(cell * (long ? 0.28 : v >= 10 ? 0.34 : 0.4)))} />
          </Animated.View>
        ) : null}
        {/* Where two lines meet at an inside corner of a field, the joint square
            belongs to the line, or the line steps sideways there. */}
        {p.t && p.l && !p.tl ? corner({ left: 0, top: 0 }) : null}
        {p.t && p.r && !p.tr ? corner({ right: 0, top: 0 }) : null}
        {p.b && p.l && !p.bl ? corner({ left: 0, bottom: 0 }) : null}
        {p.b && p.r && !p.br ? corner({ right: 0, bottom: 0 }) : null}
      </Animated.View>
    </View>
  );
});

function Hatch({ color, base }: { color: string; base: string }) {
  const id = 'h' + useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <Pattern id={id} width={10} height={10} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <Rect width={10} height={10} fill={mix(color, base, 0.45)} />
          <Rect width={5} height={10} fill={color} />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}
