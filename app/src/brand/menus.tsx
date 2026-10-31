import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/design/theme';
import { font } from '@/design/tokens';

import { Grow } from './marks';

/* The first screen, in the poster identity (direction C, chosen 2026-10-31):
   the screen is one Mondrian canvas edge to edge, and the name is set huge in
   Dela Gothic One, split where the word splits. */


const go = {
  continue: () => router.push('/game'),
  fresh: () => router.push({ pathname: '/game', params: { scene: 'early' } }),
  howto: () => router.push('/howto'),
  settings: () => router.push('/settings'),
};

function useFrame() {
  const ins = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  return { ins, width };
}

function Link({ label, onPress, color }: { label: string; onPress: () => void; color?: string }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" hitSlop={10}>
      {({ pressed }) => (
        <Text style={{ fontFamily: font.bodySemi, fontSize: 16, color: color ?? c.text, opacity: pressed ? 0.5 : 1 }}>{label}</Text>
      )}
    </Pressable>
  );
}

export function PosterMenu() {
  const { c, isDark } = useTheme();
  const { ins, width } = useFrame();
  const { height } = useWindowDimensions();
  const L = 12; // line weight of the poster
  const vx = Math.round(width * 0.82);
  const hy = Math.round(height * 0.17);
  const field = isDark ? '#1C1D21' : '#F3EFE4';
  const wordColour = isDark ? c.tile[3] : c.line;
  const size = Math.floor((vx - 32) / 3.1);

  return (
    <View style={{ flex: 1, backgroundColor: field }}>
      {/* the canvas */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Grow from="top" delay={0}>
          <View style={{ position: 'absolute', left: vx, top: 0, width: L, height: hy * 2.4, backgroundColor: c.line }} />
        </Grow>
        <Grow from="left" delay={120}>
          <View style={{ position: 'absolute', left: 0, top: hy, width, height: L, backgroundColor: c.line }} />
        </Grow>
        <Animated.View entering={FadeIn.delay(300).duration(400)} style={{ position: 'absolute', left: vx + L, top: 0, right: 0, height: hy, backgroundColor: c.tile[2] }} />
        <Animated.View entering={FadeIn.delay(420).duration(400)} style={{ position: 'absolute', left: vx + L, top: hy + L, right: 0, height: hy * 1.4 - L, backgroundColor: c.tile[3] }} />
        <View style={{ position: 'absolute', left: vx, top: hy * 2.4, right: 0, height: L, backgroundColor: c.line }} />
        <Animated.View entering={FadeIn.delay(540).duration(400)} style={{ position: 'absolute', left: 0, top: 0, width: vx * 0.28, height: hy, backgroundColor: c.tile[1] }} />
        <View style={{ position: 'absolute', left: vx * 0.28, top: 0, width: L, height: hy, backgroundColor: c.line }} />
      </View>

      <View style={{ flex: 1, paddingTop: hy + L + 22, paddingBottom: ins.bottom + 16, paddingHorizontal: 20 }}>
        <Animated.View entering={FadeIn.delay(500).duration(500)}>
          <Text allowFontScaling={false} style={{ fontFamily: font.wide, fontSize: size, lineHeight: size * 0.98, color: wordColour, letterSpacing: -2 }}>
            block{'\n'}haus
          </Text>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(800).duration(500)} style={{ marginTop: 'auto', gap: 12 }}>
          <Text style={{ fontFamily: font.bodyMedium, fontSize: 16, color: isDark ? c.muted : '#4A4A4F' }}>Best 2,410, best tile 96</Text>
          <Pressable onPress={go.continue} accessibilityRole="button" accessibilityLabel="Continue, score 129">
            {({ pressed }) => (
              <View style={{ height: 70, backgroundColor: pressed ? c.tile[1] : c.line, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: font.wide, fontSize: 24, color: c.tile[3] }}>Continue</Text>
                <Text style={{ fontFamily: font.wide, fontSize: 22, color: '#FFFFFF' }}>129</Text>
              </View>
            )}
          </Pressable>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2, paddingTop: 4, paddingBottom: 6 }}>
            <Link label="New game" onPress={go.fresh} />
            <Link label="How to play" onPress={go.howto} />
            <Link label="Settings" onPress={go.settings} />
          </View>
        </Animated.View>
      </View>
    </View>
  );
}
