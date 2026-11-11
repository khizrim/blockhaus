import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Overlay } from '@/components/Overlay';
import { Body, Button, Card, Heading, Label, Panel, Row, Screen, Segmented, Toggle, TopBar } from '@/components/ui';
import { space, type } from '@/design/system';
import { useTheme, type ThemeMode } from '@/design/theme';
import type { LangPref } from '@/i18n';
import { useGame } from '@/game/store';

/* Settings, the minimum (2026-11-08): the theme, sound and touch, the way
   back to the lesson and the rules, the record and a way to wipe it. */
export default function Settings() {
  const p = useTheme();
  const { c, t } = p;
  const [confirm, setConfirm] = useState(false);
  const { stats, resetProgress } = useGame();
  const best = stats.best.toLocaleString(t.locale);

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <TopBar title={t.settings} onBack={() => router.back()} />
        <ScrollView contentContainerStyle={{ gap: space.xxl, paddingBottom: space.xl }} showsVerticalScrollIndicator={false}>
          <Section title={t.theme}>
            <Segmented<ThemeMode>
              value={p.mode}
              onChange={p.setMode}
              options={[
                { value: 'system', label: t.system },
                { value: 'light', label: t.light },
                { value: 'dark', label: t.dark },
              ]}
            />
          </Section>

          {/* Each language is written in itself, so it can be found from the other. */}
          <Section title={t.language}>
            <Segmented<LangPref>
              value={p.langPref}
              onChange={p.setLangPref}
              options={[
                { value: 'system', label: t.system },
                { value: 'ru', label: 'Русский' },
                { value: 'en', label: 'English' },
              ]}
            />
          </Section>

          <Section title={t.game}>
            <Card>
              <Row label={t.sound}>
                <Toggle label={t.sound} value={p.sound} onChange={p.setSound} />
              </Row>
              <Row label={t.music}>
                <Toggle label={t.music} value={p.music} onChange={p.setMusic} />
              </Row>
              <Row label={t.haptics}>
                <Toggle label={t.haptics} value={p.haptics} onChange={p.setHaptics} />
              </Row>
              <Row label={t.hints} note={t.hintsNote}>
                <Toggle label={t.hints} value={p.hints} onChange={p.setHints} />
              </Row>
            </Card>
          </Section>

          <Section title={t.help}>
            <Card>
              <Row
                label={t.learn}
                onPress={() => {
                  router.dismissAll();
                  router.push({ pathname: '/game', params: { learn: '1' } });
                }}
              />
              <Row label={t.rules} onPress={() => router.push('/howto')} />
            </Card>
          </Section>

          <Section title={t.recordTitle}>
            <Card>
              <Row label={t.best}>
                <Text style={[type.bodyStrong, { color: c.text, fontVariant: ['tabular-nums'] }]}>{best}</Text>
              </Row>
            </Card>
            <Button kind="danger" label={t.reset} onPress={() => setConfirm(true)} />
          </Section>
        </ScrollView>
      </Screen>

      {confirm ? (
        <View style={StyleSheet.absoluteFill}>
          <Overlay onDismiss={() => setConfirm(false)}>
            <Panel>
              <Heading>{t.resetAsk}</Heading>
              <Body muted style={{ marginTop: space.sm }}>
                {t.resetText(best)}
              </Body>
              <View style={{ gap: space.md, marginTop: space.xl }}>
                <Button
                  kind="danger"
                  label={t.resetYes}
                  onPress={() => {
                    resetProgress();
                    setConfirm(false);
                  }}
                />
                <Button label={t.resetNo} onPress={() => setConfirm(false)} />
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
