import { router } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';

import { Field } from '@/components/Field';
import { Arrow, Body, Button, Heading, Ladder, Screen, TopBar } from '@/components/ui';
import { useTheme } from '@/design/theme';
import { space } from '@/design/system';
import engine from '@/game/engine';

const GOAL = engine.DEFAULTS.goal;

/* How to play: five cards, each a tiny board drawn with the real renderer.
   The result of each card pops on a loop so the cause and effect read. */

/* The result pops once, shortly after the card shows. Tap the art to replay.
   No loops: a repeating animation is noise next to the text. */
function useBeat(ms = 600) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const id = setTimeout(() => setN(1), ms);
    return () => clearTimeout(id);
  }, [ms]);
  return [n, () => setN((k) => k + 1)] as const;
}

function Eq({ a, b, w, h, cell = 40 }: { a: (number | null)[]; b: (number | null)[]; w: number; h: number; cell?: number }) {
  const { c } = useTheme();
  const [beat, replay] = useBeat();
  const changed = (i: number) => a[i] !== b[i] && (b[i] ?? 0) > 0;
  return (
    <Pressable onPress={replay} accessibilityRole="button" accessibilityLabel="Показать ещё раз"
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.lg }}>
      <Field w={w} h={h} values={a} cell={cell} gap={6} />
      <Arrow dir="right" color={c.muted} s={16} />
      <Field w={w} h={h} values={b} cell={cell} gap={6} look={(i) => (changed(i) && beat ? { pop: beat } : undefined)} />
    </Pressable>
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
    text: 'Начиная с тройки, равные плитки сливаются в следующую: 3 и 3 дают 6, 6 и 6 дают 12. Слияния идут цепочкой, и длинная цепочка дороже: третье и четвёртое слияние приносят очки вдвое, пятое и дальше втрое.',
    art: () => <Eq w={3} h={1} a={[3, 3, 6]} b={[0, 0, 12]} cell={44} />,
  },
  {
    title: 'Сдвиг',
    text: 'Смахните доску, и всё съедет в одну сторону, а пары по пути сольются. Сдвигов сколько угодно. После каждого с дальнего края въезжает первая фигура из лотка. В настройках можно включить сдвиги за каскады: тогда сдвиг даётся один на каждый лоток и ещё один за каскад из четырёх слияний, фигура при этом не въезжает.',
    art: () => <Eq w={3} h={3} a={[1, 0, 2, 0, 12, 0, 6, 0, 0]} b={[3, 0, 0, 12, 0, 0, 6, 0, 0]} cell={34} />,
  },
  {
    title: `Соберите ${GOAL}`,
    text: `Дойдите по лесенке до ${GOAL}, чтобы победить. Вехи на пути видны под доской: 24, 48, 96 и дальше. Игра кончается, когда ни одна фигура не встаёт на доску и ни один сдвиг ничего не сливает. После ${GOAL} можно играть дальше на очки.`,
    art: () => (
      <View style={{ alignItems: 'center' }}>
        <Ladder best={GOAL} size={28} animate />
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
          <View key={p.title} style={{ width: pageW, paddingTop: space.sm }}>
            <View style={{ height: 208, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface, borderWidth: 1, borderColor: c.hair, marginBottom: space.xl }}>
              {/* Only the visible card animates. */}
              {Math.abs(page - k) <= 0 ? p.art() : null}
            </View>
            <Heading>{p.title}</Heading>
            <Body style={{ marginTop: space.sm }}>{p.text}</Body>
          </View>
        ))}
      </ScrollView>

      <View style={{ marginTop: 'auto', gap: space.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: space.sm }} accessibilityLabel={`Шаг ${page + 1} из ${PAGES.length}`}>
          {PAGES.map((_, k) => (
            <View key={k} style={{ width: k === page ? 24 : 8, height: 8, backgroundColor: k === page ? c.text : c.hair }} />
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
