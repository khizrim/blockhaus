import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Overlay } from '@/components/Overlay';
import { Button, Heading, Label, Panel, Toggle } from '@/components/ui';
import { scenes } from '@/design/mock';
import { useTheme } from '@/design/theme';
import { font } from '@/design/tokens';

export default function Pause() {
  const { c, sound, setSound } = useTheme();
  const { scene } = useLocalSearchParams<{ scene?: string }>();
  const openScene = (key: string) => {
    router.dismissAll();
    router.replace({ pathname: '/game', params: { scene: key } });
  };

  return (
    <Overlay onDismiss={() => router.back()}>
      <Panel>
        <Heading size={24} style={{ marginBottom: 18 }}>
          Пауза
        </Heading>
        <View style={{ gap: 10 }}>
          <Button kind="primary" size="lg" label="Продолжить" onPress={() => router.back()} />
          <Button label="Начать заново" onPress={() => openScene('early')} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button style={{ flex: 1 }} label="Как играть" onPress={() => router.push('/howto')} />
            <Button style={{ flex: 1 }} label="Настройки" onPress={() => router.push('/settings')} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 }}>
            <Text style={{ fontFamily: font.bodySemi, fontSize: 15, color: c.text }}>Звук</Text>
            <Toggle label="Звук" value={sound} onChange={setSound} />
          </View>
          <Button kind="ghost" label="Выйти в меню" onPress={() => router.dismissTo('/')} />
        </View>

        {/* Prototype only: jump between still positions and end screens. */}
        <View style={{ marginTop: 14, paddingTop: 14, borderTopWidth: 2, borderColor: c.fold, gap: 8 }}>
          <Label>Сцены прототипа</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {scenes.map((s) => (
              <Chip key={s.key} label={s.title} on={s.key === (scene ?? 'play')} onPress={() => openScene(s.key)} />
            ))}
            <Chip label="Победа" onPress={() => router.replace('/win')} />
            <Chip label="Проигрыш" onPress={() => router.replace('/over')} />
          </View>
        </View>
      </Panel>
    </Overlay>
  );
}

function Chip({ label, on, onPress }: { label: string; on?: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{ paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1.5, borderColor: c.text, backgroundColor: on ? c.text : 'transparent' }}>
      <Text style={{ fontFamily: font.bodySemi, fontSize: 12, color: on ? c.bg : c.text }}>{label}</Text>
    </Pressable>
  );
}
