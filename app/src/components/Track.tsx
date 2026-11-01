import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';

import { TileNum } from '@/components/TileNum';
import { Enamel } from '@/design/depth';
import { useTheme } from '@/design/theme';
import { type } from '@/design/system';
import { rank } from '@/design/tokens';
import { minutesLeft } from '@/game/daily';

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
export function Track({ steps, best, next, width, gap, top, intro = 0, progress = 0 }: { steps: number[]; best: number; next: number | null; width: number; gap: number; top: number; intro?: number; /** How far the board is toward `next`, 0..1: a bar along its square's floor. */ progress?: number }) {
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
        <TrackStep key={v} v={v} on={best >= v} next={v === next} progress={v === next ? progress : 0} goal={k === steps.length - 1} w={size} h={h} frame={Math.max(3, Math.round(gap * 0.6))} intro={intro} delay={120 + k * INTRO_STEP} />
      ))}
    </View>
  );
}

function TrackStep({ v, on, next, goal, w, h, frame, intro, delay, progress }: { v: number; on: boolean; next: boolean; goal: boolean; w: number; h: number; frame: number; intro: number; delay: number; progress: number }) {
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
  // The next milestone fills along its floor as the board gathers toward it.
  const p = useSharedValue(progress);
  useEffect(() => {
    p.value = withTiming(progress, { duration: 300, easing: Easing.out(Easing.cubic) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);
  const bar = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));
  return (
    <Animated.View style={[{ width: w, height: h, padding: frame, backgroundColor: on || next ? c.line : c.hair }, st]}>
      <View style={{ flex: 1, backgroundColor: on ? c.tile[rk] : c.canvas, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <Enamel fill={on ? c.tile[rk] : c.canvas} size={h} empty={!on} dark={isDark} />
        {!on && next && progress > 0 ? <Animated.View style={[{ position: 'absolute', left: 0, bottom: 0, height: Math.max(4, Math.round(h * 0.22)), backgroundColor: c.tile[rk] }, bar]} /> : null}
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
export function StreakDays({ count, size = 14, gap = 3, shield = 0 }: { count: number; size?: number; gap?: number; shield?: number }) {
  const { c, isDark } = useTheme();
  return (
    <View accessible accessibilityLabel={`Серия: ${count}${shield ? ', один пропуск в запасе' : ''}`} style={{ flexDirection: 'row', gap, alignItems: 'center' }}>
      {Array.from({ length: 7 }, (_, k) => k < Math.min(count, 7)).map((on, k) => (
        <View key={k} style={{ width: size, height: size, padding: 2, backgroundColor: on ? c.line : c.hair }}>
          <View style={{ flex: 1, backgroundColor: on ? c.tile[3] : c.canvas }}>
            <Enamel fill={on ? c.tile[3] : c.canvas} size={size} empty={!on} dark={isDark} />
          </View>
        </View>
      ))}
      {/* A gold medal's shield: one missed day the streak survives. Blue, set apart. */}
      {shield ? (
        <View style={{ width: size, height: size, marginLeft: gap, padding: 2, backgroundColor: c.line }}>
          <View style={{ flex: 1, backgroundColor: c.tile[1] }}>
            <Enamel fill={c.tile[1]} size={size} dark={isDark} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** The workshop rank: its name and a strip of ten squares that fill toward
    the next rank, lit in the rank's own colour. */
export function RankStrip({ name, into, need, level, width, top = 0 }: { name: string; into: number; need: number; level: number; width: number; top?: number }) {
  const { c, isDark } = useTheme();
  const lit = Math.floor((into / need) * 10);
  const tint = c.tile[[3, 2, 1, 5, 4, 6, 7, 8][level % 8]];
  const sq = 10;
  return (
    <View
      accessible
      accessibilityLabel={`Ранг мастерской: ${name}. До следующего ${need - into} очков`}
      style={{ width, flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: top }}>
      <Text numberOfLines={1} style={[type.secondaryStrong, { color: c.text, flexShrink: 1 }]}>
        {name}
      </Text>
      <View style={{ flexDirection: 'row', gap: 2, padding: 2, backgroundColor: c.line, marginLeft: 'auto' }}>
        {Array.from({ length: 10 }, (_, k) => k < lit).map((on, k) => (
          <View key={k} style={{ width: sq, height: sq, backgroundColor: on ? tint : c.canvas, overflow: 'hidden' }}>
            {on ? <Enamel fill={tint} size={sq} dark={isDark} /> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

/** The three tasks of the day as squares, lit when done. */
export function TaskSquares({ done, size = 14, gap = 3, start = 0 }: { done: boolean[]; size?: number; gap?: number; start?: number }) {
  const { c, isDark } = useTheme();
  const fills = [c.tile[2], c.tile[3], c.tile[1]];
  return (
    <View accessible accessibilityLabel={`Задания дня: ${done.filter(Boolean).length} из 3`} style={{ flexDirection: 'row', gap, alignItems: 'center' }}>
      {done.map((on, k) => (
        <View key={k} style={{ width: size, height: size, padding: 2, backgroundColor: on ? c.line : c.hair }}>
          <View style={{ flex: 1, backgroundColor: on ? fills[(k + start) % 3] : c.canvas }}>
            <Enamel fill={on ? fills[(k + start) % 3] : c.canvas} size={size} empty={!on} dark={isDark} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** Time to the next game of the day as the board would show it: a framed
    strip of 24 hours, the ones left lit blue, going out one by one towards
    midnight, and the hours and minutes beside it. Ticks on its own. */
export function DayClock({ width, top = 0 }: { width: number; top?: number }) {
  const { c, isDark } = useTheme();
  const [mins, setMins] = useState(() => minutesLeft());
  useEffect(() => {
    const id = setInterval(() => setMins(minutesLeft()), 20000);
    return () => clearInterval(id);
  }, []);
  const left = Math.ceil(mins / 60);
  const clock = `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}`;
  const frame = 3;
  const label = 44;
  const strip = width - label - frame * 2 - 8;
  const cw = (strip - frame * 23) / 24;
  return (
    <View
      accessible
      accessibilityLabel={`Новая игра дня через ${Math.floor(mins / 60)} ч ${mins % 60} мин`}
      style={{ width, flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: top }}>
      <View style={{ height: 12 + frame * 2, padding: frame, backgroundColor: c.line, flexDirection: 'row', gap: frame }}>
        {Array.from({ length: 24 }, (_, k) => k >= 24 - left).map((on, k) => (
          <View key={k} style={{ width: cw, backgroundColor: on ? c.tile[1] : c.canvas, overflow: 'hidden' }}>
            {on ? <Enamel fill={c.tile[1]} size={12} dark={isDark} /> : null}
          </View>
        ))}
      </View>
      <Text allowFontScaling={false} style={[type.secondaryStrong, { width: label, color: c.text, fontVariant: ['tabular-nums'], textAlign: 'right' }]}>
        {clock}
      </Text>
    </View>
  );
}

/** A medal as a tile: a square in the medal's colour, the score on it.
    Without a medal, an empty framed square with the score in ink. */
export function MedalMark({ medal, score, size = 24 }: { medal: { tile: number } | null; score: number; size?: number }) {
  const { c, isDark } = useTheme();
  const fill = medal ? (medal.tile ? c.tile[medal.tile] : c.faint) : c.canvas;
  const ink = medal ? (medal.tile ? c.ink[medal.tile] : c.line) : c.text;
  return (
    <View style={{ height: size, padding: 2, backgroundColor: medal ? c.line : c.hair }}>
      <View style={{ flex: 1, minWidth: size * 1.6, paddingHorizontal: 6, backgroundColor: fill, alignItems: 'center', justifyContent: 'center' }}>
        <Enamel fill={fill} size={size} empty={!medal} dark={isDark} />
        <TileNum v={score} color={ink} size={Math.max(12, Math.round(size * 0.5))} />
      </View>
    </View>
  );
}
