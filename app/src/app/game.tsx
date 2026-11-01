import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';

import { Field, type CellLook } from '@/components/Field';
import { Overlay } from '@/components/Overlay';
import { Body, Button, Heading, IconButton, Label, Panel, PauseIcon, Screen, TextLink, TileBadge } from '@/components/ui';
import { pieceGrid } from '@/design/mock';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dur, enter, exit, HIT, space, type } from '@/design/system';
import { Enamel } from '@/design/depth';
import { useTheme } from '@/design/theme';
import { font, rank } from '@/design/tokens';
import engine, { type Dir, type Piece } from '@/game/engine';
import { DAILY, MEDALS, medalOf, nextMedal } from '@/game/daily';
import { LESSONS } from '@/game/lessons';
import { slideMoves, type Move } from '@/game/slide';
import { useGame } from '@/game/store';
import { fx } from '@/sound/sfx';
import { TileNum } from '@/components/TileNum';

/* The game. The rules are the engine the prototype and the balance simulator
   run; this screen only shows them. A placement lands first, then each merge
   of the chain plays one beat after the last: the board steps through the
   cascade while the marimba climbs. */

const N = engine.N;
const STEP = 150; // ms between merges of a chain
const FLY = 110; // ms for an absorbed tile to fly into its partner
const PLATE = 6; // px each sweep layer shows under the board
const back = (d: number, k = 1.8) => ({ duration: d, easing: Easing.out(Easing.back(k)) });

// On the web a drag would otherwise select the numbers.
const noSelect = { userSelect: 'none' } as object;

const SWIPE = 24; // px of travel that counts as a swipe
const SLIDE = dur.base; // ms for tiles to travel in a sweep
/** The lesson line: one line of title type. */
const LESSON_H = 30;

type Hold = { slot: number; piece: Piece };

/** The milestones: every new best from 24 up to the goal and two rungs past
    it (for the game that goes on). Each one marks the board when reached. */
const FIRST_MILESTONE = 24;
function milestonesFor(goal: number): number[] {
  const out: number[] = [];
  for (let v = FIRST_MILESTONE; v <= goal; v *= 2) out.push(v);
  return out;
}
const isMilestone = (v: number) => v >= FIRST_MILESTONE && Number.isInteger(Math.log2(v / 3));

/** The placement that merges the most, as [cell, value] pairs to hatch. */
function bestMove(g: { board: number[]; tray: (Piece | null)[] }): [number, number][] | null {
  let top: [number, number][] | null = null;
  let most = 0;
  for (const p of g.tray) {
    if (!p || p.used) continue;
    const { w, h } = engine.size(p);
    for (let y = 0; y <= N - h; y++)
      for (let x = 0; x <= N - w; x++) {
        if (!engine.fits(g.board, p, x, y)) continue;
        const n = engine.applyPlacement(g.board.slice(), p, x, y).steps.length;
        if (n > most) {
          most = n;
          top = p.cells.map(([cx, cy, v]) => [(y + cy) * N + x + cx, v] as [number, number]);
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
  const { learn, daily } = useLocalSearchParams<{ learn?: string; daily?: string }>();
  const isDaily = store.mode === 'daily';
  /* The daily's rules stay in sight: pieces left and the next medal. */
  const piecesLeft = Math.max(0, DAILY.pieceLimit - g.moves);
  const coming = nextMedal(g.score);
  const dailyLine = `Осталось ${piecesLeft} · ${coming ? `до ${coming.of} ${coming.at - g.score}` : `${medalOf(g.score)!.emoji} золото`}`;
  // A medal reached mid-game rings once, on the move that reached it.
  const medalRank = isDaily ? (medalOf(g.score)?.rank ?? 0) : 0;
  const lastMedal = useRef({ rank: medalRank, daily: isDaily });
  useEffect(() => {
    // Opening the daily with medals already won is not a new medal.
    if (lastMedal.current.daily === isDaily && medalRank > lastMedal.current.rank) fx.bonus();
    lastMedal.current = { rank: medalRank, daily: isDaily };
  }, [medalRank, isDaily]);
  const lesson = store.lesson === null ? null : LESSONS[store.lesson];
  const [coach, setCoach] = useState<'task' | 'done'>('task');
  /** Right after the lessons: the goal stands in the lesson line for the whole first game,
      so the board never jumps when it goes. */
  const [goalLine, setGoalLine] = useState(false);
  // The lesson on the board now, for timers that outlive a render (skip from pause).
  const lessonNow = useRef(store.lesson);
  lessonNow.current = store.lesson;

  // Opened for the game of the day: put it on the board; leaving the screen
  // puts the free game back.
  useEffect(() => {
    if (store.ready && daily) store.startDaily();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.ready, daily]);
  const leaveDaily = useRef(store.leaveDaily);
  leaveDaily.current = store.leaveDaily;
  useEffect(() => () => leaveDaily.current(), []);

  // Opened to learn: start the first lesson once the save has loaded.
  useEffect(() => {
    if (store.ready && learn && store.lesson === null) store.startLesson(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.ready, learn]);
  useEffect(() => setCoach('task'), [store.lesson]);

  // What the board shows. Equal to the game's board at rest; during a chain it
  // steps through the intermediate positions.
  const [shown, setShown] = useState<number[]>(() => g.board.slice());
  /* A hint is shown, not told: after a long pause the board hatches one good
     move, once per game. */
  const [nudge, setNudge] = useState<[number, number][] | null>(null);
  const idleShown = useRef(0);
  const [flights, setFlights] = useState<{ id: string; m: Move; ms: number }[]>([]);
  const [floats, setFloats] = useState<{ id: string; at: number; v: number }[]>([]);
  const [returning, setReturning] = useState<number | null>(null);
  const [pops, setPops] = useState<Record<number, number>>({});
  const [lands, setLands] = useState<Record<number, number>>({});
  const [hold, setHold] = useState<Hold | null>(null);
  /** The best tile before the move now playing: a merge above it is a new milestone. */
  const peak = useRef(g.bestTile);
  /** A milestone's wave across the board, from the cell that made it. */
  const [ripple, setRipple] = useState<{ at: number; v: number; id: number; board: number[] } | null>(null);
  /** A milestone whose copy is still flying to the track: its square waits. */
  const [trackHold, setTrackHold] = useState(0);
  const lastDir = useRef<Dir>('down');
  // A new tray gets new keys so its pieces spring in; a spent piece keeps its key.
  const trayId = useRef(0);
  // The piece drawn in the drag layer: the held one, or one flying home.
  const [held, setHeld] = useState<Piece | null>(null);
  const [target, setTarget] = useState<{ gx: number; gy: number } | null>(null);
  const [sliding, setSliding] = useState<{ moves: Move[]; id: number } | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const later = (ms: number, f: () => void) => timers.current.push(setTimeout(f, ms));
  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  /* A new move ends the last one at once. Its pending frames are dropped, so
     whatever they would have cleaned up (points in the air, tiles in flight,
     a piece flying home) is cleared here too, or it stays stuck on the board. */
  /** An earned sweep waits under the board until its chain has played out. */
  const [bonusHeld, setBonusHeld] = useState(false);
  const settle = () => {
    clearTimers();
    setBonusHeld(false);
    setFlights([]);
    setFloats([]);
    setSliding(null);
    setReturning(null);
    setHeld(null);
  };
  useEffect(() => clearTimers, []);

  // A new game, a loaded position or a restored save: show it as it is.
  const lastGame = useRef(g);
  useEffect(() => {
    if (lastGame.current !== g) {
      lastGame.current = g;
      settle();
      setShown(g.board.slice());
      idleShown.current = 0;
      peak.current = g.bestTile;
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
  const trayMax = Math.max(24, Math.min(40, Math.floor(inner / 3 / 3.3)));
  /* The board takes what is left of the height after the fixed parts:
     header ~64, the lesson card when there is one, the tray, and the 8pt
     paddings around them. Never wider than the screen, never under 240. */
  const chrome = ins.top + ins.bottom + 24 + 64 + (store.lesson !== null || goalLine || isDaily ? LESSON_H + space.lg : 0) + (g.cfg.freeSweeps ? 44 : 18) + trayMax * 3 + 32 + 48;
  const boardSize = Math.max(240, Math.min(inner, height - chrome));
  const cell = Math.floor((boardSize - gap) / N);
  /* One column for the whole screen: the header, the lesson, the board and
     the tray share the board's left and right edges. */
  const col = cell * N + gap;
  const trayCell = Math.min(trayMax, Math.floor(col / 3 / 3.3));
  /* The interface unit: the header squares are one board cell, the score is
     set to the cell's height, and the steps between blocks are a share of it,
     so the chrome grows and shrinks with the board instead of staying fixed. */
  const unit = Math.max(HIT, cell);
  const step = Math.round(unit * 0.4);

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
        later(1600, () => {
          if (lessonNow.current !== k) return;
          if (k + 1 < LESSONS.length) return store.startLesson(k + 1);
          // Straight into the game, no card: the goal takes the lesson line.
          setGoalLine(true);
          skipLessons();
        });
      } else if (pieceStep || g.sweeps === 0) {
        // Cannot happen with moves locked, but never leave a lesson stuck.
        later(400, () => lessonNow.current === k && store.startLesson(k));
      }
    });
  };

  const skipLessons = () => {
    settle();
    store.finishLessons();
  };
  useEffect(() => {
    if (goalLine && g.over) setGoalLine(false);
  }, [goalLine, g.over, store.version]);

  /** Of a move's merge levels, in order, which ones make a new milestone:
      the first merge of each milestone value above the best before the move. */
  const milestonesIn = (levels: number[]) => {
    const before = peak.current;
    peak.current = Math.max(before, ...levels);
    const seen = new Set<number>();
    return levels.map((l) => {
      if (l <= before || !isMilestone(l) || seen.has(l)) return false;
      seen.add(l);
      return true;
    });
  };
  /** One merge lands: the note, the points, the press. A milestone rings its
      bell instead of the note and sends a wave of its colour across the board. */
  const land = (at: number, level: number, milestone: boolean, board: number[]) => {
    setPops((pp) => ({ ...pp, [at]: Date.now() }));
    if (milestone) {
      // The goal itself rings with the win card that follows, not a bell.
      if (level === g.cfg.goal) fx.merge(level);
      else fx.milestone(level);
      setRipple({ at, v: level, id: Date.now(), board: board.slice() });
      // Its square on the track fills when the flying copy lands there.
      setTrackHold(level);
      later(FLIP + 120 + FLY_HOME, () => {
        setTrackHold(0);
        fx.bonus();
      });
      later(RIPPLE_MS, () => setRipple(null));
    } else fx.merge(level);
    float(at, level);
    thump(milestone ? Math.max(level, 192) : level);
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
    const k = v >= 384 ? 0.06 : v >= 192 ? 0.05 : v >= 96 ? 0.04 : v >= 48 ? 0.03 : v >= 24 ? 0.02 : 0.012;
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
      const gx = Math.round((px - boardAt.current.x - pad) / cell);
      const gy = Math.round((py - boardAt.current.y - pad) / cell);
      // In a lesson the piece goes in only where the lesson puts it.
      const at = lesson?.hint?.[0]?.[0];
      if (at !== undefined && (gx !== at % N || gy !== ((at / N) | 0))) return null;
      return engine.fits(g.board, p, gx, gy) ? { gx, gy } : null;
    },
    [g, cell, gap, lesson],
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
      // Back to its slot, the way it came, then it is the tray's again. A
      // warning only when it was let go over the board and did not fit there.
      const px = Math.round((dx.value - boardAt.current.x) / cell);
      const py = Math.round((dy.value - boardAt.current.y) / cell);
      const w = Math.max(...h.piece.cells.map(([cx]) => cx)) + 1;
      const hgt = Math.max(...h.piece.cells.map(([, cy]) => cy)) + 1;
      const overBoard = px > -w && py > -hgt && px < N && py < N;
      if (overBoard && store.lesson === null) fx.invalid();
      else fx.putBack();
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
    const res = store.place(h.slot, t.gx, t.gy);
    if (!res) return;
    if (res.refilled) trayId.current++;

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
    const marks = milestonesIn(res.steps.map((st) => st.level));
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
        land(st.anchor, st.level, marks[k], snap);
      });
    });
    const done = 90 + Math.max(0, res.steps.length - 1) * STEP + (res.steps.length ? FLY : 0);
    later(done + 20, () => setShown(g.board.slice()));
    if (res.refilled) later(done + 120, () => fx.tray());
    // A chain of two or more earns a sweep: its layer slides in under the
    // board as the last merge lands, with its own two rising ticks.
    if (res.bonus) {
      setBonusHeld(true);
      later(done, () => {
        setBonusHeld(false);
        fx.bonus();
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
      if (!hold && nudge) {
        const h = nudge.find(([at]) => at === i);
        if (h && shown[i] === 0) l.ghost = h[1];
      }
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
    // A lesson's board slides only the way it teaches; other swipes do nothing.
    if (lesson?.dirs && !lesson.dirs.includes(dir)) return;
    if (!g.cfg.freeSweeps && g.sweeps === 0) {
      fx.invalid();
      shake();
      return;
    }
    settle();
    const before = g.board.slice();
    const moves = slideMoves(before, dir, !!g.cfg.sweepChain);
    lastDir.current = dir;
    const res = store.sweep(dir);
    if (!res) {
      fx.invalid();
      shake();
      return;
    }
    fx.sweep();
    const marks = milestonesIn(res.made.map((m) => m.level));
    setShown(new Array(N * N).fill(0));
    setSliding({ moves, id: Date.now() });
    /* A tile that merges more than once in a line (3 3 6 -> 12) lands showing
       its first merge, and each later merge steps it up on its own pop, so
       the number, the note and the points rise together. */
    const after = g.board.slice();
    const landed = after.slice();
    const seen = new Set<number>();
    for (const m of res.made) if (!seen.has(m.at)) { seen.add(m.at); landed[m.at] = m.level; }
    later(SLIDE, () => {
      setSliding(null);
      setShown(landed);
      // The new tile slides in at the far edge as the board settles.
      if (res.spawned) setLands((l) => ({ ...l, [res.spawned!.at]: Date.now() }));
      // The board meets the wall it was pushed against.
      const [ux, uy] = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[dir];
      sx.value = withSequence(withTiming(ux * 5, { duration: 50 }), withTiming(0, back(240, 2.5)));
      sy.value = withSequence(withTiming(uy * 5, { duration: 50 }), withTiming(0, back(240, 2.5)));
    });
    res.made.forEach((m, k) =>
      later(SLIDE + k * STEP, () => {
        setShown((sh) => (sh[m.at] === m.level ? sh : Object.assign(sh.slice(), { [m.at]: m.level })));
        land(m.at, m.level, marks[k], after);
      }),
    );
    later(SLIDE + res.made.length * STEP, () => setShown(after));
    afterMove(SLIDE + res.made.length * STEP);
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

  // After a long pause in a normal game, hatch one move that merges.
  useEffect(() => {
    if (!hints || store.lesson !== null || g.over || hold || idleShown.current >= 1) return;
    const id = setTimeout(() => {
      const m = bestMove(g);
      if (!m) return;
      idleShown.current++;
      setNudge(m);
      later(3000, () => setNudge(null));
    }, 15000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.version, hold, store.lesson, hints]);

  /* Where each milestone's square sits, in the board's own coordinates, so
     the milestone tile can fly into it. Mirrors Track's layout. */
  const milestones = milestonesFor(g.cfg.goal);
  const trackTop = isDaily ? gap * 2 + step / 2 : step / 2;
  const trackHome = (v: number) => {
    const k = milestones.indexOf(v);
    if (k < 0 || !g.cfg.freeSweeps || store.lesson !== null) return null;
    const size = Math.floor((col - gap * (milestones.length - 1)) / milestones.length);
    const h = Math.max(28, Math.min(44, Math.round(size * 0.5)));
    return { x: k * (size + gap), y: cell * N + gap + trackTop, w: size, h };
  };

  // While tiles are in flight the board under them is empty; keep the last best.
  const bestRef = useRef(0);
  if (!sliding) bestRef.current = Math.max(...shown, 0);
  const best = bestRef.current;

  /* ---------- the lesson plays its own move ----------
     A see-through copy of the piece lifts from its slot, glides to the
     hatched cell and fades, over and over until the player takes over. The
     sweep lesson shows a finger square crossing the board instead. */
  const slotRefs = useRef<(ComponentRef<typeof View> | null)[]>([]);
  type Geo = { board: { x: number; y: number; w: number }; slot?: { x: number; y: number } };
  const [geo, setGeo] = useState<Geo | null>(null);
  const demoSlot = lesson ? g.tray.findIndex((p) => p && !p.used) : -1;
  useEffect(() => {
    setGeo(null);
    if (!lesson || coach !== 'task') return;
    const id = setTimeout(() => {
      boardRef.current?.measureInWindow((bx, by, bw) => {
        const board = { x: bx, y: by, w: bw };
        const r = demoSlot >= 0 ? slotRefs.current[demoSlot] : null;
        if (!r) return setGeo({ board });
        r.measureInWindow((sx_, sy_, sw, sh) => setGeo({ board, slot: { x: sx_ + sw / 2, y: sy_ + sh / 2 } }));
      });
    }, 400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.lesson, store.version, coach, width, height]);

  return (
    <View style={[{ flex: 1 }, noSelect]}>
      <Screen style={{ width: col }}>
        {/* header without labels: the score leads; the best tile and pause are
            two squares of one size on the right */}
        <View style={{ height: unit, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View accessible accessibilityLabel={`Очки: ${g.score}`}>
            <TileNum v={g.score.toLocaleString('ru-RU')} size={Math.round(unit * 0.72)} color={c.text} style={{ lineHeight: unit, letterSpacing: -0.5 }} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <BestTile v={best} size={unit} frame={gap} />
            <IconButton label="Пауза" size={unit} onPress={() => router.push('/pause')}>
              <PauseIcon color={c.text} s={Math.round(unit * 0.32)} />
            </IconButton>
          </View>
        </View>

        {/* the lesson and the board, centred between the header and the tray, never closer than one step */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: step }}>
          {/* One line above the board, nothing else: the move in plain words,
              then the rule it proved as a formula. The way out of the lessons is in pause. */}
          {lesson || goalLine || isDaily ? (
            <View style={{ width: col, marginBottom: step, height: LESSON_H, justifyContent: 'center' }}>
              <Text
                accessibilityRole="header"
                numberOfLines={1}
                adjustsFontSizeToFit
                style={[type.title, { color: c.text }]}>
                {lesson ? (coach === 'task' ? lesson.title : lesson.done) : isDaily ? dailyLine : `Цель: ${g.cfg.goal}`}
              </Text>
            </View>
          ) : null}
          <Animated.View style={boardStyle} {...swipe.panHandlers}>
            {/* The game of the day wears a yellow frame: another game at a glance. */}
            {isDaily ? (
              <View
                pointerEvents="none"
                style={{ position: 'absolute', left: -gap * 2, top: -gap * 2, right: -gap * 2, bottom: -gap * 2, borderWidth: gap, borderColor: c.tile[3] }}
              />
            ) : null}
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
              <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                {flights.map((f) => (
                  <SlidingTile key={f.id} m={f.m} cell={cell} gap={gap} ms={f.ms} />
                ))}
                {ripple ? <Ripple key={ripple.id} at={ripple.at} v={ripple.v} board={ripple.board} cell={cell} gap={gap} home={trackHome(ripple.v)} /> : null}
                {floats.map((f) => (
                  <Float key={f.id} at={f.at} v={f.v} cell={cell} gap={gap} />
                ))}
              </View>
            </View>
          </Animated.View>
          {/* The sweeps are the board's thickness: one layer under it per
              sweep left. A sweep pulls a layer out the way the board went; a
              new tray slides them back in. */}
          {g.cfg.freeSweeps ? (
            /* With free sweeps there is nothing to count under the board:
               the milestones on the way to the goal sit there instead. */
            store.lesson === null ? (
              <Track steps={milestones} best={trackHold ? Math.min(best, trackHold / 2) : best} width={col} gap={gap} top={trackTop} />
            ) : null
          ) : (
            <View pointerEvents="none" accessibilityLabel={`Сдвигов: ${g.sweeps}`} style={{ width: col, alignItems: 'center', marginTop: isDaily ? gap * 2 : 0 }}>
              {Array.from({ length: g.cfg.sweepsMax }, (_, k) => k).map((k) => (
                <Plate key={k} on={g.sweeps - (bonusHeld ? 1 : 0) > k} k={k} dir={lastDir.current} width={col - 2 * (k + 1) * space.sm} />
              ))}
            </View>
          )}
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
              ref={(r) => void (slotRefs.current[slot] = r)}
              collapsable={false}
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
                <TrayPiece
                  key={`${trayId.current}-${slot}-${JSON.stringify(p.cells)}`}
                  delay={slot * 70}
                  opacity={p.used || hold?.slot === slot || returning === slot ? 0 : g.over ? 0.35 : 1}>
                  <Field variant="piece" {...pieceGrid(p)} cell={trayCell} gap={gap} />
                </TrayPiece>
              ) : null}
            </View>
          ))}
        </View>
      </Screen>

      {/* The first daily explains itself once: what is different and why. */}
      {isDaily && !store.dailyIntro && g.moves === 0 ? (
        <View style={StyleSheet.absoluteFill}>
          <Overlay>
            <Panel>
              <Heading>Игра дня</Heading>
              <Body muted style={{ marginTop: space.sm }}>
                Сегодня у всех одна и та же доска и одни и те же фигуры. Партия короткая: {DAILY.pieceLimit} фигур. Наберите очки на медаль и сравните результат с друзьями.
              </Body>
              <View style={{ flexDirection: 'row', gap: space.xl, marginTop: space.lg }}>
                {MEDALS.map((m) => (
                  <View key={m.rank} style={{ gap: space.xs }}>
                    <Text style={[type.heading, { color: c.text }]}>{m.emoji}</Text>
                    <Text style={[type.secondary, { color: c.muted }]}>{m.at}</Text>
                  </View>
                ))}
              </View>
              <View style={{ marginTop: space.xl }}>
                <Button kind="primary" size="lg" label="Начать" onPress={store.markDailyIntro} />
              </View>
            </Panel>
          </Overlay>
        </View>
      ) : null}

      {lesson && coach === 'task' && !hold && !held && !sliding && geo ? (
        demoSlot >= 0 && geo.slot && lesson.hint ? (
          <Demo
            key={`demo-${store.lesson}-${store.version}`}
            piece={g.tray[demoSlot]!}
            from={geo.slot}
            to={{ x: geo.board.x + gap / 2 + (lesson.hint[0][0] % N) * cell, y: geo.board.y + gap / 2 + ((lesson.hint[0][0] / N) | 0) * cell }}
            cell={cell}
            gap={gap}
          />
        ) : demoSlot < 0 ? (
          <Finger key={`finger-${store.lesson}`} board={geo.board} />
        ) : null
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
  const { c, isDark } = useTheme();
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
        { position: 'absolute', left: 0, top: 0, width: cell, height: cell, padding: pad, backgroundColor: c.line },
        st,
      ]}>
      <View style={{ flex: 1, backgroundColor: c.tile[rk], alignItems: 'center', justifyContent: 'center' }}>
        <Enamel fill={c.tile[rk]} size={cell} dark={isDark} />
        <TileNum v={m.value} color={c.ink[rk]} size={Math.max(12, Math.round(cell * (m.value >= 100 ? 0.28 : m.value >= 10 ? 0.34 : 0.4)))} />
      </View>
    </Animated.View>
  );
}


/** The best tile, drawn as a tile of the board: its fill inside the line. */
/** Drawn the way a lone tile sits on the board: one cell, framed by one gap. */
function BestTile({ v, size, frame }: { v: number; size: number; frame: number }) {
  const { c, isDark } = useTheme();
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
      style={[{ width: size, height: size, padding: frame, backgroundColor: c.line }, st]}>
      <View style={{ flex: 1, backgroundColor: v ? c.tile[rk] : c.canvas, alignItems: 'center', justifyContent: 'center' }}>
        <Enamel fill={v ? c.tile[rk] : c.canvas} size={size} empty={!v} dark={isDark} />
        {v ? (
          <TileNum v={v} color={c.ink[rk]} size={Math.max(12, Math.round(size * (v >= 100 ? 0.28 : v >= 10 ? 0.34 : 0.4)))} />
        ) : null}
      </View>
    </Animated.View>
  );
}

const RIPPLE_MS = 1400;
const WAVE = 55; // ms per cell of distance from the milestone
const FLIP = 460; // ms the milestone tile turns over in the air
const FLY_HOME = 380; // ms its copy flies into the track

/** A milestone, played on the enamel. The tile that made it rises off the
    board and turns over once, light running across its face; a wave goes
    out from it and every tile on the board lifts out of its socket in turn,
    with a glint on its enamel, while the empty floor flashes the new colour.
    Then a copy of the tile drops into its square on the track under the
    board, which pops as it lands. */
function Ripple({ at, v, board, cell, gap, home }: { at: number; v: number; board: number[]; cell: number; gap: number; home: { x: number; y: number; w: number; h: number } | null }) {
  const { c } = useTheme();
  const pad = gap / 2;
  const ax = at % N;
  const ay = (at / N) | 0;
  const pos = (i: number) => ({ x: pad + (i % N) * cell, y: pad + ((i / N) | 0) * cell });
  const dist = (i: number) => Math.abs((i % N) - ax) + Math.abs(((i / N) | 0) - ay);
  const cells = Array.from({ length: N * N }, (_, i) => i);
  return (
    <>
      {cells.map((i) =>
        board[i] > 0 ? null : (
          <FloorFlash key={`f${i}`} d={dist(i)} color={c.tile[rank(v)]} style={{ left: pos(i).x + pad, top: pos(i).y + pad, width: cell - gap, height: cell - gap }} />
        ),
      )}
      {cells.map((i) => (board[i] > 0 && i !== at ? <LiftTile key={`t${i}`} v={board[i]} d={dist(i)} at={pos(i)} cell={cell} gap={gap} /> : null))}
      <LiftTile key="hero" v={v} d={0} at={pos(at)} cell={cell} gap={gap} hero home={home} />
    </>
  );
}

function FloorFlash({ d, color, style }: { d: number; color: string; style: object }) {
  const o = useSharedValue(0);
  useEffect(() => {
    o.value = withDelay(d * WAVE, withSequence(withTiming(0.75, { duration: 90 }), withTiming(0, { duration: 460, easing: Easing.out(Easing.quad) })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const st = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ position: 'absolute', backgroundColor: color }, style, st]} />;
}

/** One tile lifting out of its socket: an empty socket shows under it, a
    shadow falls on the board, and a glint crosses its face. The hero tile
    rises higher, turns over, and then flies home to the track. */
function LiftTile({ v, d, at, cell, gap, hero, home }: { v: number; d: number; at: { x: number; y: number }; cell: number; gap: number; hero?: boolean; home?: { x: number; y: number; w: number; h: number } | null }) {
  const { c, depth, isDark } = useTheme();
  const pad = gap / 2;
  const rk = rank(v);
  const lift = useSharedValue(0); // 0 on the board, 1 at the top of the lift
  const turn = useSharedValue(0); // one full turn for the hero
  const shine = useSharedValue(0); // glint position across the face
  const fly = useSharedValue(0); // hero copy on its way to the track
  useEffect(() => {
    const delay = d * WAVE;
    if (hero) {
      lift.value = withSequence(withTiming(1, { duration: 140, easing: Easing.out(Easing.cubic) }), withDelay(FLIP - 140, withTiming(0, { duration: 160, easing: Easing.in(Easing.quad) })));
      turn.value = withTiming(1, { duration: FLIP, easing: Easing.inOut(Easing.cubic) });
      shine.value = withDelay(FLIP * 0.45, withTiming(1, { duration: 320 }));
      if (home) fly.value = withDelay(FLIP + 120, withTiming(1, { duration: FLY_HOME, easing: Easing.in(Easing.cubic) }));
    } else {
      lift.value = withDelay(delay, withSequence(withTiming(1, { duration: 150, easing: Easing.out(Easing.cubic) }), withTiming(0, back(380, 2.2))));
      shine.value = withDelay(delay + 40, withTiming(1, { duration: 300 }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const rise = hero ? 0.32 : 0.12;
  const tileSt = useAnimatedStyle(() => ({
    transform: [
      { translateY: -lift.value * cell * (hero ? 0.22 : 0.1) },
      { scale: 1 + lift.value * rise },
      // A spin seen from the front: the tile narrows to its edge and opens
      // again, twice, so its number never shows mirrored.
      { scaleX: Math.max(0.04, Math.abs(Math.cos(turn.value * Math.PI * 2))) },
    ],
    // While its copy flies to the track, the tile is back in its place.
    opacity: 1,
  }));
  // Edge-on, the enamel catches less light.
  const dimSt = useAnimatedStyle(() => ({ opacity: hero ? (1 - Math.abs(Math.cos(turn.value * Math.PI * 2))) * 0.35 : 0 }));
  const shadowSt = useAnimatedStyle(() => ({
    opacity: lift.value * (isDark ? 0.6 : 0.28),
    transform: [{ translateY: lift.value * cell * 0.08 }, { scale: 1 + lift.value * rise * 0.6 }],
  }));
  // The socket is shown only while the tile is off the board.
  const socketSt = useAnimatedStyle(() => ({ opacity: lift.value > 0.02 || (turn.value > 0.02 && turn.value < 0.98) ? 1 : 0 }));
  const glintSt = useAnimatedStyle(() => ({
    opacity: shine.value > 0 && shine.value < 1 ? 0.55 : 0,
    transform: [{ translateX: -cell + shine.value * cell * 2 }, { rotate: '20deg' }],
  }));
  const flySt = useAnimatedStyle(() => {
    if (!home) return { opacity: 0 };
    const k = fly.value;
    const sx = home.w / cell;
    const sy = home.h / cell;
    return {
      opacity: k > 0 && k < 1 ? 1 : 0,
      transform: [
        { translateX: at.x + (home.x - at.x) * k + (cell * (1 + (sx - 1) * k) - cell) / 2 },
        { translateY: at.y + (home.y - at.y) * k - Math.sin(Math.PI * k) * cell * 0.6 + (cell * (1 + (sy - 1) * k) - cell) / 2 },
        { scaleX: 1 + (sx - 1) * k },
        { scaleY: 1 + (sy - 1) * k },
      ],
    };
  });
  const face = (
    <View style={{ flex: 1, backgroundColor: c.tile[rk], alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <Depth kind={depth} fill={c.tile[rk]} open={{ t: true, r: true, b: true, l: true }} size={cell} dark={isDark} />
      <TileNum v={v} color={c.ink[rk]} size={Math.max(12, Math.round(cell * (v >= 100 ? 0.28 : v >= 10 ? 0.34 : 0.4)))} />
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: -cell * 0.3, bottom: -cell * 0.3, width: cell * 0.28, backgroundColor: '#FFFFFF' }, glintSt]} />
    </View>
  );
  const box = { position: 'absolute' as const, left: at.x, top: at.y, width: cell, height: cell };
  return (
    <>
      <Animated.View pointerEvents="none" style={[box, { padding: pad, backgroundColor: c.line }, socketSt]}>
        <View style={{ flex: 1, backgroundColor: c.canvas }}>
          <Depth kind={depth} fill={c.canvas} open={{ t: true, r: true, b: true, l: true }} size={cell} empty dark={isDark} />
        </View>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[box, { left: at.x + pad, top: at.y + pad, width: cell - gap, height: cell - gap, backgroundColor: '#000000' }, shadowSt]} />
      <Animated.View pointerEvents="none" style={[box, { padding: pad, backgroundColor: c.line }, tileSt]}>
        {face}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#000000' }, dimSt]} />
      </Animated.View>
      {hero && home ? (
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: cell, height: cell, padding: pad, backgroundColor: c.line }, flySt]}>
          {face}
        </Animated.View>
      ) : null}
    </>
  );
}

/** The way to the goal under the board: one small tile per milestone, empty
    until reached, then in its own colour. The last one is the goal. A
    milestone reached pops its square when the flying tile lands in it. */
function Track({ steps, best, width, gap, top }: { steps: number[]; best: number; width: number; gap: number; top: number }) {
  const between = gap;
  const size = Math.floor((width - between * (steps.length - 1)) / steps.length);
  const h = Math.max(28, Math.min(44, Math.round(size * 0.5)));
  const reached = steps.filter((v) => best >= v).length;
  return (
    <View
      pointerEvents="none"
      accessible
      accessibilityLabel={`Вехи: ${reached} из ${steps.length}. Цель ${steps[steps.length - 1]}`}
      style={{ width, flexDirection: 'row', gap: between, marginTop: top }}>
      {steps.map((v, k) => (
        <TrackStep key={v} v={v} on={best >= v} goal={k === steps.length - 1} w={size} h={h} frame={Math.max(3, Math.round(gap * 0.6))} />
      ))}
    </View>
  );
}

function TrackStep({ v, on, goal, w, h, frame }: { v: number; on: boolean; goal: boolean; w: number; h: number; frame: number }) {
  const { c, depth, isDark } = useTheme();
  const rk = rank(v);
  const k = useSharedValue(1);
  const was = useRef(on);
  useEffect(() => {
    if (on && !was.current) k.value = withSequence(withTiming(1.25, { duration: 0 }), withTiming(1, back(360, 2.6)));
    was.current = on;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: k.value }] }));
  return (
    <Animated.View style={[{ width: w, height: h, padding: frame, backgroundColor: on || goal ? c.line : c.hair }, st]}>
      <View style={{ flex: 1, backgroundColor: on ? c.tile[rk] : c.canvas, alignItems: 'center', justifyContent: 'center' }}>
        <Depth kind={depth} fill={on ? c.tile[rk] : c.canvas} open={{ t: true, r: true, b: true, l: true }} size={h} empty={!on} dark={isDark} />
        <TileNum v={v} color={on ? c.ink[rk] : goal ? c.text : c.faint} size={Math.max(11, Math.round(h * 0.36))} />
      </View>
    </Animated.View>
  );
}

/** One sweep layer under the board. */
function Plate({ on, k, dir, width }: { on: boolean; k: number; dir: Dir; width: number }) {
  const { c } = useTheme();
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const o = useSharedValue(on ? 1 : 0);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) return void (first.current = false);
    if (on) {
      x.value = 0;
      y.value = -PLATE * 2;
      y.value = withDelay(k * 80, withTiming(0, back(300, 2.2)));
      o.value = withDelay(k * 80, withTiming(1, { duration: 120 }));
    } else {
      const [ux, uy] = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[dir];
      x.value = withTiming(ux * 80, { duration: 220, easing: Easing.in(Easing.quad) });
      y.value = withTiming(uy * 24, { duration: 220, easing: Easing.in(Easing.quad) });
      o.value = withTiming(0, { duration: 220 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on]);
  const st = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateX: x.value }, { translateY: y.value }] }));
  return <Animated.View style={[{ width, height: PLATE, marginTop: k ? 2 : 4, backgroundColor: c.line }, st]} />;
}

/** "+N" rising from the cell where a merge happened. */
function Float({ at, v, cell, gap }: { at: number; v: number; cell: number; gap: number }) {
  const { c } = useTheme();
  const k = useSharedValue(0);
  useEffect(() => {
    k.value = withTiming(1, { duration: 760, easing: Easing.out(Easing.cubic) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const pad = gap / 2;
  const st = useAnimatedStyle(() => ({
    opacity: k.value < 0.6 ? 1 : 1 - (k.value - 0.6) / 0.4,
    transform: [{ translateY: -k.value * cell * 0.7 }, { scale: 0.8 + Math.min(1, k.value * 4) * 0.2 }],
  }));
  return (
    <Animated.View
      style={[
        { position: 'absolute', left: pad + (at % N) * cell, top: pad + ((at / N) | 0) * cell - cell * 0.3, width: cell, alignItems: 'center' },
        st,
      ]}>
      <Text
        allowFontScaling={false}
        style={{ fontFamily: font.tile, fontSize: Math.round(cell * (v >= 24 ? 0.34 : 0.28)), color: c.text, textShadowColor: c.canvas, textShadowRadius: 4 }}>
        {`+${v}`}
      </Text>
    </Animated.View>
  );
}

/** A tray piece. New ones spring in one after another. Own shared values, not
    `entering`, so Safari keeps their size. */
function TrayPiece({ delay, opacity, children }: { delay: number; opacity: number; children: React.ReactNode }) {
  const k = useSharedValue(0);
  useEffect(() => {
    k.value = withDelay(delay, withTiming(1, back(300, 2.2)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: 0.4 + k.value * 0.6 }], opacity: Math.min(1, k.value * 2) * opacity }));
  return <Animated.View style={st}>{children}</Animated.View>;
}

/** The lesson's own move: a see-through copy of the piece goes from its slot
    to the hatched cell, again and again. */
function Demo({ piece, from, to, cell, gap }: { piece: Piece; from: { x: number; y: number }; to: { x: number; y: number }; cell: number; gap: number }) {
  const { w, h } = pieceGrid(piece);
  const start = { x: from.x - (w * cell) / 2, y: from.y - (h * cell) / 2 };
  const k = useSharedValue(0);
  const o = useSharedValue(0);
  useEffect(() => {
    const loop = () => {
      k.value = 0;
      o.value = withSequence(withTiming(0.75, { duration: 250 }), withDelay(950, withTiming(0.75, { duration: 0 })), withTiming(0, { duration: 300 }));
      k.value = withDelay(250, withTiming(1, { duration: 700, easing: Easing.inOut(Easing.cubic) }));
    };
    loop();
    const id = setInterval(loop, 2400);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const st = useAnimatedStyle(() => ({
    opacity: o.value,
    transform: [
      { translateX: start.x + (to.x - start.x) * k.value },
      { translateY: start.y + (to.y - start.y) * k.value },
    ],
  }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0 }, st]}>
      <Field variant="piece" {...pieceGrid(piece)} cell={cell} gap={gap} />
    </Animated.View>
  );
}

/** For the sweep lesson: a finger square that crosses the board, the gesture
    to copy. */
function Finger({ board }: { board: { x: number; y: number; w: number } }) {
  const { c } = useTheme();
  const size = 44;
  const k = useSharedValue(0);
  const o = useSharedValue(0);
  useEffect(() => {
    const loop = () => {
      k.value = 0;
      o.value = withSequence(withTiming(0.8, { duration: 200 }), withDelay(600, withTiming(0, { duration: 250 })));
      k.value = withDelay(200, withTiming(1, { duration: 600, easing: Easing.inOut(Easing.quad) }));
    };
    loop();
    const id = setInterval(loop, 1800);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const x0 = board.x + board.w * 0.75 - size / 2;
  const x1 = board.x + board.w * 0.25 - size / 2;
  const y = board.y + board.w / 2 - size / 2;
  const st = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateX: x0 + (x1 - x0) * k.value }, { translateY: y }] }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', left: 0, top: 0, width: size, height: size, borderWidth: 4, borderColor: c.line, backgroundColor: c.canvas }, st]}
    />
  );
}
