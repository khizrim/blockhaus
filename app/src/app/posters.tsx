import { router } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { Overlay } from '@/components/Overlay';
import { PosterFrame } from '@/components/WallPoster';
import { Block, plateStyle } from '@/components/Block';
import { font } from '@/design/tokens';
import { Body, Button, Heading, Screen, TopBar } from '@/components/ui';
import { space, type } from '@/design/system';
import { useTheme } from '@/design/theme';
import { dayLabel } from '@/game/daily';
import { POSTERS, WALL, type PosterDef } from '@/game/meta';
import { shareImage } from '@/game/shareImage';
import { useGame } from '@/game/store';

/* The wall is one composition: a white plastic plate, twelve frames of different sizes set
   into it and a yellow block with the count. An earned poster fills its
   frame with its own composition and its number; an empty frame is paper
   with the number faint in its corner (a secret one shows nothing). Tap an
   empty frame to read what it wants; tap a poster to open it and send it. */
export default function Posters() {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const { posters } = useGame();
  const [open, setOpen] = useState<PosterDef | null>(null);
  const [peek, setPeek] = useState<PosterDef | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const shot = useRef<ComponentRef<typeof View>>(null);
  const col = Math.min(width, 440) - space.xl * 2;
  const L = Math.round(Math.min(7, Math.max(5, width * 0.015)));
  const u = Math.floor((col - L) / WALL.cols);
  const wallW = u * WALL.cols + L;
  const wallH = u * WALL.rows + L;
  const have = POSTERS.filter((p) => posters[p.id]).length;
  const rect = (r: { x: number; y: number; w: number; h: number }) => ({ left: L + r.x * u, top: L + r.y * u, width: r.w * u - L, height: r.h * u - L });
  const cnt = rect(WALL.count);

  const share = async (p: PosterDef) => {
    const r = await shareImage(shot, `Blockhaus: плакат «${p.title}» — ${p.hint.toLowerCase()}.`);
    setNote(r === 'copied' ? 'Скопировано' : r === 'failed' ? 'Не получилось поделиться' : null);
  };

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <TopBar title="Плакаты" onBack={() => router.back()} />
        <ScrollView contentContainerStyle={{ paddingBottom: space.xl, alignItems: 'center' }} showsVerticalScrollIndicator={false}>
          <View style={[{ width: wallW, height: wallH }, plateStyle(c, 18)]}>
            {/* the count: how many of the twelve are up */}
            <View
              accessible
              accessibilityLabel={`Плакатов на стене: ${have} из ${POSTERS.length}`}
              style={{ position: 'absolute', ...cnt }}>
              <Block v={1} size={cnt.height} width={cnt.width} fill={c.tile[3]} numbers={false}>
                <View style={{ position: 'absolute', left: space.sm, bottom: space.sm }}>
                  <Text allowFontScaling={false} style={{ fontFamily: font.wide, fontSize: Math.round(cnt.height * 0.5), lineHeight: Math.round(cnt.height * 0.58), color: c.ink[3] }}>
                    {have}
                  </Text>
                  <Text allowFontScaling={false} style={[type.secondaryStrong, { color: c.ink[3] }]}>{`из ${POSTERS.length}`}</Text>
                </View>
              </Block>
            </View>
            {POSTERS.map((p, k) => {
              const on = !!posters[p.id];
              const r = WALL.frames[k];
              const box = rect(r);
              return (
                <Animated.View key={p.id} entering={FadeIn.delay(80 + k * 45).duration(220)} style={{ position: 'absolute', ...box }}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={on ? `Плакат «${p.title}»` : p.secret ? 'Секретная рамка' : `Пустая рамка: ${p.hint}`}
                    onPress={() => {
                      setNote(null);
                      if (on) setOpen(p);
                      else setPeek(peek?.id === p.id ? null : p);
                    }}
                    style={{ flex: 1 }}>
                    <PosterFrame p={p} on={on} w={box.width} h={box.height} cols={r.w * 2} rows={r.h * 2} picked={peek?.id === p.id} />
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
          {/* What an empty frame wants, once it is tapped. A secret keeps its secret. */}
          <View style={{ width: wallW, minHeight: 48, marginTop: space.md, justifyContent: 'center' }}>
            {peek ? (
              <Animated.View key={peek.id} entering={FadeIn.duration(160)}>
                <Text style={[type.secondaryStrong, { color: c.text }]}>{peek.secret ? 'Секрет' : peek.title}</Text>
                <Text style={[type.secondary, { color: c.muted }]}>{peek.secret ? 'Найдётся в игре' : peek.hint}</Text>
              </Animated.View>
            ) : null}
          </View>
        </ScrollView>
      </Screen>

      {open ? (
        <View style={StyleSheet.absoluteFill}>
          <Overlay onDismiss={() => setOpen(null)}>
            <Animated.View entering={ZoomIn.duration(240)}>
              {/* The picture that is sent: the poster and its caption on paper. */}
              <View ref={shot} collapsable={false} style={{ backgroundColor: c.bg, padding: space.lg, gap: space.md, alignItems: 'center' }}>
                {(() => {
                  // The same frame as on the wall, only larger.
                  const r = WALL.frames[POSTERS.indexOf(open)];
                  const fw = Math.min(r.w >= r.h ? 280 : 200, width - space.xl * 4);
                  const fh = Math.min(fw * (r.h / r.w), 320);
                  return (
                    <View style={[{ width: fw, height: fh, padding: L }, plateStyle(c, 16)]}>
                      <PosterFrame p={open} on w={fw - L * 2} h={fh - L * 2} cols={r.w * 2} rows={r.h * 2} picked={false} />
                    </View>
                  );
                })()}
                <Heading level="heading">{open.title}</Heading>
                <Body muted small style={{ textAlign: 'center' }}>
                  {open.hint} · {dayLabel(posters[open.id])}
                </Body>
                <Text style={[type.meta, { color: c.faint }]}>blockhaus</Text>
              </View>
            </Animated.View>
            <View style={{ width: '100%', gap: space.md, marginTop: space.lg }}>
              {note ? <Body muted small style={{ textAlign: 'center' }}>{note}</Body> : null}
              <Button kind="primary" label="Поделиться" onPress={() => share(open)} />
              <Button label="Закрыть" onPress={() => setOpen(null)} />
            </View>
          </Overlay>
        </View>
      ) : null}
    </View>
  );
}
