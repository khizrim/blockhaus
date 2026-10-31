import { useEffect } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';

/* ---------- shared: a block that grows in from a corner ---------- */

export function Grow({
  children,
  delay = 0,
  from = 'left',
}: {
  children: React.ReactNode;
  delay?: number;
  from?: 'left' | 'top';
}) {
  const s = useSharedValue(0);
  useEffect(() => {
    s.value = withDelay(delay, withSpring(1, { damping: 18, stiffness: 140 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const st = useAnimatedStyle(() =>
    from === 'left'
      ? { transform: [{ scaleX: s.value }], transformOrigin: 'left' }
      : { transform: [{ scaleY: s.value }], transformOrigin: 'top' },
  );
  return <Animated.View style={st}>{children}</Animated.View>;
}

