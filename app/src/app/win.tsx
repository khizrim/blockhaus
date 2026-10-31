import { router } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown } from 'react-native-reanimated';

import { Field } from '@/components/Field';
import { useGame } from '@/game/store';
import { fx } from '@/sound/sfx';
import { Overlay } from '@/components/Overlay';
import { Body, Button, Heading, Panel, Stat } from '@/components/ui';
import { dur, space } from '@/design/system';

/* The win. One tile, the 192, is the picture: the only colour on the card. */
export default function Win() {
  const { game, markWinSeen, newGame } = useGame();
  useEffect(() => {
    fx.win();
    markWinSeen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Overlay>
      <Panel>
        <Animated.View
          entering={FadeInDown.delay(dur.base).duration(dur.slow).easing(Easing.out(Easing.cubic)).withInitialValues({ opacity: 0, transform: [{ translateY: 8 }] })}
          style={{ alignSelf: 'flex-start', width: 96, height: 96 }}>
          <Field w={1} h={1} values={[Math.max(192, game.bestTile)]} cell={96} gap={8} variant="piece" />
        </Animated.View>
        <Heading style={{ marginTop: space.xl }}>Вы собрали {Math.max(192, game.bestTile)}</Heading>
        <Body muted style={{ marginTop: space.sm }}>
          Партия выиграна. Можно продолжить на очки или начать новую.
        </Body>
        <Animated.View entering={FadeIn.delay(dur.slow).duration(dur.base)} style={{ flexDirection: 'row', gap: space.xxl, marginTop: space.xl }}>
          <Stat label="Очки" value={game.score.toLocaleString('ru-RU')} />
          <Stat label="Слияния" value={String(game.merges)} />
          <Stat label="Ходы" value={String(game.moves)} />
        </Animated.View>
        <View style={{ gap: space.md, marginTop: space.xl }}>
          <Button kind="primary" size="lg" label="Играть дальше" onPress={() => router.back()} />
          <Button
            label="Новая игра"
            onPress={() => {
              newGame();
              router.back();
            }}
          />
        </View>
      </Panel>
    </Overlay>
  );
}
