import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Field } from '@/components/Field';
import { fx } from '@/sound/sfx';
import { Overlay } from '@/components/Overlay';
import { Body, Button, Label, Panel } from '@/components/ui';
import { dur, space, useCalm } from '@/design/system';
import { useTheme } from '@/design/theme';
import { Enamel } from '@/design/depth';
import { font } from '@/design/tokens';
import { pieceGrid } from '@/design/mock';
import { DayClock, MedalTrack, StreakDays, Track, milestonesFor } from '@/components/Track';
import { MEDALS, dayLabel, medalOf, nextMedal, shareOrCopy, shareText } from '@/game/daily';
import { canRemind, useReminder } from '@/game/remind';
import { useGame } from '@/game/store';

const GAP = 4;

/* Game over, told by the board: the final board large, and beside it what
   ended the run. In the free game that is the pieces left in the tray, the
   ones with nowhere to go. In the game of the day it is the medal, a tile in
   its colour. Under it the score, set big, and the track as the run left it. */
export default function Over() {
  const { c, isDark } = useTheme();
  const calm = useCalm();
  const { game: final, stats, newGame, mode, daily, streak } = useGame();
  const reminder = useReminder();
  const { width } = useWindowDimensions();
  // The panel's inner width, and the board at about three fifths of it.
  const CARD = Math.min(width - space.lg * 2, 360) - space.xl * 2 - 2;
  const CELL = Math.floor((CARD * 0.6 - GAP) / 6);
  const BOARD = CELL * 6 + GAP;
  const steps = milestonesFor(final.cfg.goal);
  const next = steps.find((v) => v > final.bestTile) ?? null;
  const isDaily = mode === 'daily';
  const medal = medalOf(final.score);
  const miss = nextMedal(final.score);
  const stuck = final.tray.filter((p) => p && !p.used);
  const [shareNote, setShareNote] = useState<string | null>(null);
  const share = async () => {
    if (!daily.result) return;
    const r = await shareOrCopy(shareText(daily.key, daily.result, streak.count));
    setShareNote(r === 'copied' ? 'Результат скопирован' : r === 'failed' ? 'Не получилось поделиться' : null);
  };
  const target = final.score;
  // The first game is always a record, so it is not called one.
  const record = !isDaily && target >= stats.best && target > 0 && stats.played > 1;
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

  const side = CARD - BOARD - space.lg;
  const summary = isDaily
    ? `Игра дня, ${dayLabel(daily.key)}. ${target} очков. ${medal ? `Медаль: ${medal.name}.` : `До бронзы не хватило ${miss!.at - target}.`}`
    : `Места нет. ${target} очков, лучшая плитка ${final.bestTile}.${next ? ` Следующая веха ${next}.` : ''}`;

  return (
    <Overlay>
      <Panel>
        <View accessible accessibilityLabel={summary} style={{ flexDirection: 'row', gap: space.lg }}>
          <Field w={6} h={6} values={final.board} cell={CELL} gap={GAP} numbers={false} />
          <Animated.View entering={FadeIn.delay(dur.slow).duration(dur.base)} style={{ width: side, gap: space.md, justifyContent: isDaily ? 'space-between' : 'flex-start' }}>
            {isDaily ? (
              <>
                {/* The medal won, as a tile; no medal leaves the square empty. */}
                <View style={{ width: side, height: side, padding: 4, backgroundColor: medal ? c.line : c.hair }}>
                  <View style={{ flex: 1, backgroundColor: medal ? (medal.tile ? c.tile[medal.tile] : c.faint) : c.canvas }}>
                    <Enamel fill={medal ? (medal.tile ? c.tile[medal.tile] : c.faint) : c.canvas} size={side} empty={!medal} dark={isDark} />
                  </View>
                </View>
                <StreakDays count={streak.count} size={Math.floor((side - 6 * 3) / 7)} />
              </>
            ) : (
              /* What would not fit: the tray as it was left. */
              stuck.map((p, k) => <Field key={k} variant="piece" {...pieceGrid(p!)} cell={Math.min(CELL, Math.floor(side / 3))} gap={GAP} numbers={false} />)
            )}
          </Animated.View>
        </View>

        <View style={{ flexDirection: 'row', marginTop: space.xl }}>
          {/* A new record: the score on a yellow block, as on the poster. */}
          <View style={{ backgroundColor: record ? c.tile[3] : 'transparent', paddingHorizontal: record ? space.sm : 0, marginLeft: record ? -space.sm : 0 }}>
            {record ? <Enamel fill={c.tile[3]} size={56} dark={isDark} /> : null}
            <Text allowFontScaling={false} style={{ fontFamily: font.wide, fontSize: 48, lineHeight: 60, color: record ? c.ink[3] : c.text, fontVariant: ['tabular-nums'] }}>
              {shown.toLocaleString('ru-RU')}
            </Text>
          </View>
        </View>
        {!isDaily && stats.played > 1 && !record ? (
          <Label meta style={{ marginTop: space.xs }}>{`рекорд ${stats.best.toLocaleString('ru-RU')}`}</Label>
        ) : null}

        <Animated.View entering={FadeIn.delay(dur.base).duration(dur.base)}>
          {isDaily ? (
            <>
              <MedalTrack medals={MEDALS} score={final.score} width={CARD} gap={4} top={space.md} />
              <DayClock width={CARD} top={space.lg} />
            </>
          ) : (
            <Track steps={steps} best={final.bestTile} next={next} width={CARD} gap={4} top={space.md} />
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
