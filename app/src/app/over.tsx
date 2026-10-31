import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Field } from '@/components/Field';
import { Overlay } from '@/components/Overlay';
import { Body, Button, Label, Panel, TileBadge } from '@/components/ui';
import { sceneByKey } from '@/design/mock';
import { useTheme } from '@/design/theme';
import { font } from '@/design/tokens';

/* Game over: the final board, shrunk to a thumbnail, with the score counting up. */
export default function Over() {
  const { c } = useTheme();
  const final = sceneByKey('late');
  const target = final.score;
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const t0 = Date.now();
    const id = setInterval(() => {
      const k = Math.min(1, (Date.now() - t0) / 900);
      setShown(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k === 1) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [target]);

  return (
    <Overlay>
      <Panel accent={2}>
        <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
          <Field w={6} h={6} values={final.board} cell={17} gap={3} numbers={false} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text allowFontScaling={false} style={{ fontFamily: font.wide, fontSize: 22, color: c.text }}>
              NO ROOM LEFT
            </Text>
            <Body muted style={{ fontSize: 14, lineHeight: 19 }}>
              None of the pieces fit anywhere.
            </Body>
          </View>
        </View>

        <View style={{ marginTop: 20, gap: 4 }}>
          <Label>Score</Label>
          <Text allowFontScaling={false} style={{ fontFamily: font.black, fontSize: 48, lineHeight: 52, color: c.text }}>
            {shown.toLocaleString('en-US')}
          </Text>
        </View>
        <Animated.View entering={FadeInDown.delay(900)} style={{ flexDirection: 'row', gap: 20, marginTop: 6 }}>
          <View style={{ gap: 4 }}>
            <Label>Best tile</Label>
            <TileBadge v={48} />
          </View>
          <View style={{ gap: 4 }}>
            <Label>Merges</Label>
            <Text style={{ fontFamily: font.tile, fontSize: 17, color: c.text }}>{final.merges}</Text>
          </View>
          <View style={{ gap: 4 }}>
            <Label>Best ever</Label>
            <Text style={{ fontFamily: font.tile, fontSize: 17, color: c.text }}>2,410</Text>
          </View>
        </Animated.View>

        <View style={{ gap: 10, marginTop: 22 }}>
          <Button
            kind="primary"
            size="lg"
            label="PLAY AGAIN"
            onPress={() => {
              router.dismissAll();
              router.replace({ pathname: '/game', params: { scene: 'early' } });
            }}
          />
          <Button label="Menu" onPress={() => router.dismissTo('/')} />
        </View>
      </Panel>
    </Overlay>
  );
}
