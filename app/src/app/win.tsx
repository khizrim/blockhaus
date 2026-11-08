import { router } from 'expo-router';
import { useEffect } from 'react';
import { useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';

import { Block } from '@/components/Block';
import { Button, CountUp, Page } from '@/components/ui';
import engine from '@/game/engine';
import { useGame } from '@/game/store';
import { fx } from '@/sound/sfx';

/* The win (2026-11-08): the goal block itself drops onto the page, squashes
   and settles, a chord climbs, the score counts up. No sentence: the block
   is the news. */
const GOAL = engine.DEFAULTS.goal;
export default function Win() {
  const { game, markWinSeen, mode } = useGame();
  const { width } = useWindowDimensions();
  const goal = Math.max(GOAL, game.bestTile);
  const size = Math.min(180, Math.round((Math.min(width, 440) - 32) * 0.5));
  const y = useSharedValue(-120);
  const o = useSharedValue(0);
  const sx = useSharedValue(1);
  const sy = useSharedValue(1);
  useEffect(() => {
    markWinSeen();
    const fall = { duration: 290, easing: Easing.bezier(0.5, 0, 0.7, 1) };
    o.value = withTiming(1, { duration: 150 });
    y.value = withSequence(withTiming(0, fall), withTiming(-6, { duration: 110, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 120, easing: Easing.in(Easing.quad) }));
    sx.value = withDelay(290, withSequence(withTiming(1.06, { duration: 60 }), withTiming(0.98, { duration: 110 }), withTiming(1, { duration: 120 })));
    sy.value = withDelay(290, withSequence(withTiming(0.9, { duration: 60 }), withTiming(1.03, { duration: 110 }), withTiming(1, { duration: 120 })));
    const id = setTimeout(() => fx.win(), 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const st = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateY: y.value }, { scaleX: sx.value }, { scaleY: sy.value }], transformOrigin: 'bottom' }));
  return (
    <Page>
      <View accessible accessibilityLabel={`Вы собрали ${goal}. ${game.score} очков.`} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24 }}>
        <Animated.View style={st}>
          <Block v={goal} size={size} />
        </Animated.View>
        <CountUp to={game.score} />
      </View>
      <View style={{ gap: 12 }}>
        <Button kind="primary" size="lg" label="Играть дальше" onPress={() => router.back()} />
        {mode === 'daily' ? null : (
          <Button size="lg" label="В меню" onPress={() => router.dismissTo('/')} />
        )}
      </View>
    </Page>
  );
}
