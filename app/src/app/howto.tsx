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
  const { c, t } = useTheme();
  const [beat, replay] = useBeat();
  const changed = (i: number) => a[i] !== b[i] && (b[i] ?? 0) > 0;
  return (
    <Pressable onPress={replay} accessibilityRole="button" accessibilityLabel={t.replay}
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.lg }}>
      <Field w={w} h={h} values={a} cell={cell} gap={6} />
      <Arrow dir="right" color={c.muted} s={16} />
      <Field w={w} h={h} values={b} cell={cell} gap={6} look={(i) => (changed(i) && beat ? { pop: beat } : undefined)} />
    </Pressable>
  );
}

/** Each card's art; its title and text come from the strings, in order. */
const ART: (() => ReactNode)[] = [
  () => <Eq w={3} h={2} a={[0, 0, 2, 0, 0, 0]} b={[1, 0, 2, 1, 0, 0]} />,
  () => <Eq w={2} h={2} a={[1, 2, 1, 1]} b={[0, 3, 1, 1]} cell={44} />,
  () => <Eq w={3} h={1} a={[3, 3, 6]} b={[0, 0, 12]} cell={44} />,
  () => <Eq w={3} h={3} a={[1, 0, 2, 0, 12, 0, 6, 0, 0]} b={[3, 0, 0, 12, 0, 0, 6, 0, 0]} cell={34} />,
  () => (
    <View style={{ alignItems: 'center' }}>
      <Ladder best={GOAL} size={28} animate />
    </View>
  ),
];

export default function HowTo() {
  const { c, t } = useTheme();
  const PAGES = t.rulesPages(GOAL).map((p, k) => ({ ...p, art: ART[k] }));
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
      <TopBar title={t.howto} close onBack={() => router.back()} />
      <ScrollView
        ref={ref}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / pageW))}
        style={{ flexGrow: 0 }}>
        {PAGES.map((p, k) => (
          <View key={k} style={{ width: pageW, paddingTop: space.sm }}>
            <View style={{ height: 208, alignItems: 'center', justifyContent: 'center', backgroundColor: c.plate, borderRadius: 20, boxShadow: `0 6px 0 ${c.plateEdge}`, marginBottom: space.xl }}>
              {/* Only the visible card animates. */}
              {Math.abs(page - k) <= 0 ? p.art() : null}
            </View>
            <Heading>{p.title}</Heading>
            <Body style={{ marginTop: space.sm }}>{p.text}</Body>
          </View>
        ))}
      </ScrollView>

      <View style={{ marginTop: 'auto', gap: space.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: space.sm }} accessibilityLabel={t.step(page + 1, PAGES.length)}>
          {PAGES.map((_, k) => (
            <View key={k} style={{ width: k === page ? 24 : 8, height: 8, borderRadius: 4, backgroundColor: k === page ? '#356BFF' : c.canvas, boxShadow: k === page ? 'none' : 'inset 0 1px 2px rgba(0,0,0,0.12)' }} />
          ))}
        </View>
        <Button
          kind="primary"
          size="lg"
          label={last ? t.gotIt : t.next}
          onPress={() => (last ? router.back() : go(page + 1))}
        />
      </View>
    </Screen>
  );
}
