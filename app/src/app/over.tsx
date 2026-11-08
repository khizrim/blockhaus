import { router } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';

import { Field } from '@/components/Field';
import { Body, Button, Chip, CountUp, Page } from '@/components/ui';
import { dayLabel, medalOf, nextMedal, shareText } from '@/game/daily';
import { shareImage } from '@/game/shareImage';
import { canRemind, useReminder } from '@/game/remind';
import { useGame } from '@/game/store';
import { fx } from '@/sound/sfx';

/* Game over (2026-11-08): the board as it was left, small and gone cold;
   the score counting up; a chip with the record (yellow when this is a new
   one) or, in the game of the day, the medal. Two keys: again, or the menu. */
export default function Over() {
  const { game: final, stats, newGame, mode, daily, streak } = useGame();
  const reminder = useReminder();
  const { width } = useWindowDimensions();
  const isDaily = mode === 'daily';
  const medal = medalOf(final.score, daily.key);
  const miss = nextMedal(final.score, daily.key);
  const [shareNote, setShareNote] = useState<string | null>(null);
  const shot = useRef<ComponentRef<typeof View>>(null);
  const share = async () => {
    if (!daily.result) return;
    // The page itself goes out as a picture; a browser sends the text.
    const r = await shareImage(shot, shareText(daily.key, daily.result, streak.count));
    setShareNote(r === 'copied' ? 'Результат скопирован' : r === 'failed' ? 'Не получилось поделиться' : null);
  };
  const target = final.score;
  // The first game is always a record, so it is not called one.
  const record = !isDaily && target >= stats.best && target > 0 && stats.played > 1;
  useEffect(() => fx.over(), []);

  // The chip pops in as the count-up ends; a record rings.
  const k = useSharedValue(0);
  useEffect(() => {
    k.value = withDelay(650, withSequence(withTiming(1.1, { duration: 150 }), withTiming(1, { duration: 110 })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const chipSt = useAnimatedStyle(() => ({ opacity: Math.min(1, k.value), transform: [{ scale: 0.6 + 0.4 * Math.min(1, k.value) + Math.max(0, k.value - 1) }] }));

  const summary = isDaily
    ? `Игра дня, ${dayLabel(daily.key)}. ${target} очков. ${medal ? `Медаль: ${medal.name}.` : miss ? `До бронзы не хватило ${miss.at - target}.` : ''}`
    : `Места нет. ${target} очков.`;
  const cell = Math.floor(((Math.min(width, 440) - 32) * 0.62) / 6);

  return (
    <Page>
      <View ref={shot} collapsable={false} accessible accessibilityLabel={summary} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 }}>
        <View style={{ opacity: 0.6 }}>
          <Field w={6} h={6} values={final.board} cell={cell} gap={Math.max(3, Math.round(cell * 0.1))} />
        </View>
        <View style={{ height: 8 }} />
        <CountUp to={target} />
        <Animated.View style={chipSt}>
          {isDaily ? (
            <Chip yellow={!!medal}>{medal ? medal.name : miss ? `До бронзы ${miss.at - target}` : dayLabel(daily.key)}</Chip>
          ) : record ? (
            <Chip yellow>Новый рекорд</Chip>
          ) : stats.played > 1 ? (
            <Chip>{`Рекорд ${stats.best.toLocaleString('ru-RU')}`}</Chip>
          ) : null}
        </Animated.View>
      </View>
      <View style={{ gap: 12 }}>
        {isDaily ? (
          <Button kind="primary" size="lg" label="Поделиться" onPress={share} />
        ) : (
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
        {shareNote ? <Body muted small style={{ textAlign: 'center' }}>{shareNote}</Body> : null}
        {/* A reason to come back: the phone says when the next one is out. */}
        {isDaily && canRemind && !reminder.on ? <Button size="lg" label="Напоминать в 9:00" onPress={reminder.enable} /> : null}
        {isDaily && reminder.on && reminder.justSet ? <Body muted small style={{ textAlign: 'center' }}>Напомним завтра в 9:00</Body> : null}
        <Button size="lg" label="В меню" onPress={() => router.dismissTo('/')} />
      </View>
    </Page>
  );
}
