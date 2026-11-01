import { useId } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { mix } from './tokens';

/* Prototype: three ways to give the flat Mondrian board some volume. Each one
   only draws inside a field's own fill, on the sides that face a black line,
   so a field still reads as one block, cells keep their size and the thick
   lines stay where they are.

   flat:   the board as it ships.
   relief: enamel. A light edge on top and left, a dark one on bottom and
           right: every field is a slightly raised slab. Empty fields sit level.
   paper:  cut paper. The black grid is a sheet laid over the colours, so it
           casts a soft shadow into every field from above and the left; the
           board itself hangs off the wall on a soft shadow.
   block:  toy blocks. Each field shows its front face under it, a darker band
           of its own colour; the board stands on the wall with a hard step. */

export type DepthKind = 'flat' | 'relief' | 'paper' | 'block';

export const DEPTHS: { value: DepthKind; label: string }[] = [
  { value: 'flat', label: 'Плоско' },
  { value: 'relief', label: 'Эмаль' },
  { value: 'paper', label: 'Бумага' },
  { value: 'block', label: 'Кубики' },
];

type Sides = { t?: boolean; r?: boolean; b?: boolean; l?: boolean };

/** The front face of a block, as a share of a cell. */
export const faceOf = (kind: DepthKind, cell: number) => (kind === 'block' ? Math.max(3, Math.round(cell * 0.1)) : 0);

/**
 * Draw the volume inside one fill box. `open` says which sides face a line
 * (true = exposed). `size` is the cell (or block) the effect scales with.
 */
export function Depth({
  kind,
  fill,
  open,
  size,
  empty,
  dark,
}: {
  kind: DepthKind;
  fill: string;
  open: Sides;
  size: number;
  /** An empty canvas field: the floor, not a block. */
  empty?: boolean;
  dark?: boolean;
}) {
  if (kind === 'flat') return null;
  const strip = (side: keyof Sides, w: number, color: string, key: string) => {
    const st: ViewStyle = { position: 'absolute', backgroundColor: color };
    if (side === 't') Object.assign(st, { left: 0, right: 0, top: 0, height: w });
    if (side === 'b') Object.assign(st, { left: 0, right: 0, bottom: 0, height: w });
    if (side === 'l') Object.assign(st, { top: 0, bottom: 0, left: 0, width: w });
    if (side === 'r') Object.assign(st, { top: 0, bottom: 0, right: 0, width: w });
    return <View key={key} pointerEvents="none" style={st} />;
  };

  if (kind === 'relief') {
    const w = Math.max(2, Math.round(size * 0.055));
    if (empty) {
      // Level with the line: just a whisper of the line's own shadow on top.
      return (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {open.t ? strip('t', w, dark ? 'rgba(0,0,0,0.25)' : 'rgba(17,18,21,0.07)', 't') : null}
          {open.l ? strip('l', w, dark ? 'rgba(0,0,0,0.25)' : 'rgba(17,18,21,0.07)', 'l') : null}
        </View>
      );
    }
    const hi = mix('#FFFFFF', fill, dark ? 0.26 : 0.34);
    const lo = mix('#000000', fill, dark ? 0.3 : 0.24);
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {open.b ? strip('b', w, lo, 'b') : null}
        {open.r ? strip('r', w, lo, 'r') : null}
        {open.t ? strip('t', w, hi, 't') : null}
        {open.l ? strip('l', w, hi, 'l') : null}
      </View>
    );
  }

  if (kind === 'paper') {
    const w = Math.max(4, Math.round(size * 0.2));
    const a = empty ? (dark ? 0.55 : 0.2) : dark ? 0.6 : 0.42;
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {open.t ? <Fade side="t" w={w} a={a} /> : null}
        {open.l ? <Fade side="l" w={w} a={a} /> : null}
      </View>
    );
  }

  // block
  const f = faceOf(kind, size);
  if (empty) {
    // The floor: the blocks and the line above it throw a short shade.
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {open.t ? <Fade side="t" w={Math.round(f * 1.6)} a={dark ? 0.4 : 0.12} /> : null}
      </View>
    );
  }
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {open.t ? strip('t', Math.max(1, Math.round(f * 0.3)), mix('#FFFFFF', fill, 0.3), 't') : null}
      {open.b ? strip('b', f, mix('#000000', fill, dark ? 0.38 : 0.3), 'b') : null}
    </View>
  );
}

/** A soft shadow strip that fades away from one edge. */
function Fade({ side, w, a }: { side: 't' | 'l'; w: number; a: number }) {
  const id = 'f' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const vertical = side === 't';
  const st: ViewStyle = vertical
    ? { position: 'absolute', left: 0, right: 0, top: 0, height: w }
    : { position: 'absolute', top: 0, bottom: 0, left: 0, width: w };
  return (
    <View pointerEvents="none" style={st}>
    <Svg width="100%" height="100%">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2={vertical ? '0' : '1'} y2={vertical ? '1' : '0'}>
          <Stop offset="0" stopColor="#000000" stopOpacity={a} />
          <Stop offset="0.45" stopColor="#000000" stopOpacity={a * 0.35} />
          <Stop offset="1" stopColor="#000000" stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
    </View>
  );
}

/** What the whole panel does on the wall: the board, the poster, a card. */
export function panelDepth(kind: DepthKind, bg: string, dark: boolean, unit: number): ViewStyle {
  if (kind === 'paper') {
    return {
      boxShadow: dark
        ? `0 ${Math.round(unit * 1.2)}px ${Math.round(unit * 3)}px rgba(0,0,0,0.55)`
        : `0 ${Math.round(unit * 1.2)}px ${Math.round(unit * 3)}px rgba(17,18,21,0.18), 0 1px 2px rgba(17,18,21,0.12)`,
    };
  }
  if (kind === 'block') {
    // A hard step under the panel, in the wall's own shade: it stands on it.
    const step = Math.max(3, Math.round(unit * 0.9));
    return { boxShadow: `0 ${step}px 0 0 ${dark ? '#000000' : mix('#000000', bg, 0.22)}` };
  }
  if (kind === 'relief') {
    return { boxShadow: `0 2px 0 0 ${dark ? '#000000' : mix('#000000', bg, 0.14)}` };
  }
  return {};
}
