import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Overlay } from '@/components/Overlay';
import { Body, Button, Heading, Panel, TextLink } from '@/components/ui';
import { dur, space, type } from '@/design/system';
import { useTheme } from '@/design/theme';
import { Enamel, panelEnamel } from '@/design/depth';
import { font } from '@/design/tokens';
import engine from '@/game/engine';
import { DayClock, MedalMark, RankStrip, StreakDays, TaskSquares, Track, milestonesFor } from '@/components/Track';
import { dayLabel, medalOf, shareOrCopy, shareText } from '@/game/daily';
import { useGame } from '@/game/store';

import { Grow } from './marks';

/* The first screen. The top of the screen is the poster: a Mondrian
   composition that bleeds off three edges and ends on one full-width line.
   Red, yellow and blue stay small, about a sixth of the screen together, so
   paper carries the page. Below the line: the name, the record, the actions. */

const go = {
  play: () => router.push('/game'),
  howto: () => router.push('/howto'),
  settings: () => router.push('/settings'),
  posters: () => router.push('/posters'),
};

export function PosterMenu() {
  const { c, isDark } = useTheme();
  const ins = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const [confirm, setConfirm] = useState(false);
  const { game, stats, inProgress, newGame, learned, daily, streak, rank, tasks } = useGame();
  const [taskList, setTaskList] = useState(false);
  const [dailyNote, setDailyNote] = useState<string | null>(null);
  const openDaily = () => router.push({ pathname: '/game', params: { daily: '1' } });
  const shareDaily = async () => {
    if (!daily.result) return;
    const r = await shareOrCopy(shareText(daily.key, daily.result, streak.count));
    setDailyNote(r === 'copied' ? 'Результат скопирован' : r === 'failed' ? 'Не получилось поделиться' : null);
  };
  const score = game.score.toLocaleString('ru-RU');
  const fresh = () => {
    if (!learned) return router.push({ pathname: '/game', params: { learn: '1' } });
    newGame();
    go.play();
  };
  // Under the name, the way to the goal as the player left it: the same
  // track the game keeps under the board, the next milestone framed.
  const steps = milestonesFor(engine.DEFAULTS.goal);
  const nextStep = steps.find((v) => v > stats.bestTile) ?? null;
  const colW = Math.min(W, 440) - space.xl * 2;

  const L = 8; // poster line weight, on the 8pt grid
  const A = Math.round(Math.min(H * 0.44, W * 1.05)); // poster height
  const v1 = Math.round(W * 0.62);
  const hl = Math.round(A * 0.6);
  const hr = Math.round(A * 0.38);
  const vs = Math.round(W * 0.22);
  const hb = Math.round(A * 0.76);
  const size = Math.min(56, Math.floor((W - space.xl * 2) / 6.8));

  const unit = Math.round(W / 6);
  const block = (st: object, delay: number, bg: string, open: { t?: boolean; r?: boolean; b?: boolean; l?: boolean }) => (
    <Animated.View entering={FadeIn.delay(delay).duration(dur.slow)} style={[{ position: 'absolute', backgroundColor: bg, overflow: 'hidden' }, st]}>
      <Enamel fill={bg} open={open} size={unit} dark={isDark} />
    </Animated.View>
  );
  const line = (st: object) => <View style={[{ position: 'absolute', backgroundColor: c.line }, st]} />;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {/* the poster */}
      <View style={[{ height: A + L, backgroundColor: isDark ? c.canvas : c.bg, zIndex: 1 }, panelEnamel(c.bg, isDark)]} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {block({ left: v1 + L, top: 0, right: 0, height: hr }, 150, c.tile[2], { l: true, b: true })}
        {block({ left: 0, top: hl + L, width: vs, height: A - hl - L }, 200, c.tile[3], { t: true, r: true, b: true })}
        {block({ left: v1 + L, top: hb + L, right: 0, height: A - hb - L }, 250, c.tile[1], { t: true, l: true, b: true })}
        <Grow from="top">{line({ left: v1, top: 0, width: L, height: A })}</Grow>
        <Grow from="left" delay={50}>{line({ left: 0, top: hl, width: v1, height: L })}</Grow>
        <Grow from="left" delay={50}>{line({ left: v1, top: hr, width: W - v1, height: L })}</Grow>
        <Grow from="top" delay={100}>{line({ left: vs, top: hl, width: L, height: A - hl })}</Grow>
        <Grow from="left" delay={100}>{line({ left: v1, top: hb, width: W - v1, height: L })}</Grow>
        <Grow from="left">{line({ left: 0, top: A, width: W, height: L })}</Grow>
      </View>

      {/* below the line */}
      <Animated.View
        entering={FadeIn.delay(150).duration(dur.slow)}
        style={{
          flex: 1,
          width: '100%',
          maxWidth: 440,
          alignSelf: 'center',
          paddingHorizontal: space.xl,
          paddingTop: space.xl,
          paddingBottom: ins.bottom + space.lg,
        }}>
        <Text
          accessibilityRole="header"
          allowFontScaling={false}
          numberOfLines={1}
          style={{ fontFamily: font.wide, fontSize: size, lineHeight: Math.round(size * 1.15), color: isDark ? c.tile[3] : c.text }}>
          blockhaus
        </Text>
        <Track steps={steps} best={stats.bestTile} next={nextStep} width={colW} gap={4} top={space.md} />
        {learned ? <RankStrip name={rank.name} into={rank.into} need={rank.need} level={rank.level} width={colW} top={space.md} /> : null}

        <View style={{ marginTop: 'auto', gap: space.md }}>
          {inProgress ? (
            <>
              <Button kind="primary" size="lg" label="Продолжить" trailing={score} accessibilityLabel={`Продолжить партию, ${score} очков`} onPress={go.play} />
              <Button label="Новая игра" onPress={() => setConfirm(true)} />
            </>
          ) : (
            <Button kind="primary" size="lg" label="Играть" onPress={fresh} />
          )}
          {/* The game of the day: the same deal for everyone, once a day. */}
          {learned ? (
            daily.done ? (
              <Button
                label="Поделиться игрой дня"
                trailing={<MedalMark medal={medalOf(daily.result!.score)} score={daily.result!.score} size={28} />}
                accessibilityLabel={`Поделиться игрой дня, ${daily.result!.score} очков${medalOf(daily.result!.score) ? `, ${medalOf(daily.result!.score)!.name}` : ''}`}
                onPress={shareDaily}
              />
            ) : (
              <Button
                label={daily.started ? 'Продолжить игру дня' : 'Игра дня'}
                trailing={streak.count > 0 ? <StreakDays count={streak.count} shield={streak.shield} /> : dayLabel(daily.key)}
                accessibilityLabel={`${daily.started ? 'Продолжить игру дня' : 'Игра дня'}${streak.count > 0 ? `, серия ${streak.count}` : ''}`}
                onPress={openDaily}
              />
            )
          ) : null}
          {learned ? (
            <Button
              label="Задания дня"
              trailing={<TaskSquares done={tasks.done} />}
              accessibilityLabel={`Задания дня, выполнено ${tasks.done.filter(Boolean).length} из 3`}
              onPress={() => setTaskList(true)}
            />
          ) : null}
          {learned && daily.done && !dailyNote ? (
            <DayClock width={colW} />
          ) : null}
          {dailyNote ? <Text style={[type.secondary, { color: c.muted, textAlign: 'center' }]}>{dailyNote}</Text> : null}
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: space.xxl, marginTop: space.xs }}>
            <TextLink label="Как играть" onPress={go.howto} />
            {learned ? <TextLink label="Плакаты" onPress={go.posters} /> : null}
            <TextLink label="Настройки" onPress={go.settings} />
          </View>
        </View>
      </Animated.View>

      {/* The three tasks of the day, each beside its square. */}
      {taskList ? (
        <View style={[StyleSheet.absoluteFill, { zIndex: 2 }]}>
          <Overlay onDismiss={() => setTaskList(false)}>
            <Panel>
              <Heading>Задания дня</Heading>
              <View style={{ gap: space.md, marginTop: space.lg }}>
                {tasks.list.map((t, k) => (
                  <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                    <TaskSquares done={[tasks.done[k]]} size={24} start={k} />
                    <Body style={{ flex: 1, color: tasks.done[k] ? c.muted : c.text }}>{t.text}</Body>
                    {t.goal > 1 ? <Text style={[type.secondaryStrong, { color: c.muted, fontVariant: ['tabular-nums'] }]}>{`${tasks.progress[k]}/${t.goal}`}</Text> : null}
                  </View>
                ))}
              </View>
              <Body muted small style={{ marginTop: space.lg }}>
                В обычной партии. Каждое задание приносит мастерской 300 очков. Новые задания в полночь.
              </Body>
              <View style={{ marginTop: space.xl }}>
                <Button kind="primary" label="Понятно" onPress={() => setTaskList(false)} />
              </View>
            </Panel>
          </Overlay>
        </View>
      ) : null}

      {/* A new game throws the current one away, so it asks first. */}
      {confirm ? (
        <View style={[StyleSheet.absoluteFill, { zIndex: 2 }]}>
          <Overlay onDismiss={() => setConfirm(false)}>
            <Panel>
              <Heading>Начать новую игру?</Heading>
              <Body muted style={{ marginTop: space.sm }}>
                Текущая партия на {score} очков пропадёт.
              </Body>
              <View style={{ gap: space.md, marginTop: space.xl }}>
                <Button
                  kind="primary"
                  label="Начать новую"
                  onPress={() => {
                    setConfirm(false);
                    fresh();
                  }}
                />
                <Button label="Вернуться" onPress={() => setConfirm(false)} />
              </View>
            </Panel>
          </Overlay>
        </View>
      ) : null}
    </View>
  );
}
