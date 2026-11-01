import { StyleSheet, View } from 'react-native';

import { Field } from '@/components/Field';
import { TileNum } from '@/components/TileNum';
import { Enamel } from '@/design/depth';
import { useTheme } from '@/design/theme';
import { rank } from '@/design/tokens';
import { POSTERS, WALL, posterBoard, type PosterDef } from '@/game/meta';

/** One frame of the wall: the poster's composition fitted to the frame, its
    number on a block of its colour in the corner. Empty: paper. */
export function PosterFrame({ p, on, w, h, cols, rows, picked }: { p: PosterDef; on: boolean; w: number; h: number; cols: number; rows: number; picked: boolean }) {
  const { c, isDark } = useTheme();
  const g = 4;
  const cell = Math.min((w - g) / cols, (h - g) / rows);
  const rk = rank(Math.max(1, Math.min(p.v, 768)));
  const tint = c.tile[rk] || c.tile[3];
  const tag = Math.max(30, Math.round(Math.min(w, h) * 0.42));
  if (!on) {
    return (
      <View style={{ flex: 1, backgroundColor: c.canvas, overflow: 'hidden' }}>
        <Enamel fill={c.canvas} size={Math.min(w, h)} empty dark={isDark} />
        {picked ? <View style={[StyleSheet.absoluteFill, { borderWidth: 3, borderColor: c.tile[3] }]} /> : null}
        {p.secret ? null : (
          <View style={{ position: 'absolute', right: 6, bottom: 4 }}>
            <TileNum v={p.v} color={c.faint} size={Math.max(11, Math.round(tag * 0.42))} />
          </View>
        )}
      </View>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: c.line, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
      <Field w={cols} h={rows} values={posterBoard(p.seed, cols, rows)} cell={cell} gap={g} numbers={false} />
      <View style={{ position: 'absolute', right: 0, bottom: 0, minWidth: tag, height: tag * 0.62, paddingHorizontal: 6, borderTopWidth: g, borderLeftWidth: g, borderColor: c.line, backgroundColor: tint, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <Enamel fill={tint} size={tag} dark={isDark} />
        <TileNum v={p.v} color={c.ink[rk] || c.text} size={Math.max(11, Math.round(tag * 0.34))} />
      </View>
    </View>
  );
}

/** A poster at a given width, in the proportions of its frame on the wall. */
export function WallPoster({ p, width }: { p: PosterDef; width: number }) {
  const { c } = useTheme();
  const r = WALL.frames[POSTERS.indexOf(p)] ?? { w: 1, h: 1 };
  const h = Math.round(width * (r.h / r.w));
  return (
    <View style={{ width, height: h, padding: 2, backgroundColor: c.line }}>
      <PosterFrame p={p} on w={width - 4} h={h - 4} cols={r.w * 2} rows={r.h * 2} picked={false} />
    </View>
  );
}
