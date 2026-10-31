import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Overlay } from '@/components/Overlay';
import { Body, Button, Heading, Panel, Row, Rule, Toggle } from '@/components/ui';
import { space } from '@/design/system';
import { useTheme } from '@/design/theme';
import { useGame } from '@/game/store';
import { dimMusic } from '@/sound/sfx';

export default function Pause() {
  const { sound, setSound, music, setMusic } = useTheme();
  useEffect(() => {
    dimMusic(true);
    return () => dimMusic(false);
  }, []);
  const { game, newGame } = useGame();
  const [confirm, setConfirm] = useState(false);
  const restart = () => {
    newGame();
    router.back();
  };

  if (confirm) {
    return (
      <Overlay onDismiss={() => setConfirm(false)}>
        <Panel>
          <Heading>Начать заново?</Heading>
          <Body muted style={{ marginTop: space.sm }}>
            Текущая партия на {game.score.toLocaleString('ru-RU')} очков пропадёт.
          </Body>
          <View style={{ gap: space.md, marginTop: space.xl }}>
            <Button kind="primary" label="Начать заново" onPress={restart} />
            <Button label="Вернуться" onPress={() => setConfirm(false)} />
          </View>
        </Panel>
      </Overlay>
    );
  }

  return (
    <Overlay onDismiss={() => router.back()}>
      <Panel>
        <Heading>Пауза</Heading>
        <View style={{ gap: space.md, marginTop: space.xl }}>
          <Button kind="primary" size="lg" label="Продолжить" onPress={() => router.back()} />
          <Button label="Начать заново" onPress={() => (game.moves > 0 ? setConfirm(true) : restart())} />
        </View>
        <View style={{ marginTop: space.lg }}>
          <Row label="Звук">
            <Toggle label="Звук" value={sound} onChange={setSound} />
          </Row>
          <Rule />
          <Row label="Музыка">
            <Toggle label="Музыка" value={music} onChange={setMusic} />
          </Row>
          <Rule />
          <Row label="Как играть" onPress={() => router.push('/howto')} />
          <Rule />
          <Row label="Настройки" onPress={() => router.push('/settings')} />
          <Rule />
          <Row label="Выйти в меню" onPress={() => router.dismissTo('/')} />
        </View>
      </Panel>
    </Overlay>
  );
}
