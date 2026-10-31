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
    title: 'Drop pieces',
    text: 'Drag a piece from the tray onto any empty cells. Three pieces per tray; use them in any order.',
    art: () => <Eq w={3} h={2} a={[0, 0, 2, 0, 0, 0]} b={[1, 0, 2, 1, 0, 0]} />,
  },
  {
    title: '1 + 2 = 3',
    text: 'A cell that lands beside its partner merges with it. A 1 pairs with a 2. Two 1s, or two 2s, just sit side by side.',
    art: () => <Eq w={2} h={2} a={[1, 2, 1, 1]} b={[0, 3, 1, 1]} cell={44} />,
  },
  {
    title: 'Equals double',
    text: 'From 3 up, equal tiles merge into the next rung: 3 and 3 make 6, 6 and 6 make 12. Merges cascade.',
    art: () => <Eq w={3} h={1} a={[3, 3, 6]} b={[0, 0, 12]} cell={44} />,
  },
  {
    title: 'Sweep',
    text: 'Twice per tray you can slide the whole board one way. Pairs that meet on the way combine.',
    art: () => <Eq w={3} h={3} a={[1, 0, 2, 0, 12, 0, 6, 0, 0]} b={[3, 0, 0, 12, 0, 0, 6, 0, 0]} cell={34} />,
  },
  {
    title: 'Make 96',
    text: 'Climb the ladder to 96 to win. The game ends when no piece in the tray fits. You can keep going past 96 for score.',
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
      <TopBar title="How to play" close onBack={() => router.back()} />
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
            <Text allowFontScaling={false} style={{ fontFamily: font.wide, fontSize: 13, color: c.muted, letterSpacing: 1.4 }}>
              {k + 1} / {PAGES.length}
            </Text>
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
          label={last ? 'Got it' : 'Next'}
          onPress={() => (last ? router.back() : go(page + 1))}
        />
      </View>
    </Screen>
  );
}
