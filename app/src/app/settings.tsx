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
      <TopBar title="SETTINGS" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ gap: 26, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <Section title="Look">
          <Segmented<ThemeMode>
            value={t.mode}
            onChange={t.setMode}
            options={[
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
          />
          <View style={{ alignItems: 'center', paddingTop: 4 }}>
            <Field w={5} h={3} values={PREVIEW} cell={44} gap={6} />
          </View>
        </Section>

        <Section title="Feel">
          <Row label="Sound" note="Placement knocks and merge chimes">
            <Toggle label="Sound" value={t.sound} onChange={t.setSound} />
          </Row>
          <Row label="Haptics" note="A tap when a piece lands or merges">
            <Toggle label="Haptics" value={t.haptics} onChange={t.setHaptics} />
          </Row>
          <Row label="Hints" note="The line of help under the board">
            <Toggle label="Hints" value={t.hints} onChange={t.setHints} />
          </Row>
        </Section>

        <Section title="Progress">
          <Row label="Best score" note="2,410 · best tile 96 · 37 games">
            <View />
          </Row>
          <Button kind="outline" label="Reset progress" onPress={() => setConfirm(true)} />
        </Section>

        <Text style={{ fontFamily: font.body, fontSize: 12, color: c.faint, textAlign: 'center' }}>
          Blockhaus 0.1 · visual prototype
        </Text>
      </ScrollView>
    </Screen>

      {confirm ? (
        <View style={StyleSheet.absoluteFill}>
          <Overlay onDismiss={() => setConfirm(false)}>
            <Panel accent={2}>
              <Heading size={20}>Reset progress?</Heading>
              <Body muted style={{ marginTop: 8 }}>
                Your best score of 2,410, your best tile and 37 games of history will be erased. This can’t be undone.
              </Body>
              <View style={{ gap: 10, marginTop: 18 }}>
                <Button kind="danger" label="Erase progress" onPress={() => setConfirm(false)} />
                <Button label="Keep it" onPress={() => setConfirm(false)} />
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
