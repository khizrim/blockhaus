import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Overlay } from '@/components/Overlay';
import { Body, Button, Gear, Heading, IconButton, Page, Panel, SoundIcon } from '@/components/ui';
import { space } from '@/design/system';
import { useTheme } from '@/design/theme';
import { useGame } from '@/game/store';
import { dimMusic } from '@/sound/sfx';

/* Pause (2026-11-08): a page in the table colour. The sound key at the top,
   then three keys: carry on, start again, back to the menu. */
export default function Pause() {
  const { c, sound, setSound } = useTheme();
  useEffect(() => {
    dimMusic(true);
    return () => dimMusic(false);
  }, []);
  const { game, newGame, lesson, finishLessons } = useGame();
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
    <Page
      top={
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <IconButton label="Настройки" size={48} onPress={() => router.push('/settings')}>
            <Gear color={c.text} />
          </IconButton>
          <IconButton label={sound ? 'Выключить звук' : 'Включить звук'} size={48} onPress={() => setSound(!sound)}>
            <SoundIcon on={sound} color={c.text} />
          </IconButton>
        </View>
      }>
      <View style={{ flex: 1, justifyContent: 'center', gap: 12 }}>
        <Button kind="primary" size="lg" label="Продолжить" onPress={() => router.back()} />
        <Button size="lg" label="Заново" onPress={() => (game.moves > 0 ? setConfirm(true) : restart())} />
        <Button size="lg" label="В меню" onPress={() => router.dismissTo('/')} />
        {lesson !== null ? (
          <Button
            kind="ghost"
            label="Пропустить обучение"
            onPress={() => {
              finishLessons();
              router.back();
            }}
          />
        ) : null}
      </View>
    </Page>
  );
}
