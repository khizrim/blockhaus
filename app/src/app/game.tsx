import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { Field, type CellLook } from '@/components/Field';
import { Overlay } from '@/components/Overlay';
import { Body, Button, Heading, IconButton, Label, Panel, PauseIcon, Screen, TextLink, TileBadge } from '@/components/ui';
import { pieceGrid } from '@/design/mock';
import { dur, enter, exit, space, type } from '@/design/system';
import { useTheme } from '@/design/theme';
import { font, rank } from '@/design/tokens';
import engine, { type Dir, type Piece } from '@/game/engine';
import { LESSONS } from '@/game/lessons';
import { slideMoves, type Move } from '@/game/slide';
import { useGame } from '@/game/store';
import { fx } from '@/sound/sfx';

/* The game. The rules are the engine the prototype and the balance simulator
   run; this screen only shows them. A placement lands first, then each merge
   of the chain plays one beat after the last: the board steps through the
   cascade while the marimba climbs. */

const N = engine.N;
const BEAT = 120; // ms between merges of a chain

// On the web a drag would otherwise select the numbers.
const noSelect = { userSelect: 'none' } as object;

const SWIPE = 24; // px of travel that counts as a swipe
const SLIDE = dur.base; // ms for tiles to travel in a sweep

type Hold = { slot: number; piece: Piece };

export default function Game() {
  const { c, hints } = useTheme();
  const store = useGame();
  const g = store.game;
  const { width, height } = useWindowDimensions();
  const { learn } = useLocalSearchParams<{ learn?: string }>();
  const lesson = store.lesson === null ? null : LESSONS[store.lesson];
  const [coach, setCoach] = useState<'task' | 'done' | 'retry'>('task');
  const [final, setFinal] = useState(false);

  // Opened to learn: start the first lesson once the save has loaded.
  useEffect(() => {
    if (store.ready && learn && store.lesson === null && !final) store.startLesson(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.ready, learn]);
  useEffect(() => setCoach('task'), [store.lesson]);

  // What the board shows. Equal to the game's board at rest; during a chain it
  // steps through the intermediate positions.
  const [shown, setShown] = useState<number[]>(() => g.board.slice());
  const [hint, setHint] = useState('Перетащите фигуру на доску.');
  const [pops, setPops] = useState<Record<number, number>>({});
  const [lands, setLands] = useState<Record<number, number>>({});
  const [hold, setHold] = useState<Hold | null>(null);
  const [target, setTarget] = useState<{ gx: number; gy: number } | null>(null);
  const [sliding, setSliding] = useState<{ moves: Move[]; id: number } | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const later = (ms: number, f: () => void) => timers.current.push(setTimeout(f, ms));
  const settle = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => settle, []);

  // A new game, a loaded position or a restored save: show it as it is.
  const lastGame = useRef(g);
  useEffect(() => {
    if (lastGame.current !== g) {
      lastGame.current = g;
      settle();
      setShown(g.board.slice());
      setHint('Перетащите фигуру на доску.');
    }
  }, [g, store.version]);
  useEffect(() => {
    if (store.ready) setShown(store.game.board.slice());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.ready]);

  // Sizing: the board takes the width, but leaves the tray within thumb reach.
  const inner = Math.min(width, 440) - 32;
  const gap = Math.round(Math.min(7, Math.max(5, width * 0.015)));
  const boardSize = Math.max(240, Math.min(inner, height - 380));
  const cell = Math.floor((boardSize - gap) / N);
  // Pieces in the tray at about two thirds of the board's cell, so they read as the same things.
  const trayCell = Math.min(Math.floor(cell * 0.7), Math.floor(inner / 3 / 3.3));

  /** After the animation of a move: the win, or the end, if either happened. */
  const afterMove = (ms: number) => {
    if (store.lesson !== null) return lessonCheck(ms);
    later(ms + 250, () => {
      if (g.won && !store.winSeen) router.push('/win');
      else if (g.over) router.push('/over');
    });
  };

  /** In a lesson: the step is done when its result is on the board; a move
      that misses it puts the position back to try again. */
  const lessonCheck = (ms: number) => {
    const k = store.lesson;
    if (k === null) return;
    const L = LESSONS[k];
    const pieceStep = L.tray.some((p) => !p.used);
    // The engine refills a spent tray at random; a lesson keeps it empty.
    if (pieceStep) g.tray = g.tray.map((p) => ({ ...p, used: true }));
    later(ms + 150, () => {
      if (L.goal(g)) {
        setCoach('done');
        later(1600, () => (k + 1 < LESSONS.length ? store.startLesson(k + 1) : setFinal(true)));
      } else if (pieceStep || g.sweeps === 0) {
        setCoach('retry');
        later(1200, () => store.startLesson(k));
      }
    });
  };

  const skipLessons = () => {
    settle();
    setFinal(false);
    store.finishLessons();
  };

  /* ---------- drag ---------- */
  const boardRef = useRef<ComponentRef<typeof View>>(null);
  const boardAt = useRef({ x: 0, y: 0 });
  const measureBoard = () => boardRef.current?.measureInWindow((x, y) => (boardAt.current = { x, y }));

  const dx = useSharedValue(0);
  const dy = useSharedValue(0);
  const lift = useSharedValue(0);
  const dragStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dx.value }, { translateY: dy.value }, { scale: 0.9 + lift.value * 0.1 }],
    opacity: lift.value === 0 ? 0 : 1,
  }));

  // Where the held piece's top-left cell sits on the board, if it fits there.
  const fitAt = useCallback(
    (p: Piece, px: number, py: number) => {
      const pad = gap / 2;
      const gx = Math.round((px - boardAt.current.x - pad) / cell);
      const gy = Math.round((py - boardAt.current.y - pad) / cell);
      return engine.fits(g.board, p, gx, gy) ? { gx, gy } : null;
    },
    [g, cell, gap],
  );

  const pieceOffset = (p: Piece) => {
    const { w, h } = pieceGrid(p);
    // The piece rides above the finger so the finger never hides it.
    return { ox: (w * cell) / 2, oy: h * cell + 36 };
  };

  const start = (slot: number, pageX: number, pageY: number) => {
    const p = g.tray[slot];
    if (!p || p.used || g.over) return;
    measureBoard();
    const { ox, oy } = pieceOffset(p);
    dx.value = pageX - ox;
    dy.value = pageY - oy + 20;
    dy.value = withTiming(pageY - oy, enter(dur.fast));
    lift.value = withTiming(1, enter(dur.fast));
    setHold({ slot, piece: p });
    fx.pick();
    setHint('Яркие плитки сольются с фигурой.');
  };

  const move = (pageX: number, pageY: number) => {
    if (!holdRef.current) return;
    const { ox, oy } = pieceOffset(holdRef.current.piece);
    dx.value = pageX - ox;
    dy.value = pageY - oy;
    const t = fitAt(holdRef.current.piece, pageX - ox, pageY - oy);
    setTarget((prev) => (prev?.gx === t?.gx && prev?.gy === t?.gy ? prev : t));
  };

  const end = () => {
    const h = holdRef.current;
    if (!h) return;
    const t = targetRef.current;
    setHold(null);
    setTarget(null);
    if (!t) {
      lift.value = withTiming(0, exit(dur.fast));
      fx.invalid();
      setHint('Здесь не помещается.');
      return;
    }
    lift.value = 0;
    settle();
    const before = g.board.slice();
    const res = store.place(h.slot, t.gx, t.gy);
    if (!res) return;

    // Frame 0: the piece laid. Then one frame per merge of the chain.
    const frame = before.slice();
    h.piece.cells.forEach(([cx, cy, v]) => (frame[(t.gy + cy) * N + t.gx + cx] = v));
    setShown(frame.slice());
    const now = Date.now();
    setLands((l) => ({ ...l, ...Object.fromEntries(res.laid.map((i) => [i, now])) }));
    fx.place(h.piece.cells.length);

    res.steps.forEach((s, k) => {
      for (const a of s.absorbed) frame[a] = 0;
      frame[s.anchor] = s.level;
      const snap = frame.slice();
      later(90 + k * BEAT, () => {
        setShown(snap);
        setPops((pp) => ({ ...pp, [s.anchor]: Date.now() }));
        fx.merge(s.level);
      });
    });
    const done = 90 + res.steps.length * BEAT;
    later(done, () => setShown(g.board.slice()));

    if (res.steps.length > 1) setHint(`Цепочка из ${res.steps.length} слияний, до ${res.steps[res.steps.length - 1].level}.`);
    else if (res.steps.length === 1) setHint(`Слияние: ${res.steps[0].level}.`);
    else setHint('Ставьте рядом с парой: 1 и 2, или две равные плитки от 3.');
    if (res.refilled) {
      later(done + 100, () => {
        fx.tray();
        setHint('Новый лоток и снова два сдвига.');
      });
    }
    afterMove(done);
  };

  const holdRef = useRef<Hold | null>(null);
  const targetRef = useRef<typeof target>(null);
  holdRef.current = hold;
  targetRef.current = target;
  const handlers = useRef({ start, move, end });
  handlers.current = { start, move, end };

  const responders = useMemo(
    () =>
      [0, 1, 2].map((slot) =>
        PanResponder.create({
          onStartShouldSetPanResponder: () => true,
          onMoveShouldSetPanResponder: () => true,
          onPanResponderTerminationRequest: () => false,
          onPanResponderGrant: (e) => handlers.current.start(slot, e.nativeEvent.pageX, e.nativeEvent.pageY),
          onPanResponderMove: (e) => handlers.current.move(e.nativeEvent.pageX, e.nativeEvent.pageY),
          onPanResponderRelease: () => handlers.current.end(),
          onPanResponderTerminate: () => handlers.current.end(),
        }),
      ),
    [],
  );

  /* ---------- what each cell looks like right now ---------- */
  const look = useCallback(
    (i: number): CellLook | undefined => {
      const l: CellLook = { pop: pops[i], land: lands[i] };
      if (!hold && lesson?.hint && coach === 'task') {
        const h = lesson.hint.find(([at]) => at === i);
        if (h && shown[i] === 0) l.ghost = h[1];
      }
      if (hold) {
        const pv = hold.piece.cells[0][2];
        if (shown[i] > 0 && !engine.pairs(pv, shown[i])) l.dim = true;
        if (target) {
          const x = i % N;
          const y = (i / N) | 0;
          const mine = hold.piece.cells.find(([cx, cy]) => target.gx + cx === x && target.gy + cy === y);
          if (mine) l.ghost = mine[2];
          // A neighbour that pairs with the ghost gets the "about to be eaten" frame.
          else if (
            shown[i] > 0 &&
            hold.piece.cells.some(
              ([cx, cy, v]) => engine.pairs(v, shown[i]) && Math.abs(target.gx + cx - x) + Math.abs(target.gy + cy - y) === 1,
            )
          )
            l.absorb = true;
        }
      }
      return l;
    },
    [shown, hold, target, pops, lands, lesson, coach],
  );

  const values = useMemo(() => {
    if (!hold || !target) return shown;
    const v = shown.slice();
    for (const [x, y, val] of hold.piece.cells) v[(target.gy + y) * N + target.gx + x] = val;
    return v;
  }, [shown, hold, target]);

  /* ---------- sweep: swipe the board ----------
     While the finger moves the board leans a few points that way; on release
     every tile slides to where the engine put it, and the merges pop where
     two tiles met. */
  const sx = useSharedValue(0);
  const sy = useSharedValue(0);
  const boardStyle = useAnimatedStyle(() => ({ transform: [{ translateX: sx.value }, { translateY: sy.value }] }));

  const shake = () => {
    sx.value = withSequence(withTiming(6, { duration: 50 }), withTiming(-6, { duration: 80 }), withTiming(0, enter(dur.fast)));
  };

  const sweep = (dir: Dir) => {
    sx.value = withTiming(0, enter(dur.fast));
    sy.value = withTiming(0, enter(dur.fast));
    if (g.over) return;
    if (g.sweeps === 0) {
      fx.invalid();
      shake();
      setHint('Сдвигов не осталось. Новый лоток даст ещё два.');
      return;
    }
    settle();
    const before = g.board.slice();
    const moves = slideMoves(before, dir);
    const res = store.sweep(dir);
    if (!res) {
      fx.invalid();
      shake();
      setHint('В эту сторону ничего не сдвинется.');
      return;
    }
    fx.sweep();
    setShown(new Array(N * N).fill(0));
    setSliding({ moves, id: Date.now() });
    later(SLIDE, () => {
      setSliding(null);
      setShown(g.board.slice());
    });
    res.made.forEach((m, k) =>
      later(SLIDE + k * BEAT, () => {
        setPops((pp) => ({ ...pp, [m.at]: Date.now() }));
        fx.merge(m.level);
      }),
    );
    setHint(
      res.made.length
        ? `Сдвиг: ${res.made.length === 1 ? 'одно слияние' : `слияний: ${res.made.length}`}.`
        : g.sweeps === 0
          ? 'Это был последний сдвиг в этом лотке.'
          : 'Сдвиг. В этом лотке остался ещё один.',
    );
    afterMove(SLIDE + res.made.length * BEAT);
  };

  const sweepRef = useRef(sweep);
  sweepRef.current = sweep;
  const swipe = useMemo(() => {
    const axis = (dx: number, dy: number) => (Math.abs(dx) > Math.abs(dy) ? 'x' : 'y');
    const lean = (d: number) => Math.max(-8, Math.min(8, d * 0.1));
    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) + Math.abs(gs.dy) > 8,
      onPanResponderMove: (_, gs) => {
        if (axis(gs.dx, gs.dy) === 'x') {
          sx.value = lean(gs.dx);
          sy.value = 0;
        } else {
          sy.value = lean(gs.dy);
          sx.value = 0;
        }
      },
      onPanResponderRelease: (_, gs) => {
        const x = axis(gs.dx, gs.dy) === 'x';
        const d = x ? gs.dx : gs.dy;
        if (Math.abs(d) < SWIPE) {
          sx.value = withTiming(0, enter(dur.fast));
          sy.value = withTiming(0, enter(dur.fast));
          return;
        }
        sweepRef.current(x ? (d > 0 ? 'right' : 'left') : d > 0 ? 'down' : 'up');
      },
      onPanResponderTerminate: () => {
        sx.value = withTiming(0, enter(dur.fast));
        sy.value = withTiming(0, enter(dur.fast));
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sweepRow = (
    <View style={{ width: boardSize, flexDirection: 'row', alignItems: 'center', minHeight: 44, marginTop: space.sm, gap: space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }} accessibilityLabel={`Сдвигов осталось: ${g.sweeps}`}>
        <Label>Сдвиги</Label>
        {[0, 1].map((k) => (
          <View key={k} style={{ width: 16, height: 8, backgroundColor: k < g.sweeps ? c.text : 'transparent', borderWidth: 1, borderColor: k < g.sweeps ? c.text : c.hair }} />
        ))}
      </View>
      <Text style={[type.secondary, { flex: 1, textAlign: 'right', color: c.muted }]} numberOfLines={1}>
        {g.sweeps ? 'Смахните доску в любую сторону' : 'Вернутся с новым лотком'}
      </Text>
    </View>
  );

  const best = Math.max(...shown, 0);

  return (
    <View style={[{ flex: 1 }, noSelect]}>
      <Screen>
        {/* header: the score leads, the best tile is the progress, pause on the right */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <View>
            <Label meta>Очки</Label>
            <Text allowFontScaling={false} style={[type.number, { color: c.text }]} accessibilityLabel={`Очки: ${g.score}`}>
              {g.score.toLocaleString('ru-RU')}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.lg }}>
            <View style={{ alignItems: 'flex-end', gap: space.xs }}>
              <Label meta>Лучшая</Label>
              <TileBadge v={best} size={28} />
            </View>
            <IconButton label="Пауза" onPress={() => router.push('/pause')}>
              <PauseIcon color={c.text} />
            </IconButton>
          </View>
        </View>

        {/* board, with its toolbar and the hint, centred in the free height */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: space.lg }}>
          {lesson ? (
            <View style={{ width: boardSize, marginBottom: space.lg, minHeight: 104 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Label meta>{`Обучение · ${(store.lesson ?? 0) + 1} из ${LESSONS.length}`}</Label>
                <TextLink label="Пропустить" onPress={skipLessons} />
              </View>
              <Heading level="heading">{coach === 'done' ? 'Получилось' : coach === 'retry' ? 'Ещё раз' : lesson.title}</Heading>
              <Body muted small style={{ marginTop: space.xs }}>
                {coach === 'done' ? lesson.done : coach === 'retry' ? 'Пары не вышло. Ставим заново.' : lesson.text}
              </Body>
            </View>
          ) : null}
          <Animated.View style={boardStyle} {...swipe.panHandlers}>
            <View
              ref={boardRef}
              onLayout={measureBoard}
              collapsable={false}
              accessibilityLabel="Доска. Смахните, чтобы сдвинуть"
              accessibilityActions={[
                { name: 'left', label: 'Сдвиг влево' },
                { name: 'right', label: 'Сдвиг вправо' },
                { name: 'up', label: 'Сдвиг вверх' },
                { name: 'down', label: 'Сдвиг вниз' },
              ]}
              onAccessibilityAction={(e) => sweep(e.nativeEvent.actionName as Dir)}>
              <Field w={N} h={N} values={values} cell={cell} gap={gap} look={look} />
              {sliding ? (
                <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                  {sliding.moves.map((m) => (
                    <SlidingTile key={`${sliding.id}-${m.from}`} m={m} cell={cell} gap={gap} />
                  ))}
                </View>
              ) : null}
            </View>
          </Animated.View>
          {lesson && lesson.sweeps === 0 ? <View style={{ minHeight: 44, marginTop: space.sm }} /> : sweepRow}
          {hints && !lesson ? (
            <Text style={[type.secondary, { width: boardSize, marginTop: space.md, minHeight: 40, color: c.muted }]}>{hint}</Text>
          ) : null}
        </View>

        {/* tray: an L1 surface with three slots */}
        <View
          style={{
            height: trayCell * 3 + space.xxl,
            flexDirection: 'row',
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.hair,
          }}>
          {g.tray.map((p, slot) => (
            <View
              key={slot}
              {...responders[slot].panHandlers}
              accessibilityLabel={p && !p.used ? `Фигура ${slot + 1}` : `Пустой слот ${slot + 1}`}
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                borderLeftWidth: slot ? 1 : 0,
                borderColor: c.hair,
              }}>
              {p ? (
                <Animated.View
                  key={`${p.used ? 'used' : 'live'}-${JSON.stringify(p.cells)}`}
                  entering={p.used ? undefined : FadeIn.duration(dur.base)}
                  style={{ opacity: p.used || hold?.slot === slot ? 0 : g.over ? 0.35 : 1 }}>
                  <Field variant="piece" {...pieceGrid(p)} cell={trayCell} gap={gap} />
                </Animated.View>
              ) : null}
            </View>
          ))}
        </View>
      </Screen>

      {final ? (
        <View style={StyleSheet.absoluteFill}>
          <Overlay>
            <Panel>
              <Heading>Цель: собрать 96</Heading>
              <Body muted style={{ marginTop: space.sm }}>
                Лесенка: 3, 6, 12, 24, 48, 96. Партия кончается, когда ни одна фигура из лотка не встаёт на доску, так что держите место и пары.
              </Body>
              <View style={{ marginTop: space.xl }}>
                <Button kind="primary" size="lg" label="Начать игру" onPress={skipLessons} />
              </View>
            </Panel>
          </Overlay>
        </View>
      ) : null}

      {/* The lifted piece, above everything. No drop shadow: the lift reads
          from the scale-up and from the ghost on the board. */}
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0 }, dragStyle]}>
        {hold ? <Field variant="piece" {...pieceGrid(hold.piece)} cell={cell} gap={gap} /> : null}
      </Animated.View>
    </View>
  );
}

/** A tile in flight during a sweep: drawn the way an isolated tile sits on the
    board (its own fill inside the thick line), moving from its old cell to its
    new one. */
function SlidingTile({ m, cell, gap }: { m: Move; cell: number; gap: number }) {
  const { c } = useTheme();
  const pad = gap / 2;
  const at = (i: number) => ({ x: pad + (i % N) * cell, y: pad + ((i / N) | 0) * cell });
  const a = at(m.from);
  const b = at(m.to);
  const k = useSharedValue(0);
  useEffect(() => {
    k.value = withTiming(1, enter(SLIDE));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const st = useAnimatedStyle(() => ({
    transform: [{ translateX: a.x + (b.x - a.x) * k.value }, { translateY: a.y + (b.y - a.y) * k.value }],
  }));
  const rk = rank(m.value);
  return (
    <Animated.View
      style={[
        { position: 'absolute', left: 0, top: 0, width: cell, height: cell, padding: pad, backgroundColor: c.line },
        st,
      ]}>
      <View style={{ flex: 1, backgroundColor: c.tile[rk], alignItems: 'center', justifyContent: 'center' }}>
        <Text
          allowFontScaling={false}
          style={{
            color: c.ink[rk],
            fontFamily: font.tile,
            fontSize: Math.max(12, Math.round(cell * (m.value >= 100 ? 0.28 : m.value >= 10 ? 0.34 : 0.4))),
            fontVariant: ['tabular-nums'],
          }}>
          {m.value}
        </Text>
      </View>
    </Animated.View>
  );
}
