import { View, type ViewStyle } from 'react-native';

import { useTheme } from '@/design/theme';
import { mix, rank } from '@/design/tokens';
import { TileNum } from './TileNum';

/* The one block of the game (2026-11-08): a piece of glossy plastic. A
   rounded face, lighter at the top, standing on a ledge of its own colour
   darkened, with a thin highlight along the top edge. Blocks are always one
   size; the number is the same size in every block. */

export const RADIUS = 0.18;
/** Height of the ledge under the face, as a part of the block. */
export const LEDGE = 0.06;

/** Face gradient and ledge colour for a fill. */
export function plastic(fill: string) {
  return {
    top: mix('#FFFFFF', fill, 0.22),
    ledge: mix('#000000', fill, 0.28),
  };
}

/** The number's size in a block of this size. */
export const numSize = (size: number) => Math.max(10, Math.round(size * 0.42));

type Props = {
  v: number;
  size: number;
  /** Width when it differs from the height (never for a game block). */
  width?: number;
  /** Override the fill, e.g. a stone or a medal. */
  fill?: string;
  ink?: string;
  numbers?: boolean;
  style?: ViewStyle;
  children?: React.ReactNode;
};

/** A plastic block. `v <= 0` draws an empty socket instead. */
export function Block({ v, size, width, fill, ink, numbers = true, style, children }: Props) {
  const { c } = useTheme();
  const w = width ?? size;
  const r = Math.round(Math.min(w, size) * RADIUS);
  if (v === 0 && !fill) return <Socket size={size} width={width} style={style} />;
  const rk = rank(v);
  const f = fill ?? (v < 0 ? c.tile[10] : c.tile[rk]);
  const { top, ledge } = plastic(f);
  const lh = Math.max(2, Math.round(size * LEDGE));
  return (
    <View style={[{ width: w, height: size, borderRadius: r, backgroundColor: ledge }, style]}>
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: lh,
          borderRadius: r,
          backgroundColor: f,
          backgroundImage: `linear-gradient(180deg, ${top}, ${f})`,
          boxShadow: `inset 0 ${Math.max(1, Math.round(size * 0.03))}px 0 rgba(255,255,255,0.35)`,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}>
        {numbers && v > 0 ? <TileNum v={v} color={ink ?? c.ink[rk]} size={numSize(size)} /> : null}
        {children}
      </View>
    </View>
  );
}

/** An empty socket moulded into the plate. */
export function Socket({ size, width, style }: { size: number; width?: number; style?: ViewStyle }) {
  const { c, isDark } = useTheme();
  const w = width ?? size;
  return (
    <View
      style={[
        {
          width: w,
          height: size,
          borderRadius: Math.round(Math.min(w, size) * RADIUS),
          backgroundColor: c.canvas,
          boxShadow: `inset 0 ${Math.max(1, Math.round(size * 0.035))}px ${Math.max(2, Math.round(size * 0.055))}px rgba(0,0,0,${isDark ? 0.4 : 0.1})`,
        },
        style,
      ]}
    />
  );
}

/** The white plate the board is moulded in. */
export function plateStyle(c: ReturnType<typeof useTheme>['c'], radius = 14): ViewStyle {
  return {
    borderRadius: radius,
    backgroundColor: c.plate,
    backgroundImage: `linear-gradient(180deg, ${c.plate}, ${mix('#000000', c.plate, 0.03)})`,
    boxShadow: `0 6px 0 ${c.plateEdge}, 0 14px 24px rgba(0,0,0,0.08)`,
  };
}
