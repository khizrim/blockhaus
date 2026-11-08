import { router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { Button, Label, Row, Rule, Screen, Toggle, TopBar } from '@/components/ui';
import { space, type } from '@/design/system';
import { useTheme } from '@/design/theme';
import { fx, play, type SoundName } from '@/sound/sfx';

/* Every sound in the game, to audition one by one, plus the chains as they
   will sound in play. Prototype only. */

const GROUPS: { title: string; items: { name: SoundName; label: string; note: string }[] }[] = [
  {
    title: 'Фигуры',
    items: [
      { name: 'pick', label: 'Взять фигуру', note: 'Лёгкий щелчок, фигура покидает лоток' },
      { name: 'place-1', label: 'Поставить, 1 клетка', note: 'Деревянный стук' },
      { name: 'place-2', label: 'Поставить, 2 клетки', note: 'Стук чуть ниже и плотнее' },
      { name: 'place-3', label: 'Поставить, 3 клетки', note: 'Самый тяжёлый стук' },
      { name: 'invalid', label: 'Не помещается', note: 'Два глухих удара, без зуммера' },
      { name: 'tray', label: 'Новый лоток', note: 'Три коротких щелчка вверх' },
      { name: 'sweep', label: 'Сдвиг', note: 'Доска скользит по сукну и встаёт' },
    ],
  },
  {
    title: 'Слияния: маримба, ступень за ступенью',
    items: [
      { name: 'merge-3', label: 'Получилась 3', note: 'До' },
      { name: 'merge-4', label: 'Получилась 6', note: 'Ре' },
      { name: 'merge-5', label: 'Получилась 12', note: 'Ми' },
      { name: 'merge-6', label: 'Получилась 24', note: 'Соль' },
      { name: 'merge-7', label: 'Получилась 48', note: 'Ля' },
      { name: 'merge-8', label: 'Получилась 96', note: 'До октавой выше' },
      { name: 'merge-9', label: 'Получилась 192', note: 'Ре над октавой' },
      { name: 'merge-10', label: 'Получилась 384', note: 'Ми над октавой' },
      { name: 'merge-11', label: 'Получилась 768', note: 'Соль над октавой' },
    ],
  },
  {
    title: 'Вехи: новый рекорд партии от 24',
    items: [
      { name: 'milestone-6', label: 'Первая 24', note: 'Колокол на соль' },
      { name: 'milestone-7', label: 'Первая 48', note: 'Колокол на ля' },
      { name: 'milestone-8', label: 'Первая 96', note: 'Колокол на до' },
      { name: 'milestone-9', label: 'Первая 192', note: 'Колокол на ре' },
      { name: 'milestone-11', label: 'Первая 768', note: 'После цели, колокол на соль' },
    ],
  },
  {
    title: 'Конец партии',
    items: [
      { name: 'win', label: 'Победа', note: 'Вся лесенка и аккорд на 192' },
      { name: 'over', label: 'Места нет', note: 'Две ноты вниз, спокойно' },
    ],
  },
  {
    title: 'Интерфейс',
    items: [
      { name: 'tap', label: 'Кнопка', note: 'Тихий бумажный щелчок' },
      { name: 'toggle-on', label: 'Включить', note: 'Два щелчка вверх' },
      { name: 'toggle-off', label: 'Выключить', note: 'Два щелчка вниз' },
    ],
  },
];

export default function Sounds() {
  const { c, sound, music, setMusic } = useTheme();
  return (
    <Screen>
      <TopBar title="Звуки и музыка" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ gap: space.xxl, paddingBottom: space.xl }} showsVerticalScrollIndicator={false}>
        {!sound ? (
          <Text style={[type.secondary, { color: c.tile[2] }]}>Звук выключен в настройках, здесь ничего не будет слышно.</Text>
        ) : null}

        <View style={{ gap: space.sm }}>
          <Label>Музыка</Label>
          <Text style={[type.secondary, { color: c.muted }]}>
            Петля 53 секунды в до-мажорной пентатонике, октавой ниже слияний. Играет в фоне, пока включена в настройках; на паузе затихает.
          </Text>
          <Row label="Музыка в фоне" note="Включить или выключить">
            <Toggle label="Музыка" value={music} onChange={setMusic} />
          </Row>
        </View>

        <View style={{ gap: space.sm }}>
          <Label>Цепочки</Label>
          <Button label="Каскад 3 → 6 → 12" onPress={() => fx.cascade([3, 6, 12])} />
          <Button label="Вся лесенка 3 → 192" onPress={() => fx.cascade([3, 6, 12, 24, 48, 96, 192])} />
          <Button label="Ход: взять, поставить, слить" onPress={() => {
            fx.pick();
            setTimeout(() => fx.place(2), 450);
            setTimeout(() => fx.cascade([3, 6]), 540);
          }} />
        </View>

        {GROUPS.map((g) => (
          <View key={g.title} style={{ gap: space.sm }}>
            <Label>{g.title}</Label>
            <View style={{ backgroundColor: c.plate, borderRadius: 16, boxShadow: `0 4px 0 ${c.plateEdge}`, paddingHorizontal: space.lg }}>
              {g.items.map((it, k) => (
                <View key={it.name}>
                  {k ? <Rule /> : null}
                  <Row label={it.label} note={it.note} onPress={() => play(it.name)} />
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}
