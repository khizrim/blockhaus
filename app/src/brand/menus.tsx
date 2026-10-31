import { router } from 'expo-router';
import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TileBadge } from '@/components/ui';
import { useTheme } from '@/design/theme';

import { CellWord, Grow, RuleMark, WORD } from './marks';

/* Three identity directions for the first screen, side by side for choosing.
   All three keep the board as it is; they differ in the mark, the type and
   how the menu is built. */

export const brandFont = {
  rule: 'Unbounded_700Bold',
  ruleMedium: 'Unbounded_500Medium',
  poster: 'DelaGothicOne_400Regular',
  body: 'Onest_400Regular',
  bodyMedium: 'Onest_500Medium',
  bodySemi: 'Onest_600SemiBold',
};

const go = {
  continue: () => router.push('/game'),
  fresh: () => router.push({ pathname: '/game', params: { scene: 'early' } }),
  howto: () => router.push('/howto'),
  settings: () => router.push('/settings'),
};

function useFrame() {
  const ins = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const inner = Math.min(width, 440) - 40;
  return { ins, inner, width };
}

/** Prototype-only switch between the three directions. */
export function DirectionSwitch({ v, onChange, dark }: { v: string; onChange: (v: string) => void; dark?: boolean }) {
  const { c } = useTheme();
  const ink = dark ? '#FFFFFF' : c.text;
  return (
    <View style={{ flexDirection: 'row', alignSelf: 'center', gap: 6 }}>
      {['a', 'b', 'c'].map((k) => (
        <Pressable
          key={k}
          onPress={() => onChange(k)}
          accessibilityLabel={`Direction ${k.toUpperCase()}`}
          style={{
            width: 30,
            height: 30,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: ink,
            backgroundColor: v === k ? ink : 'transparent',
          }}>
          <Text style={{ fontFamily: brandFont.bodySemi, fontSize: 13, color: v === k ? (dark ? '#000' : c.bg) : ink }}>
            {k.toUpperCase()}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/* =====================================================================
   A. Rule. The mark is the rule itself: 1 + 2 = 3 as three pieces that
   tile one block. Wordmark in Unbounded, lowercase. Menu is quiet: one
   big yellow block to continue, everything else in plain words.
   ===================================================================== */

export function MenuA({ switcher }: { switcher: ReactNode }) {
  const { c } = useTheme();
  const { ins, inner } = useFrame();
  const cell = Math.floor((inner * 0.58) / 3);
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: ins.top + 28, paddingBottom: ins.bottom + 16, paddingHorizontal: 20 }}>
      <View style={{ flex: 1, width: '100%', maxWidth: 400, alignSelf: 'center' }}>
        <RuleMark cell={cell} gap={8} drop />
        <Animated.View entering={FadeIn.delay(820).duration(500)} style={{ marginTop: 26, gap: 10 }}>
          <Text allowFontScaling={false} style={{ fontFamily: brandFont.rule, fontSize: Math.floor(inner / 6.6), letterSpacing: -1.5, color: c.text, lineHeight: Math.floor(inner / 5.6) }}>
            blockhaus
          </Text>
          <Text style={{ fontFamily: brandFont.body, fontSize: 17, lineHeight: 24, color: c.muted, maxWidth: 300 }}>
            One and two make three. Equals double, all the way to 96.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(1000).duration(500)} style={{ marginTop: 'auto', gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontFamily: brandFont.body, fontSize: 15, color: c.muted }}>Best 2,410</Text>
            <TileBadge v={96} size={22} />
          </View>
          <Pressable onPress={go.continue} accessibilityRole="button" accessibilityLabel="Continue, score 129">
            {({ pressed }) => (
              <View style={{ backgroundColor: c.line, padding: 6, transform: [{ translateY: pressed ? 2 : 0 }] }}>
                <View style={{ backgroundColor: c.tile[3], height: 72, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontFamily: brandFont.rule, fontSize: 22, color: c.ink[3] }}>Continue</Text>
                  <Text style={{ fontFamily: brandFont.ruleMedium, fontSize: 20, color: c.ink[3] }}>129</Text>
                </View>
              </View>
            )}
          </Pressable>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, paddingTop: 4 }}>
            <Link label="New game" onPress={go.fresh} />
            <Link label="How to play" onPress={go.howto} />
            <Link label="Settings" onPress={go.settings} />
          </View>
          <View style={{ marginTop: 10 }}>{switcher}</View>
        </Animated.View>
      </View>
    </View>
  );
}

function Link({ label, onPress, color }: { label: string; onPress: () => void; color?: string }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" hitSlop={10}>
      {({ pressed }) => (
        <Text style={{ fontFamily: brandFont.bodySemi, fontSize: 16, color: color ?? c.text, opacity: pressed ? 0.5 : 1 }}>{label}</Text>
      )}
    </Pressable>
  );
}

/* =====================================================================
   B. Cells. The name is drawn on the board's own grid, letter by letter,
   and the menu continues it: every choice is a field in one framed
   column, so the first screen is already a Blockhaus board.
   ===================================================================== */

export function MenuB({ switcher }: { switcher: ReactNode }) {
  const { c } = useTheme();
  const { ins, inner } = useFrame();
  const gap = 5;
  const cell = Math.floor((inner - gap) / WORD.w);
  const rows: { label: string; note?: string; tone?: number; onPress: () => void }[] = [
    { label: 'Continue', note: '129', tone: 3, onPress: go.continue },
    { label: 'New game', onPress: go.fresh },
    { label: 'How to play', onPress: go.howto },
    { label: 'Settings', onPress: go.settings },
  ];
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: ins.top + 20, paddingBottom: ins.bottom + 16, paddingHorizontal: 20 }}>
      <View style={{ flex: 1, width: '100%', maxWidth: 400, alignSelf: 'center' }}>
        <CellWord cell={cell} gap={gap} intro />
        <Animated.View entering={FadeIn.delay(700).duration(500)} style={{ marginTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontFamily: brandFont.bodyMedium, fontSize: 16, color: c.muted }}>A merge puzzle in six by six</Text>
          <TileBadge v={96} size={22} />
        </Animated.View>

        <Animated.View entering={FadeIn.delay(850).duration(500)} style={{ marginTop: 'auto', gap: 14 }}>
          <View style={{ backgroundColor: c.line, padding: gap / 2 }}>
            {rows.map((r, k) => (
              <Pressable key={r.label} onPress={r.onPress} accessibilityRole="button">
                {({ pressed }) => (
                  <View
                    style={{
                      margin: gap / 2,
                      height: k === 0 ? 76 : 54,
                      paddingHorizontal: 18,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: pressed ? c.tile[1] : r.tone ? c.tile[r.tone] : c.canvas,
                    }}>
                    <Text style={{ fontFamily: k === 0 ? brandFont.bodySemi : brandFont.bodyMedium, fontSize: k === 0 ? 24 : 18, color: pressed ? '#FFF' : r.tone ? c.ink[r.tone] : c.text }}>
                      {r.label}
                    </Text>
                    {r.note ? (
                      <Text style={{ fontFamily: brandFont.bodySemi, fontSize: 20, color: r.tone ? c.ink[r.tone] : c.muted }}>{r.note}</Text>
                    ) : null}
                  </View>
                )}
              </Pressable>
            ))}
          </View>
          {switcher}
        </Animated.View>
      </View>
    </View>
  );
}

/* =====================================================================
   C. Poster. The screen is one Mondrian canvas, edge to edge: thick
   lines run off the screen, the name is set huge in Dela Gothic One,
   split where the word splits. The loudest of the three.
   ===================================================================== */

export function MenuC({ switcher }: { switcher: ReactNode }) {
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
          <Text allowFontScaling={false} style={{ fontFamily: brandFont.poster, fontSize: size, lineHeight: size * 0.98, color: wordColour, letterSpacing: -2 }}>
            block{'\n'}haus
          </Text>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(800).duration(500)} style={{ marginTop: 'auto', gap: 12 }}>
          <Text style={{ fontFamily: brandFont.bodyMedium, fontSize: 16, color: isDark ? c.muted : '#4A4A4F' }}>Best 2,410, best tile 96</Text>
          <Pressable onPress={go.continue} accessibilityRole="button" accessibilityLabel="Continue, score 129">
            {({ pressed }) => (
              <View style={{ height: 70, backgroundColor: pressed ? c.tile[1] : c.line, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: brandFont.poster, fontSize: 24, color: c.tile[3] }}>Continue</Text>
                <Text style={{ fontFamily: brandFont.poster, fontSize: 22, color: '#FFFFFF' }}>129</Text>
              </View>
            )}
          </Pressable>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2, paddingTop: 4, paddingBottom: 6 }}>
            <Link label="New game" onPress={go.fresh} />
            <Link label="How to play" onPress={go.howto} />
            <Link label="Settings" onPress={go.settings} />
          </View>
          {switcher}
        </Animated.View>
      </View>
    </View>
  );
}
