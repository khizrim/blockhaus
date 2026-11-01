import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Field } from '@/components/Field';
import { fx } from '@/sound/sfx';
import { Overlay } from '@/components/Overlay';
import { Body, Button, Heading, Label, Panel, Stat, TileBadge } from '@/components/ui';
import { dur, space, type, useCalm } from '@/design/system';
import { useTheme } from '@/design/theme';
import { MedalTrack, StreakDays, Track, milestonesFor } from '@/components/Track';
import { DAILY, MEDALS, dayLabel, medalOf, nextMedal, plural, shareOrCopy, shareText, untilTomorrow } from '@/game/daily';
import { canRemind, useReminder } from '@/game/remind';
import { useGame } from '@/game/store';

/* Game over: the final board as a thumbnail, the score counting up once. */
export default function Over() {
  const { c } = useTheme();
  const calm = useCalm();
  const { game: final, stats, newGame, mode, daily, streak } = useGame();
  const { width } = useWindowDimensions();
  const reminder = useReminder();
  /* The track as the player left it: what was reached, and the next one,
     framed, as the thing to beat next time. */
  const steps = milestonesFor(final.cfg.goal);
  const next = steps.find((v) => v > final.bestTile) ?? null;
  const trackW = Math.min(width, 440) - 32 - space.xl * 2;
  const isDaily = mode === 'daily';
  const medal = medalOf(final.score);
  const miss = nextMedal(final.score);
  const ranOut = final.moves < DAILY.pieceLimit;
  const dailyNote = [
    medal ? `Медаль: ${medal.name}.${miss ? ` До ${miss.of} было ${miss.at - final.score}.` : ''}` : `До бронзы не хватило ${miss!.at - final.score}.`,
    ranOut ? 'Место кончилось раньше фигур.' : `Все ${DAILY.pieceLimit} фигур на доске.`,
    `Новая раскладка через ${untilTomorrow()}.`,
  ].join(' ');
  const [shareNote, setShareNote] = useState<string | null>(null);
  const share = async () => {
    if (!daily.result) return;
    const r = await shareOrCopy(shareText(daily.key, daily.result, streak.count));
    setShareNote(r === 'copied' ? 'Результат скопирован' : r === 'failed' ? 'Не получилось поделиться' : null);
  };
  const target = final.score;
  // The first game is always a record, so it is not called one.
  const record = target >= stats.best && target > 0 && stats.played > 1;
  const classicNote = next
    ? `Вы дошли до ${final.bestTile || 0}. В следующий раз: ${next}.`
    : `Вы дошли до ${final.bestTile}, дальше цели.`;
  const [shown, setShown] = useState(calm ? target : 0);
  useEffect(() => fx.over(), []);

  useEffect(() => {
    if (calm) return setShown(target);
    const t0 = Date.now();
    const id = setInterval(() => {
      const k = Math.min(1, (Date.now() - t0) / 600);
      setShown(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k === 1) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [target, calm]);

  return (
    <Overlay>
      <Panel>
        <View style={{ flexDirection: 'row', gap: space.lg, alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Heading>{isDaily ? `Игра дня, ${dayLabel(daily.key)}` : 'Места нет'}</Heading>
            <Body muted small style={{ marginTop: space.xs }}>
              {isDaily ? dailyNote : `Ни одна фигура не встаёт. ${classicNote}`}
            </Body>
          </View>
          <Field w={6} h={6} values={final.board} cell={12} gap={2} numbers={false} />
        </View>

        <View style={{ marginTop: space.xl }}>
          <Label meta>Очки</Label>
          <Text allowFontScaling={false} style={[type.number, { color: c.text }]}>
            {shown.toLocaleString('ru-RU')}
          </Text>
        </View>
        <Animated.View entering={FadeIn.delay(dur.base).duration(dur.base)}>
          {isDaily ? (
            <MedalTrack medals={MEDALS} score={final.score} width={trackW} gap={4} top={space.md} />
          ) : (
            <Track steps={steps} best={final.bestTile} next={next} width={trackW} gap={4} top={space.md} />
          )}
        </Animated.View>
        <Animated.View entering={FadeIn.delay(dur.slow).duration(dur.base)} style={{ flexDirection: 'row', gap: space.xxl, marginTop: space.lg }}>
          <Stat label="Лучшая плитка">
            <TileBadge v={final.bestTile} />
          </Stat>
          <Stat label="Слияния" value={String(final.merges)} />
          {isDaily ? (
            <Stat label={`Серия ${streak.count} ${plural(streak.count, 'день', 'дня', 'дней')}`}>
              <View style={{ height: 30, justifyContent: 'center' }}>
                <StreakDays count={streak.count} />
              </View>
            </Stat>
          ) : stats.played > 1 ? (
            <Stat label={record ? 'Новый рекорд' : 'Рекорд'} value={stats.best.toLocaleString('ru-RU')} />
          ) : (
            <Stat label="Ходы" value={String(final.moves)} />
          )}
        </Animated.View>

        <View style={{ gap: space.md, marginTop: space.xl }}>
          {isDaily ? (
            <Button kind="primary" size="lg" label="Поделиться" onPress={share} />
          ) : (
            <Button
              kind="primary"
              size="lg"
              label="Сыграть ещё"
              onPress={() => {
                newGame();
                router.back();
              }}
            />
          )}
          {shareNote ? <Body muted small style={{ textAlign: 'center' }}>{shareNote}</Body> : null}
          {/* A reason to come back: the phone says when the next one is out. */}
          {isDaily && canRemind && !reminder.on ? <Button label="Напоминать в 9:00" onPress={reminder.enable} /> : null}
          {isDaily && reminder.on && reminder.justSet ? <Body muted small style={{ textAlign: 'center' }}>Напомним завтра в 9:00</Body> : null}
          <Button label="Выйти в меню" onPress={() => router.dismissTo('/')} />
        </View>
      </Panel>
    </Overlay>
  );
}
