import { router } from 'expo-router';
import { View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown } from 'react-native-reanimated';

import { Field } from '@/components/Field';
import { Overlay } from '@/components/Overlay';
import { Body, Button, Heading, Panel, Stat } from '@/components/ui';
import { dur, space } from '@/design/system';

/* The win. One tile, the 96, is the picture: the only colour on the card. */
export default function Win() {
  return (
    <Overlay>
      <Panel>
        <Animated.View
          entering={FadeInDown.delay(dur.base).duration(dur.slow).easing(Easing.out(Easing.cubic)).withInitialValues({ opacity: 0, transform: [{ translateY: 8 }] })}
          style={{ alignSelf: 'flex-start' }}>
          <Field w={1} h={1} values={[96]} cell={96} gap={8} variant="piece" />
        </Animated.View>
        <Heading style={{ marginTop: space.xl }}>Вы собрали 96</Heading>
        <Body muted style={{ marginTop: space.sm }}>
          Партия выиграна. Можно продолжить на очки или начать новую.
        </Body>
        <Animated.View entering={FadeIn.delay(dur.slow).duration(dur.base)} style={{ flexDirection: 'row', gap: space.xxl, marginTop: space.xl }}>
          <Stat label="Очки" value="2 410" />
          <Stat label="Слияния" value="260" />
        </Animated.View>
        <View style={{ gap: space.md, marginTop: space.xl }}>
          <Button kind="primary" size="lg" label="Играть дальше" onPress={() => router.back()} />
          <Button
            label="Новая игра"
            onPress={() => {
              router.dismissAll();
              router.replace({ pathname: '/game', params: { scene: 'early' } });
            }}
          />
        </View>
      </Panel>
    </Overlay>
  );
}
