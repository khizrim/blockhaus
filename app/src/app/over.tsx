import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Field } from '@/components/Field';
import { fx } from '@/sound/sfx';
import { Overlay } from '@/components/Overlay';
import { Body, Button, Heading, Label, Panel, Stat, TileBadge } from '@/components/ui';
import { dur, space, type, useCalm } from '@/design/system';
import { useTheme } from '@/design/theme';
import { useGame } from '@/game/store';

/* Game over: the final board as a thumbnail, the score counting up once. */
export default function Over() {
  const { c } = useTheme();
  const calm = useCalm();
  const { game: final, stats, newGame } = useGame();
  const target = final.score;
  const record = target >= stats.best && target > 0;
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
            <Heading>Места нет</Heading>
            <Body muted small style={{ marginTop: space.xs }}>
              Ни одна фигура из лотка не помещается на доску.
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
        <Animated.View entering={FadeIn.delay(dur.slow).duration(dur.base)} style={{ flexDirection: 'row', gap: space.xxl, marginTop: space.lg }}>
          <Stat label="Лучшая плитка">
            <TileBadge v={final.bestTile} />
          </Stat>
          <Stat label="Слияния" value={String(final.merges)} />
          <Stat label={record ? 'Новый рекорд' : 'Рекорд'} value={stats.best.toLocaleString('ru-RU')} />
        </Animated.View>

        <View style={{ gap: space.md, marginTop: space.xl }}>
          <Button
            kind="primary"
            size="lg"
            label="Сыграть ещё"
            onPress={() => {
              newGame();
              router.back();
            }}
          />
          <Button label="Выйти в меню" onPress={() => router.dismissTo('/')} />
        </View>
      </Panel>
    </Overlay>
  );
}
