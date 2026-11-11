import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown } from 'react-native-reanimated';

import { dur, space } from '@/design/system';
import { useTheme } from '@/design/theme';

/** A scrim over the screen with a dialog card. The card fades up 8pt, ease-out. */
export function Overlay({ children, onDismiss }: { children: ReactNode; onDismiss?: () => void }) {
  const { c, t } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.lg }}>
      <Animated.View entering={FadeIn.duration(dur.base)} style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} accessibilityLabel={t.close} disabled={!onDismiss} />
      </Animated.View>
      <Animated.View
        accessibilityViewIsModal
        entering={FadeInDown.duration(dur.slow).easing(Easing.out(Easing.cubic)).withInitialValues({ opacity: 0, transform: [{ translateY: 8 }] })}
        style={{ width: '100%', maxWidth: 360 }}>
        {children}
      </Animated.View>
    </View>
  );
}
