import { Text, type TextStyle } from 'react-native';

import { font } from '@/design/tokens';

/* Tile numbers: Rubik 700 at one size for every value. Longer numbers are
   set tighter instead of smaller (-0.02 em for two digits, -0.05 em for
   three), and the tracking cut from the last digit is paid back on the
   right so the number stays centred. */
export function TileNum({ v, size, color, style }: { v: number | string; size: number; color: string; style?: TextStyle }) {
  const s = String(v);
  const digits = s.replace(/\D/g, '').length;
  const track = digits >= 3 ? -0.05 : digits === 2 ? -0.02 : 0;
  return (
    <Text
      allowFontScaling={false}
      selectable={false}
      style={[
        {
          fontFamily: font.tile,
          fontSize: size,
          color,
          includeFontPadding: false,
          userSelect: 'none',
          letterSpacing: track * size,
          paddingRight: -track * size,
        },
        style,
      ]}>
      {s}
    </Text>
  );
}
