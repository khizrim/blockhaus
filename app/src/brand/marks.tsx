import { useEffect } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { dur, enter } from '@/design/system';

/* ---------- a poster line that draws itself in from one end ---------- */

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
    s.value = withDelay(delay, withTiming(1, enter(dur.slow)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const st = useAnimatedStyle(() =>
    from === 'left'
      ? { transform: [{ scaleX: s.value }], transformOrigin: 'left' }
      : { transform: [{ scaleY: s.value }], transformOrigin: 'top' },
  );
  return <Animated.View style={st}>{children}</Animated.View>;
}
