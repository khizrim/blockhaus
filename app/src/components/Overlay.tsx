import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { useTheme } from '@/design/theme';

/** A scrim over the game with a card that drops in like a placed piece. */
export function Overlay({ children, onDismiss }: { children: ReactNode; onDismiss?: () => void }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Animated.View entering={FadeIn.duration(180)} style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} accessibilityLabel="Close" />
      </Animated.View>
      <Animated.View entering={ZoomIn.springify().damping(14).stiffness(220)} style={{ width: '100%', maxWidth: 340 }}>
        {children}
      </Animated.View>
    </View>
  );
}
