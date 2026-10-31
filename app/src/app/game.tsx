import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Field, type CellLook } from '@/components/Field';
import { Arrow, IconButton, Label, PauseIcon, Screen, TileBadge } from '@/components/ui';
import { dur, enter, exit, space, type } from '@/design/system';
import { N, pieceGrid, sceneByKey, type Piece } from '@/design/mock';
import { useTheme } from '@/design/theme';
import { pairs } from '@/design/tokens';
import { fx } from '@/sound/sfx';

/* The game screen, fully drawn, with no rules behind it. Pieces can be picked
   up and set down so the drag, the partner highlight, the ghost and the landing
   can be judged by hand; nothing merges. Tapping a tile replays the merge pop;
   the sweep buttons nudge the board and spend a sweep. */

// On the web a drag would otherwise select the numbers.
const noSelect = { userSelect: 'none' } as object;

const SWEEP_LABEL = { left: 'Сдвиг влево', right: 'Сдвиг вправо', up: 'Сдвиг вверх', down: 'Сдвиг вниз' };

type Hold = { slot: number; piece: Piece; x: number; y: number };

export default function Game() {
  const { c, hints } = useTheme();
  const { scene: sceneKey } = useLocalSearchParams<{ scene?: string }>();
  const scene = useMemo(() => sceneByKey(sceneKey), [sceneKey]);
  const { width, height } = useWindowDimensions();

  const [board, setBoard] = useState<number[]>(scene.board);
  const [tray, setTray] = useState<(Piece | null)[]>(scene.tray);
  const [sweeps, setSweeps] = useState(scene.sweeps);
  const [hint, setHint] = useState('Перетащите фигуру на доску.');
  const [pops, setPops] = useState<Record<number, number>>({});
  const [lands, setLands] = useState<Record<number, number>>({});
  const [hold, setHold] = useState<Hold | null>(null);
  const [target, setTarget] = useState<{ gx: number; gy: number } | null>(null);

  useEffect(() => {
    setBoard(scene.board);
    setTray(scene.tray);
    setSweeps(scene.sweeps);
  }, [scene]);

  useEffect(() => {
    if (scene.key !== 'won') return;
    const t = setTimeout(() => router.push('/win'), 900);
    return () => clearTimeout(t);
  }, [scene.key]);

  // Sizing: the board takes the width, but leaves the tray within thumb reach.
  const inner = Math.min(width, 440) - 32;
  const gap = Math.round(Math.min(7, Math.max(5, width * 0.015)));
  const boardSize = Math.max(240, Math.min(inner, height - 380));
  const cell = Math.floor((boardSize - gap) / N);
  // Pieces in the tray at about half the board's cell, so they read as the same things.
  const trayCell = Math.min(Math.floor(cell * 0.7), Math.floor(inner / 3 / 3.3));

  const best = Math.max(...board, 0);

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
      const ok = p.cells.every(([x, y]) => {
        const bx = gx + x;
        const by = gy + y;
        return bx >= 0 && by >= 0 && bx < N && by < N && board[by * N + bx] === 0;
      });
      return ok ? { gx, gy } : null;
    },
    [board, cell, gap],
  );

  const pieceOffset = (p: Piece) => {
    const { w, h } = pieceGrid(p);
    // The piece rides above the finger so the finger never hides it.
    return { ox: (w * cell) / 2, oy: h * cell + 36 };
  };

  const start = (slot: number, pageX: number, pageY: number) => {
    const p = tray[slot];
    if (!p || p.used) return;
    measureBoard();
    const { ox, oy } = pieceOffset(p);
    dx.value = pageX - ox;
    dy.value = pageY - oy + 20;
    dy.value = withTiming(pageY - oy, enter(dur.fast));
    lift.value = withTiming(1, enter(dur.fast));
    setHold({ slot, piece: p, x: pageX, y: pageY });
    fx.pick();
    setHint('Яркие плитки: с ними фигура сольётся.');
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
    if (t) {
      const next = board.slice();
      const landed: Record<number, number> = {};
      for (const [x, y, v] of h.piece.cells) {
        const i = (t.gy + y) * N + t.gx + x;
        next[i] = v;
        landed[i] = Date.now();
      }
      setBoard(next);
      setLands((l) => ({ ...l, ...landed }));
      fx.place(h.piece.cells.length);
      /* No rules yet, but the sound of a merge is previewed where one would
         happen: each partner next to the landed piece pops and plays the note
         of the value the merge would make, climbing like a chain. */
      const pv = h.piece.cells[0][2];
      const partners = board
        .map((v, i) => ({ v, i }))
        .filter(({ v, i }) => {
          const x = i % N;
          const y = (i / N) | 0;
          return pairs(pv, v) && h.piece.cells.some(([cx, cy]) => Math.abs(t.gx + cx - x) + Math.abs(t.gy + cy - y) === 1);
        });
      if (partners.length) {
        const made = pv < 3 ? 3 : pv * 2;
        const chain = partners.map((_, k) => made * 2 ** k);
        setTimeout(() => {
          fx.cascade(chain);
          partners.forEach(({ i }, k) => setTimeout(() => setPops((pp) => ({ ...pp, [i]: Date.now() })), k * 120));
        }, 90);
      }
      const nt = tray.map((p, k) => (k === h.slot && p ? { ...p, used: true } : p));
      // A spent tray comes back full, the way the real one will.
      if (nt.every((p) => !p || p.used)) {
        setTray(scene.tray.map((p) => (p ? { ...p, used: false } : p)));
        setTimeout(fx.tray, 250);
      } else setTray(nt);
      lift.value = 0;
      setHint('Фигура на месте. Правил пока нет, ничего не сливается.');
    } else {
      lift.value = withTiming(0, exit(dur.fast));
      fx.invalid();
      setHint('Здесь не помещается.');
    }
    setHold(null);
    setTarget(null);
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
      if (hold) {
        const pv = hold.piece.cells[0][2];
        if (board[i] > 0 && !pairs(pv, board[i])) l.dim = true;
        if (target) {
          const x = i % N;
          const y = (i / N) | 0;
          const mine = hold.piece.cells.find(([cx, cy]) => target.gx + cx === x && target.gy + cy === y);
          if (mine) l.ghost = mine[2];
          // A neighbour that pairs with the ghost gets the "about to be eaten" frame.
          else if (
            board[i] > 0 &&
            pairs(pv, board[i]) &&
            hold.piece.cells.some(([cx, cy]) => Math.abs(target.gx + cx - x) + Math.abs(target.gy + cy - y) === 1)
          )
            l.absorb = true;
        }
      }
      return l;
    },
    [board, hold, target, pops, lands],
  );

  const values = useMemo(() => {
    if (!hold || !target) return board;
    const v = board.slice();
    for (const [x, y, val] of hold.piece.cells) v[(target.gy + y) * N + target.gx + x] = val;
    return v;
  }, [board, hold, target]);

  /* ---------- sweep: a nudge, not a slide ---------- */
  const sx = useSharedValue(0);
  const sy = useSharedValue(0);
  const boardStyle = useAnimatedStyle(() => ({ transform: [{ translateX: sx.value }, { translateY: sy.value }] }));
  const sweep = (dir: 'left' | 'right' | 'up' | 'down') => {
    if (sweeps === 0) return;
    const d = 8;
    const [vx, vy] = { left: [-d, 0], right: [d, 0], up: [0, -d], down: [0, d] }[dir];
    sx.value = withSequence(withTiming(vx, exit(dur.fast)), withTiming(0, enter(dur.base)));
    sy.value = withSequence(withTiming(vy, exit(dur.fast)), withTiming(0, enter(dur.base)));
    setSweeps((s) => s - 1);
    fx.sweep();
    setHint(sweeps === 1 ? 'Сдвигов больше нет. Новый лоток даст ещё два.' : 'Сдвиг. Настоящее движение появится вместе с правилами.');
  };

  const tapCell = (i: number) => {
    if (board[i] <= 0) return;
    setPops((p) => ({ ...p, [i]: Date.now() }));
    // Tapping a tile plays the note its merge makes: a way to hear the ladder.
    fx.merge(Math.max(3, board[i]));
  };

  const sweepRow = (
    <View style={{ width: boardSize, flexDirection: 'row', alignItems: 'center', marginTop: space.md }}>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm }} accessibilityLabel={`Сдвигов осталось: ${sweeps}`}>
        <Label>Сдвиги</Label>
        {[0, 1].map((k) => (
          <View key={k} style={{ width: 8, height: 8, backgroundColor: k < sweeps ? c.text : c.hair }} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        {(['left', 'down', 'up', 'right'] as const).map((d) => (
          <IconButton key={d} quiet label={SWEEP_LABEL[d]} disabled={sweeps === 0} onPress={() => sweep(d)}>
            <Arrow dir={d} color={c.text} s={16} />
          </IconButton>
        ))}
      </View>
    </View>
  );

  return (
    <View style={[{ flex: 1 }, noSelect]}>
      <Screen>
        {/* header: the score leads, the best tile is the progress, pause on the right */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <View>
            <Label meta>Очки</Label>
            <Text allowFontScaling={false} style={[type.number, { color: c.text }]}>
              {scene.score.toLocaleString('ru-RU')}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.lg }}>
            <View style={{ alignItems: 'flex-end', gap: space.xs }}>
              <Label meta>Лучшая</Label>
              <TileBadge v={best} size={28} />
            </View>
            <IconButton label="Пауза" onPress={() => router.push({ pathname: '/pause', params: { scene: scene.key } })}>
              <PauseIcon color={c.text} />
            </IconButton>
          </View>
        </View>

        {/* board, with its toolbar and the hint, centred in the free height */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: space.lg }}>
          <Animated.View style={boardStyle}>
            <View ref={boardRef} onLayout={measureBoard} collapsable={false}>
              <Field w={N} h={N} values={values} cell={cell} gap={gap} look={look} />
              {/* tap targets above the drawing */}
              <View style={[StyleSheet.absoluteFill, { padding: gap / 2, flexDirection: 'row', flexWrap: 'wrap' }]}>
                {board.map((_, i) => (
                  <Pressable key={i} onPress={() => tapCell(i)} style={{ width: cell, height: cell }} />
                ))}
              </View>
            </View>
          </Animated.View>
          {sweepRow}
          {hints ? (
            <Text style={[type.secondary, { width: boardSize, marginTop: space.md, minHeight: 20, color: c.muted }]}>{hint}</Text>
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
          {tray.map((p, slot) => (
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
                  key={p.used ? 'used' : 'live'}
                  entering={p.used ? undefined : FadeIn.duration(dur.base)}
                  style={{ opacity: p.used || hold?.slot === slot ? 0 : 1 }}>
                  <Field variant="piece" {...pieceGrid(p)} cell={trayCell} gap={gap} />
                </Animated.View>
              ) : null}
            </View>
          ))}
        </View>
      </Screen>

      {/* The lifted piece, above everything. No drop shadow: the lift reads
          from the scale-up and from the ghost on the board. */}
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0 }, dragStyle]}>
        {hold ? <Field variant="piece" {...pieceGrid(hold.piece)} cell={cell} gap={gap} /> : null}
      </Animated.View>
    </View>
  );
}
