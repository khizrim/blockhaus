import { router } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { Overlay } from '@/components/Overlay';
import { WallPoster } from '@/components/WallPoster';
import { Body, Button, Heading, Screen, TopBar } from '@/components/ui';
import { space, type } from '@/design/system';
import { useTheme } from '@/design/theme';
import { dayLabel } from '@/game/daily';
import { POSTERS, type PosterDef } from '@/game/meta';
import { shareImage } from '@/game/shareImage';
import { useGame } from '@/game/store';

/* The wall: twelve frames, three to a row. An earned poster hangs in its
   frame; an empty frame says what it wants, or only «?» for a secret one.
   A poster opens large and can be sent as a picture. */
export default function Posters() {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const { posters } = useGame();
  const [open, setOpen] = useState<PosterDef | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const shot = useRef<ComponentRef<typeof View>>(null);
  const col = Math.min(width, 440) - space.xl * 2;
  const w = Math.floor((col - space.md * 2) / 3);
  const have = POSTERS.filter((p) => posters[p.id]).length;

  const share = async (p: PosterDef) => {
    const r = await shareImage(shot, `Blockhaus: плакат «${p.title}» — ${p.hint.toLowerCase()}.`);
    setNote(r === 'copied' ? 'Скопировано' : r === 'failed' ? 'Не получилось поделиться' : null);
  };

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <TopBar title={`Плакаты ${have} из ${POSTERS.length}`} onBack={() => router.back()} />
        <ScrollView contentContainerStyle={{ paddingBottom: space.xl }} showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
            {POSTERS.map((p, k) => {
              const on = !!posters[p.id];
              return (
                <Animated.View key={p.id} entering={FadeIn.delay(k * 40)}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={on ? `Плакат «${p.title}»` : p.secret ? 'Секретный плакат' : `Пустая рамка: ${p.hint}`}
                    disabled={!on}
                    onPress={() => {
                      setNote(null);
                      setOpen(p);
                    }}
                    style={{ width: w, gap: space.xs }}>
                    <WallPoster p={p} on={on} width={w} />
                    <Text numberOfLines={1} style={[type.secondaryStrong, { color: on ? c.text : c.faint }]}>
                      {on || !p.secret ? p.title : '?'}
                    </Text>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        </ScrollView>
      </Screen>

      {open ? (
        <View style={StyleSheet.absoluteFill}>
          <Overlay onDismiss={() => setOpen(null)}>
            <Animated.View entering={ZoomIn.duration(240)}>
              {/* The picture that is sent: the poster and its caption on paper. */}
              <View ref={shot} collapsable={false} style={{ backgroundColor: c.bg, padding: space.lg, gap: space.md, alignItems: 'center' }}>
                <WallPoster p={open} on width={Math.min(260, width - space.xl * 4)} />
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
