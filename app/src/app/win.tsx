import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown } from 'react-native-reanimated';

import { Field } from '@/components/Field';
import engine from '@/game/engine';
import { useGame } from '@/game/store';
import { fx } from '@/sound/sfx';
import { Overlay } from '@/components/Overlay';
import { Body, Button, Heading, Panel, Stat } from '@/components/ui';
import { dur, space } from '@/design/system';

/* The win. One tile, the goal, is the picture: the only colour on the card. */
const GOAL = engine.DEFAULTS.goal;
export default function Win() {
  const { game, markWinSeen, newGame, mode } = useGame();
  useEffect(() => {
    fx.win();
    markWinSeen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Overlay>
      <Panel>
        {/* The box holds the size; the animation lives inside it. On the web
            the entering animation drops its own view's size when it ends, and
            the heading slid up under the tile. */}
        <View style={{ alignSelf: 'flex-start', width: 96, height: 96 }}>
          <Animated.View
            entering={FadeInDown.delay(dur.base).duration(dur.slow).easing(Easing.out(Easing.cubic)).withInitialValues({ opacity: 0, transform: [{ translateY: 8 }] })}
            style={StyleSheet.absoluteFill}>
            <Field w={1} h={1} values={[Math.max(GOAL, game.bestTile)]} cell={96} gap={8} variant="piece" />
          </Animated.View>
        </View>
        <Heading style={{ marginTop: space.xl }}>Вы собрали {Math.max(GOAL, game.bestTile)}</Heading>
        <Body muted style={{ marginTop: space.sm }}>
          {mode === 'daily' ? 'Игра дня выиграна. Доиграйте её до конца, чтобы записать результат.' : 'Партия выиграна. Можно продолжить на очки или начать новую.'}
        </Body>
        <Animated.View entering={FadeIn.delay(dur.slow).duration(dur.base)} style={{ flexDirection: 'row', gap: space.xxl, marginTop: space.xl }}>
          <Stat label="Очки" value={game.score.toLocaleString('ru-RU')} />
          <Stat label="Слияния" value={String(game.merges)} />
          <Stat label="Ходы" value={String(game.moves)} />
        </Animated.View>
        <View style={{ gap: space.md, marginTop: space.xl }}>
          <Button kind="primary" size="lg" label="Играть дальше" onPress={() => router.back()} />
          {mode === 'daily' ? null : (
            <Button
              label="Новая игра"
              onPress={() => {
                newGame();
                router.back();
              }}
            />
          )}
        </View>
      </Panel>
    </Overlay>
  );
}
