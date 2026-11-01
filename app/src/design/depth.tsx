import { StyleSheet, View, type ViewStyle } from 'react-native';

import { mix } from './tokens';

/* Enamel: the board's volume. Every coloured field is a slightly raised slab,
   with a light edge on top and left and a dark one on bottom and right. The
   edges are drawn only inside a field's own fill, on the sides that face a
   black line, so a field still reads as one block, cells keep their size and
   the thick lines stay where they are. Empty fields sit level with the line. */

export type Sides = { t?: boolean; r?: boolean; b?: boolean; l?: boolean };
export const ALL: Sides = { t: true, r: true, b: true, l: true };

/** Width of an enamel edge for a block of this size. */
export const edgeOf = (size: number) => Math.max(2, Math.round(size * 0.055));

/** The edge colours for a fill. */
export function enamel(fill: string, dark: boolean) {
  return {
    hi: mix('#FFFFFF', fill, dark ? 0.26 : 0.34),
    lo: mix('#000000', fill, dark ? 0.3 : 0.24),
  };
}

/**
 * Draw the enamel inside one fill box. `open` says which sides face a line.
 * `size` is the cell (or block) the edge scales with.
 */
export function Enamel({
  fill,
  open = ALL,
  size,
  empty,
  dark,
}: {
  fill: string;
  open?: Sides;
  size: number;
  /** An empty canvas field: level with the line, only a whisper of its shadow. */
  empty?: boolean;
  dark?: boolean;
}) {
  const w = edgeOf(size);
  const strip = (side: keyof Sides, color: string) => {
    const st: ViewStyle = { position: 'absolute', backgroundColor: color };
    if (side === 't') Object.assign(st, { left: 0, right: 0, top: 0, height: w });
    if (side === 'b') Object.assign(st, { left: 0, right: 0, bottom: 0, height: w });
    if (side === 'l') Object.assign(st, { top: 0, bottom: 0, left: 0, width: w });
    if (side === 'r') Object.assign(st, { top: 0, bottom: 0, right: 0, width: w });
    return <View key={side} pointerEvents="none" style={st} />;
  };
  if (empty) {
    const sh = dark ? 'rgba(0,0,0,0.25)' : 'rgba(17,18,21,0.07)';
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {open.t ? strip('t', sh) : null}
        {open.l ? strip('l', sh) : null}
      </View>
    );
  }
  const { hi, lo } = enamel(fill, !!dark);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {open.b ? strip('b', lo) : null}
      {open.r ? strip('r', lo) : null}
      {open.t ? strip('t', hi) : null}
      {open.l ? strip('l', hi) : null}
    </View>
  );
}

/** A panel on the wall (the board, the poster): a thin step under it. */
export function panelEnamel(bg: string, dark: boolean): ViewStyle {
  return { boxShadow: `0 2px 0 0 ${dark ? '#000000' : mix('#000000', bg, 0.14)}` };
}
