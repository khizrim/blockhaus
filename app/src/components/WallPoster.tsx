import { StyleSheet, View } from 'react-native';

import { Field } from '@/components/Field';
import { TileNum } from '@/components/TileNum';
import { Block, Socket } from '@/components/Block';
import { useTheme } from '@/design/theme';
import { rank } from '@/design/tokens';
import { POSTERS, WALL, posterBoard, type PosterDef } from '@/game/meta';

/** One frame of the wall: the poster's composition fitted to the frame, its
    number on a block of its colour in the corner. Empty: paper. */
export function PosterFrame({ p, on, w, h, cols, rows, picked }: { p: PosterDef; on: boolean; w: number; h: number; cols: number; rows: number; picked: boolean }) {
  const { c } = useTheme();
  const g = 4;
  const cell = Math.min((w - g) / cols, (h - g) / rows);
  const rk = rank(Math.max(1, Math.min(p.v, 768)));
  const tint = c.tile[rk] || c.tile[3];
  const tag = Math.max(30, Math.round(Math.min(w, h) * 0.42));
  const r = Math.round(Math.min(w, h) * 0.12);
  if (!on) {
    // An empty frame: a socket moulded into the wall, its number faint in the corner.
    return (
      <View style={{ flex: 1 }}>
        <Socket size={h} width={w} style={{ borderRadius: r }} />
        {picked ? <View style={[StyleSheet.absoluteFill, { borderRadius: r, borderWidth: 3, borderColor: '#356BFF' }]} /> : null}
        {p.secret ? null : (
          <View style={{ position: 'absolute', right: 8, bottom: 6 }}>
            <TileNum v={p.v} color={c.faint} size={Math.max(11, Math.round(tag * 0.42))} />
          </View>
        )}
      </View>
    );
  }
  // An earned poster: its blocks on a little plate, its number on a block of its colour.
  return (
    <View style={{ flex: 1, borderRadius: r, backgroundColor: c.canvas, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
      <Field w={cols} h={rows} values={posterBoard(p.seed, cols, rows)} cell={cell} gap={g} numbers={false} variant="piece" />
      <View style={{ position: 'absolute', right: 4, bottom: 4 }}>
        <Block v={p.v} size={Math.round(tag * 0.62)} width={Math.max(tag, Math.round(tag * 0.62))} fill={tint} ink={c.ink[rk] || c.text} />
      </View>
    </View>
  );
}

/** A poster at a given width, in the proportions of its frame on the wall. */
export function WallPoster({ p, width }: { p: PosterDef; width: number }) {
  const r = WALL.frames[POSTERS.indexOf(p)] ?? { w: 1, h: 1 };
  const h = Math.round(width * (r.h / r.w));
  return (
    <View style={{ width, height: h }}>
      <PosterFrame p={p} on w={width} h={h} cols={r.w * 2} rows={r.h * 2} picked={false} />
    </View>
  );
}
