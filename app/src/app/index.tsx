import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Field } from '@/components/Field';
import { Body, Button, Label, Screen, TileBadge } from '@/components/ui';
import { COVER } from '@/design/mock';
import { useTheme } from '@/design/theme';
import { font } from '@/design/tokens';

/* Main menu. The cover is a still composition drawn with the same field
   renderer as the board; it assembles cell by cell on open, and again on tap. */
export default function Menu() {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const [take, setTake] = useState(0);
  const inner = Math.min(width, 440) - 32;
  const cell = Math.floor((inner - 6) / COVER.w);

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', gap: 28 }}>
        <Pressable onPress={() => setTake((t) => t + 1)} accessibilityLabel="Replay cover" style={{ alignSelf: 'center' }}>
          <Field
            key={take}
            w={COVER.w}
            h={COVER.h}
            values={COVER.values}
            cell={cell}
            gap={6}
            numbers={false}
            look={(i) => ({ enterDelay: ((i % COVER.w) + Math.floor(i / COVER.w)) * 45 })}
          />
        </Pressable>

        <Animated.View entering={FadeInDown.delay(380).duration(420)} style={{ gap: 6 }}>
          <Text
            allowFontScaling={false}
            numberOfLines={1}
            style={{ fontFamily: font.wide, fontSize: Math.min(44, Math.floor(inner / 8.4)), letterSpacing: 1, color: c.text }}>
            BLOCKHAUS
          </Text>
          <Body muted>Drop pieces. Pair them up. Build to 96.</Body>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(480).duration(420)} style={{ flexDirection: 'row', gap: 24 }}>
          <Stat label="Best score" value="2,410" />
          <View style={{ gap: 6 }}>
            <Label>Best tile</Label>
            <TileBadge v={96} size={26} />
          </View>
          <Stat label="Games" value="37" />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(560).duration(420)} style={{ gap: 12 }}>
          <Button size="lg" kind="primary" label="CONTINUE  ·  129" onPress={() => router.push('/game')} />
          <Button size="lg" label="NEW GAME" onPress={() => router.push({ pathname: '/game', params: { scene: 'early' } })} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button style={{ flex: 1 }} label="How to play" onPress={() => router.push('/howto')} />
            <Button style={{ flex: 1 }} label="Settings" onPress={() => router.push('/settings')} />
          </View>
        </Animated.View>
      </View>

      <Button kind="ghost" label="Design kit" onPress={() => router.push('/kit')} />
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Label>{label}</Label>
      <Text allowFontScaling={false} style={{ fontFamily: font.tile, fontSize: 20, color: c.text }}>
        {value}
      </Text>
    </View>
  );
}
