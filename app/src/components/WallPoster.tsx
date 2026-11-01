import { Text, View } from 'react-native';

import { Field } from '@/components/Field';
import { TileNum } from '@/components/TileNum';
import { Enamel } from '@/design/depth';
import { type } from '@/design/system';
import { useTheme } from '@/design/theme';
import { rank } from '@/design/tokens';
import { posterBoard, type PosterDef } from '@/game/meta';

/* A poster of the collection: its own composition of colour fields on the
   board's black, and under it a band with the feat's number, in that
   number's colour. A poster not yet earned is an empty frame. */
export function WallPoster({ p, on, width }: { p: PosterDef; on: boolean; width: number }) {
  const { c, isDark } = useTheme();
  const L = Math.max(3, Math.round(width * 0.04));
  const cell = Math.floor((width - L) / 6);
  const w = cell * 6 + L;
  const bandH = Math.round(w * 0.3);
  const rk = rank(p.v >= 3 ? Math.min(p.v, 768) : p.v);
  const fill = c.tile[rk] || c.tile[3];
  return (
    <View style={{ width: w, backgroundColor: on ? c.line : c.hair, padding: on ? 0 : 2 }}>
      {on ? (
        <>
          <Field w={6} h={6} values={posterBoard(p.seed)} cell={cell} gap={L} numbers={false} />
          <View style={{ height: bandH, marginHorizontal: L / 2, marginBottom: L / 2, backgroundColor: fill, alignItems: 'flex-end', justifyContent: 'center', paddingHorizontal: L * 2, overflow: 'hidden' }}>
            <Enamel fill={fill} size={bandH} dark={isDark} />
            <TileNum v={p.v} color={c.ink[rk] || c.text} size={Math.round(bandH * 0.5)} />
          </View>
        </>
      ) : (
        <View style={{ height: w - 4 + bandH, backgroundColor: c.canvas, alignItems: 'center', justifyContent: 'center', padding: 6 }}>
          <Text style={[type.meta, { color: c.faint, textAlign: 'center' }]} numberOfLines={3}>
            {p.secret ? '?' : p.hint}
          </Text>
        </View>
      )}
    </View>
  );
}
