import { useEffect, useState, type ReactNode } from 'react';
import { Text, useWindowDimensions, View, type ViewStyle } from 'react-native';

import { Field } from '@/components/Field';
import { Enamel, panelEnamel } from '@/design/depth';
import { space, useCalm } from '@/design/system';
import { useTheme } from '@/design/theme';
import { font } from '@/design/tokens';

/* The result posters (game over, the win), built like the menu's: a black
   ground whose gaps are the lines, blocks set into it. The final board
   takes the big field on the left; a column of blocks stands beside it;
   bands run full width below. */

/** The poster's measures: as wide as the dialog, lines of the board's weight. */
export function usePoster() {
  const { width } = useWindowDimensions();
  const W = Math.min(width - space.lg * 2, 360);
  const L = Math.round(Math.min(7, Math.max(5, width * 0.015)));
  const inner = W - L * 2;
  const cell = Math.floor((inner * 0.64 - L) / 6);
  const board = cell * 6;
  const side = inner - board - L;
  return { W, L, inner, cell, board, side };
}

export function Poster({ label, children }: { label: string; children: ReactNode }) {
  const { c, isDark } = useTheme();
  const { W, L } = usePoster();
  return (
    <View accessible accessibilityLabel={label} style={[{ width: W, padding: L, gap: L, backgroundColor: c.line }, panelEnamel(c.bg, isDark)]}>
      {children}
    </View>
  );
}

/** One block of the poster: paper, or a colour with its enamel. */
export function Block({ fill, style, children }: { fill?: string; style?: ViewStyle; children?: ReactNode }) {
  const { c, isDark } = useTheme();
  const { side } = usePoster();
  const f = fill ?? c.canvas;
  return (
    <View style={[{ backgroundColor: f }, style]}>
      {f === c.canvas ? null : <Enamel fill={f} size={side} dark={isDark} />}
      {children}
    </View>
  );
}

/** The final board in the big field, its own frame folded into the poster's lines. */
export function PosterBoard({ values }: { values: number[] }) {
  const { L, cell, board } = usePoster();
  return (
    <View style={{ width: board, height: board, overflow: 'hidden' }}>
      <Field w={6} h={6} values={values} cell={cell} gap={L} numbers={false} style={{ margin: -L / 2 }} />
    </View>
  );
}

/** The score band: the number in the wordmark's face, counting up once.
    `fill` puts it on a colour (yellow for a record); `aside` sits at the right. */
export function ScoreBand({ value, fill, ink, aside }: { value: number; fill?: string; ink?: string; aside?: ReactNode }) {
  const { c } = useTheme();
  const calm = useCalm();
  const [shown, setShown] = useState(calm ? value : 0);
  useEffect(() => {
    if (calm) return setShown(value);
    const t0 = Date.now();
    const id = setInterval(() => {
      const k = Math.min(1, (Date.now() - t0) / 600);
      setShown(Math.round(value * (1 - Math.pow(1 - k, 3))));
      if (k === 1) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [value, calm]);
  return (
    <Block fill={fill} style={{ paddingHorizontal: space.lg, paddingVertical: space.sm, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
      <Text allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit style={{ flexShrink: 1, fontFamily: font.wide, fontSize: 48, lineHeight: 60, color: ink ?? c.text, fontVariant: ['tabular-nums'] }}>
        {shown.toLocaleString('ru-RU')}
      </Text>
      {aside}
    </Block>
  );
}
