import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { PanResponder, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';

import { Field, type CellLook } from '@/components/Field';
import { Overlay } from '@/components/Overlay';
import { Body, Button, Heading, IconButton, Key, Label, Panel, Screen, TextLink } from '@/components/ui';
import { pieceGrid } from '@/design/mock';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dur, enter, exit, HIT, space, type } from '@/design/system';
import { useTheme } from '@/design/theme';
import { font, rank } from '@/design/tokens';
import engine, { type Dir, type Game as EngineGame, type Piece, type Step } from '@/game/engine';
import { LESSONS } from '@/game/lessons';
import { slideMoves, type Move } from '@/game/slide';
import { useGame } from '@/game/store';
import { fx } from '@/sound/sfx';
import { TileNum } from '@/components/TileNum';
import { Block, plateStyle, Socket } from '@/components/Block';
import { Icon } from '@/components/icons';
import { Formula } from '@/components/Formula';
import { INTRO_STEP, milestonesFor } from '@/components/Track';

/* The game. The rules are the engine the prototype and the balance simulator
   run; this screen only shows them. A placement lands first, then each merge
   of the chain plays one beat after the last: the board steps through the
   cascade while the marimba climbs. */

const N = engine.N;
const STEP = 190; // ms between merges of a chain: long enough to read each one
/** A cascade speeds up as it goes: the gap before merge k+1. */
const GAPS = [180, 160, 140, 120, 110];
const chainAt = (k: number) => GAPS.slice(0, k).reduce((a, b) => a + b, 0) + Math.max(0, k - GAPS.length) * GAPS[GAPS.length - 1];
const FLY = 110; // ms for an absorbed tile to fly into its partner
const ECHO_MS = 460; // ms one square wave of a chained merge takes to fade
const ECHO_GAP = 70; // ms between the waves of one merge
const PLATE = 6; // px each sweep layer shows under the board
const back = (d: number, k = 1.8) => ({ duration: d, easing: Easing.out(Easing.back(k)) });

/** A mouse or trackpad (web on a computer), not a finger. */
const FINE_POINTER = Platform.OS === 'web' && typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: fine)').matches;

// On the web a drag would otherwise select the numbers.
const noSelect = { userSelect: 'none' } as object;

const SWIPE = 24; // px of travel that counts as a swipe
const SLIDE = dur.base; // ms for tiles to travel in a sweep
const PUSH_MS = 260; // ms for the pushed piece to ride in from the far edge
const EXPLAIN_AFTER = 1100; // ms from a proved step to its explanation card
const LESSON_READ = 1400; // ms more to read the formula of a step with no card

type Hold = { slot: number; piece: Piece };

const isMilestone = (v: number) => v >= 24 && Number.isInteger(Math.log2(v / 3));

/** Whether a piece fits anywhere on the board; one that fits nowhere is dimmed in the tray. */
function fitsSomewhere(board: number[], p: Piece) {
  const { w, h } = engine.size(p);
  for (let y = 0; y <= N - h; y++) for (let x = 0; x <= N - w; x++) if (engine.fits(board, p, x, y)) return true;
  return false;
}

/** The placement that merges the most, as [cell, value] pairs to hatch. */
function bestMove(g: { board: number[]; tray: (Piece | null)[]; cfg: { absorb?: 'big' | 'new' } }): [number, number][] | null {
  let top: [number, number][] | null = null;
  let most = 0;
  for (const p of g.tray) {
    if (!p || p.used) continue;
    const { w, h } = engine.size(p);
    for (let y = 0; y <= N - h; y++)
      for (let x = 0; x <= N - w; x++) {
        if (!engine.fits(g.board, p, x, y)) continue;
        const n = engine.applyPlacement(g.board.slice(), p, x, y, g.cfg.absorb).steps.length;
        if (n > most) {
          most = n;
          top = p.cells.map(([cx, cy, v]) => [(y + cy) * N + x + cx, v] as [number, number]);
        }
      }
  }
  return top;
}

/** When no piece fits, the swipe that does the most: its merges, plus the
    pushed piece landing and what that merges. Tried on a copy of the game. */
function bestPush(g: EngineGame): Dir | null {
  let best: Dir | null = null;
  let top = -Infinity;
  for (const d of ['left', 'right', 'up', 'down'] as Dir[]) {
    const c = { ...g, board: g.board.slice(), tray: g.tray.map((p) => p && { ...p, cells: p.cells.map((x) => [...x] as [number, number, number]) }), rng: () => 0.5 } as EngineGame;
    const r = engine.sweep(c, d);
    if (!r) continue;
    const sc = r.made.length * 2 + (r.pushed ? 1 + r.pushed.steps.length * 2 : 0) - (c.over ? 10 : 0);
    if (sc > top) {
      top = sc;
      best = d;
    }
  }
  return best;
}
/** Where a swipe that way would bring the next tray piece in: tried on a
    copy of the game, so the board can show it while the finger is down. */
function aimPush(g: EngineGame, d: Dir): { piece: Piece; ox: number; oy: number } | null {
  const c = { ...g, board: g.board.slice(), tray: g.tray.map((p) => p && { ...p, cells: p.cells.map((x) => [...x] as [number, number, number]) }), rng: () => 0.5 } as EngineGame;
  const r = engine.sweep(c, d);
  return r?.pushed ? { piece: r.pushed.piece, ox: r.pushed.ox, oy: r.pushed.oy } : null;
}
const UNIT: Record<Dir, [number, number]> = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };

export default function Game() {
  const { c, hints, isDark } = useTheme();
  const store = useGame();
  const g = store.game;
  const { width, height } = useWindowDimensions();
  const { learn } = useLocalSearchParams<{ learn?: string }>();
  // A medal reached mid-game rings once, on the move that reached it.
  const counted = !g.cfg.freeSweeps && g.cfg.sweepsMax > 0;
  const showTrack = false;
  const lesson = store.lesson === null ? null : LESSONS[store.lesson];
  const [coach, setCoach] = useState<'task' | 'done'>('task');
  /** The lesson whose explanation card is up, if any. */
  const [explain, setExplain] = useState<number | null>(null);
  // The lesson on the board now, for timers that outlive a render (skip from pause).
  const lessonNow = useRef(store.lesson);
  lessonNow.current = store.lesson;

  // Opened to learn: start the first lesson once the save has loaded.
  useEffect(() => {
    if (store.ready && learn && store.lesson === null) store.startLesson(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.ready, learn]);
  useEffect(() => {
    setCoach('task');
    setExplain(null);
    if (store.lesson === 0) lessonPeak.current = 0;
  }, [store.lesson]);

  // What the board shows. Equal to the game's board at rest; during a chain it
  // steps through the intermediate positions.
  const [shown, setShown] = useState<number[]>(() => g.board.slice());
  /* A hint is shown, not told: after a long pause the board hatches one good
     move, once per game. */
  const [nudge, setNudge] = useState<[number, number][] | null>(null);
  const idleShown = useRef(0);
  const [flights, setFlights] = useState<{ id: string; m: Move; ms: number }[]>([]);
  /** The square waves of a second, third… merge in one chain. */
  const [echoes, setEchoes] = useState<{ id: string; at: number; v: number; n: number }[]>([]);
  // While a swipe is held past the threshold: where the next piece will ride in.
  const [aim, setAim] = useState<{ id: string; piece: Piece; ox: number; oy: number; dir: Dir } | null>(null);
  const aimDir = useRef<Dir | null>(null);
  const [incoming, setIncoming] = useState<{ id: number; piece: Piece; ox: number; oy: number; dir: Dir; delay: number } | null>(null);
  const [floats, setFloats] = useState<{ id: string; at: number; v: number; times: number }[]>([]);
  const [returning, setReturning] = useState<number | null>(null);
  const [pops, setPops] = useState<Record<number, number>>({});
  const [lands, setLands] = useState<Record<number, number>>({});
  const [hold, setHold] = useState<Hold | null>(null);
  /** The best tile before the move now playing: a merge above it is a new milestone. */
  const peak = useRef(g.bestTile);
  /** A milestone's wave across the board, from the cell that made it. */
  const [ripple, setRipple] = useState<{ at: number; v: number; id: number; board: number[]; primaries?: boolean } | null>(null);
  /** The best milestone earned during the lessons: the track keeps it from step to step. */
  const lessonPeak = useRef(0);
  /** The move now playing made a milestone (it gets the full show already). */
  const moveHadMilestone = useRef(false);
  /** Bumps when the track should assemble itself square by square (the start of the first game). */
  const [trackIntro, setTrackIntro] = useState(0);
  /** The lesson board breaking up at the end of the lessons. */
  const [scatter, setScatter] = useState<{ id: number; board: number[] } | null>(null);
  /** Bumps when the lesson line changes, so it kicks in. */
  const lineKick = useSharedValue(1);
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
  /** How far the cascade on the board has got toward an earned sweep. */
  const [chain, setChain] = useState(0);
  const settle = () => {
    clearTimers();
    setBonusHeld(false);
    setChain(0);
    setFlights([]);
    setIncoming(null);
    setFloats([]);
    setEchoes([]);
    setSliding(null);
    setReturning(null);
    setHeld(null);
    /* The milestone wave and the lessons' break-up draw copies of the board
       over it and take them down from a timer. clearTimers just dropped that
       timer, so they go here too, or the copies stay on the board as tiles
       that never move, even into a new game. */
    setRipple(null);
    setScatter(null);
    setTrackHold(0);
    setAim(null);
    aimDir.current = null;
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
  // The line above the board: a lesson's formula, its tiles at the tray's cell.
  const LESSON_H = trayMax;
  const chrome = ins.top + ins.bottom + 24 + 64 + (store.lesson !== null ? LESSON_H + space.lg : 0) + 12 + trayMax * 3 + 32 + 48;
  const boardSize = Math.max(240, Math.min(inner, height - chrome));
  const cell = Math.floor((boardSize - gap) / N);
  /* One column for the whole screen: the header, the lesson, the board and
     the tray share the board's left and right edges. */
  const col = cell * N + gap;
  // Tray pieces at 0.7 of a board cell, as large as three slots of three cells allow.
  const trayCell = Math.min(Math.round(cell * 0.7), Math.floor(col / 9));
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
    const milestoneFired = moveHadMilestone.current;
    later(ms + 150, () => {
      if (L.goal(g)) {
        /* The step is proved: its result tile rises and turns over, a wave
           of its colour runs out over the board, and a bell rings, a step
           higher with every lesson. The line turns into the formula on the
           same frame. A step that made a milestone already had its show. */
        const at = resultCell(g.board, L);
        if (!milestoneFired && at >= 0) {
          setRipple({ at, v: g.board[at], id: Date.now(), board: g.board.slice() });
          later(RIPPLE_MS, () => setRipple(null));
        }
        if (!milestoneFired) fx.milestone(24 * 2 ** Math.min(k, 4));
        setCoach('done');
        kickLine();
        // When the show has played, the board dims and a card says what
        // happened. The player moves on with the button, in their own time.
        // A step that only repeats an idea moves on by itself.
        const wait = milestoneFired ? RIPPLE_MS + 200 : EXPLAIN_AFTER;
        if (L.card) later(wait, () => lessonNow.current === k && setExplain(k));
        else later(wait + LESSON_READ, () => advance(k));
      } else if (pieceStep) {
        // Cannot happen with moves locked, but never leave a lesson stuck.
        later(400, () => lessonNow.current === k && store.startLesson(k));
      }
    });
  };

  /** «Понятно» on the explanation card: the card goes, then the next step. */
  const nextLesson = () => {
    const k = explain;
    if (k === null) return;
    setExplain(null);
    advance(k);
  };
  const advance = (k: number) => {
    later(dur.base, () => {
      if (lessonNow.current !== k) return;
      if (k + 1 < LESSONS.length) return store.startLesson(k + 1);
      finale();
    });
  };

  /** The tile a lesson was about: the highest one on the board. */
  const resultCell = (board: number[], _L: unknown) => {
    let at = -1;
    board.forEach((v, i) => {
      if (v > 0 && (at < 0 || v > board[at])) at = i;
    });
    return at;
  };

  const kickLine = () => {
    lineKick.value = withSequence(withTiming(1.12, { duration: 0 }), withTiming(1, back(320, 2.4)));
  };

  /* The end of the lessons. The lesson board breaks up: every tile lifts and
     drops away in a wave from the centre, one soft knock each. Then the real
     game: the board is empty, the goal kicks into the line, and the track to
     384 assembles square by square while the marimba climbs the milestones. */
  const finale = () => {
    // The engine's board, not the shown one: this runs from a timer set
    // before the last move finished drawing.
    const board = g.board.slice();
    setScatter({ id: Date.now(), board });
    setShown(new Array(N * N).fill(0));
    fx.sweep();
    later(SCATTER_MS, () => {
      setScatter(null);
      skipLessons();
      setTrackIntro(Date.now());
      later(120, () => fx.cascade(milestonesFor(engine.DEFAULTS.goal), INTRO_STEP));
    });
  };

  const skipLessons = () => {
    settle();
    store.finishLessons();
  };

  /** Of a move's merge levels, in order, which ones make a new milestone:
      the first merge of each milestone value above the best before the move. */
  const milestonesIn = (levels: number[]) => {
    const before = peak.current;
    peak.current = Math.max(before, ...levels);
    const seen = new Set<number>();
    const marks = levels.map((l) => {
      if (l <= before || !isMilestone(l) || seen.has(l)) return false;
      seen.add(l);
      return true;
    });
    moveHadMilestone.current = marks.some(Boolean);
    return marks;
  };
  /** One merge lands: the note, the points, the press. A milestone rings its
      bell instead of the note and sends a wave of its colour across the board. */
  const land = (at: number, level: number, milestone: boolean, board: number[], pts = level, step = 0) => {
    setPops((pp) => ({ ...pp, [at]: Date.now() }));
    if (milestone) {
      // The goal itself rings with the win card that follows, not a bell.
      if (level === g.cfg.goal) fx.merge(level, step);
      else fx.milestone(level);
      setRipple({ at, v: level, id: Date.now(), board: board.slice() });
      if (store.lesson !== null) lessonPeak.current = Math.max(lessonPeak.current, level);
      // Its square on the track fills when the flying copy lands there.
      setTrackHold(level);
      later(FLIP + 120 + FLY_HOME, () => {
        setTrackHold(0);
        fx.bonus();
      });
      later(RIPPLE_MS, () => setRipple(null));
    } else fx.merge(level, step);
    /* A merge that a merge made: the tile sends out one square wave per
       merge of the chain so far, in its new colour, so a double reads as
       two rings and a triple as three. */
    if (step > 0 && !milestone) {
      const id = `${at}-${Date.now()}-${step}`;
      setEchoes((e) => [...e, { id, at, v: level, n: Math.min(4, step + 1) }]);
      later(ECHO_MS + 4 * ECHO_GAP, () => setEchoes((e) => e.filter((x) => x.id !== id)));
    }
    float(at, pts, Math.round(pts / level));
    thump(milestone ? Math.max(level, 192) : level);
  };

  /* 1919 points, the year the Bauhaus opened: a milestone of the score,
     once a game. Its wave runs in the school's three primaries, blue, red
     and yellow, ring by ring; the score in the header is stamped on a
     yellow block; three notes climb, then the bell. If the same move made a
     tile milestone, this one waits for that show to finish. */
  const bauhausCheck = (s0: number, ms: number, at: number, s1 = g.score) => {
    if (store.lesson !== null || s0 >= BAUHAUS || s1 < BAUHAUS) return;
    const wait = moveHadMilestone.current ? ms + RIPPLE_MS : ms + 60;
    later(wait, () => {
      setRipple({ at, v: 3, id: Date.now(), board: g.board.slice(), primaries: true });
      later(RIPPLE_MS, () => setRipple(null));
      fx.cascade([3, 6, 12], 90);
      later(280, () => fx.milestone(96));
      stamp.value = withSequence(withTiming(1, { duration: 120 }), withDelay(1100, withTiming(0, { duration: 400 })));
      scoreKick.value = withSequence(withTiming(1.3, { duration: 0 }), withTiming(1, back(420, 2.6)));
    });
  };
  const stamp = useSharedValue(0);
  const scoreKick = useSharedValue(1);
  const stampStyle = useAnimatedStyle(() => ({ opacity: stamp.value, transform: [{ scaleX: 0.6 + stamp.value * 0.4 }] }));
  const scoreStyle = useAnimatedStyle(() => ({ transform: [{ scale: scoreKick.value }], transformOrigin: 'center' }));

  /** Points rise from where a merge happened. */
  const float = (at: number, v: number, times = 1) => {
    const id = `${at}-${Date.now()}-${Math.random()}`;
    setFloats((f) => [...f, { id, at, v, times }]);
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
    // The piece rides above the finger so the finger never hides it. A mouse
    // hides nothing, so there the piece sits under the pointer, where aimed.
    if (FINE_POINTER) return { ox: (w * cell) / 2, oy: (h * cell) / 2 };
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
    const s0 = g.score;
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
    const done = playChain(frame, res.steps, milestonesIn(res.steps.map((st) => st.level)), 90);
    later(done + 20, () => setShown(g.board.slice()));
    if (res.refilled) later(done + 120, () => fx.tray());
    // A chain of two or more earns a sweep: its layer slides in under the
    // board as the last merge lands, with its own two rising ticks.
    /* The empty layer under the board is cut into as many segments as a
       cascade needs merges to earn it. Each merge of this chain fills one on
       the frame it lands, so a chain of three shows how far it got: three of
       five. A full layer becomes the earned sweep. */
    if (counted && g.cfg.chainBonus && res.steps.length) {
      res.steps.slice(0, g.cfg.chainBonus).forEach((_, k) => later(90 + chainAt(k) + FLY, () => setChain(k + 1)));
      later(done + (res.bonus ? 0 : 700), () => setChain(0));
    }
    if (res.bonus) {
      setBonusHeld(true);
      later(done, () => {
        setBonusHeld(false);
        fx.bonus();
      });
    }
    if (res.steps.length) bauhausCheck(s0, done, res.steps[res.steps.length - 1].anchor);
    afterMove(done);
  };

  /** Plays a placed piece's chain from `base` ms: one merge per step, the
      absorbed tile flies into its partner, and on arrival the partner flashes,
      its number kicks, the note plays, the haptic taps and the points float up,
      all on the same frame. `frame` is the board with the piece laid. Returns
      when the last merge has landed. */
  const playChain = (frame: number[], steps: Step[], marks: boolean[], base: number) => {
    steps.forEach((st, k) => {
      const t0 = base + chainAt(k);
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
        land(st.anchor, st.level, marks[k], snap, st.pts, k);
      });
    });
    return base + chainAt(Math.max(0, steps.length - 1)) + (steps.length ? FLY : 0);
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

  /* The held piece's move, played on a copy of the board: which tiles the
     whole cascade will eat, and where it ends and as what. The bigger tile
     takes the smaller in, so the end is often a tile already on the board.
     The board shows exactly this, so a merge never comes as a surprise. */
  const preview = useMemo(() => {
    if (!hold || !target || !engine.fits(shown, hold.piece, target.gx, target.gy)) return null;
    const b = shown.slice();
    const { laid, steps } = engine.applyPlacement(b, hold.piece, target.gx, target.gy, g.cfg.absorb);
    const own = new Map(laid.map((at, k) => [at, hold.piece.cells[k][2]] as [number, number]));
    const eaten = new Set<number>();
    for (const st of steps) for (const a of st.absorbed) if (!own.has(a)) eaten.add(a);
    const result: Record<number, number> = {};
    for (const st of steps) if (b[st.anchor] > 0) result[st.anchor] = b[st.anchor];
    return { laid: own, eaten, result };
  }, [shown, hold, target]);

  /* ---------- what each cell looks like right now ---------- */
  const look = useCallback(
    (i: number): CellLook | undefined => {
      const l: CellLook = { pop: pops[i], land: lands[i] };
      if (!hold && nudge) {
        const h = nudge.find(([at]) => at === i);
        if (h && shown[i] === 0) l.ghost = h[1];
      }
      // A held swipe: the cells the next tray piece will ride in to, hatched
      // in its colour, the board's own "a piece goes here" (see aimAt).
      if (!hold && aim) {
        const m = aim.piece.cells.find(([cx, cy]) => (aim.oy + cy) * N + aim.ox + cx === i);
        if (m) l.ghost = m[2];
      }
      if (!hold && lesson?.hint && coach === 'task') {
        const h = lesson.hint.find(([at]) => at === i);
        if (h && shown[i] === 0) l.ghost = h[1];
      }
      if (hold) {
        const pv = hold.piece.cells[0][2];
        if (shown[i] > 0 && !engine.pairs(pv, shown[i])) l.dim = true;
        /* Magnets: a tile next to where the piece would land leans toward a
           partner it would join, and away from a like pole (1 by 1, 2 by 2). */
        if (target && shown[i] > 0) {
          const x = i % N;
          const y = (i / N) | 0;
          for (const [cx, cy, cv] of hold.piece.cells) {
            const dx = target.gx + cx - x;
            const dy = target.gy + cy - y;
            if (Math.abs(dx) + Math.abs(dy) !== 1) continue;
            if (engine.pairs(cv, shown[i])) l.lean = [dx * 0.09, dy * 0.09];
            else if (cv < 3 && cv === shown[i]) l.lean = [-dx * 0.07, -dy * 0.07];
            if (l.lean) break;
          }
        }
        if (target && preview) {
          // The move played out ahead: the tiles that will fly in get the
          // "about to be eaten" frame, every one of the cascade and only
          // those; the piece's cells show what they will turn into.
          if (preview.result[i]) {
            l.ghost = preview.result[i];
            l.dim = false;
          } else if (preview.eaten.has(i)) {
            l.absorb = true;
            l.dim = false;
          } else if (preview.laid.has(i)) l.ghost = preview.laid.get(i);
        }
      }
      return l;
    },
    [shown, hold, target, preview, pops, lands, lesson, coach, nudge, aim],
  );

  const values = useMemo(() => {
    /* A tile on an aimed cell is about to slide away from it; while the
       swipe is held the cell shows the piece coming instead. */
    if (!hold && aim) {
      const v = shown.slice();
      for (const [x, y] of aim.piece.cells) v[(aim.oy + y) * N + aim.ox + x] = 0;
      return v;
    }
    if (!hold || !target) return shown;
    const v = shown.slice();
    for (const [x, y, val] of hold.piece.cells) v[(target.gy + y) * N + target.gx + x] = val;
    // The cell where a cascade ends shows the tile it ends as; a cell of
    // the piece that flies into a bigger tile still shows the piece.
    if (preview) for (const [i, r] of Object.entries(preview.result)) v[+i] = r;
    return v;
  }, [shown, hold, target, aim, preview]);

  /* ---------- sweep: swipe the board ----------
     While the finger moves the board leans a few points that way; on release
     every tile slides to where the engine put it, and the merges pop where
     two tiles met. */
  const sx = useSharedValue(0);
  const sy = useSharedValue(0);
  // The board tips like a tray in the hands when swept: 3° toward the way the blocks go.
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const boardStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 900 }, { translateX: sx.value }, { translateY: sy.value }, { rotateX: `${tx.value}deg` }, { rotateY: `${ty.value}deg` }, { scale: bump.value }],
  }));
  const tilt = (dir: Dir, deg: number, hold: number) => {
    const [ux, uy] = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[dir];
    const go = (v: number) => withSequence(withTiming(v, { duration: 90, easing: Easing.out(Easing.quad) }), withDelay(hold, withTiming(0, { duration: 160, easing: Easing.inOut(Easing.quad) })));
    tx.value = go(-uy * deg);
    ty.value = go(ux * deg);
  };

  /* The sweep key shows the gesture instead of doing it: the board leans
     each way in turn, the way a swipe would tip it. */
  const hintSweep = () => {
    const lean = Math.round(cell * 0.12);
    const go = (v: number) => withSequence(withTiming(v, { duration: 120, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 120, easing: Easing.in(Easing.quad) }));
    sx.value = withSequence(go(-lean), go(lean), withTiming(0, { duration: 480 }));
    sy.value = withSequence(withTiming(0, { duration: 480 }), go(-lean), go(lean));
  };

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
      tilt(dir, 1.5, 0);
      return;
    }
    settle();
    const before = g.board.slice();
    const moves = slideMoves(before, dir, !!g.cfg.sweepChain);
    lastDir.current = dir;
    const s0 = g.score;
    const res = store.sweep(dir);
    if (!res) {
      fx.invalid();
      tilt(dir, 1.5, 0);
      return;
    }
    fx.sweep();
    tilt(dir, 3, SLIDE - 90);
    const push = res.pushed ?? null;
    const allMarks = milestonesIn([...res.made.map((m) => m.level), ...(push ? push.steps.map((st) => st.level) : [])]);
    const marks = allMarks.slice(0, res.made.length);
    if (push?.refilled) trayId.current++;
    // Stones stay put while the tiles slide around them.
    setShown(before.map((v) => (v < 0 ? v : 0)));
    setSliding({ moves, id: Date.now() });
    /* A tile that merges more than once in a line (3 3 6 -> 12) lands showing
       its first merge, and each later merge steps it up on its own pop, so
       the number, the note and the points rise together. */
    const after = (res.swept ?? g.board).slice();
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
      sx.value = withSequence(withTiming(ux * 2, { duration: 50 }), withTiming(0, { duration: 200, easing: Easing.out(Easing.cubic) }));
      sy.value = withSequence(withTiming(uy * 2, { duration: 50 }), withTiming(0, { duration: 200, easing: Easing.out(Easing.cubic) }));
    });
    // The k-th merge of one tile in its line is step k of its chain.
    const nth: Record<number, number> = {};
    res.made.forEach((m, k) => {
      const step = (nth[m.at] = (nth[m.at] ?? -1) + 1);
      later(SLIDE + k * STEP, () => {
        setShown((sh) => (sh[m.at] === m.level ? sh : Object.assign(sh.slice(), { [m.at]: m.level })));
        land(m.at, m.level, marks[k], after, m.pts, step);
      });
    });
    let done = SLIDE + res.made.length * STEP;
    later(done, () => setShown(after));
    const sMade = s0 + res.made.reduce((t, m) => t + m.level, 0);
    if (res.made.length) bauhausCheck(s0, SLIDE + (res.made.length - 1) * STEP, res.made[res.made.length - 1].at, sMade);
    /* The push: the next tray piece leaves its slot and rides in from beyond
       the far edge into the room the slide made. It lands with the place
       sound and haptic on the frame it stops, then its own chain plays. */
    if (push) {
      const enterAt = res.made.length ? done : SLIDE - 60;
      const frame = after.slice();
      push.piece.cells.forEach(([cx, cy, v]) => (frame[(push.oy + cy) * N + push.ox + cx] = v));
      setIncoming({ id: Date.now(), piece: push.piece, ox: push.ox, oy: push.oy, dir, delay: enterAt });
      later(enterAt + PUSH_MS, () => {
        setIncoming(null);
        setShown(frame.slice());
        const now = Date.now();
        setLands((l) => ({ ...l, ...Object.fromEntries(push.laid.map((i) => [i, now])) }));
        fx.place(push.piece.cells.length);
      });
      const chainEnd = playChain(frame, push.steps, allMarks.slice(res.made.length), enterAt + PUSH_MS + 90);
      if (push.steps.length) bauhausCheck(sMade, chainEnd, push.steps[push.steps.length - 1].anchor);
      done = chainEnd;
      later(done + 20, () => setShown(g.board.slice()));
      if (push.refilled) later(done + 120, () => fx.tray());
    }
    afterMove(done);
  };

  const sweepRef = useRef(sweep);
  sweepRef.current = sweep;
  /* The pushed piece's cells show up hatched in its colour as soon as the
     finger has gone far enough to count as a swipe, and move when the swipe
     changes direction. Letting go hands over to Incoming. */
  const aimAt = (dir: Dir | null) => {
    if (dir === aimDir.current) return;
    aimDir.current = dir;
    const ok = dir && g.cfg.freeSweeps && g.cfg.sweepCost === 'push' && !g.over && !(lesson?.dirs && !lesson.dirs.includes(dir));
    const at = ok ? aimPush(g, dir) : null;
    setAim(at && dir ? { ...at, dir, id: `${dir}-${store.version}` } : null);
  };
  const aimRef = useRef(aimAt);
  aimRef.current = aimAt;
  const swipe = useMemo(() => {
    const axis = (dx: number, dy: number) => (Math.abs(dx) > Math.abs(dy) ? 'x' : 'y');
    const lean = (d: number) => Math.max(-8, Math.min(8, d * 0.1));
    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) + Math.abs(gs.dy) > 8,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, gs) => {
        const x = axis(gs.dx, gs.dy) === 'x';
        if (x) {
          sx.value = lean(gs.dx);
          sy.value = 0;
        } else {
          sy.value = lean(gs.dy);
          sx.value = 0;
        }
        const d = x ? gs.dx : gs.dy;
        aimRef.current(Math.abs(d) < SWIPE ? null : x ? (d > 0 ? 'right' : 'left') : d > 0 ? 'down' : 'up');
      },
      onPanResponderRelease: (_, gs) => {
        aimRef.current(null);
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
        aimRef.current(null);
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

  /* Stuck: no piece in the tray fits, and only a swipe can go on. The
     board says it without words: it leans the way of the best swipe, twice,
     and the piece that would ride in pulses in the tray. Again while stuck. */
  const stuckPulse = useSharedValue(1);
  const [stuckSlot, setStuckSlot] = useState<number | null>(null);
  const stuckStyle = useAnimatedStyle(() => ({ transform: [{ scale: stuckPulse.value }] }));
  useEffect(() => {
    if (!hints || store.lesson !== null || g.over || hold || sliding) return;
    const free = g.tray.filter((p): p is Piece => !!p && !p.used);
    if (!free.length || free.some((p) => engine.canPlaceAnywhere(g.board, p))) return;
    const show = () => {
      const d = bestPush(g);
      if (!d) return;
      const [ux, uy] = UNIT[d];
      const lean = (u: number) =>
        withSequence(
          withTiming(u * 10, { duration: 220, easing: Easing.out(Easing.cubic) }),
          withTiming(0, back(320, 2.2)),
          withDelay(200, withTiming(u * 10, { duration: 220, easing: Easing.out(Easing.cubic) })),
          withTiming(0, back(320, 2.2)),
        );
      sx.value = lean(ux);
      sy.value = lean(uy);
      setStuckSlot(g.tray.findIndex((p) => p && !p.used));
      const beat = () => withSequence(withTiming(1.18, { duration: 200 }), withTiming(1, back(300, 2.2)));
      stuckPulse.value = withSequence(beat(), withDelay(200, beat()));
    };
    const first = setTimeout(show, 2500);
    const again = setInterval(show, 9000);
    return () => {
      clearTimeout(first);
      clearInterval(again);
      setStuckSlot(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.version, hold, store.lesson, hints, !!sliding]);

  /* Where each milestone's square sits, in the board's own coordinates, so
     the milestone tile can fly into it. Mirrors Track's layout. */
  const milestones = milestonesFor(g.cfg.goal);
  const trackTop = step / 2;
  const trackHome = (v: number) => {
    const k = milestones.indexOf(v);
    if (k < 0 || !showTrack) return null;
    const size = Math.floor((col - gap * (milestones.length - 1)) / milestones.length);
    const h = Math.max(28, Math.min(44, Math.round(size * 0.5)));
    const plates = counted ? g.cfg.sweepsMax * (PLATE + 2) + 2 : 0;
    return { x: k * (size + gap), y: cell * N + gap + trackTop + plates, w: size, h };
  };

  // While tiles are in flight the board under them is empty; keep the last best.
  const bestRef = useRef(0);
  if (!sliding) bestRef.current = Math.max(...shown, 0);
  const best = bestRef.current;
  /* The goal of the game in hand is the next milestone, not the far 384:
     the track frames it, and the first game names it above the board. */
  const trackBest = store.lesson !== null ? Math.max(best, lessonPeak.current) : best;
  const nextStep = milestones.find((v) => v > trackBest) ?? null;

  /* ---------- the lesson plays its own move ----------
     A see-through copy of the piece lifts from its slot, glides to the
     hatched cell and fades, over and over until the player takes over. The
     sweep lesson shows a finger square crossing the board instead. */
  const slotRefs = useRef<(ComponentRef<typeof View> | null)[]>([]);
  type Geo = { board: { x: number; y: number; w: number }; slot?: { x: number; y: number } };
  const [geo, setGeo] = useState<Geo | null>(null);
  const demoSlot = lesson && lesson.hint ? g.tray.findIndex((p) => p && !p.used) : -1;
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

  const lineStyle = useAnimatedStyle(() => ({ transform: [{ scale: lineKick.value }], transformOrigin: 'left center' }));

  return (
    <View style={[{ flex: 1 }, noSelect]}>
      <Screen style={{ width: col }}>
        {/* The header (2026-11-08): pause key, the score in the middle with
            the cascade's multiplier beside it, the sweep key with its studs. */}
        <View style={{ height: 52, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <IconButton label="Пауза" size={48} onPress={() => router.push('/pause')}>
            <Icon name="pause" color={c.text} />
          </IconButton>
          <Animated.View accessible accessibilityLabel={`Очки: ${g.score}`} style={[{ height: 48, justifyContent: 'center', alignItems: 'center' }, scoreStyle]}>
            {/* The 1919 stamp: a yellow chip flashes in behind the score. */}
            <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: -space.md, right: -space.md, top: 2, bottom: 2, borderRadius: 12, backgroundColor: '#FFD43B', backgroundImage: 'linear-gradient(180deg, #FFE27A, #FFD43B)', boxShadow: '0 3px 0 #C9A21F' }, stampStyle]} />
            <ScoreNum v={g.score} />
            {chainMult(g.cfg.chainScore, chain) > 1 ? <MultChip k={chainMult(g.cfg.chainScore, chain)} /> : null}
          </Animated.View>
          <SweepKey
            studs={counted ? g.cfg.sweepsMax : 0}
            filled={g.sweeps - (bonusHeld ? 1 : 0)}
            onPress={hintSweep}
          />
        </View>

        {/* the lesson and the board, centred between the header and the tray, never closer than one step */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: step }}>
          {/* Above the board: the move in plain words (then the formula it
              proved) and, under it, the mechanic. The way out of the lessons is in pause. */}
          {lesson ? (
            <View style={{ width: col, marginBottom: step }}>
              <Animated.View
                accessible
                accessibilityRole="header"
                accessibilityLabel={lesson.title}
                style={[{ height: LESSON_H, justifyContent: 'center' }, lineStyle]}>
                <Formula terms={lesson.formula} cell={trayCell} gap={gap} open={coach === 'task'} fit={col} />
              </Animated.View>
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
              <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                {flights.map((f) => (
                  <SlidingTile key={f.id} m={f.m} cell={cell} gap={gap} ms={f.ms} />
                ))}
                {incoming ? <Incoming key={incoming.id} {...incoming} cell={cell} gap={gap} /> : null}
                {scatter ? <Scatter key={scatter.id} board={scatter.board} cell={cell} gap={gap} /> : null}
                {ripple ? <Ripple key={ripple.id} at={ripple.at} v={ripple.v} board={ripple.board} cell={cell} gap={gap} home={ripple.primaries ? null : trackHome(ripple.v)} primaries={ripple.primaries} /> : null}
              </View>
              {/* After a proved step: the board dims and a card says what
                  happened and why. Nothing moves on until «Понятно». */}
              {lesson && explain === store.lesson ? (
                <View style={[StyleSheet.absoluteFill, { justifyContent: 'center' }]}>
                  {/* A solid plate over the board, no scrim: the board is never seen through a page. */}
                  <View style={[StyleSheet.absoluteFill, { left: -Math.max(0, Math.round(cell * 0.14) - gap / 2), right: -Math.max(0, Math.round(cell * 0.14) - gap / 2), top: -Math.max(0, Math.round(cell * 0.14) - gap / 2), bottom: -Math.max(0, Math.round(cell * 0.14) - gap / 2) }, plateStyle(c, Math.round(cell * 0.26))]} />
                  <View style={{ padding: space.xl }}>
                    <View>
                      {/* The proved formula and the related rows, all at the
                          tray's size, so the card reads as one table. */}
                      <View style={{ gap: space.md }}>
                        {[lesson.formula, ...(lesson.also ?? [])].map((row, k) => (
                          <Formula key={k} terms={row} cell={trayCell} gap={gap} fit={col - space.xl * 2} />
                        ))}
                      </View>
                      <Body style={{ marginTop: space.lg }}>{(counted && lesson.ruleCascade) || lesson.rule}</Body>
                      <View style={{ marginTop: space.lg }}>
                        <Button kind="primary" size="lg" label="Понятно" onPress={nextLesson} />
                      </View>
                    </View>
                  </View>
                </View>
              ) : null}
            </View>
          </Animated.View>
          {/* The sweeps are the board's thickness: one layer under it per
              sweep left. A sweep pulls a layer out the way the board went; a
              new tray slides them back in. */}
          {/* The game of the day climbs to medals, not to 384. Sweeps are
              counted by the studs on the sweep key. */}
        </View>

        {/* tray: an L1 surface with three slots */}
        <View
          style={{
            height: trayCell * 3 + space.xxl,
            flexDirection: 'row',
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
              }}>
              {/* What comes into this slot with the next tray: its shape only,
                  small and grey in the corner. The values are dealt when it
                  arrives, from the board as it is then. */}
              {g.next?.[slot] && store.lesson === null && !g.over && (!p || p.used) ? (
                <NextShape cells={g.next[slot]} cell={trayCell} gap={gap} />
              ) : null}
              {p ? (
                <Animated.View style={slot === stuckSlot ? stuckStyle : undefined}>
                <TrayPiece
                  key={`${trayId.current}-${slot}-${JSON.stringify(p.cells)}`}
                  delay={slot * 60}
                  rise={trayCell}
                  opacity={p.used || hold?.slot === slot || returning === slot ? 0 : g.over || !fitsSomewhere(shown, p) ? 0.35 : 1}>
                  <Field variant="piece" {...pieceGrid(p)} cell={trayCell} gap={gap} />
                </TrayPiece>
                </Animated.View>
              ) : null}
            </View>
          ))}
        </View>
      </Screen>

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
  const pad = gap / 2;
  const at = (i: number) => ({ x: pad + (i % N) * cell, y: pad + ((i / N) | 0) * cell });
  const a = at(m.from);
  const b = at(m.to);
  const k = useSharedValue(0);
  useEffect(() => {
    // A sweep slides in; a merge's lighter tile is pulled and accelerates into its partner.
    k.value = withTiming(1, ms === SLIDE ? { duration: ms, easing: Easing.in(Easing.quad) } : { duration: ms, easing: Easing.bezier(0.6, 0, 1, 0.6) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const st = useAnimatedStyle(() => ({
    transform: [{ translateX: a.x + (b.x - a.x) * k.value }, { translateY: a.y + (b.y - a.y) * k.value }],
  }));
  return (
    <Animated.View
      style={[
        { position: 'absolute', left: 0, top: 0, width: cell, height: cell, padding: pad },
        st,
      ]}>
      <Block v={m.value} size={cell - gap} />
    </Animated.View>
  );
}


/** The best tile, drawn as a tile of the board: its fill inside the line. */
/** Drawn the way a lone tile sits on the board: one cell, framed by one gap. */
function BestTile({ v, size }: { v: number; size: number; frame?: number }) {
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
      style={[{ width: size, height: size, opacity: v ? 1 : 0 }, st]}>
      {v ? <Block v={v} size={size} /> : null}
    </Animated.View>
  );
}

const RIPPLE_MS = 1400;
/** The score milestone: the year the Bauhaus opened. */
const BAUHAUS = 1919;
const WAVE = 55; // ms per cell of distance from the milestone
const FLIP = 460; // ms the milestone tile turns over in the air
const FLY_HOME = 380; // ms its copy flies into the track

/** A milestone, played on the enamel. The tile that made it rises off the
    board and turns over once, light running across its face; a wave goes
    out from it and every tile on the board lifts out of its socket in turn,
    with a glint on its enamel, while the empty floor flashes the new colour.
    Then a copy of the tile drops into its square on the track under the
    board, which pops as it lands. */
function Ripple({ at, v, board, cell, gap, home, primaries }: { at: number; v: number; board: number[]; cell: number; gap: number; home: { x: number; y: number; w: number; h: number } | null; primaries?: boolean }) {
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
          <FloorFlash key={`f${i}`} d={dist(i)} color={primaries ? c.tile[1 + (dist(i) % 3)] : c.tile[rank(v)]} style={{ left: pos(i).x + pad, top: pos(i).y + pad, width: cell - gap, height: cell - gap }} />
        ),
      )}
      {cells.map((i) => (board[i] > 0 && i !== at ? <LiftTile key={`t${i}`} v={board[i]} d={dist(i)} at={pos(i)} cell={cell} gap={gap} /> : null))}
      {primaries ? (
        board[at] > 0 ? <LiftTile key="hero" v={board[at]} d={0} at={pos(at)} cell={cell} gap={gap} hero home={null} /> : null
      ) : (
        <LiftTile key="hero" v={v} d={0} at={pos(at)} cell={cell} gap={gap} hero home={home} />
      )}
    </>
  );
}

function FloorFlash({ d, color, style }: { d: number; color: string; style: { width: number; left: number; top: number; height: number } }) {
  const o = useSharedValue(0);
  useEffect(() => {
    o.value = withDelay(d * WAVE, withSequence(withTiming(0.75, { duration: 90 }), withTiming(0, { duration: 460, easing: Easing.out(Easing.quad) })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const st = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ position: 'absolute', backgroundColor: color, borderRadius: style.width * 0.18 }, style, st]} />;
}

/** One tile lifting out of its socket: an empty socket shows under it, a
    shadow falls on the board, and a glint crosses its face. The hero tile
    rises higher, turns over, and then flies home to the track. */
function LiftTile({ v, d, at, cell, gap, hero, home }: { v: number; d: number; at: { x: number; y: number }; cell: number; gap: number; hero?: boolean; home?: { x: number; y: number; w: number; h: number } | null }) {
  const { isDark } = useTheme();
  const pad = gap / 2;
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
    <Block v={v} size={cell - gap}>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: -cell * 0.3, bottom: -cell * 0.3, width: cell * 0.28, backgroundColor: '#FFFFFF' }, glintSt]} />
    </Block>
  );
  const box = { position: 'absolute' as const, left: at.x, top: at.y, width: cell, height: cell };
  return (
    <>
      <Animated.View pointerEvents="none" style={[box, { padding: pad }, socketSt]}>
        <Socket size={cell - gap} />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[box, { left: at.x + pad, top: at.y + pad, width: cell - gap, height: cell - gap, borderRadius: (cell - gap) * 0.18, backgroundColor: '#000000' }, shadowSt]} />
      <Animated.View pointerEvents="none" style={[box, { padding: pad }, tileSt]}>
        {face}
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: pad, top: pad, right: pad, bottom: pad, borderRadius: (cell - gap) * 0.18, backgroundColor: '#000000' }, dimSt]} />
      </Animated.View>
      {hero && home ? (
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: cell, height: cell, padding: pad }, flySt]}>
          {face}
        </Animated.View>
      ) : null}
    </>
  );
}

const SCATTER_MS = 900;

/** The lesson board breaking up: every tile lifts, tips and drops away in a
    wave from the centre, leaving the empty board for the first game. */
function Scatter({ board, cell, gap }: { board: number[]; cell: number; gap: number }) {
  const { c } = useTheme();
  const pad = gap / 2;
  return (
    <>
      {/* The whole ladder runs over the board corner to corner, each
          diagonal one rung higher, 3 up to the goal's ink. */}
      {Array.from({ length: N * N }, (_, i) => {
        const diag = (i % N) + ((i / N) | 0);
        return (
          <FloorFlash
            key={`l${i}`}
            d={diag * 0.9}
            color={c.tile[Math.min(10, 3 + Math.floor((diag * 8) / (2 * N - 2)))]}
            style={{ left: pad + (i % N) * cell + pad, top: pad + ((i / N) | 0) * cell + pad, width: cell - gap, height: cell - gap }}
          />
        );
      })}
      {board.map((v, i) => {
        if (!v) return null;
        const x = i % N;
        const y = (i / N) | 0;
        const d = Math.abs(x - 2.5) + Math.abs(y - 2.5);
        return <ScatterTile key={i} v={v} d={d} side={x < 3 ? -1 : 1} at={{ x: pad + x * cell, y: pad + y * cell }} cell={cell} gap={gap} />;
      })}
    </>
  );
}

function ScatterTile({ v, d, side, at, cell, gap }: { v: number; d: number; side: number; at: { x: number; y: number }; cell: number; gap: number }) {
  const pad = gap / 2;
  const k = useSharedValue(0);
  useEffect(() => {
    k.value = withDelay(d * 60, withTiming(1, { duration: 420, easing: Easing.in(Easing.quad) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const st = useAnimatedStyle(() => {
    const up = Math.sin(Math.min(1, k.value * 2.2) * Math.PI) * 0.25; // a hop before the drop
    return {
      opacity: k.value < 0.75 ? 1 : 1 - (k.value - 0.75) / 0.25,
      transform: [
        { translateX: side * k.value * cell * 0.5 },
        { translateY: -up * cell + k.value * k.value * cell * 2.2 },
        { rotate: `${side * k.value * 35}deg` },
        { scale: 1 + up * 0.5 - k.value * 0.35 },
      ],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: at.x, top: at.y, width: cell, height: cell, padding: pad }, st]}>
      <Block v={v} size={cell - gap} />
    </Animated.View>
  );
}

/** The shape of the piece coming next into a tray slot, in the slot's corner. */
function NextShape({ cells, cell, gap }: { cells: [number, number][]; cell: number; gap: number }) {
  const w = Math.max(...cells.map(([x]) => x)) + 1;
  const h = Math.max(...cells.map(([, y]) => y)) + 1;
  // The shape that comes next, as moulds sunk into the table where it will rise.
  return (
    <View pointerEvents="none" accessibilityLabel="Следующая фигура" style={{ width: w * cell, height: h * cell, position: 'absolute' }}>
      {cells.map(([x, y], k) => (
        <Socket key={k} size={cell - gap} style={{ position: 'absolute', left: x * cell + gap / 2, top: y * cell + gap / 2 }} />
      ))}
    </View>
  );
}

/** "+N" rising from the cell where a merge happened. A late merge of a
    placed piece's cascade pays double or triple, and says so: "+48 ×2". */
/** One square wave of a chained merge: a frame of the new tile's colour, as
    thick as the board's line, grows out of the cell and fades. Wave j of n
    starts j beats later and goes further, so a triple sends three rings. */
function Echo({ at, v, n, cell, gap }: { at: number; v: number; n: number; cell: number; gap: number }) {
  return (
    <>
      {Array.from({ length: n }, (_, j) => (
        <EchoRing key={j} at={at} v={v} j={j} cell={cell} gap={gap} />
      ))}
    </>
  );
}
function EchoRing({ at, v, j, cell, gap }: { at: number; v: number; j: number; cell: number; gap: number }) {
  const { c } = useTheme();
  const k = useSharedValue(0);
  useEffect(() => {
    k.value = withDelay(j * ECHO_GAP, withTiming(1, { duration: ECHO_MS, easing: Easing.out(Easing.cubic) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const pad = gap / 2;
  const reach = 0.55 + j * 0.45;
  const st = useAnimatedStyle(() => ({
    opacity: k.value === 0 ? 0 : 1 - k.value,
    transform: [{ scale: 1 + k.value * reach }],
  }));
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: pad + (at % N) * cell + gap / 2,
          top: pad + ((at / N) | 0) * cell + gap / 2,
          width: cell - gap,
          height: cell - gap,
          borderWidth: Math.max(3, gap),
          borderColor: c.tile[rank(v)],
        },
        st,
      ]}
    />
  );
}

function Float({ at, v, times = 1, cell, gap }: { at: number; v: number; times?: number; cell: number; gap: number }) {
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
        { position: 'absolute', left: pad + (at % N) * cell - cell / 2, top: pad + ((at / N) | 0) * cell - cell * 0.3, width: cell * 2, alignItems: 'center' },
        st,
      ]}>
      <Text
        allowFontScaling={false}
        style={{ fontFamily: font.tile, fontSize: Math.round(cell * (v >= 24 ? 0.34 : 0.28)), color: c.text, textShadowColor: c.canvas, textShadowRadius: 4 }}>
        {`+${v}`}
        {times > 1 ? <Text style={{ fontSize: Math.round(cell * 0.22), color: c.muted }}>{` ×${times}`}</Text> : null}
      </Text>
    </Animated.View>
  );
}

/** The pushed piece: it rides in from beyond the far edge of the board,
    fading up as it crosses the frame, and stops on its cells with a small
    overshoot, the way the board itself meets a wall. */
function Incoming({ piece, ox, oy, dir, delay, cell, gap }: { piece: Piece; ox: number; oy: number; dir: Dir; delay: number; cell: number; gap: number }) {
  const { w, h } = pieceGrid(piece);
  // It comes from the side the tiles moved away from.
  const [ux, uy] = { left: [1, 0], right: [-1, 0], up: [0, 1], down: [0, -1] }[dir];
  const far = (ux ? w : h) * cell + gap * 2;
  const k = useSharedValue(0);
  useEffect(() => {
    k.value = withDelay(delay, withTiming(1, { duration: PUSH_MS, easing: Easing.out(Easing.back(1.4)) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const st = useAnimatedStyle(() => ({
    opacity: Math.min(1, k.value * 2.5),
    transform: [{ translateX: ux * far * (1 - k.value) }, { translateY: uy * far * (1 - k.value) }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: gap / 2 + ox * cell, top: gap / 2 + oy * cell }, st]}>
      <Field variant="piece" {...pieceGrid(piece)} cell={cell} gap={gap} />
    </Animated.View>
  );
}

/** A tray piece. New ones spring in one after another. Own shared values, not
    `entering`, so Safari keeps their size. */
function TrayPiece({ delay, opacity, rise, children }: { delay: number; opacity: number; rise: number; children: React.ReactNode }) {
  // A new piece rises out of its moulds: up from a third of a cell below, no bounce.
  const k = useSharedValue(0);
  useEffect(() => {
    k.value = withDelay(delay, withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - k.value) * rise * 0.35 }, { scale: 0.92 + k.value * 0.08 }], opacity: Math.min(1, k.value * 2) * opacity }));
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
  // A fingertip of white plastic presses down, drags across the board and lifts.
  const size = 48;
  const k = useSharedValue(0);
  const o = useSharedValue(0);
  const p = useSharedValue(0);
  useEffect(() => {
    const loop = () => {
      k.value = 0;
      o.value = withSequence(withTiming(1, { duration: 150 }), withDelay(750, withTiming(0, { duration: 200 })));
      p.value = withSequence(withDelay(150, withTiming(1, { duration: 100 })), withDelay(600, withTiming(0, { duration: 100 })));
      k.value = withDelay(250, withTiming(1, { duration: 600, easing: Easing.inOut(Easing.quad) }));
    };
    loop();
    const id = setInterval(loop, 1800);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const x0 = board.x + board.w * 0.75 - size / 2;
  const x1 = board.x + board.w * 0.25 - size / 2;
  const y = board.y + board.w / 2 - size / 2;
  const st = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateX: x0 + (x1 - x0) * k.value }, { translateY: y }, { scale: 1.1 - p.value * 0.1 }] }));
  const shade = useAnimatedStyle(() => ({ opacity: 0.18 + p.value * 0.12, transform: [{ scale: 1 - p.value * 0.15 }] }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: size, height: size }, st]}>
      <Animated.View style={[{ position: 'absolute', left: 4, top: 8, width: size - 8, height: size - 8, borderRadius: size, backgroundColor: '#000000' }, shade]} />
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#FFFFFF',
          backgroundImage: 'linear-gradient(180deg, #FFFFFF, #ECEAE4)',
          boxShadow: '0 3px 0 #CFCDC6, inset 0 2px 0 #FFFFFF',
        }}
      />
    </Animated.View>
  );
}

/** How far the board is toward the next milestone `next`: the tiles from a
    quarter of it up to just under it, summed, over `next`. Two 96s and a 48
    are most of a 192; the small change on the board does not count. Never
    full until the milestone itself is made. */
function progressTo(board: number[], next: number): number {
  let sum = 0;
  for (const v of board) if (v >= next / 4 && v < next) sum += v;
  return Math.min(0.95, sum / next);
}

/** The score: Rubik 700, one size, counting up with every merge. */
function ScoreNum({ v }: { v: number }) {
  const { c } = useTheme();
  const [shownV, setShownV] = useState(v);
  const from = useRef(v);
  useEffect(() => {
    const a = from.current;
    if (v <= a) {
      from.current = v;
      setShownV(v);
      return;
    }
    const t0 = Date.now();
    const id = setInterval(() => {
      const k = Math.min(1, (Date.now() - t0) / 300);
      const x = Math.round(a + (v - a) * (1 - Math.pow(1 - k, 3)));
      setShownV(x);
      if (k >= 1) {
        clearInterval(id);
        from.current = v;
      }
    }, 16);
    return () => {
      clearInterval(id);
      from.current = v;
    };
  }, [v]);
  return <TileNum v={shownV} size={40} color={c.text} style={{ lineHeight: 48, fontVariant: ['tabular-nums'] }} />;
}

/** The cascade's score multiplier for the merge in hand, from chainScore. */
function chainMult(table: number[] | undefined, k: number) {
  if (!table || !table.length || k <= 0) return 1;
  return table[Math.min(k, table.length) - 1];
}

/** A yellow chip beside the score: ×2, ×3 while a cascade pays more. */
function MultChip({ k }: { k: number }) {
  const s = useSharedValue(0);
  useEffect(() => {
    s.value = withSequence(withTiming(1.15, { duration: 100 }), withTiming(1, { duration: 120 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: -14 }, { scale: s.value }] }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', left: '100%', marginLeft: 8, top: '50%', height: 28, paddingHorizontal: 8, borderRadius: 8, justifyContent: 'center', backgroundColor: '#FFD43B', backgroundImage: 'linear-gradient(180deg, #FFE27A, #FFD43B)', boxShadow: '0 3px 0 #C9A21F' }, st]}>
      <TileNum v={`×${k}`} size={16} color="#2A2A2A" />
    </Animated.View>
  );
}

/** The sweep key: a four-way arrow and one stud socket per sweep the game
    can hold; a held sweep is a yellow chip in its socket. */
function SweepKey({ studs, filled, onPress }: { studs: number; filled: number; onPress: () => void }) {
  const { c } = useTheme();
  const empty = studs > 0 && filled <= 0;
  return (
    <Key label={studs ? `Сдвиги: ${Math.max(0, filled)}` : 'Сдвиги'} onPress={onPress}>
      <View style={{ opacity: empty ? 0.3 : 1 }}>
        <Icon name="sweep" color={c.text} />
      </View>
      {studs > 0 ? (
        <View style={{ flexDirection: 'row', gap: 5 }}>
          {Array.from({ length: studs }, (_, k) => (
            <Stud key={k} on={k < filled} />
          ))}
        </View>
      ) : null}
    </Key>
  );
}

function Stud({ on }: { on: boolean }) {
  const { isDark } = useTheme();
  const k = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    k.value = on ? withSequence(withTiming(1.5, { duration: 0 }), withTiming(1, { duration: 180 })) : withTiming(0, { duration: 120 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on]);
  const st = useAnimatedStyle(() => ({ opacity: Math.min(1, k.value), transform: [{ translateY: -2 }, { scale: Math.max(1, k.value) }] }));
  return (
    <View style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: isDark ? '#1E2025' : '#E4E2DB', boxShadow: 'inset 0 2px 2px rgba(0,0,0,0.14)' }}>
      <Animated.View
        style={[{ position: 'absolute', left: 0, top: 0, width: 14, height: 14, borderRadius: 4, backgroundColor: '#FFD43B', backgroundImage: 'linear-gradient(180deg, #FFE27A, #FFD43B)', boxShadow: '0 2px 0 #C9A21F, inset 0 1px 0 rgba(255,255,255,0.8)' }, st]}
      />
    </View>
  );
}
