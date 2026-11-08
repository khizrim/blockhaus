import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Overlay } from '@/components/Overlay';
import { Body, Button, Card, Heading, Label, Panel, Row, Screen, Segmented, Toggle, TopBar } from '@/components/ui';
import { space, type } from '@/design/system';
import { useTheme, type ThemeMode } from '@/design/theme';
import { useGame } from '@/game/store';

/* Settings, the minimum (2026-11-08): the theme, sound and touch, the way
   back to the lesson and the rules, the record and a way to wipe it. */
export default function Settings() {
  const t = useTheme();
  const { c } = t;
  const [confirm, setConfirm] = useState(false);
  const { stats, resetProgress } = useGame();
  const best = stats.best.toLocaleString('ru-RU');

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <TopBar title="Настройки" onBack={() => router.back()} />
        <ScrollView contentContainerStyle={{ gap: space.xxl, paddingBottom: space.xl }} showsVerticalScrollIndicator={false}>
          <Section title="Тема">
            <Segmented<ThemeMode>
              value={t.mode}
              onChange={t.setMode}
              options={[
                { value: 'system', label: 'Как в системе' },
                { value: 'light', label: 'Светлая' },
                { value: 'dark', label: 'Тёмная' },
              ]}
            />
          </Section>

          <Section title="Игра">
            <Card>
              <Row label="Звук">
                <Toggle label="Звук" value={t.sound} onChange={t.setSound} />
              </Row>
              <Row label="Музыка">
                <Toggle label="Музыка" value={t.music} onChange={t.setMusic} />
              </Row>
              <Row label="Вибрация">
                <Toggle label="Вибрация" value={t.haptics} onChange={t.setHaptics} />
              </Row>
              <Row label="Подсказки" note="Доска покажет ход, если долго думать">
                <Toggle label="Подсказки" value={t.hints} onChange={t.setHints} />
              </Row>
            </Card>
          </Section>

          <Section title="Помощь">
            <Card>
              <Row
                label="Пройти обучение"
                onPress={() => {
                  router.dismissAll();
                  router.push({ pathname: '/game', params: { learn: '1' } });
                }}
              />
              <Row label="Правила" onPress={() => router.push('/howto')} />
            </Card>
          </Section>

          <Section title="Рекорд">
            <Card>
              <Row label="Лучший счёт">
                <Text style={[type.bodyStrong, { color: c.text, fontVariant: ['tabular-nums'] }]}>{best}</Text>
              </Row>
            </Card>
            <Button kind="danger" label="Сбросить прогресс" onPress={() => setConfirm(true)} />
          </Section>
        </ScrollView>
      </Screen>

      {confirm ? (
        <View style={StyleSheet.absoluteFill}>
          <Overlay onDismiss={() => setConfirm(false)}>
            <Panel>
              <Heading>Сбросить прогресс?</Heading>
              <Body muted style={{ marginTop: space.sm }}>
                Рекорд {best} и текущая партия будут удалены. Вернуть их не получится.
              </Body>
              <View style={{ gap: space.md, marginTop: space.xl }}>
                <Button
                  kind="danger"
                  label="Удалить прогресс"
                  onPress={() => {
                    resetProgress();
                    setConfirm(false);
                  }}
                />
                <Button label="Оставить" onPress={() => setConfirm(false)} />
              </View>
            </Panel>
          </Overlay>
        </View>
      ) : null}
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <Label>{title}</Label>
      {children}
    </View>
  );
}
