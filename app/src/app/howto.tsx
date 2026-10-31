import { router } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { ScrollView, Text, useWindowDimensions, View } from 'react-native';

import { Field } from '@/components/Field';
import { Arrow, Body, Button, Heading, Ladder, Screen, TopBar } from '@/components/ui';
import { useTheme } from '@/design/theme';
import { font } from '@/design/tokens';

/* How to play: five cards, each a tiny board drawn with the real renderer.
   The result of each card pops on a loop so the cause and effect read. */

function useBeat(ms = 1800) {
  const [n, setN] = useState(1);
  useEffect(() => {
    const id = setInterval(() => setN((k) => k + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
  return n;
}

function Eq({ a, b, w, h, cell = 40 }: { a: (number | null)[]; b: (number | null)[]; w: number; h: number; cell?: number }) {
  const { c } = useTheme();
  const beat = useBeat();
  const changed = (i: number) => a[i] !== b[i] && (b[i] ?? 0) > 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
      <Field w={w} h={h} values={a} cell={cell} gap={6} />
      <Arrow dir="right" color={c.text} s={18} />
      <Field w={w} h={h} values={b} cell={cell} gap={6} look={(i) => (changed(i) ? { pop: beat } : undefined)} />
    </View>
  );
}

const PAGES: { title: string; text: string; art: () => ReactNode }[] = [
  {
    title: 'Ставьте фигуры',
    text: 'Перетащите фигуру из лотка на свободные клетки. В лотке три фигуры, ставить можно в любом порядке.',
    art: () => <Eq w={3} h={2} a={[0, 0, 2, 0, 0, 0]} b={[1, 0, 2, 1, 0, 0]} />,
  },
  {
    title: '1 + 2 = 3',
    text: 'Клетка, вставшая рядом с парой, сливается с ней. Единица пара двойке. Две единицы или две двойки просто стоят рядом.',
    art: () => <Eq w={2} h={2} a={[1, 2, 1, 1]} b={[0, 3, 1, 1]} cell={44} />,
  },
  {
    title: 'Равные удваиваются',
    text: 'Начиная с тройки, равные плитки сливаются в следующую: 3 и 3 дают 6, 6 и 6 дают 12. Слияния идут цепочкой.',
    art: () => <Eq w={3} h={1} a={[3, 3, 6]} b={[0, 0, 12]} cell={44} />,
  },
  {
    title: 'Сдвиг',
    text: 'Дважды за лоток можно сдвинуть всю доску в одну сторону. Пары, встретившиеся по пути, сливаются.',
    art: () => <Eq w={3} h={3} a={[1, 0, 2, 0, 12, 0, 6, 0, 0]} b={[3, 0, 0, 12, 0, 0, 6, 0, 0]} cell={34} />,
  },
  {
    title: 'Соберите 96',
    text: 'Дойдите по лесенке до 96, чтобы победить. Игра кончается, когда ни одна фигура из лотка не помещается. После 96 можно играть дальше на очки.',
    art: () => (
      <View style={{ alignItems: 'center' }}>
        <Ladder best={96} size={28} animate />
      </View>
    ),
  },
];

export default function HowTo() {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const pageW = Math.min(width, 440) - 32;
  const [page, setPage] = useState(0);
  const ref = useRef<ComponentRef<typeof ScrollView>>(null);
  const go = (k: number) => {
    ref.current?.scrollTo({ x: k * pageW, animated: true });
    setPage(k);
  };
  const last = page === PAGES.length - 1;

  return (
    <Screen>
      <TopBar title="Как играть" close onBack={() => router.back()} />
      <ScrollView
        ref={ref}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / pageW))}
        style={{ flexGrow: 0 }}>
        {PAGES.map((p, k) => (
          <View key={p.title} style={{ width: pageW, gap: 22, paddingTop: 12 }}>
            <View style={{ height: 200, alignItems: 'center', justifyContent: 'center', backgroundColor: c.canvas, borderWidth: 2, borderColor: c.stroke }}>
              {/* Only the visible card animates. */}
              {Math.abs(page - k) <= 0 ? p.art() : null}
            </View>
            <Heading size={26}>{p.title}</Heading>
            <Body>{p.text}</Body>
          </View>
        ))}
      </ScrollView>

      <View style={{ marginTop: 'auto', gap: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
          {PAGES.map((_, k) => (
            <View key={k} style={{ width: k === page ? 22 : 10, height: 10, backgroundColor: k === page ? c.text : 'transparent', borderWidth: 2, borderColor: c.text }} />
          ))}
        </View>
        <Button
          kind="primary"
          size="lg"
          label={last ? 'Понятно' : 'Дальше'}
          onPress={() => (last ? router.back() : go(page + 1))}
        />
      </View>
    </Screen>
  );
}
