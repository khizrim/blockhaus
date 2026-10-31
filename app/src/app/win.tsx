import { router } from 'expo-router';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Field } from '@/components/Field';
import { Overlay } from '@/components/Overlay';
import { Body, Button, Label, Panel } from '@/components/ui';
import { useTheme } from '@/design/theme';
import { font } from '@/design/tokens';

/* The win: the ladder collapses into one teal block. A strip of every rung
   assembles left to right, then the 96 lands on top and keeps a slow pulse. */
const STRIP = [1, 2, 3, 6, 12, 24, 48];

export default function Win() {
  const { c } = useTheme();
  const s = useSharedValue(0);
  const pulse = useSharedValue(1);
  useEffect(() => {
    s.value = withDelay(STRIP.length * 70 + 120, withSpring(1, { damping: 9, stiffness: 160 }));
    pulse.value = withDelay(1400, withRepeat(withSequence(withTiming(1.04, { duration: 700 }), withTiming(1, { duration: 700 })), -1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const big = useAnimatedStyle(() => ({ transform: [{ scale: s.value * pulse.value }] }));

  return (
    <Overlay>
      <Panel accent={8}>
        <View style={{ alignItems: 'center', gap: 16 }}>
          <Field
            w={STRIP.length}
            h={1}
            values={STRIP}
            cell={34}
            gap={5}
            look={(i) => ({ enterDelay: i * 70 })}
          />
          <Animated.View style={[{ width: 132, height: 132, backgroundColor: c.line, padding: 6 }, big]}>
            <View style={{ flex: 1, backgroundColor: c.tile[8], alignItems: 'center', justifyContent: 'center' }}>
              <Text allowFontScaling={false} style={{ fontFamily: font.black, fontSize: 56, color: c.ink[8] }}>
                96
              </Text>
            </View>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(900)} style={{ alignItems: 'center', gap: 6 }}>
            <Text allowFontScaling={false} style={{ fontFamily: font.wide, fontSize: 26, color: c.text }}>
              YOU MADE 96
            </Text>
            <Body muted style={{ textAlign: 'center' }}>
              The board is yours. Keep going for score, or start fresh.
            </Body>
          </Animated.View>
          <View style={{ flexDirection: 'row', gap: 24 }}>
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Label>Score</Label>
              <Text style={{ fontFamily: font.tile, fontSize: 20, color: c.text }}>2,410</Text>
            </View>
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Label>Merges</Label>
              <Text style={{ fontFamily: font.tile, fontSize: 20, color: c.text }}>260</Text>
            </View>
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Label>Time</Label>
              <Text style={{ fontFamily: font.tile, fontSize: 20, color: c.text }}>14:32</Text>
            </View>
          </View>
        </View>
        <View style={{ gap: 10, marginTop: 20 }}>
          <Button kind="primary" tone={8} size="lg" label="KEEP GOING" onPress={() => router.back()} />
          <Button
            label="New game"
            onPress={() => {
              router.dismissAll();
              router.replace({ pathname: '/game', params: { scene: 'early' } });
            }}
          />
        </View>
      </Panel>
    </Overlay>
  );
}
