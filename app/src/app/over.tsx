import { router } from 'expo-router';
import { useEffect } from 'react';
import { useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';

import { Field } from '@/components/Field';
import { Button, Chip, CountUp, Page } from '@/components/ui';
import { dayLabel } from '@/game/daily';
import { useGame } from '@/game/store';
import { fx } from '@/sound/sfx';

/* Game over (2026-11-08): the board as it was left, small and gone cold;
   the score counting up; a chip with the record (yellow when this is a new
   one), or the day of the game of the day. Then again, or the menu. */
export default function Over() {
  const { game: final, stats, newGame, mode, daily } = useGame();
  const { width } = useWindowDimensions();
  const isDaily = mode === 'daily';
  const target = final.score;
  // The first game is always a record, so it is not called one.
  const record = !isDaily && target >= stats.best && target > 0 && stats.played > 1;
  useEffect(() => fx.over(), []);

  // The chip pops in as the count-up ends.
  const k = useSharedValue(0);
  useEffect(() => {
    k.value = withDelay(650, withSequence(withTiming(1.1, { duration: 150 }), withTiming(1, { duration: 110 })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const chipSt = useAnimatedStyle(() => ({ opacity: Math.min(1, k.value), transform: [{ scale: 0.6 + 0.4 * Math.min(1, k.value) + Math.max(0, k.value - 1) }] }));
  const cell = Math.floor(((Math.min(width, 440) - 32) * 0.62) / 6);

  return (
    <Page>
      <View accessible accessibilityLabel={isDaily ? `Игра дня, ${dayLabel(daily.key)}. ${target} очков.` : `Места нет. ${target} очков.`} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 }}>
        <View style={{ opacity: 0.6 }}>
          <Field w={6} h={6} values={final.board} cell={cell} gap={Math.max(3, Math.round(cell * 0.1))} />
        </View>
        <View style={{ height: 8 }} />
        <CountUp to={target} />
        <Animated.View style={chipSt}>
          {isDaily ? (
            <Chip>{`Игра дня, ${dayLabel(daily.key)}`}</Chip>
          ) : record ? (
            <Chip yellow>Новый рекорд</Chip>
          ) : stats.played > 1 ? (
            <Chip>{`Рекорд ${stats.best.toLocaleString('ru-RU')}`}</Chip>
          ) : null}
        </Animated.View>
      </View>
      <View style={{ gap: 12 }}>
        {isDaily ? null : (
          <Button
            kind="primary"
            size="lg"
            label="Ещё раз"
            onPress={() => {
              newGame();
              router.back();
            }}
          />
        )}
        <Button kind={isDaily ? 'primary' : 'secondary'} size="lg" label="В меню" onPress={() => router.dismissTo('/')} />
      </View>
    </Page>
  );
}
