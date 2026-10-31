import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Overlay } from '@/components/Overlay';
import { Body, Button, Heading, Panel, Row, Rule, Toggle } from '@/components/ui';
import { space } from '@/design/system';
import { useTheme } from '@/design/theme';

export default function Pause() {
  const { sound, setSound } = useTheme();
  const [confirm, setConfirm] = useState(false);
  const restart = () => {
    router.dismissAll();
    router.replace({ pathname: '/game', params: { scene: 'early' } });
  };

  if (confirm) {
    return (
      <Overlay onDismiss={() => setConfirm(false)}>
        <Panel>
          <Heading>Начать заново?</Heading>
          <Body muted style={{ marginTop: space.sm }}>
            Текущая партия на 129 очков пропадёт.
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
          <Button label="Начать заново" onPress={() => setConfirm(true)} />
        </View>
        <View style={{ marginTop: space.lg }}>
          <Row label="Звук">
            <Toggle label="Звук" value={sound} onChange={setSound} />
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
