import { router } from "expo-router";
import { useState, type ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Overlay } from "@/components/Overlay";
import {
  Body,
  Button,
  Heading,
  Label,
  Panel,
  Row,
  Rule,
  Screen,
  Segmented,
  Toggle,
  TopBar,
} from "@/components/ui";
import { scenes } from "@/design/mock";
import { space, type } from "@/design/system";
import { useTheme, type ThemeMode } from "@/design/theme";
import { useGame } from "@/game/store";

/* Settings: a plain list. Sections are labelled, rows are 56 tall and split by
   hairlines, controls sit on the right. */
export default function Settings() {
  const t = useTheme();
  const { c } = t;
  const [confirm, setConfirm] = useState(false);
  const { stats, resetProgress, loadPosition } = useGame();
  const best = stats.best.toLocaleString("ru-RU");
  const openScene = (key: string) => {
    const sc = scenes.find((x) => x.key === key);
    if (!sc) return;
    loadPosition(sc);
    router.dismissAll();
    router.push("/game");
  };

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <TopBar title="Настройки" onBack={() => router.back()} />
        <ScrollView
          contentContainerStyle={{ gap: space.xxl, paddingBottom: space.xl }}
          showsVerticalScrollIndicator={false}
        >
          <Section title="Тема">
            <Segmented<ThemeMode>
              value={t.mode}
              onChange={t.setMode}
              options={[
                { value: "system", label: "Как в системе" },
                { value: "light", label: "Светлая" },
                { value: "dark", label: "Тёмная" },
              ]}
            />
          </Section>

          <Section title="Игра">
            <List>
              <Row label="Звук" note="Стук фигур и звон слияний">
                <Toggle label="Звук" value={t.sound} onChange={t.setSound} />
              </Row>
              <Row label="Музыка" note="Тихая мелодия в фоне, в тон слияниям">
                <Toggle label="Музыка" value={t.music} onChange={t.setMusic} />
              </Row>
              <Row label="Вибрация" note="Лёгкий толчок, когда фигура встаёт">
                <Toggle
                  label="Вибрация"
                  value={t.haptics}
                  onChange={t.setHaptics}
                />
              </Row>
              <Row label="Подсказки" note="Строка помощи под доской">
                <Toggle
                  label="Подсказки"
                  value={t.hints}
                  onChange={t.setHints}
                />
              </Row>
            </List>
          </Section>

          <Section title="Помощь">
            <List>
              <Row
                label="Пройти обучение"
                note="Пять коротких шагов на настоящей доске"
                onPress={() => {
                  router.dismissAll();
                  router.push({ pathname: "/game", params: { learn: "1" } });
                }}
              />
              <Row label="Правила" onPress={() => router.push("/howto")} />
            </List>
          </Section>

          <Section title="Прогресс">
            <List>
              <Row
                label="Рекорд"
                note={`Лучшая плитка ${stats.bestTile || "—"}, партий: ${stats.played}, побед: ${stats.wins}`}
              >
                <Text
                  style={[
                    type.bodyStrong,
                    { color: c.text, fontVariant: ["tabular-nums"] },
                  ]}
                >
                  {best}
                </Text>
              </Row>
            </List>
            <Button
              kind="danger"
              label="Сбросить прогресс"
              onPress={() => setConfirm(true)}
            />
          </Section>

          {/* Developer builds only: still positions, the sound bench and the kit.
              A release build never shows this section. */}
          {__DEV__ ? (
            <Section title="Для разработки">
              <List>
                {scenes.map((s) => (
                  <Row
                    key={s.key}
                    label={s.title}
                    onPress={() => openScene(s.key)}
                  />
                ))}

                <Row
                  label="Все звуки и музыка"
                  onPress={() => router.push("/sounds")}
                />
                <Row label="Дизайн-кит" onPress={() => router.push("/kit")} />
              </List>
            </Section>
          ) : null}

          <Label meta style={{ textAlign: "center" }}>
            Blockhaus 1.0
          </Label>
        </ScrollView>
      </Screen>

      {confirm ? (
        <View style={StyleSheet.absoluteFill}>
          <Overlay onDismiss={() => setConfirm(false)}>
            <Panel>
              <Heading>Сбросить прогресс?</Heading>
              <Body muted style={{ marginTop: space.sm }}>
                Рекорд {best}, лучшая плитка, счёт партий и текущая партия будут
                удалены. Вернуть их не получится.
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

/** Rows on an L1 surface, split by hairlines. */
function List({ children }: { children: ReactNode }) {
  const { c } = useTheme();
  const items = (Array.isArray(children) ? children.flat() : [children]).filter(
    Boolean,
  );
  return (
    <View
      style={{
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.hair,
        paddingHorizontal: space.lg,
      }}
    >
      {items.map((child, k) => (
        <View key={k}>
          {k ? <Rule /> : null}
          {child}
        </View>
      ))}
    </View>
  );
}
