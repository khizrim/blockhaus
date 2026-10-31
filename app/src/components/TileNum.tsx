import { Text, type TextStyle } from 'react-native';

import { font } from '@/design/tokens';

/* Tile numbers. Onest's "1" carries twice the right side-bearing of the other
   digits, so "12" or "24"-style pairs read as "1 2". A "1" followed by another
   digit is pulled in by 0.06 em, which evens the gap out. */
export function TileNum({ v, size, color, style }: { v: number; size: number; color: string; style?: TextStyle }) {
  const s = String(v);
  return (
    <Text allowFontScaling={false} style={[{ fontFamily: font.tile, fontSize: size, color, includeFontPadding: false }, style]}>
      {s.split('').map((d, i) =>
        d === '1' && i < s.length - 1 ? (
          <Text key={i} style={{ letterSpacing: -0.06 * size }}>
            1
          </Text>
        ) : (
          d
        ),
      )}
    </Text>
  );
}
