import { router } from 'expo-router';
import { useEffect } from 'react';
import { useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';

import { Field } from '@/components/Field';
import { Block } from '@/components/Block';
import { Body, Button, Chip, Page } from '@/components/ui';
import { useTheme } from '@/design/theme';
import { personalGoal } from '@/game/personal-goal';
import { useGame } from '@/game/store';
import { fx } from '@/sound/sfx';

export default function Over() {
  const { game: final, previousBestTile, newGame } = useGame();
  const { t } = useTheme();
  const { width } = useWindowDimensions();
  const result = final.bestTile ? t.bestTile(final.bestTile) : t.noBestTile;
  const record = final.bestTile >= personalGoal(previousBestTile);
  const next = personalGoal(Math.max(previousBestTile, final.bestTile));
  useEffect(() => fx.over(), []);

  const k = useSharedValue(0);
  useEffect(() => {
    k.value = withDelay(650, withSequence(withTiming(1.1, { duration: 150 }), withTiming(1, { duration: 110 })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const chipSt = useAnimatedStyle(() => ({ opacity: Math.min(1, k.value), transform: [{ scale: 0.6 + 0.4 * Math.min(1, k.value) + Math.max(0, k.value - 1) }] }));
  const cell = Math.floor(((Math.min(width, 440) - 32) * 0.62) / 6);

  return (
    <Page>
      <View accessible accessibilityLabel={`${t.noRoom(final.score)} ${result}. ${record ? t.newRecord + '. ' : ''}${t.tileGoal(next)}.`} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <View style={{ opacity: 0.6 }}>
          <Field w={6} h={6} values={final.board} cell={cell} gap={Math.max(3, Math.round(cell * 0.1))} />
        </View>
        {final.bestTile > 0 && <Block size={68} v={final.bestTile} />}
        <Body>{result}</Body>
        <Animated.View style={chipSt}>
          {record ? <Chip yellow>{t.newRecord}</Chip> : <Chip>{t.tileGoal(next)}</Chip>}
        </Animated.View>
        {record && <Body>{t.tileGoal(next)}</Body>}
        <Body small muted>{t.score(final.score)}</Body>
      </View>
      <View style={{ gap: 12 }}>
        <Button
          kind="primary"
          size="lg"
          label={t.again}
          onPress={() => {
            newGame();
            router.back();
          }}
        />
        <Button kind="secondary" size="lg" label={t.toMenu} onPress={() => router.dismissTo('/')} />
      </View>
    </Page>
  );
}
