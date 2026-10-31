import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Field, type CellLook } from '@/components/Field';
import { Arrow, IconButton, Label, Ladder, PauseIcon, Screen, TileBadge, Wordmark } from '@/components/ui';
import { N, pieceGrid, sceneByKey, type Piece } from '@/design/mock';
import { useTheme } from '@/design/theme';
import { font, pairs } from '@/design/tokens';

/* The game screen, fully drawn, with no rules behind it. Pieces can be picked
   up and set down so the drag, the partner highlight, the ghost and the landing
   can be judged by hand; nothing merges. Tapping a tile replays the merge pop;
   the sweep buttons nudge the board and spend a sweep. */

// On the web a drag would otherwise select the numbers.
const noSelect = { userSelect: 'none' } as object;

type Hold = { slot: number; piece: Piece; x: number; y: number };

export default function Game() {
  const { c, hints } = useTheme();
  const { scene: sceneKey } = useLocalSearchParams<{ scene?: string }>();
  const scene = useMemo(() => sceneByKey(sceneKey), [sceneKey]);
  const { width, height } = useWindowDimensions();

  const [board, setBoard] = useState<number[]>(scene.board);
  const [tray, setTray] = useState<(Piece | null)[]>(scene.tray);
  const [sweeps, setSweeps] = useState(scene.sweeps);
  const [hint, setHint] = useState('Drag a piece onto the board.');
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
  const boardSize = Math.max(240, Math.min(inner, height - 390));
  const cell = Math.floor((boardSize - gap) / N);
  const trayCell = Math.min(26, Math.floor(inner / 3 / 4));

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
    dy.value = withTiming(pageY - oy, { duration: 120 });
    lift.value = withSpring(1, { damping: 14, stiffness: 300 });
    setHold({ slot, piece: p, x: pageX, y: pageY });
    setHint('Partners stay bright. Everything else steps back.');
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
      setTray((tr) => {
        const nt = tr.map((p, k) => (k === h.slot && p ? { ...p, used: true } : p));
        // A spent tray comes back full, the way the real one will.
        return nt.every((p) => !p || p.used) ? scene.tray.map((p) => (p ? { ...p, used: false } : p)) : nt;
      });
      lift.value = 0;
      setHint('Placed. No rules run yet, so nothing merges.');
    } else {
      lift.value = withTiming(0, { duration: 160 });
      setHint('No room there.');
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
    const d = 10;
    const [vx, vy] = { left: [-d, 0], right: [d, 0], up: [0, -d], down: [0, d] }[dir];
    const back = { duration: 260, easing: Easing.out(Easing.back(2.5)) };
    sx.value = withSequence(withTiming(vx, { duration: 90 }), withTiming(0, back));
    sy.value = withSequence(withTiming(vy, { duration: 90 }), withTiming(0, back));
    setSweeps((s) => s - 1);
    setHint(sweeps === 1 ? 'No sweeps left. Finishing this tray brings two more.' : 'Swept. The real slide comes with the rules.');
  };

  const tapCell = (i: number) => {
    if (board[i] > 0) setPops((p) => ({ ...p, [i]: Date.now() }));
  };

  return (
    <View style={[{ flex: 1 }, noSelect]}>
      <Screen>
        {/* header */}
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Pressable onPress={() => router.back()} accessibilityLabel="Back to menu" hitSlop={8}>
              <Wordmark size={16} />
            </Pressable>
            <IconButton
              label="Pause"
              size={38}
              onPress={() => router.push({ pathname: '/pause', params: { scene: scene.key } })}>
              <PauseIcon color={c.text} />
            </IconButton>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <Text
              allowFontScaling={false}
              style={{ fontFamily: font.black, fontSize: Math.min(46, width * 0.11), lineHeight: Math.min(50, width * 0.12), color: c.text }}>
              {scene.score.toLocaleString('en-US')}
            </Text>
            <View style={{ flexDirection: 'row', gap: 14, paddingBottom: 4 }}>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Label>Merges</Label>
                <Text style={{ fontFamily: font.tile, fontSize: 17, color: c.text }}>{scene.merges}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Label>Best</Label>
                <TileBadge v={best} />
              </View>
            </View>
          </View>
          <Ladder best={best} />
        </View>

        {/* board */}
        <View style={{ marginTop: 14, alignItems: 'center' }}>
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
        </View>

        {hints ? (
          <Text style={{ textAlign: 'center', marginTop: 12, minHeight: 20, fontFamily: font.body, fontSize: 13, color: c.muted }}>
            {hint}
          </Text>
        ) : null}

        {/* sweeps */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 12 }}>
          {(['left', 'down', 'up', 'right'] as const).map((d) => (
            <IconButton key={d} label={`Sweep ${d}`} size={40} disabled={sweeps === 0} onPress={() => sweep(d)}>
              <Arrow dir={d} color={c.text} s={16} />
            </IconButton>
          ))}
          <View style={{ flexDirection: 'row', gap: 4, marginLeft: 6 }} accessibilityLabel={`${sweeps} sweeps left`}>
            {[0, 1].map((k) => (
              <View
                key={k}
                style={{
                  width: 10,
                  height: 10,
                  borderWidth: 2,
                  borderColor: sweeps === 0 ? c.faint : c.text,
                  backgroundColor: k < sweeps ? c.text : 'transparent',
                }}
              />
            ))}
          </View>
        </View>

        {/* tray */}
        <View
          style={{
            marginTop: 'auto',
            height: 96,
            flexDirection: 'row',
            borderTopWidth: gap,
            borderBottomWidth: gap,
            borderColor: c.line,
          }}>
          {tray.map((p, slot) => (
            <View
              key={slot}
              {...responders[slot].panHandlers}
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                borderLeftWidth: slot ? 2 : 0,
                borderColor: c.fold,
              }}>
              {p ? (
                <Animated.View
                  key={p.used ? 'used' : 'live'}
                  entering={p.used ? undefined : FadeIn.duration(220)}
                  style={{ opacity: p.used ? 0.1 : hold?.slot === slot ? 0 : 1 }}>
                  <Field variant="piece" {...pieceGrid(p)} cell={trayCell} gap={gap} />
                </Animated.View>
              ) : null}
            </View>
          ))}
        </View>
      </Screen>

      {/* The lifted piece, above everything. Its shadow is a hard offset copy in
          the line colour, the same device as the buttons, so it works the same on
          every platform and never shades the piece's empty corners. */}
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0 }, dragStyle]}>
        {hold ? (
          <>
            <View style={{ position: 'absolute', left: 6, top: 10, opacity: 0.22 }}>
              <Field variant="piece" {...pieceGrid(hold.piece)} cell={cell} gap={gap} numbers={false} look={() => ({ shadow: true })} />
            </View>
            <Field variant="piece" {...pieceGrid(hold.piece)} cell={cell} gap={gap} />
          </>
        ) : null}
      </Animated.View>
    </View>
  );
}
