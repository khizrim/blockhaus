import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Overlay } from '@/components/Overlay';
import { Body, Button, Heading, Panel } from '@/components/ui';
import { useTheme } from '@/design/theme';
import { font } from '@/design/tokens';

import { Grow } from './marks';

/* The first screen, in the poster identity: the whole screen is one Mondrian
   canvas. A black line runs top to bottom near the right edge and the colour
   column beside it carries red, yellow and blue from top to bottom. The name
   sits in the open field, the controls in the bottom panel, each in its own
   cell of the same composition. */

const go = {
  continue: () => router.push('/game'),
  fresh: () => router.push({ pathname: '/game', params: { scene: 'early' } }),
  howto: () => router.push('/howto'),
  settings: () => router.push('/settings'),
};

function Link({ label, onPress }: { label: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" hitSlop={12}>
      {({ pressed }) => (
        <Text style={{ fontFamily: font.bodySemi, fontSize: 17, color: c.text, opacity: pressed ? 0.5 : 1 }}>{label}</Text>
      )}
    </Pressable>
  );
}

export function PosterMenu() {
  const { c, isDark } = useTheme();
  const ins = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const [confirm, setConfirm] = useState(false);

  const L = 12; // line weight of the poster
  const vx = Math.round(W * 0.8); // the long vertical
  const hy = Math.round(H * 0.15); // the top horizontal
  const panel = 196 + ins.bottom; // controls cell at the bottom
  const yb = H - panel; // its top line
  const ym = Math.round((hy + yb) / 2); // where yellow gives way to paper
  const bx = Math.round(vx * 0.3);
  const wordColour = isDark ? c.tile[3] : c.line;
  const size = Math.floor((vx - 40) / 3.1);

  const box = (st: object, delay: number, bg: string) => (
    <Animated.View entering={FadeIn.delay(delay).duration(380)} style={[{ position: 'absolute', backgroundColor: bg }, st]} />
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {box({ left: 0, top: 0, width: bx, height: hy }, 300, c.tile[1])}
        {box({ left: vx + L, top: 0, right: 0, height: hy }, 380, c.tile[2])}
        {box({ left: vx + L, top: hy + L, right: 0, height: ym - hy - L }, 460, c.tile[3])}
        {box({ left: vx + L, top: yb + L, right: 0, bottom: 0 }, 540, c.tile[1])}
        <Grow from="top">
          <View style={{ position: 'absolute', left: vx, top: 0, width: L, height: H, backgroundColor: c.line }} />
        </Grow>
        <Grow from="left" delay={100}>
          <View style={{ position: 'absolute', left: 0, top: hy, width: W, height: L, backgroundColor: c.line }} />
        </Grow>
        <Grow from="left" delay={180}>
          <View style={{ position: 'absolute', left: 0, top: yb, width: W, height: L, backgroundColor: c.line }} />
        </Grow>
        <View style={{ position: 'absolute', left: bx, top: 0, width: L, height: hy, backgroundColor: c.line }} />
        <View style={{ position: 'absolute', left: vx, top: ym, right: 0, height: L, backgroundColor: c.line }} />
      </View>

      {/* the name, in the open field */}
      <View style={{ position: 'absolute', left: 20, width: vx - 32, top: hy + L, height: yb - hy - L, justifyContent: 'center' }}>
        <Animated.View entering={FadeIn.delay(500).duration(500)}>
          <Text allowFontScaling={false} style={{ fontFamily: font.wide, fontSize: size, lineHeight: size * 0.98, color: wordColour, letterSpacing: -2 }}>
            block{'\n'}haus
          </Text>
          <Text style={{ marginTop: 14, fontFamily: font.bodyMedium, fontSize: 15, color: c.muted }}>Рекорд 2 410, лучшая плитка 96</Text>
        </Animated.View>
      </View>

      {/* the controls cell */}
      <Animated.View
        entering={FadeIn.delay(700).duration(500)}
        style={{ position: 'absolute', left: 20, width: vx - 40, top: yb + L + 18, gap: 12 }}>
        <Pressable onPress={go.continue} accessibilityRole="button" accessibilityLabel="Продолжить партию, 129 очков">
          {({ pressed }) => (
            <View
              style={{
                height: 64,
                backgroundColor: pressed ? c.tile[1] : isDark ? '#000' : c.line,
                borderWidth: isDark ? 2 : 0,
                borderColor: c.stroke,
                paddingHorizontal: 18,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
              <Text style={{ fontFamily: font.wide, fontSize: 21, color: '#FFFFFF' }}>Продолжить</Text>
              <Text style={{ fontFamily: font.wide, fontSize: 19, color: '#FFFFFF' }}>129</Text>
            </View>
          )}
        </Pressable>
        <Button label="Новая игра" onPress={() => setConfirm(true)} />
        <View style={{ flexDirection: 'row', gap: 22, paddingTop: 4 }}>
          <Link label="Как играть" onPress={go.howto} />
          <Link label="Настройки" onPress={go.settings} />
        </View>
      </Animated.View>

      {/* A new game throws the current one away, so it asks first. */}
      {confirm ? (
        <View style={StyleSheet.absoluteFill}>
          <Overlay onDismiss={() => setConfirm(false)}>
            <Panel>
              <Heading size={22}>Начать заново?</Heading>
              <Body muted style={{ marginTop: 8 }}>
                Текущая партия на 129 очков пропадёт.
              </Body>
              <View style={{ gap: 10, marginTop: 18 }}>
                <Button
                  kind="primary"
                  label="Начать заново"
                  onPress={() => {
                    setConfirm(false);
                    go.fresh();
                  }}
                />
                <Button label="Отмена" onPress={() => setConfirm(false)} />
              </View>
            </Panel>
          </Overlay>
        </View>
      ) : null}
    </View>
  );
}
