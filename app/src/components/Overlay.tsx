import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { dur, rise, space } from '@/design/system';
import { useTheme } from '@/design/theme';

/** A scrim over the screen with a dialog card. The card fades up 8pt, ease-out. */
export function Overlay({ children, onDismiss }: { children: ReactNode; onDismiss?: () => void }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.lg }}>
      <Animated.View entering={FadeIn.duration(dur.base)} style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} accessibilityLabel="Закрыть" disabled={!onDismiss} />
      </Animated.View>
      <Animated.View
        accessibilityViewIsModal
        entering={rise()}
        style={{ width: '100%', maxWidth: 360 }}>
        {children}
      </Animated.View>
    </View>
  );
}
