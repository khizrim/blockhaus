import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Field } from '@/components/Field';
import { Overlay } from '@/components/Overlay';
import { Body, Button, Heading, Label, Panel, Screen, Segmented, Toggle, TopBar } from '@/components/ui';
import { useTheme, type ThemeMode } from '@/design/theme';
import { font } from '@/design/tokens';

const PREVIEW = [1, 1, 2, 3, 0, 6, 2, 12, 24, 2, 0, 48, 0, 0, 96];

export default function Settings() {
  const t = useTheme();
  const { c } = t;
  const [confirm, setConfirm] = useState(false);

  return (
    <View style={{ flex: 1 }}>
    <Screen>
      <TopBar title="Настройки" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ gap: 26, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
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
          <View style={{ alignItems: 'center', paddingTop: 4 }}>
            <Field w={5} h={3} values={PREVIEW} cell={44} gap={6} />
          </View>
        </Section>

        <Section title="Ощущения">
          <Row label="Звук" note="Стук фигур и звон слияний">
            <Toggle label="Звук" value={t.sound} onChange={t.setSound} />
          </Row>
          <Row label="Вибрация" note="Лёгкий толчок, когда фигура встаёт или сливается">
            <Toggle label="Вибрация" value={t.haptics} onChange={t.setHaptics} />
          </Row>
          <Row label="Подсказки" note="Строка помощи под доской">
            <Toggle label="Подсказки" value={t.hints} onChange={t.setHints} />
          </Row>
        </Section>

        <Section title="Прогресс">
          <Row label="Рекорд" note="2 410 очков, лучшая плитка 96, сыграно 37 партий">
            <View />
          </Row>
          <Button kind="outline" label="Сбросить прогресс" onPress={() => setConfirm(true)} />
        </Section>

        <Text style={{ fontFamily: font.body, fontSize: 12, color: c.faint, textAlign: 'center' }}>
          Blockhaus 0.1, визуальный прототип
        </Text>
        <Button kind="ghost" label="Дизайн-кит" onPress={() => router.push('/kit')} />
      </ScrollView>
    </Screen>

      {confirm ? (
        <View style={StyleSheet.absoluteFill}>
          <Overlay onDismiss={() => setConfirm(false)}>
            <Panel>
              <Heading size={20}>Сбросить прогресс?</Heading>
              <Body muted style={{ marginTop: 8 }}>
                Рекорд 2 410, лучшая плитка и история 37 партий будут удалены. Вернуть их не получится.
              </Body>
              <View style={{ gap: 10, marginTop: 18 }}>
                <Button kind="danger" label="Удалить прогресс" onPress={() => setConfirm(false)} />
                <Button label="Отмена" onPress={() => setConfirm(false)} />
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
    <View style={{ gap: 12 }}>
      <Label>{title}</Label>
      {children}
    </View>
  );
}

function Row({ label, note, children }: { label: string; note?: string; children: ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: font.bodySemi, fontSize: 16, color: c.text }}>{label}</Text>
        {note ? <Text style={{ fontFamily: font.body, fontSize: 13, color: c.muted }}>{note}</Text> : null}
      </View>
      {children}
    </View>
  );
}
