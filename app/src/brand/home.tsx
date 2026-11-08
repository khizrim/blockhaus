import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';

import { Block, plastic } from '@/components/Block';
import { Field, type CellLook } from '@/components/Field';
import { Overlay } from '@/components/Overlay';
import { Body, Button, Chip, Gear, Heading, IconButton, Page, Panel, SoundIcon } from '@/components/ui';
import { space } from '@/design/system';
import { useTheme } from '@/design/theme';
import { font } from '@/design/tokens';
import { useGame } from '@/game/store';
import { fx } from '@/sound/sfx';

/* The menu (2026-11-08): settings and sound keys at the top; a small white
   plate that plays one cascade and stops; the wordmark with one red block
   at its end; the record; the keys in. On launch a splash plays first: a 2
   is set down, a 1 beside it, the 2 leans in, the 1 snaps in and they are a
   3. It never loops, and a tap skips it. */

let splashed = false;

export function Home() {
  const { c, sound, setSound } = useTheme();
  const { game, stats, inProgress, newGame, learned, daily } = useGame();
  const [confirm, setConfirm] = useState(false);
  const [splash, setSplash] = useState(!splashed);
  const score = game.score.toLocaleString('ru-RU');
  const play = () => router.push('/game');
  const fresh = () => {
    if (!learned) return router.push({ pathname: '/game', params: { learn: '1' } });
    newGame();
    play();
  };
  const openDaily = () => router.push({ pathname: '/game', params: { daily: '1' } });
  const done = () => {
    splashed = true;
    setSplash(false);
  };

  return (
    <View style={{ flex: 1 }}>
      <Page
        top={
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <IconButton label="Настройки" size={48} onPress={() => router.push('/settings')}>
              <Gear color={c.text} />
            </IconButton>
            <IconButton label={sound ? 'Выключить звук' : 'Включить звук'} size={48} onPress={() => setSound(!sound)}>
              <SoundIcon on={sound} color={c.text} />
            </IconButton>
          </View>
        }>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28 }}>
          {splash ? <View style={{ height: 1 }} /> : <Demo />}
          <Logo />
          {stats.best > 0 ? <Chip>{`Рекорд ${stats.best.toLocaleString('ru-RU')}`}</Chip> : <View style={{ height: 32 }} />}
        </View>
        <View style={{ gap: 12 }}>
          {inProgress ? (
            <>
              <Button kind="primary" size="lg" label="Продолжить" trailing={score} accessibilityLabel={`Продолжить партию, ${score} очков`} onPress={play} />
              <Button size="lg" label="Новая игра" onPress={() => setConfirm(true)} />
            </>
          ) : (
            <Button kind="primary" size="lg" label="Играть" onPress={fresh} />
          )}
          {learned && !daily.done ? <Button size="lg" label={daily.started ? 'Продолжить игру дня' : 'Игра дня'} onPress={openDaily} /> : null}
        </View>
      </Page>

      {/* A new game throws the current one away, so it asks first. */}
      {confirm ? (
        <View style={[StyleSheet.absoluteFill, { zIndex: 2 }]}>
          <Overlay onDismiss={() => setConfirm(false)}>
            <Panel>
              <Heading>Начать новую игру?</Heading>
              <Body muted style={{ marginTop: space.sm }}>
                Текущая партия на {score} очков пропадёт.
              </Body>
              <View style={{ gap: space.md, marginTop: space.xl }}>
                <Button
                  kind="primary"
                  label="Начать новую"
                  onPress={() => {
                    setConfirm(false);
                    fresh();
                  }}
                />
                <Button label="Вернуться" onPress={() => setConfirm(false)} />
              </View>
            </Panel>
          </Overlay>
        </View>
      ) : null}

      {splash ? <Splash onDone={done} /> : null}
    </View>
  );
}

/** The wordmark: "blockhaus" in Rubik 700, one red block at its end. */
export function Logo({ size = 52 }: { size?: number }) {
  const { c } = useTheme();
  const red = c.tile[2];
  const { top, ledge } = plastic(red);
  const b = Math.round(size * 0.7);
  return (
    <View accessible accessibilityRole="header" accessibilityLabel="blockhaus" style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
      <Text allowFontScaling={false} style={{ fontFamily: font.wide, fontSize: size, lineHeight: Math.round(size * 1.05), letterSpacing: -0.045 * size, color: c.text, includeFontPadding: false }}>
        blockhaus
      </Text>
      <View
        style={{
          width: b,
          height: b,
          marginLeft: Math.round(size * 0.12),
          marginBottom: Math.round(size * 0.16),
          borderRadius: Math.round(b * 0.18),
          backgroundColor: red,
          backgroundImage: `linear-gradient(180deg, ${top}, ${red})`,
          boxShadow: `0 ${Math.round(b * 0.07)}px 0 ${ledge}, inset 0 ${Math.max(1, Math.round(b * 0.05))}px 0 rgba(255,255,255,0.45)`,
        }}
      />
    </View>
  );
}

/* ---------- the demo plate: one cascade, played once ---------- */

const START = [0, 0, 0, 1, 0, 2, 3, 0, 0, 0, 6, 12, 24, 0, 0, 0];
const at = (x: number, y: number) => y * 4 + x;
// [from, to, result]
const CHAIN: [number, number, number][] = [
  [at(0, 1), at(1, 1), 3],
  [at(1, 1), at(2, 1), 6],
  [at(2, 1), at(2, 2), 12],
  [at(2, 2), at(3, 2), 24],
];

function Demo() {
  const { width } = useWindowDimensions();
  const cell = Math.floor(Math.min(58, (Math.min(width, 440) - 32) / 5.4) * 1.1);
  const gap = Math.round(cell * 0.1);
  const [vals, setValsState] = useState(START);
  const cur = useRef(START);
  const setVals = (f: (v: number[]) => number[]) => {
    cur.current = f(cur.current);
    setValsState(cur.current);
  };
  const [look, setLook] = useState<Record<number, CellLook>>({});
  const [fly, setFly] = useState<{ from: number; to: number; v: number; id: number } | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    const later = (ms: number, f: () => void) => timers.current.push(setTimeout(f, ms));
    let t = 900;
    later(t, () => {
      setVals((v) => Object.assign(v.slice(), { [at(0, 1)]: 1 }));
      setLook({ [at(0, 1)]: { land: Date.now() } });
    });
    t += 160;
    later(t, () => setLook({ [at(1, 1)]: { lean: [-0.08, 0] } }));
    t += 160;
    later(t, () => setLook({}));
    for (const [from, to, res] of CHAIN) {
      const t0 = t;
      later(t0, () => {
        setFly({ from, to, v: cur.current[from], id: Date.now() });
        setVals((v) => Object.assign(v.slice(), { [from]: 0 }));
      });
      later(t0 + 120, () => {
        setFly(null);
        setVals((v) => Object.assign(v.slice(), { [to]: res }));
        setLook({ [to]: { pop: Date.now() } });
        fx.merge(res, CHAIN.findIndex((s) => s[1] === to));
      });
      t += 270;
    }
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, []);
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Field w={4} h={4} values={vals} cell={cell} gap={gap} look={(i) => look[i]} />
      {fly ? <Flyer key={fly.id} {...fly} cell={cell} gap={gap} /> : null}
    </View>
  );
}

function Flyer({ from, to, v, cell, gap }: { from: number; to: number; v: number; cell: number; gap: number }) {
  const pos = (i: number) => ({ x: (i % 4) * cell + gap, y: ((i / 4) | 0) * cell + gap });
  const a = pos(from);
  const b = pos(to);
  const k = useSharedValue(0);
  useEffect(() => {
    k.value = withTiming(1, { duration: 120, easing: Easing.bezier(0.6, 0, 1, 0.6) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: a.x + (b.x - a.x) * k.value }, { translateY: a.y + (b.y - a.y) * k.value }] }));
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0, zIndex: 1 }, st]}>
      <Block v={v} size={cell - gap} />
    </Animated.View>
  );
}

/* ---------- the splash ---------- */

function Splash({ onDone }: { onDone: () => void }) {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const sz = Math.floor((Math.min(width, 440) - 32) / 6.75);
  const gap = Math.round(sz * 0.1);
  const page = useSharedValue(1);
  const twoY = useSharedValue(-sz * 0.25);
  const twoO = useSharedValue(0);
  const twoX = useSharedValue(0);
  const twoSx = useSharedValue(1);
  const twoSy = useSharedValue(1);
  const oneY = useSharedValue(-sz * 0.25);
  const oneO = useSharedValue(0);
  const oneX = useSharedValue(0);
  const [merged, setMerged] = useState(false);
  const left = useSharedValue(sz + gap);
  const live = useRef(true);

  useEffect(() => {
    const T: ReturnType<typeof setTimeout>[] = [];
    const later = (ms: number, f: () => void) => T.push(setTimeout(() => live.current && f(), ms));
    const fall = { duration: 160, easing: Easing.bezier(0.55, 0, 1, 0.45) };
    const squash = (sx: number, sy: number) => {
      twoSx.value = withSequence(withTiming(sx, { duration: 45 }), withTiming(1, { duration: 95 }));
      twoSy.value = withSequence(withTiming(sy, { duration: 45 }), withTiming(1, { duration: 95 }));
    };
    // the 2 is set down
    twoO.value = withDelay(200, withTiming(1, fall));
    twoY.value = withDelay(200, withTiming(0, fall));
    later(360, () => {
      fx.place(1);
      squash(1.04, 0.94);
    });
    // the 1 beside it
    later(620, () => {
      oneO.value = withTiming(1, fall);
      oneY.value = withTiming(0, fall);
    });
    later(780, () => {
      fx.place(1);
      // the 2 leans in
      twoX.value = withTiming(-sz * 0.09, { duration: 120 });
    });
    // the 1 is pulled and accelerates into it
    later(1000, () => {
      oneX.value = withTiming(sz + gap, { duration: 130, easing: Easing.bezier(0.6, 0, 1, 0.6) });
    });
    later(1130, () => {
      oneO.value = 0;
      twoX.value = 0;
      setMerged(true);
      twoSx.value = withSequence(withTiming(0.88, { duration: 55 }), withTiming(1.03, { duration: 88 }), withTiming(1, { duration: 77 }));
      twoSy.value = withSequence(withTiming(1.06, { duration: 55 }), withTiming(0.98, { duration: 88 }), withTiming(1, { duration: 77 }));
      fx.merge(3, 0);
    });
    // the 3 slides to the middle
    later(1370, () => {
      left.value = withTiming(Math.round((sz + gap) / 2), { duration: 260, easing: Easing.bezier(0.3, 0.6, 0.4, 1) });
    });
    later(2170, () => {
      page.value = withTiming(0, { duration: 220 });
    });
    later(2400, onDone);
    return () => {
      live.current = false;
      T.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pageSt = useAnimatedStyle(() => ({ opacity: page.value }));
  const twoSt = useAnimatedStyle(() => ({
    left: left.value,
    opacity: twoO.value,
    transform: [{ translateX: twoX.value }, { translateY: twoY.value }, { scaleX: twoSx.value }, { scaleY: twoSy.value }],
    transformOrigin: 'bottom',
  }));
  const oneSt = useAnimatedStyle(() => ({ opacity: oneO.value, transform: [{ translateX: oneX.value }, { translateY: oneY.value }] }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: c.bg, zIndex: 5 }, pageSt]}>
      <Pressable
        accessibilityLabel="Пропустить заставку"
        onPress={() => {
          live.current = false;
          onDone();
        }}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: sz * 2 + gap, height: sz }}>
          <Animated.View style={[{ position: 'absolute', left: 0, top: 0 }, oneSt]}>
            <Block v={1} size={sz} />
          </Animated.View>
          <Animated.View style={[{ position: 'absolute', top: 0 }, twoSt]}>
            <Block v={merged ? 3 : 2} size={sz} />
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
