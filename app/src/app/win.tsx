import { router } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, FadeIn, ZoomIn } from 'react-native-reanimated';

import { Overlay } from '@/components/Overlay';
import { Block, Poster, PosterBoard, ScoreBand, usePoster } from '@/components/Poster';
import { TileNum } from '@/components/TileNum';
import { Track, milestonesFor } from '@/components/Track';
import { Body, Button } from '@/components/ui';
import { dur, space } from '@/design/system';
import { useTheme } from '@/design/theme';
import { rank } from '@/design/tokens';
import engine from '@/game/engine';
import { useGame } from '@/game/store';
import { fx } from '@/sound/sfx';

/* The win, as the same poster as game over. The board as it stands; beside
   it one tall block, the goal tile itself, in its own colour, the whole
   height of the board. The score, the track lit to the end. No sentence:
   the block is the news. */
const GOAL = engine.DEFAULTS.goal;
export default function Win() {
  const { c } = useTheme();
  const { game, markWinSeen, newGame, mode } = useGame();
  const { L, inner, board, side } = usePoster();
  const goal = Math.max(GOAL, game.bestTile);
  const rk = rank(goal);
  const steps = milestonesFor(game.cfg.goal);
  useEffect(() => {
    fx.win();
    markWinSeen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Overlay>
      <Poster label={`Вы собрали ${goal}. ${game.score} очков.`}>
        <View style={{ flexDirection: 'row', gap: L }}>
          <PosterBoard values={game.board} />
          <Animated.View entering={ZoomIn.delay(dur.base).duration(dur.slow).easing(Easing.out(Easing.back(1.6)))}>
            <Block fill={c.tile[rk]} style={{ width: side, height: board, alignItems: 'center', justifyContent: 'center' }}>
              <TileNum v={goal} color={c.ink[rk]} size={Math.round(side * 0.34)} />
            </Block>
          </Animated.View>
        </View>
        <ScoreBand value={game.score} />
        <Animated.View entering={FadeIn.delay(dur.slow).duration(dur.base)}>
          <Block style={{ padding: space.md }}>
            <Track steps={steps} best={game.bestTile} next={null} width={inner - space.md * 2} gap={4} top={0} />
          </Block>
        </Animated.View>
      </Poster>
      <View style={{ width: '100%', gap: space.md, marginTop: space.lg }}>
        {game.score >= 1919 ? (
          // The score milestone, named once, where there is room to read it.
          <Body muted small style={{ textAlign: 'center' }}>1919 очков: в этом году открылся Баухаус</Body>
        ) : null}
        {mode === 'daily' ? <Body muted small style={{ textAlign: 'center' }}>Доиграйте до конца, чтобы записать результат</Body> : null}
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
    </Overlay>
  );
}
