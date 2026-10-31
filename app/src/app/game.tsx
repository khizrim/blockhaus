import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { Field, type CellLook } from '@/components/Field';
import { Overlay } from '@/components/Overlay';
import { Body, Button, Heading, Label, Panel, PauseIcon, Screen } from '@/components/ui';
import { pieceGrid } from '@/design/mock';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dur, enter, HIT, space, type, useCalm } from '@/design/system';
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
const STEP = 150; // ms between merges of a chain
const FLY = 110; // ms for an absorbed tile to fly into its partner

const back = (d: number, k = 1.8) => ({ duration: d, easing: Easing.out(Easing.back(k)) });

// On the web a drag would otherwise select the numbers.
const noSelect = { userSelect: 'none' } as object;

const SWIPE = 24; // px of travel that counts as a swipe
const SLIDE = dur.base; // ms for tiles to travel in a sweep

type Hold = { slot: number; piece: Piece };

/** The placement that merges the most, as [cell, value] pairs to hatch. */
function bestMove(g: { board: number[]; tray: (Piece | null)[] }): { slot: number; cells: [number, number][] } | null {
  let top: { slot: number; cells: [number, number][] } | null = null;
  let most = 0;
  for (const [slot, p] of g.tray.entries()) {
    if (!p || p.used) continue;
    const { w, h } = engine.size(p);
    for (let y = 0; y <= N - h; y++)
      for (let x = 0; x <= N - w; x++) {
        if (!engine.fits(g.board, p, x, y)) continue;
        const n = engine.applyPlacement(g.board.slice(), p, x, y).steps.length;
        if (n > most) {
          most = n;
          top = { slot, cells: p.cells.map(([cx, cy, v]) => [(y + cy) * N + x + cx, v] as [number, number]) };
        }
      }
  }
  return top;
}

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
  /* A hint is shown, not told: after a long pause the board hatches one good
     move, once per game. */
  const [nudge, setNudge] = useState<{ slot: number; cells: [number, number][] } | null>(null);
  const idleShown = useRef(0);
  const [flights, setFlights] = useState<{ id: string; m: Move; ms: number }[]>([]);
  const [floats, setFloats] = useState<{ id: string; at: number; v: number }[]>([]);
  const [returning, setReturning] = useState<number | null>(null);
  // The score as the board shows it: it climbs one merge at a time with the chain.
  const [shownScore, setShownScore] = useState<number | null>(null);
  // A new tray and its sweeps arrive when the chain that emptied the old one ends.
  const refillDelay = useRef(0);
  const [pops, setPops] = useState<Record<number, number>>({});
  const [lands, setLands] = useState<Record<number, number>>({});
  const [hold, setHold] = useState<Hold | null>(null);
  const lastDir = useRef<Dir>('down');
  // A new tray gets new keys so its pieces spring in; a spent piece keeps its key.
  const trayId = useRef(0);
  // The piece drawn in the drag layer: the held one, or one flying home.
  const [held, setHeld] = useState<Piece | null>(null);
  const [target, setTarget] = useState<{ gx: number; gy: number } | null>(null);
  const [sliding, setSliding] = useState<{ moves: Move[]; id: number } | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const later = (ms: number, f: () => void) => timers.current.push(setTimeout(f, ms));
  /* A new move ends the last one at once: pending frames are dropped and
     everything in flight is cleared, so nothing is left stuck on the board.
     The board itself jumps to the game's position. */
  const settle = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setFlights([]);
    setFloats([]);
    setSliding(null);
    setShownScore(null);
    setReturning(null);
    setHeld(null);
    setNudge(null);
  };
  useEffect(() => settle, []);

  // A new game, a loaded position or a restored save: show it as it is.
  const lastGame = useRef(g);
  useEffect(() => {
    if (lastGame.current !== g) {
      lastGame.current = g;
      settle();
      setShown(g.board.slice());
      idleShown.current = 0;
    }
  }, [g, store.version]);
  useEffect(() => {
    if (store.ready) setShown(store.game.board.slice());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.ready]);

  // Sizing: the board takes the width, but leaves the tray within thumb reach.
  const ins = useSafeAreaInsets();
  const inner = Math.min(width, 440) - 32;
  const gap = Math.round(Math.min(7, Math.max(5, width * 0.015)));
  // Tray cells follow the width (three slots, a three-cell piece in each with room).
  const trayCell = Math.max(24, Math.min(40, Math.floor(inner / 3 / 3.3)));
  /* The board takes what is left of the height after the fixed parts:
     header 64, the lesson card when there is one, the tray, and the 8pt
     paddings around them. Never wider than the screen, never under 240. */
  const plate = Math.max(8, Math.round(width / 40)); // one sweep layer's thickness
  const chrome =
    ins.top + space.sm + ins.bottom + space.lg + // screen paddings
    64 + space.lg + // header and its gap to the board
    (store.lesson !== null ? 112 : 0) +
    2 * plate + 3 * space.xs + // sweep layers
    space.lg + trayCell * 3 + space.lg; // gap, tray
  const boardSize = Math.max(240, Math.min(inner, height - chrome));
  const cell = Math.floor((boardSize - gap) / N);
  // Everything lines up on the board's own edges.
  const boardW = cell * N + gap;

  /** After the animation of a move: the win, or the end, if either happened. */
  const afterMove = (ms: number) => {
    if (store.lesson !== null) return lessonCheck(ms);
    if (g.won && !store.winSeen) later(ms + 250, () => router.push('/win'));
    // The end waits a beat: the board rests, the tray shows nothing fits.
    else if (g.over) later(ms + 1000, () => router.push('/over'));
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

  /** Points rise from where a merge happened. */
  const float = (at: number, v: number) => {
    const id = `${at}-${Date.now()}-${Math.random()}`;
    setFloats((f) => [...f, { id, at, v }]);
    later(800, () => setFloats((f) => f.filter((x) => x.id !== id)));
  };
  /** Big merges move the board: a small press, bigger for higher rungs. */
  const bump = useSharedValue(1);
  const thump = (v: number) => {
    if (v < 12) return;
    const k = v >= 96 ? 0.04 : v >= 48 ? 0.03 : v >= 24 ? 0.02 : 0.012;
    bump.value = withSequence(withTiming(1 - k, { duration: 60 }), withTiming(1, back(260, 2.5)));
  };

  /* ---------- drag ---------- */
  const boardRef = useRef<ComponentRef<typeof View>>(null);
  const boardAt = useRef({ x: 0, y: 0 });
  const measureBoard = () => boardRef.current?.measureInWindow((x, y) => (boardAt.current = { x, y }));

  const origin = useRef({ x: 0, y: 0 });
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
      const fx_ = (px - boardAt.current.x - pad) / cell;
      const fy_ = (py - boardAt.current.y - pad) / cell;
      // The nearest spot where it fits, if one is within about half a cell.
      let bestD = 0.65;
      let out: { gx: number; gy: number } | null = null;
      for (let gy = Math.floor(fy_); gy <= Math.ceil(fy_); gy++)
        for (let gx = Math.floor(fx_); gx <= Math.ceil(fx_); gx++) {
          const d = Math.hypot(gx - fx_, gy - fy_);
          if (d < bestD && engine.fits(g.board, p, gx, gy)) {
            bestD = d;
            out = { gx, gy };
          }
        }
      return out;
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
    lift.value = withTiming(1, back(220, 2.4));
    origin.current = { x: pageX - ox, y: pageY - oy + 20 };
    setNudge(null);
    setHold({ slot, piece: p });
    fx.pick();
  };

  const move = (pageX: number, pageY: number) => {
    if (!holdRef.current) return;
    const { ox, oy } = pieceOffset(holdRef.current.piece);
    const t = fitAt(holdRef.current.piece, pageX - ox, pageY - oy);
    if (t) {
      // Over a spot that takes it, the piece settles into the cells it will fill.
      const pad = gap / 2;
      dx.value = withTiming(boardAt.current.x + pad + t.gx * cell, { duration: 60 });
      dy.value = withTiming(boardAt.current.y + pad + t.gy * cell, { duration: 60 });
    } else {
      dx.value = pageX - ox;
      dy.value = pageY - oy;
    }
    setTarget((prev) => (prev?.gx === t?.gx && prev?.gy === t?.gy ? prev : t));
  };

  const end = () => {
    const h = holdRef.current;
    if (!h) return;
    const t = targetRef.current;
    setHold(null);
    setTarget(null);
    if (!t) {
      // Back to its slot, the way it came, then it is the tray's again.
      fx.invalid();
      setReturning(h.slot);
      setHeld(h.piece);
      dx.value = withTiming(origin.current.x, enter(dur.base));
      dy.value = withTiming(origin.current.y, enter(dur.base));
      lift.value = withSequence(withTiming(0.4, enter(dur.base)), withTiming(0, { duration: 0 }));
      later(dur.base, () => {
        setReturning(null);
        setHeld(null);
      });
      return;
    }
    lift.value = 0;
    settle();
    const before = g.board.slice();
    let score = g.score;
    const res = store.place(h.slot, t.gx, t.gy);
    if (!res) return;
    if (res.steps.length) setShownScore(score);

    // Frame 0: the piece laid. Then one frame per merge of the chain.
    const frame = before.slice();
    h.piece.cells.forEach(([cx, cy, v]) => (frame[(t.gy + cy) * N + t.gx + cx] = v));
    setShown(frame.slice());
    const now = Date.now();
    setLands((l) => ({ ...l, ...Object.fromEntries(res.laid.map((i) => [i, now])) }));
    fx.place(h.piece.cells.length);

    /* The chain, one merge per step: the absorbed tile flies into its
       partner, and on arrival the partner flashes, its number kicks, the note
       plays, the haptic taps and the points float up, all on the same frame. */
    res.steps.forEach((st, k) => {
      const t0 = 90 + k * STEP;
      const value = frame[st.absorbed[0]];
      for (const a of st.absorbed) frame[a] = 0;
      const mid = frame.slice();
      frame[st.anchor] = st.level;
      const snap = frame.slice();
      later(t0, () => {
        setShown(mid);
        setFlights((f) => [...f, ...st.absorbed.map((a) => ({ id: `${t0}-${a}-${Date.now()}`, m: { from: a, to: st.anchor, value, merges: true }, ms: FLY }))]);
      });
      later(t0 + FLY, () => {
        setShown(snap);
        setFlights((f) => f.filter((x) => !st.absorbed.some((a) => x.m.from === a)));
        setPops((pp) => ({ ...pp, [st.anchor]: Date.now() }));
        setShownScore((score += st.level));
        fx.merge(st.level);
        float(st.anchor, st.level);
        thump(st.level);
      });
    });
    const done = 90 + Math.max(0, res.steps.length - 1) * STEP + (res.steps.length ? FLY : 0);
    later(done + 20, () => {
      setShown(g.board.slice());
      setShownScore(null);
    });
    refillDelay.current = 0;
    if (res.refilled) {
      trayId.current++;
      refillDelay.current = done;
      later(done, () => fx.tray());
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
      if (!hold && nudge) {
        const h = nudge.cells.find(([at]) => at === i);
        if (h && shown[i] === 0) l.mark = h[1];
      }
      if (!hold && lesson?.hint && coach === 'task') {
        const h = lesson.hint.find(([at]) => at === i);
        if (h && shown[i] === 0) l.ghost = h[1];
      }
      if (hold) {
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
    [shown, hold, target, pops, lands, lesson, coach, nudge],
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
  const boardStyle = useAnimatedStyle(() => ({ transform: [{ translateX: sx.value }, { translateY: sy.value }, { scale: bump.value }] }));

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
      return;
    }
    settle();
    const before = g.board.slice();
    const moves = slideMoves(before, dir);
    lastDir.current = dir;
    const score = g.score;
    const res = store.sweep(dir);
    if (!res) {
      fx.invalid();
      shake();
      return;
    }
    setShownScore(score);
    setShown(new Array(N * N).fill(0));
    setSliding({ moves, id: Date.now() });
    /* Everything happens when the tiles hit the wall: the thud, the merges
       where two tiles met, their points, and the board's knock. */
    later(SLIDE, () => {
      setSliding(null);
      setShown(g.board.slice());
      setShownScore(null);
      fx.sweep();
      const now = Date.now();
      setPops((pp) => ({ ...pp, ...Object.fromEntries(res.made.map((m) => [m.at, now])) }));
      res.made.forEach((m) => float(m.at, m.level));
      if (res.made.length) {
        const top = Math.max(...res.made.map((m) => m.level));
        fx.merge(top);
        thump(top);
      }
      // The board meets the wall it was pushed against.
      const [ux, uy] = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[dir];
      sx.value = withSequence(withTiming(ux * 5, { duration: 50 }), withTiming(0, back(240, 2.5)));
      sy.value = withSequence(withTiming(uy * 5, { duration: 50 }), withTiming(0, back(240, 2.5)));
    });
    afterMove(SLIDE + 100);
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
        if (Math.abs(d) < Math.max(SWIPE, cell * 0.5)) {
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
  }, [cell]);

  // After a long pause in a normal game, hatch one move that merges.
  // Only while this screen is in front: not under pause or a dialog.
  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  useEffect(() => {
    if (!focused || !hints || store.lesson !== null || g.over || hold || idleShown.current >= 2) return;
    const id = setTimeout(() => {
      const m = bestMove(g);
      if (!m) return;
      idleShown.current++;
      setNudge(m);
      later(4000, () => setNudge(null));
    }, idleShown.current ? 30000 : 15000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.version, hold, store.lesson, hints, focused, nudge]);

  // While tiles are in flight the board under them is empty; keep the last best.
  const bestRef = useRef(0);
  if (!sliding) bestRef.current = Math.max(...shown, 0);
  const best = bestRef.current;

  const fits = (p: Piece | null) => !!p && !p.used && engine.canPlaceAnywhere(g.board, p);

  return (
    <View style={[{ flex: 1 }, noSelect]}>
      <Screen>
        {/* One column exactly as wide as the board, so every edge lines up with it. */}
        <View style={{ flex: 1, width: boardW, alignSelf: 'center' }}>
          {/* header: the score leads, the best tile is the progress, pause on the right */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <View>
              <Label meta>Очки</Label>
              <Text allowFontScaling={false} style={[type.number, { color: c.text }]} accessibilityLabel={`Очки: ${g.score}`}>
                {(shownScore ?? g.score).toLocaleString('ru-RU')}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.md }}>
              {lesson ? null : (
                <View style={{ alignItems: 'flex-end', gap: space.xs }}>
                  <Label meta>Лучшая плитка</Label>
                  <BestTile v={best} gap={gap} />
                </View>
              )}
              <SquareButton label="Пауза" gap={gap} onPress={() => router.push('/pause')}>
                <PauseIcon color={c.text} />
              </SquareButton>
            </View>
          </View>

          {/* The free height goes mostly above the board: below it, at most a
              thumb's gap to the tray, so the drag stays short. */}
          <View style={{ flex: 1, paddingTop: space.lg }}>
            <View style={{ flex: 1 }} />
            {lesson ? (
              <View style={{ marginBottom: space.lg }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Label meta>{`Обучение · ${(store.lesson ?? 0) + 1} из ${LESSONS.length}`}</Label>
                  <Pressable accessibilityRole="button" onPress={skipLessons} hitSlop={12}>
                    <Text style={[type.secondary, { color: c.muted }]}>Пропустить</Text>
                  </Pressable>
                </View>
                <Heading level="title">{coach === 'done' ? 'Получилось' : coach === 'retry' ? 'Ещё раз' : lesson.title}</Heading>
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
                accessible
                accessibilityLabel={`Доска 6 на 6. Сдвигов осталось: ${g.sweeps}`}
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
                <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                  {flights.map((f) => (
                    <SlidingTile key={f.id} m={f.m} cell={cell} gap={gap} ms={f.ms} />
                  ))}
                  {floats.map((f) => (
                    <Float key={f.id} at={f.at} v={f.v} cell={cell} gap={gap} />
                  ))}
                </View>
              </View>
              {/* The sweeps are the board's thickness: one layer under it per
                  sweep left, an empty outline per sweep spent. A swipe pulls a
                  layer out the way the board went; a new tray slides them back. */}
              <View pointerEvents="none" style={{ gap: space.xs, marginTop: space.xs }}>
                {[0, 1].map((k) => (
                  <Plate key={k} on={g.sweeps > k} k={k} dir={lastDir.current} h={plate} delay={refillDelay.current} />
                ))}
              </View>
            </Animated.View>
            <View style={{ flex: 1, maxHeight: space.x3 }} />
          </View>

          {/* tray: bare paper, three slots under the board's columns */}
          <View style={{ height: trayCell * 3 + space.lg, marginTop: space.sm, flexDirection: 'row' }}>
            {g.tray.map((p, slot) => (
              <View
                key={slot}
                {...responders[slot].panHandlers}
                accessibilityLabel={p && !p.used ? `Фигура ${slot + 1}${fits(p) ? '' : ', не помещается'}` : `Пустой слот ${slot + 1}`}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                {p ? (
                  <TrayPiece
                    key={`${trayId.current}-${slot}-${JSON.stringify(p.cells)}`}
                    delay={refillDelay.current + slot * 70}
                    pulse={nudge?.slot === slot && !hold}
                    opacity={p.used || hold?.slot === slot || returning === slot ? 0 : fits(p) ? 1 : 0.25}>
                    <Field variant="piece" {...pieceGrid(p)} cell={trayCell} gap={gap} />
                  </TrayPiece>
                ) : null}
              </View>
            ))}
          </View>
        </View>
      </Screen>

      {final ? (
        <View style={StyleSheet.absoluteFill}>
          <Overlay>
            <Panel>
              <Heading>Цель: собрать 96</Heading>
              <Body muted style={{ marginTop: space.sm }}>
                Лесенка: 3, 6, 12, 24, 48, 96. Партия кончается, когда ни одна фигура из лотка не встаёт на доску и сдвиг уже не помогает. Держите место и пары.
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
        {hold || held ? <Field variant="piece" {...pieceGrid((hold?.piece ?? held)!)} cell={cell} gap={gap} /> : null}
      </Animated.View>
    </View>
  );
}

/** A tile in flight during a sweep: drawn the way an isolated tile sits on the
    board (its own fill inside the thick line), moving from its old cell to its
    new one. */
function SlidingTile({ m, cell, gap, ms = SLIDE }: { m: Move; cell: number; gap: number; ms?: number }) {
  const { c } = useTheme();
  const pad = gap / 2;
  const at = (i: number) => ({ x: pad + (i % N) * cell, y: pad + ((i / N) | 0) * cell });
  const a = at(m.from);
  const b = at(m.to);
  const k = useSharedValue(0);
  useEffect(() => {
    k.value = withTiming(1, ms === SLIDE ? enter(ms) : { duration: ms, easing: Easing.in(Easing.quad) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const st = useAnimatedStyle(() => ({
    transform: [{ translateX: a.x + (b.x - a.x) * k.value }, { translateY: a.y + (b.y - a.y) * k.value }],
  }));
  const rk = rank(m.value);
  return (
    <Animated.View
      style={[
        { position: 'absolute', left: -0.5, top: -0.5, width: cell + 1, height: cell + 1, padding: pad + 0.5, backgroundColor: c.line },
        st,
      ]}>
      <View style={{ flex: 1, backgroundColor: c.tile[rk], alignItems: 'center', justifyContent: 'center' }}>
        <Text
          allowFontScaling={false}
          style={{
            color: c.ink[rk],
            fontFamily: font.tile,
            fontSize: Math.max(12, Math.round(cell * (m.value >= 100 ? 0.28 : m.value >= 10 ? 0.34 : 0.4))),
            letterSpacing: m.value >= 10 ? -0.5 : 0,
          }}>
          {m.value}
        </Text>
      </View>
    </Animated.View>
  );
}


/** The best tile, drawn as a tile of the board: its fill inside the line. */
function BestTile({ v, gap }: { v: number; gap: number }) {
  const { c } = useTheme();
  const rk = rank(v);
  const k = useSharedValue(1);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) return void (first.current = false);
    k.value = withSequence(withTiming(1.3, { duration: 0 }), withTiming(1, back(320, 2.4)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: k.value }] }));
  return (
    <Animated.View
      accessibilityLabel={v ? `Лучшая плитка ${v}` : 'Лучшей плитки пока нет'}
      style={[{ width: HIT, height: HIT, padding: gap / 2, backgroundColor: c.line }, st]}>
      <View style={{ flex: 1, backgroundColor: v ? c.tile[rk] : c.canvas, alignItems: 'center', justifyContent: 'center' }}>
        {v ? (
          <Text allowFontScaling={false} style={{ fontFamily: font.tile, fontSize: v >= 10 ? 15 : 18, letterSpacing: v >= 10 ? -0.5 : 0, color: c.ink[rk] }}>
            {v}
          </Text>
        ) : null}
      </View>
    </Animated.View>
  );
}

/** A square control in the board's material: canvas inside the line. */
function SquareButton({ label, gap, onPress, children }: { label: string; gap: number; onPress: () => void; children: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({ width: HIT, height: HIT, padding: gap / 2, backgroundColor: c.line, opacity: pressed ? 0.7 : 1 })}>
      <View style={{ flex: 1, backgroundColor: c.canvas, alignItems: 'center', justifyContent: 'center' }}>{children}</View>
    </Pressable>
  );
}

/** One sweep layer under the board: a black slab while the sweep is in hand,
    an empty outline once it is spent. */
function Plate({ on, k, dir, h, delay }: { on: boolean; k: number; dir: Dir; h: number; delay: number }) {
  const { c } = useTheme();
  const [w, setW] = useState(0);
  const x = useSharedValue(on ? 0 : 1);
  const y = useSharedValue(0);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) return void (first.current = false);
    if (on) {
      // Back with a new tray: slides in from the left, one after the other.
      x.value = -1;
      y.value = 0;
      x.value = withDelay(delay + k * 80, withTiming(0, back(320, 1.6)));
    } else {
      const [ux, uy] = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[dir];
      x.value = withTiming(ux, { duration: 220, easing: Easing.in(Easing.quad) });
      y.value = withTiming(uy, { duration: 220, easing: Easing.in(Easing.quad) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * w }, { translateY: y.value * h * 2 }] }));
  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={{ height: h, overflow: 'hidden', borderWidth: 2, borderColor: on ? c.line : c.faint }}>
      <Animated.View style={[{ position: 'absolute', left: -2, right: -2, top: -2, bottom: -2, backgroundColor: c.line }, st]} />
    </View>
  );
}

/** "+N" rising from the cell where a merge happened: a small label in the
    line's colour, square-cornered like everything on the board. */
function Float({ at, v, cell, gap }: { at: number; v: number; cell: number; gap: number }) {
  const { c } = useTheme();
  const calm = useCalm();
  const k = useSharedValue(0);
  useEffect(() => {
    if (!calm) k.value = withTiming(1, { duration: 760, easing: Easing.out(Easing.cubic) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const pad = gap / 2;
  const st = useAnimatedStyle(() => ({
    opacity: k.value < 0.6 ? 1 : 1 - (k.value - 0.6) / 0.4,
    transform: [{ translateY: -k.value * cell * 0.5 }],
  }));
  return (
    <Animated.View
      style={[{ position: 'absolute', left: pad + (at % N) * cell, top: pad + ((at / N) | 0) * cell - 4, width: cell, alignItems: 'center' }, st]}>
      <View style={{ backgroundColor: c.line, paddingHorizontal: 4, paddingVertical: 1 }}>
        <Text allowFontScaling={false} style={{ fontFamily: font.bodySemi, fontSize: v >= 24 ? 14 : 12, lineHeight: 16, color: c.canvas }}>
          {`+${v}`}
        </Text>
      </View>
    </Animated.View>
  );
}

/** A tray piece. New ones spring in one after another; the suggested one
    breathes. Own shared values, not `entering`, so Safari keeps their size. */
function TrayPiece({ delay, opacity, pulse, children }: { delay: number; opacity: number; pulse?: boolean; children: React.ReactNode }) {
  const k = useSharedValue(0);
  const p = useSharedValue(1);
  useEffect(() => {
    k.value = withDelay(delay, withTiming(1, back(300, 2.2)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    p.value = pulse ? withRepeat(withSequence(withTiming(1.12, { duration: 500 }), withTiming(1, { duration: 500 })), -1) : withTiming(1, { duration: 150 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pulse]);
  const st = useAnimatedStyle(() => ({
    transform: [{ scale: (0.4 + k.value * 0.6) * p.value }],
    opacity: Math.min(1, k.value * 2) * opacity,
  }));
  return <Animated.View style={st}>{children}</Animated.View>;
}
