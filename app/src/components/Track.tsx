import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';

import { TileNum } from '@/components/TileNum';
import { Enamel } from '@/design/depth';
import { useTheme } from '@/design/theme';
import { rank } from '@/design/tokens';

const back = (d: number, k = 1.8) => ({ duration: d, easing: Easing.out(Easing.back(k)) });
export const INTRO_STEP = 110; // ms between the track's squares as it assembles

/** The milestones: every new best from 24 up to the goal and two rungs past
    it (for the game that goes on). Each one marks the board when reached. */
export const FIRST_MILESTONE = 24;
export function milestonesFor(goal: number): number[] {
  const out: number[] = [];
  for (let v = FIRST_MILESTONE; v <= goal; v *= 2) out.push(v);
  return out;
}
/** The way to the goal under the board: one small tile per milestone, empty
    until reached, then in its own colour. The last one is the goal. A
    milestone reached pops its square when the flying tile lands in it. */
export function Track({ steps, best, next, width, gap, top, intro = 0 }: { steps: number[]; best: number; next: number | null; width: number; gap: number; top: number; intro?: number }) {
  const between = gap;
  const size = Math.floor((width - between * (steps.length - 1)) / steps.length);
  const h = Math.max(28, Math.min(44, Math.round(size * 0.5)));
  const reached = steps.filter((v) => best >= v).length;
  return (
    <View
      pointerEvents="none"
      accessible
      accessibilityLabel={`Вехи: ${reached} из ${steps.length}.${next ? ` Следующая ${next}.` : ''} Цель ${steps[steps.length - 1]}`}
      style={{ width, flexDirection: 'row', gap: between, marginTop: top }}>
      {steps.map((v, k) => (
        <TrackStep key={v} v={v} on={best >= v} next={v === next} goal={k === steps.length - 1} w={size} h={h} frame={Math.max(3, Math.round(gap * 0.6))} intro={intro} delay={120 + k * INTRO_STEP} />
      ))}
    </View>
  );
}

function TrackStep({ v, on, next, goal, w, h, frame, intro, delay }: { v: number; on: boolean; next: boolean; goal: boolean; w: number; h: number; frame: number; intro: number; delay: number }) {
  const { c, isDark } = useTheme();
  const rk = rank(v);
  const k = useSharedValue(1);
  const was = useRef(on);
  // The track assembling at the start of the first game: each square drops
  // in on its own note, the goal last and hardest.
  useEffect(() => {
    if (!intro) return;
    k.value = 0;
    k.value = withDelay(delay, withSequence(withTiming(goal ? 1.35 : 1.18, { duration: 110, easing: Easing.out(Easing.cubic) }), withTiming(1, back(320, 2.6))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intro]);
  useEffect(() => {
    if (on && !was.current) k.value = withSequence(withTiming(1.25, { duration: 0 }), withTiming(1, back(360, 2.6)));
    was.current = on;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: k.value }] }));
  return (
    <Animated.View style={[{ width: w, height: h, padding: frame, backgroundColor: on || next ? c.line : c.hair }, st]}>
      <View style={{ flex: 1, backgroundColor: on ? c.tile[rk] : c.canvas, alignItems: 'center', justifyContent: 'center' }}>
        <Enamel fill={on ? c.tile[rk] : c.canvas} size={h} empty={!on} dark={isDark} />
        <TileNum v={v} color={on ? c.ink[rk] : next ? c.text : goal ? c.muted : c.faint} size={Math.max(11, Math.round(h * 0.36))} />
      </View>
    </Animated.View>
  );
}


/** The game of the day's track: its three medals, each lit in its colour
    once the score reaches it. The next one to win wears the black frame. */
export function MedalTrack({ medals, score, width, gap, top }: { medals: readonly { at: number; tile: number; name: string }[]; score: number; width: number; gap: number; top: number }) {
  const { c, isDark } = useTheme();
  const size = Math.floor((width - gap * (medals.length - 1)) / medals.length);
  const h = Math.max(28, Math.min(44, Math.round(size * 0.3)));
  const next = medals.find((m) => score < m.at);
  const frame = Math.max(3, Math.round(gap * 0.6));
  return (
    <View pointerEvents="none" accessible accessibilityLabel={next ? `До медали «${next.name}» ${next.at - score}` : 'Все медали взяты'} style={{ width, flexDirection: 'row', gap, marginTop: top }}>
      {medals.map((m, i) => {
        const on = score >= m.at;
        // The medal being played for fills from the left as the score climbs.
        const from = i ? medals[i - 1].at : 0;
        const progress = m === next ? Math.max(0, Math.min(1, (score - from) / (m.at - from))) : 0;
        const tint = m.tile ? c.tile[m.tile] : c.faint;
        const fill = on ? (m.tile ? c.tile[m.tile] : c.faint) : c.canvas;
        const ink = on ? (m.tile ? c.ink[m.tile] : c.text) : m === next ? c.text : c.faint;
        return <MedalStep key={m.at} at={m.at} on={on} fill={fill} ink={ink} tint={tint} progress={progress} framed={on || m === next} w={size} h={h} frame={frame} dark={isDark} />;
      })}
    </View>
  );
}

function MedalStep({ at, on, fill, ink, tint, progress, framed, w, h, frame, dark }: { at: number; on: boolean; fill: string; ink: string; tint: string; progress: number; framed: boolean; w: number; h: number; frame: number; dark: boolean }) {
  const { c } = useTheme();
  const k = useSharedValue(1);
  const was = useRef(on);
  useEffect(() => {
    if (on && !was.current) k.value = withSequence(withTiming(1.25, { duration: 0 }), withTiming(1, back(360, 2.6)));
    was.current = on;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: k.value }] }));
  const p = useSharedValue(progress);
  useEffect(() => {
    p.value = withTiming(progress, { duration: 300, easing: Easing.out(Easing.cubic) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);
  const bar = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));
  return (
    <Animated.View style={[{ width: w, height: h, padding: frame, backgroundColor: framed ? c.line : c.hair }, st]}>
      <View style={{ flex: 1, backgroundColor: fill, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <Enamel fill={fill} size={h} empty={!on} dark={dark} />
        {!on && progress > 0 ? <Animated.View style={[{ position: 'absolute', left: 0, bottom: 0, height: Math.max(4, Math.round(h * 0.22)), backgroundColor: tint }, bar]} /> : null}
        <TileNum v={at} color={ink} size={Math.max(11, Math.round(h * 0.36))} />
      </View>
    </Animated.View>
  );
}

/** Days of the streak as squares: the last seven, lit yellow while the streak holds. */
export function StreakDays({ count, size = 14, gap = 3 }: { count: number; size?: number; gap?: number }) {
  const { c, isDark } = useTheme();
  return (
    <View accessible accessibilityLabel={`Серия: ${count}`} style={{ flexDirection: 'row', gap, alignItems: 'center' }}>
      {Array.from({ length: 7 }, (_, k) => k < Math.min(count, 7)).map((on, k) => (
        <View key={k} style={{ width: size, height: size, padding: 2, backgroundColor: on ? c.line : c.hair }}>
          <View style={{ flex: 1, backgroundColor: on ? c.tile[3] : c.canvas }}>
            <Enamel fill={on ? c.tile[3] : c.canvas} size={size} empty={!on} dark={isDark} />
          </View>
        </View>
      ))}
    </View>
  );
}
