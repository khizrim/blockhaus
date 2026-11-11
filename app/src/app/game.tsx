import { router, useLocalSearchParams } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { PanResponder, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { cancelAnimation, Easing, type SharedValue, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { Field, WAVE_IDLE, WAVE_STEP, type CellLook, type Wave } from '@/components/Field';
import { IconButton, Key, Screen } from '@/components/ui';
import { pieceGrid } from '@/design/mock';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dur, enter, exit, HIT, layer, space, type } from '@/design/system';
import { useTheme } from '@/design/theme';
import { font, rank } from '@/design/tokens';
import engine, { type Dir, type Game as EngineGame, type Piece, type Step } from '@/game/engine';
import { FIRST_MOVES, LESSONS } from '@/game/lessons';
import { slideMoves, type Move } from '@/game/slide';
import { useGame } from '@/game/store';
import { fx } from '@/sound/sfx';
import { loudOnce, type StudKind } from '@/game/seen';
import { TileNum } from '@/components/TileNum';
import { Block, plastic, Socket } from '@/components/Block';
import { Icon } from '@/components/icons';
import { Formula, type Term } from '@/components/Formula';
import { milestonesFor } from '@/components/Track';

/* The game. The rules are the engine the prototype and the balance simulator
   run; this screen only shows them. A placement lands first, then each merge
   of the chain plays one beat after the last: the board steps through the
   cascade while the marimba climbs. */

const N = engine.N;
/* Pace (2026-11-09). A short chain, one or two merges, is read at a glance,
   so it plays quick; a long one keeps the beat that lets each merge be read,
   and speeds up as it climbs. */
const STEP = 190; // ms between merges of a sweep's long chain
const STEP_SHORT = 120; // ...and of a sweep that merges once or twice
const SHORT = 2; // merges a chain may have and still count as short
type Pace = { base: number; fly: number; gaps: number[] };
/** A cascade speeds up as it goes: the gap before merge k+1. */
const LONG_PACE: Pace = { base: 90, fly: 110, gaps: [180, 160, 140, 120, 110] };
const SHORT_PACE: Pace = { base: 50, fly: 80, gaps: [120] };
const paceOf = (merges: number) => (merges <= SHORT ? SHORT_PACE : LONG_PACE);
const chainAt = (k: number, gaps: number[]) => gaps.slice(0, k).reduce((a, b) => a + b, 0) + Math.max(0, k - gaps.length) * gaps[gaps.length - 1];
const sweepStep = (merges: number) => (merges <= SHORT ? STEP_SHORT : STEP);
const BURST_MS = 620; // ms the crumbs of a merge fly and fall
/* A sweep's stud on its way (2026-11-09: "it shows, but nothing explains
   it"): it is a moment of its own. The stud pops up big where it comes from
   and hangs there a beat, glowing, then flies to the key, which leans in to
   meet it. */
const STUD_FLY = 1050; // ms: pop, hang, fly into the key
const STUD_BOUNCE = 1500; // ms: pop, hang, fly, knock on a full key, fall
const STUD_KNOCK = 0.62; // part of STUD_BOUNCE when it hits the full key
const STUD_OUT = 750; // ms for a spent stud to leave the key and fall
const STUD_QUIET = 420; // ms for the small hop of a stud the player has seen enough
const PLATE = 6; // px each sweep layer shows under the board
const back = (d: number, k = 1.8) => ({ duration: d, easing: Easing.out(Easing.back(k)) });

/** A mouse or trackpad (web on a computer), not a finger. */
const FINE_POINTER = Platform.OS === 'web' && typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: fine)').matches;

// On the web a drag would otherwise select the numbers.
const noSelect = { userSelect: 'none' } as object;

const SWIPE = 24; // px of travel that counts as a swipe
const SLIDE = dur.base; // ms for tiles to travel in a sweep
const PUSH_MS = 260; // ms for the pushed piece to ride in from the far edge
const LESSON_READ = 1300; // ms to read the proved formula before the next step slides in (2500 felt like a hang)

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
  /** The lesson move to play now: its tray slot and the cells it may go to. */
  const mvRaw = lesson?.moves?.[g.moves] ?? null;
  /** Where the last placed piece went: a 'best' move follows it. */
  const lastLaid = useRef<number[]>([]);
  const mv = useMemo(() => {
    if (!mvRaw) return null;
    if (mvRaw.at !== 'best') return { slot: mvRaw.slot, at: mvRaw.at, right: mvRaw.right };
    // The free cell beside the last piece where this one runs longest.
    const p = g.tray[mvRaw.slot];
    let best = -1;
    let cellAt = -1;
    for (const a of lastLaid.current)
      for (const n of engine.neighbours(a)) {
        if (!p || g.board[n] !== 0) continue;
        const b = g.board.slice();
        const len = engine.applyPlacement(b, { cells: p.cells.map((c) => [...c] as [number, number, number]), used: false }, n % N, (n / N) | 0, g.cfg.absorb).steps.length;
        if (len > best) {
          best = len;
          cellAt = n;
        }
      }
    return { slot: mvRaw.slot, at: cellAt >= 0 ? [cellAt] : [], right: undefined as number | undefined };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mvRaw, store.version]);
  const [coach, setCoach] = useState<'task' | 'done'>('task');
  /** In a lesson, the merge that just landed, written as a pair: a + b = c. */
  const [eq, setEq] = useState<{ id: string; terms: Term[] } | null>(null);
  /** The lesson whose choice the player last missed. */
  const [missed, setMissed] = useState<number | null>(null);
  /** A choice stood over too long without a try. */
  const [stuck, setStuck] = useState(false);
  /** Bumps to start the lesson's own move over at once, after a miss. */
  const [demoRun, setDemoRun] = useState(0);
  /** The first game, gone on from the lessons' board: it keeps their line's
      room above the board (so the board does not jump) and lights its first
      move (FIRST_MOVES) as a hint the player may ignore. */
  const [carried, setCarried] = useState(false);
  const hintMv = useMemo(() => {
    if (!carried || store.lesson !== null) return null;
    const f = FIRST_MOVES[g.moves];
    if (!f || g.board[f.at] !== 0) return null;
    // Every earlier hinted move was played where it was lit.
    if (FIRST_MOVES.slice(0, g.moves).some((p) => g.board[p.at] !== p.v)) return null;
    const slot = g.tray.findIndex((p) => p && !p.used && p.cells.length === 1 && p.cells[0][2] === f.v);
    return slot < 0 ? null : { slot, at: [f.at] };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carried, store.lesson, store.version]);
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
    setMissed(null);
    setEq(null);
    if (store.lesson === 0) lessonPeak.current = 0;
    lineIn.value = 1;
    lineIn.value = withTiming(0, { duration: dur.slow, easing: Easing.out(Easing.cubic) });
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
  /** Plastic crumbs thrown off a cascade's merges and a new best tile. */
  const [bursts, setBursts] = useState<{ id: string; at: number; v: number; n: number; power: number }[]>([]);
  /** An earned sweep: a stud flying from the merge that earned it to the sweep key. */
  const [studFly, setStudFly] = useState<{ id: number; from: { x: number; y: number }; to: { x: number; y: number }; mode: StudMode; loud: boolean } | null>(null);
  const keyRef = useRef<ComponentRef<typeof View>>(null);
  /** ms a loud stud earned by this move will take: a lesson's proved step
      waits for it, so its wave does not drown the stud. */
  const studMs = useRef(0);
  /** The top-left of a stud chip centred on a board cell. */
  const cellPt = (at: number) => ({ x: gap / 2 + (at % N) * cell + cell / 2 - 9, y: gap / 2 + ((at / N) | 0) * cell + cell / 2 - 9 });
  /** Sends a stud between `from` and socket `k` of the sweep key ('out' flies
      from the socket to `from`), all in the board's coordinates. */
  const flyStud = (from: { x: number; y: number }, k: number, mode: StudMode, loud: boolean) => {
    /* Quiet, once the player knows it: a stud from a chain or a tray makes
       a short small hop into its socket; a full key gives a small shake and
       nothing flies; a spent stud just sinks in its socket as the key ticks. */
    if (!loud) {
      if (mode === 'bounce') keyShake.value = withSequence(withTiming(-3, { duration: 40 }), withTiming(3, { duration: 60 }), withTiming(0, { duration: 60 }));
      if (mode === 'out') keyZoom.value = withSequence(withTiming(1.06, { duration: 80 }), withTiming(1, { duration: 160 }));
      if (mode !== 'in') return;
      keyZoom.value = withDelay(STUD_QUIET - 40, withSequence(withTiming(1.1, { duration: 60 }), withTiming(1, back(220, 2))));
    }
    keyRef.current?.measureInWindow((kx, ky, kw, kh) => {
      const studs = g.cfg.sweepsMax;
      const sock = { x: kx + kw - 24 - (studs - 1 - Math.max(0, Math.min(studs - 1, k))) * 19 - boardAt.current.x, y: ky + kh / 2 - 9 - boardAt.current.y };
      setStudFly(mode === 'out' ? { id: Date.now(), from: sock, to: from, mode, loud } : { id: Date.now(), from, to: sock, mode, loud });
    });
    if (!loud) return;
    keyMoment(mode);
    // The pop where the stud comes from, on the frame it jumps up.
    if (mode !== 'out') fx.boop(4);
  };
  /** In the lessons every sweep moment plays in full; in a game, only the
      first showings of each kind (see seen.ts). */
  const isLoud = (kind: StudKind) => store.lesson !== null || loudOnce(kind);
  /* The sweep key answers the stud: it grows to meet one coming in and
     kicks as it clicks home; a full key grows, then shakes it off; a key
     that pays for a swipe pulses as the stud leaves. */
  const keyZoom = useSharedValue(1);
  const keyShake = useSharedValue(0);
  const keyStyle = useAnimatedStyle(() => ({ transform: [{ translateX: keyShake.value }, { scale: keyZoom.value }], transformOrigin: 'right center' }));
  const keyMoment = (mode: StudMode) => {
    const grow = { duration: 200, easing: Easing.out(Easing.cubic) };
    if (mode === 'in') {
      keyZoom.value = withSequence(withDelay(STUD_FLY * 0.4, withTiming(1.3, grow)), withDelay(STUD_FLY * 0.6 - 200, withTiming(1.45, { duration: 60 })), withTiming(1, back(360, 2.2)));
    } else if (mode === 'bounce') {
      const at = STUD_BOUNCE * STUD_KNOCK;
      keyZoom.value = withSequence(withDelay(STUD_BOUNCE * 0.28, withTiming(1.3, grow)), withDelay(at - STUD_BOUNCE * 0.28 - 200, withTiming(1.3, { duration: 0 })), withDelay(320, withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) })));
      keyShake.value = withDelay(at, withSequence(withTiming(-7, { duration: 50 }), withTiming(7, { duration: 70 }), withTiming(-4, { duration: 60 }), withTiming(0, { duration: 80 })));
    } else {
      keyZoom.value = withSequence(withTiming(1.3, { duration: 120, easing: Easing.out(Easing.cubic) }), withTiming(1, back(380, 2.2)));
    }
  };
  const burstClear = useRef<ReturnType<typeof setTimeout> | null>(null);
  // While a swipe is held past the threshold: where the next piece will ride in.
  const [aim, setAim] = useState<{ id: string; piece: Piece; ox: number; oy: number; dir: Dir } | null>(null);
  const aimDir = useRef<Dir | null>(null);
  const [incoming, setIncoming] = useState<{ id: number; piece: Piece; ox: number; oy: number; dir: Dir; delay: number } | null>(null);
  const [returning, setReturning] = useState<number | null>(null);
  const [pops, setPops] = useState<Record<number, number>>({});
  const [lands, setLands] = useState<Record<number, number>>({});
  const [hold, setHold] = useState<Hold | null>(null);
  /** The best tile before the move now playing: a merge above it is a new milestone. */
  const peak = useRef(g.bestTile);
  /** A milestone's wave across the board, from the cell that made it. */
  const [ripple, setRippleState] = useState<{ at: number; v: number; id: number; board: number[]; primaries?: boolean } | null>(null);
  /* The wave of a milestone lifts the board's own blocks in turn, on shared
     values (Field's Wave); only the tile that made it is drawn over the
     board, by Ripple, with the floor's flashes. */
  const waveAt = useSharedValue(-1);
  const waveT = useSharedValue(WAVE_IDLE);
  const wave = useMemo<Wave>(() => ({ at: waveAt, t: waveT }), [waveAt, waveT]);
  const setRipple = (r: typeof ripple) => {
    setRippleState(r);
    cancelAnimation(waveT);
    if (!r) {
      waveT.value = WAVE_IDLE;
      return;
    }
    waveAt.value = r.at;
    waveT.value = 0;
    waveT.value = withTiming(RIPPLE_MS, { duration: RIPPLE_MS, easing: Easing.linear });
  };
  /** The best milestone earned during the lessons: the track keeps it from step to step. */
  const lessonPeak = useRef(0);
  /** The move now playing made a milestone (it gets the full show already). */
  const moveHadMilestone = useRef(false);
  /** Bumps when the lesson line changes, so it kicks in. */
  const lineKick = useSharedValue(1);
  /** The lesson line coming in (1, from the right) or going out (-1, to the left); 0 at rest. */
  const lineIn = useSharedValue(0);
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
    pending.current = [];
    setBonusHeld(false);
    setFlights([]);
    setIncoming(null);
    setBursts([]);
    setStudFly(null);
    setSliding(null);
    setReturning(null);
    setHeld(null);
    /* The milestone wave draws copies of the board
       over it and takes them down from a timer. clearTimers just dropped that
       timer, so they go here too, or the copies stay on the board as tiles
       that never move, even into a new game. */
    setRipple(null);
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
      if (store.lesson !== null) stageLesson(prevEnd.current ?? new Array(N * N).fill(engine.STONE), g.board);
      prevEnd.current = null;
      // Any other new game is a plain one: no kept line, no hint.
      if (!introGo.current) setCarried(false);
      if (introGo.current && store.lesson === null) {
        introGo.current = false;
        /* Out of the lessons and into the game on the same board: nothing on
           it moves. Only their phrase plays, the score comes up and the tray
           deals its first pieces. */
        later(120, () => fx.learned());
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g, store.version]);

  /* A lesson step comes on to the board the last one left: if the plate
     grew, its new ring of sockets sinks in with a ratchet of clicks, then
     the step's new tiles pop up one by one, each a note higher. */
  const prevEnd = useRef<number[] | null>(null);
  /** The lessons just ended and the first game goes on from their board. */
  const introGo = useRef(false);
  const [opened, setOpened] = useState<Set<number> | null>(null);
  const stageLesson = (from: number[], to: number[]) => {
    const grown = to.map((v, i) => (from[i] < 0 && v >= 0 ? i : -1)).filter((i) => i >= 0);
    const fresh = to.map((v, i) => (v > 0 && v !== from[i] ? i : -1)).filter((i) => i >= 0);
    if (grown.length) {
      setOpened(new Set(grown));
      fx.grow();
      later(600, () => setOpened(null));
    }
    setShown(to.map((v, i) => (fresh.includes(i) ? 0 : v)));
    const t0 = grown.length ? 300 : 120;
    fresh.forEach((i, k) =>
      later(t0 + k * 110, () => {
        setShown((sh) => Object.assign(sh.slice(), { [i]: to[i] }));
        setLands((l) => ({ ...l, [i]: Date.now() }));
        fx.boop(k);
      }),
    );
  };
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
  const chrome = ins.top + ins.bottom + 24 + 64 + (store.lesson !== null || carried ? LESSON_H + space.lg : 0) + 12 + trayMax * 3 + 32 + 48;
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
    studMs.current = 0;
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
    // A step of several moves goes on until its last one is played.
    if (L.moves && g.moves < L.moves.length) return;
    // The engine refills a spent tray at random; a lesson keeps it empty.
    if (pieceStep) g.tray = g.tray.map((p) => ({ ...p, used: true }));
    const milestoneFired = moveHadMilestone.current;
    /* A stud on its way has the stage: the wave, the bell and the formula
       come once it has clicked into the key (2026-11-09, Khizri: the stud
       looked lost in the real game under the step's orange wave). */
    const studWait = studMs.current;
    studMs.current = 0;
    later(ms + 150 + studWait, () => {
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
        // The step closes on its own figure, a step higher each time; after
        // a milestone's bell it waits for the bell to ring out.
        later(milestoneFired ? 520 : 0, () => fx.lessonStep(k));
        setCoach('done');
        // A step that ends on a stud closes on its own line (square = stud).
        const goalTerm = (L.task ?? L.formula)[(L.task ?? L.formula).length - 1];
        if (typeof goalTerm !== 'number') setEq(null);
        kickLine();
        // The formula stays up to be read, then the next step slides in.
        later(milestoneFired ? RIPPLE_MS + 200 + LESSON_READ - 1100 : LESSON_READ, () => advance(k));
      } else if (pieceStep) {
        /* The shorter chain of a choice: it plays out, the board pushes
           back once, and the step comes again, its tiles popping back in. */
        later(500, () => {
          if (lessonNow.current !== k) return;
          fx.repel();
          shake();
        });
        later(1300, () => {
          if (lessonNow.current !== k) return;
          prevEnd.current = g.board.slice();
          // Missed once: the next try shows the move that proves the step.
          setMissed(k);
          setEq(null);
          store.startLesson(k);
        });
      }
    });
  };

  const advance = (k: number) => {
    // The proved line slides out to the left as the next one comes in from the right.
    lineIn.value = withTiming(-1, { duration: dur.base, easing: Easing.in(Easing.cubic) });
    later(dur.base, () => {
      if (lessonNow.current !== k) return;
      if (k + 1 < LESSONS.length) {
        prevEnd.current = g.board.slice();
        return store.startLesson(k + 1);
      }
      finale();
    });
  };

  /** The tile a lesson was about: the highest one on the board. */
  const resultCell = (board: number[], L: (typeof LESSONS)[number]) => {
    // The tile the formula ends on, made by this move; else the highest.
    const last = L.formula[L.formula.length - 1];
    const want = typeof last === 'number' ? last : Array.isArray(last) ? last[0] : 0;
    const laid = lastLaid.current;
    let at = -1;
    board.forEach((v, i) => {
      if (want && v === want && (at < 0 || laid.includes(i))) at = i;
    });
    if (at >= 0) return at;
    // No tile to show (the step ends on a stud): the biggest tile the move
    // touched, the cells it laid and their neighbours.
    const near = new Set(laid.flatMap((i) => [i, ...engine.neighbours(i)]));
    board.forEach((v, i) => {
      if (v > 0 && (near.size === 0 || near.has(i)) && (at < 0 || v > board[at])) at = i;
    });
    return at;
  };

  const kickLine = () => {
    lineKick.value = withSequence(withTiming(1.12, { duration: 0 }), withTiming(1, back(320, 2.4)));
  };

  /* The end of the lessons. The game goes on from where they ended
     (2026-11-09, Khizri: the lessons ended on a full key and the game began
     on a new board with a spent one): the same board, the same studs, a new
     tray rising from its slots. Always, also after a replay from the menu. */
  const finale = () => {
    introGo.current = true;
    setCarried(true);
    trayId.current++;
    skipLessons(true);
  };

  const skipLessons = (carry = false) => {
    settle();
    store.finishLessons(carry);
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
    // One wave per move: a long cascade that passes 24, 48 and 96 plays the
    // full show for the highest only; the ones on the way are plain merges.
    const last = marks.lastIndexOf(true);
    marks.forEach((m, k) => (marks[k] = m && k === last));
    moveHadMilestone.current = marks.some(Boolean);
    return marks;
  };
  /** One merge lands: the note, the points, the press. A milestone rings its
      bell instead of the note and sends a wave of its colour across the board. */
  const land = (at: number, level: number, milestone: boolean, board: number[], pts = level, step = 0, chainLen = 0) => {
    setPops((pp) => ({ ...pp, [at]: Date.now() }));
    if (milestone) {
      // The goal itself rings with the win card that follows, not a bell.
      if (level === g.cfg.goal) fx.merge(level, step);
      else fx.milestone(level);
      setRipple({ at, v: level, id: Date.now(), board: board.slice() });
      if (store.lesson !== null) lessonPeak.current = Math.max(lessonPeak.current, level);
      later(FLIP + 120 + FLY_HOME, () => fx.bonus());
      later(RIPPLE_MS, () => setRipple(null));
    } else fx.merge(level, step);
    /* A merge that a merge made: the tile sends out one square wave per
       merge of the chain so far, in its new colour, so a double reads as
       two rings and a triple as three. */
    /* Every merge throws plastic crumbs in the new tile's colour: a few for
       a lone merge, more and further with every step of a cascade, and the
       score jumps with it. A new best tile throws the most. */
    {
      const id = `${at}-${Date.now()}-${step}`;
      // The merge that ends a long chain throws the most of all.
      const power = chainLen >= 3 ? Math.min(7, chainLen + 2) : milestone ? 5 : Math.min(4, step + 1);
      // At most three bursts in the air; spent ones are cleared in one go
      // once the board is quiet, so a long chain costs no extra renders.
      setBursts((e) => [...e.slice(-2), { id, at, v: level, n: 1 + power * 2, power }]);
      if (burstClear.current) clearTimeout(burstClear.current);
      burstClear.current = setTimeout(() => setBursts([]), BURST_MS + 80);
      if (!milestone) scoreKick.value = withSequence(withTiming(1 + 0.04 * power, { duration: 60 }), withTiming(1, back(260, 2.4)));
    }
    thump(milestone ? Math.max(level, 192) : level, step);
    if (chainLen >= 3) slam(chainLen);
  };

  /* The end of a long chain hits (2026-11-09): on the frame its last merge
     lands the board shakes, harder the longer the chain, a low slam sounds
     under the note and the hand gets a heavy press. A chain of one or two
     merges gets none of this, so the hit stays the reward for a long one. */
  const slam = (merges: number) => {
    const a = Math.min(9, 3 + (merges - 3) * 2);
    const j = (x: number, y: number) => [x * a, y * a] as const;
    const path = [j(1, -0.6), j(-0.9, 0.7), j(0.6, 0.5), j(-0.4, -0.4), j(0.2, 0.2)];
    const run = (i: 0 | 1) =>
      withSequence(...path.map((p) => withTiming(p[i], { duration: 40, easing: Easing.out(Easing.quad) })), withTiming(0, { duration: 90, easing: Easing.out(Easing.cubic) }));
    sx.value = run(0);
    sy.value = run(1);
    fx.slam(merges);
  };

  /* Merges still to land from the last move. A new move can be made while a
     chain plays out; then whatever it had left lands at once, each tile
     popping on the board as it is, with one note, and the new move plays. */
  const pending = useRef<{ t: number; at: number; step: number; chain: number }[]>([]);
  const expect = (ms: number, at: number, step: number, chain = 0) => pending.current.push({ t: Date.now() + ms, at, step, chain });
  const flush = () => {
    const now = Date.now();
    const left = pending.current.filter((p) => p.t > now);
    pending.current = [];
    if (!left.length) return;
    setPops((pp) => ({ ...pp, ...Object.fromEntries(left.filter((p) => g.board[p.at] > 0).map((p) => [p.at, now])) }));
    fx.merge(0, Math.max(...left.map((p) => p.step)));
    // A long chain cut short still hits: its reward is not lost to a quick hand.
    const chain = Math.max(...left.map((p) => p.chain));
    if (chain >= 3) slam(chain);
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

  /** Big merges move the board: a small press, bigger for higher rungs. */
  const bump = useSharedValue(1);
  const thump = (v: number, step = 0) => {
    if (v < 12 && step < 2) return;
    // A long cascade presses the board harder as it climbs, whatever the tile.
    const k = Math.max(v >= 384 ? 0.06 : v >= 192 ? 0.05 : v >= 96 ? 0.04 : v >= 48 ? 0.03 : v >= 24 ? 0.02 : v >= 12 ? 0.012 : 0, Math.min(0.035, step * 0.007));
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
    (p: Piece, px: number, py: number, fingerX?: number, fingerY?: number) => {
      const pad = gap / 2;
      const fx_ = (px - boardAt.current.x - pad) / cell;
      const fy_ = (py - boardAt.current.y - pad) / cell;
      const gx = Math.round(fx_);
      const gy = Math.round(fy_);
      /* In a lesson the piece goes in only where the lesson puts it, and
         those cells pull it in (2026-11-11, a newbie's walk-through: on a
         phone the piece rides above the finger, so a newcomer who puts the
         finger on the lit cell holds the piece a row too high, lets go and
         sees it slide back with no word why). A lit cell takes the piece
         when the piece or the finger is within a cell and a half of it. */
      if (mv) {
        const { w, h } = pieceGrid(p);
        const fingerAt =
          fingerX === undefined || fingerY === undefined
            ? null
            : { x: (fingerX - boardAt.current.x - pad) / cell - w / 2, y: (fingerY - boardAt.current.y - pad) / cell - h / 2 };
        let best: { gx: number; gy: number } | null = null;
        let bestD = 1.5;
        for (const a of mv.at) {
          const ax = a % N;
          const ay = (a / N) | 0;
          const d = Math.min(Math.hypot(fx_ - ax, fy_ - ay), fingerAt ? Math.hypot(fingerAt.x - ax, fingerAt.y - ay) : Infinity);
          if (d < bestD && engine.fits(g.board, p, ax, ay)) {
            bestD = d;
            best = { gx: ax, gy: ay };
          }
        }
        return best;
      }
      return engine.fits(g.board, p, gx, gy) ? { gx, gy } : null;
    },
    [g, cell, gap, lesson, mv],
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
    /* In a lesson only the piece of the move now taught lifts. Touching
       another is answered (2026-11-11, Khizri: with a 1 and a 2 in the tray
       a touch on the 1 did nothing): it shakes its head, and the piece whose
       turn it is hops, then the lesson shows its move again. */
    if (mv && mv.slot !== slot) {
      fx.repel();
      lockedShake.value = withSequence(withTiming(-4, { duration: 50 }), withTiming(4, { duration: 80 }), withTiming(-2, { duration: 80 }), withTiming(0, enter(dur.fast)));
      setLockedSlot(slot);
      turnHop.value = withSequence(withDelay(150, withTiming(-trayCell * 0.4, enter(dur.fast))), withTiming(0, back(300, 2.4)));
      setDemoRun((n) => n + 1);
      return;
    }
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
    const t = fitAt(holdRef.current.piece, pageX - ox, pageY - oy, pageX, pageY);
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
      // In a lesson a piece let go in the wrong place is answered: as it
      // gets back to its slot the lesson shows its move again, from the start.
      if (store.lesson !== null) later(dur.base, () => setDemoRun((n) => n + 1));
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
    flush();
    settle();
    const before = g.board.slice();
    const s0 = g.score;
    const sw0 = g.sweeps;
    const res = store.place(h.slot, t.gx, t.gy);
    if (!res) return;
    lastLaid.current = res.laid;
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
    const done = playChain(frame, res.steps, milestonesIn(res.steps.map((st) => st.level)), 0);
    later(done + 20, () => setShown(g.board.slice()));
    if (res.refilled) later(done + 120, () => fx.tray());
    // A chain of two or more earns a sweep: its layer slides in under the
    // board as the last merge lands, with its own two rising ticks.
    /* An earned sweep is seen being earned: a yellow stud pops out of the
       merge that completed the cascade and flies in an arc into its socket on
       the sweep key, and clicks in on the frame it lands. */
    const chainAnchor = () => res.steps[Math.min(res.steps.length, g.cfg.chainBonus) - 1]?.anchor ?? res.steps[res.steps.length - 1].anchor;
    if (res.bonus) {
      setBonusHeld(true);
      const from = cellPt(chainAnchor());
      const loud = isLoud('chain');
      if (loud) studMs.current = STUD_FLY;
      later(done, () => {
        flyStud(from, g.sweeps - 1, 'in', loud);
        later(loud ? STUD_FLY : STUD_QUIET, () => {
          setStudFly(null);
          setBonusHeld(false);
          fx.bonus();
        });
      });
    } else if (counted && g.cfg.chainBonus && res.steps.length >= g.cfg.chainBonus && sw0 >= g.cfg.sweepsMax) {
      /* Earned with the key already full: the stud flies up, knocks on the
         key and drops away. Sweeps keep, but only two of them. */
      const from = cellPt(chainAnchor());
      const loud = isLoud('full');
      if (loud) studMs.current = STUD_BOUNCE;
      later(done, () => {
        flyStud(from, g.cfg.sweepsMax - 1, 'bounce', loud);
        /* Its own sound on the frame it taps the key (a tick and two bars
           stepping down), never the click of a stud going in: "no room" must
           not sound like "earned". The quiet one is the key's small shake,
           which starts at once, so the sound plays with it. */
        if (!loud) return fx.full();
        later(STUD_BOUNCE * STUD_KNOCK, () => fx.full());
        later(STUD_BOUNCE, () => setStudFly(null));
      });
    } else if (counted && res.refilled && g.sweeps > sw0) {
      /* A new tray tops an empty key up to one sweep: the stud rises out of
         the tray with the new pieces and flies up into its socket. */
      setBonusHeld(true);
      const loud = isLoud('tray');
      if (loud) studMs.current = STUD_FLY + 200;
      later(done + 200, () => {
        slotRefs.current[1]?.measureInWindow((sx_, sy_, sw, sh) => {
          flyStud({ x: sx_ + sw / 2 - 9 - boardAt.current.x, y: sy_ + sh / 2 - 9 - boardAt.current.y }, g.sweeps - 1, 'in', loud);
        });
        later(loud ? STUD_FLY : STUD_QUIET, () => {
          setStudFly(null);
          setBonusHeld(false);
          fx.bonus();
        });
      });
    }
    if (res.steps.length) bauhausCheck(s0, done, res.steps[res.steps.length - 1].anchor);
    afterMove(done);
  };

  /** Plays a placed piece's chain from `base` ms (the frame it was laid): one
      merge per step, the absorbed tile flies into its partner, and on arrival
      the partner flashes, its number kicks, the note plays, the haptic taps
      and the points float up, all on the same frame. A short chain plays
      quicker than a long one (paceOf). `frame` is the board with the piece
      laid. Returns when the last merge has landed. */
  const playChain = (frame: number[], steps: Step[], marks: boolean[], base: number) => {
    const pc = paceOf(steps.length);
    steps.forEach((st, k) => {
      const t0 = base + pc.base + chainAt(k, pc.gaps);
      const value = frame[st.absorbed[0]];
      // The pair, small first: what flew in and what took it in.
      const pair = [...st.absorbed.map((a) => frame[a]), frame[st.anchor]].sort((a, b) => a - b);
      const terms: Term[] = [...pair.flatMap((v, j) => (j ? ['+' as const, v] : [v])), '=', st.level];
      for (const a of st.absorbed) frame[a] = 0;
      const mid = frame.slice();
      frame[st.anchor] = st.level;
      const snap = frame.slice();
      const last = k === steps.length - 1;
      expect(t0 + pc.fly, st.anchor, k, last ? steps.length : 0);
      later(t0, () => {
        setShown(mid);
        setFlights((f) => [...f, ...st.absorbed.map((a) => ({ id: `${t0}-${a}-${Date.now()}`, m: { from: a, to: st.anchor, value, merges: true }, ms: pc.fly }))]);
      });
      later(t0 + pc.fly, () => {
        setShown(snap);
        setFlights((f) => f.filter((x) => !st.absorbed.some((a) => x.m.from === a)));
        land(st.anchor, st.level, marks[k], snap, st.pts, k, last ? steps.length : 0);
        // A lesson writes each merge above the board on the frame it lands.
        if (lessonNow.current !== null && pair.every((v) => v > 0)) {
          setEq({ id: `${t0}-${k}-${Date.now()}`, terms });
          kickLine();
        }
      });
    });
    return steps.length ? base + pc.base + chainAt(steps.length - 1, pc.gaps) + pc.fly : base;
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
    /* On the game's board, not the one shown: a piece can be picked up while
       the last chain still plays out, and it lands on where that chain ends. */
    if (!hold || !target || !engine.fits(g.board, hold.piece, target.gx, target.gy)) return null;
    const b = g.board.slice();
    const { laid, steps } = engine.applyPlacement(b, hold.piece, target.gx, target.gy, g.cfg.absorb);
    const own = new Map(laid.map((at, k) => [at, hold.piece.cells[k][2]] as [number, number]));
    const eaten = new Set<number>();
    for (const st of steps) for (const a of st.absorbed) if (!own.has(a)) eaten.add(a);
    const result: Record<number, number> = {};
    for (const st of steps) if (b[st.anchor] > 0) result[st.anchor] = b[st.anchor];
    return { laid: own, eaten, result, merges: steps.length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, hold, target, store.version]);
  /* The sweep a held move would earn: its stud lights as a ghost on the
     sweep key before the piece is let go, so a long chain can be aimed for. */
  const earns = !!preview && counted && !!g.cfg.chainBonus && preview.merges >= g.cfg.chainBonus && g.sweeps < g.cfg.sweepsMax;

  /* ---------- what each cell looks like right now ---------- */
  const look = useCallback(
    (i: number): CellLook | undefined => {
      const l: CellLook = { pop: pops[i], land: lands[i] };
      if (opened?.has(i)) l.enterDelay = 60 + 40 * Math.max(Math.abs((i % N) - 2.5), Math.abs(((i / N) | 0) - 2.5));
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
      // The step's cells, hatched in the piece's colour: one place, or the
      // places to choose between.
      // They stay lit while the piece is held, till it is over one of them.
      const guide = mv && coach === 'task' ? mv : hintMv;
      if ((!hold || !target) && guide && shown[i] === 0) {
        const p = g.tray[guide.slot];
        for (const a of guide.at) {
          const m = p?.cells.find(([cx, cy]) => ((a / N) | 0) * N + cy * N + (a % N) + cx === i);
          if (m) l.ghost = m[2];
        }
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
        if (target) {
          const m = hold.piece.cells.find(([cx, cy]) => (target.gy + cy) * N + target.gx + cx === i);
          if (m) l.ghost = m[2];
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
    [shown, hold, target, preview, pops, lands, lesson, coach, nudge, aim, opened, mv, hintMv],
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
    /* The landing is previewed in the sockets, never as blocks: the piece's
       cells and the tile a cascade ends as are lit moulds (CellLook.ghost),
       so the cell where a cascade ends gives up its tile to its mould. */
    const v = shown.slice();
    if (preview) for (const i of Object.keys(preview.result)) v[+i] = 0;
    return v;
  }, [shown, hold, target, aim, preview]);

  // A lesson's board is only as big as its plate: past it there is no socket.
  const plateValues = useMemo(() => (lesson ? values.map((v) => (v < 0 ? null : v)) : values), [values, lesson]);

  /* The magnets speak: as the held piece comes over a cell, a partner beside
     it hums, a like pole beside it pushes. Once per cell it enters. */
  useEffect(() => {
    if (!hold || !target) return;
    let partner = 0;
    let like = false;
    for (const [cx, cy, cv] of hold.piece.cells) {
      const x = target.gx + cx;
      const y = target.gy + cy;
      for (const [ux, uy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + ux;
        const ny = y + uy;
        if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
        const v = shown[ny * N + nx];
        if (v > 0 && engine.pairs(cv, v)) partner = Math.max(partner, v);
        else if (v > 0 && cv < 3 && v === cv) like = true;
      }
    }
    if (partner) fx.hum(partner);
    else if (like) fx.repel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.gx, target?.gy, !!hold]);

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
    /* A lesson's board slides only the way it teaches. Another way is not
       silence: the board tips that way and springs back with the lesson's
       soft push, and the finger shows the right way again. */
    if (lesson?.dirs && !lesson.dirs.includes(dir)) {
      tilt(dir, 1.5, 0);
      fx.repel();
      setDemoRun((n) => n + 1);
      return;
    }
    if (!g.cfg.freeSweeps && g.sweeps === 0) {
      fx.invalid();
      tilt(dir, 1.5, 0);
      return;
    }
    flush();
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
    const moved = moves.filter((m) => m.from !== m.to).length;
    fx.sweep(moved);
    /* A sweep is paid with a stud: it pops out of its socket on the key and
       drops off the board the way the board went. */
    if (counted) {
      const W = cell * N + gap;
      const [ux, uy] = UNIT[dir];
      flyStud({ x: W / 2 - 9 + ux * (W / 2 + cell * 0.4), y: W / 2 - 9 + uy * (W / 2 + cell * 0.4) }, g.sweeps, 'out', isLoud('spend'));
      later(STUD_OUT, () => setStudFly((f) => (f?.mode === 'out' ? null : f)));
    }
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
      fx.knock(moved);
      const [ux, uy] = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[dir];
      sx.value = withSequence(withTiming(ux * 2, { duration: 50 }), withTiming(0, { duration: 200, easing: Easing.out(Easing.cubic) }));
      sy.value = withSequence(withTiming(uy * 2, { duration: 50 }), withTiming(0, { duration: 200, easing: Easing.out(Easing.cubic) }));
    });
    // The k-th merge of one tile in its line is step k of its chain.
    const nth: Record<number, number> = {};
    const beat = sweepStep(res.made.length);
    res.made.forEach((m, k) => {
      const step = (nth[m.at] = (nth[m.at] ?? -1) + 1);
      expect(SLIDE + k * beat, m.at, step, k === res.made.length - 1 && !push?.steps.length ? res.made.length : 0);
      later(SLIDE + k * beat, () => {
        setShown((sh) => (sh[m.at] === m.level ? sh : Object.assign(sh.slice(), { [m.at]: m.level })));
        land(m.at, m.level, marks[k], after, m.pts, step, k === res.made.length - 1 && !push?.steps.length ? res.made.length : 0);
      });
    });
    let done = SLIDE + res.made.length * beat;
    later(done, () => setShown(after));
    const sMade = s0 + res.made.reduce((t, m) => t + m.level, 0);
    if (res.made.length) bauhausCheck(s0, SLIDE + (res.made.length - 1) * beat, res.made[res.made.length - 1].at, sMade);
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
      const chainEnd = playChain(frame, push.steps, allMarks.slice(res.made.length), enterAt + PUSH_MS);
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
  // A lesson's tray: the piece touched out of turn shakes, the one whose turn it is hops.
  const lockedShake = useSharedValue(0);
  const turnHop = useSharedValue(0);
  const [lockedSlot, setLockedSlot] = useState<number | null>(null);
  const lockedStyle = useAnimatedStyle(() => ({ transform: [{ translateX: lockedShake.value }] }));
  const turnStyle = useAnimatedStyle(() => ({ transform: [{ translateY: turnHop.value }] }));
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
  /* A choice is not shown: the player weighs the hatched cells themselves,
     until they have missed it once or have stood still for a while; then
     the lesson shows the move that proves the step (2026-11-11, a newbie's
     walk-through: a choice missed came back with no help, again and again). */
  const demoAt = !mv ? -1 : mv.at.length === 1 ? mv.at[0] : mv.right !== undefined && (missed === store.lesson || stuck) ? mv.right : -1;
  const demoSlot = demoAt >= 0 && mv ? mv.slot : -1;
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
  }, [store.lesson, store.version, coach, width, height, demoSlot]);

  // Nine seconds over a choice without a try: show the way.
  const choiceRight = mv && mv.at.length > 1 && mv.right !== undefined;
  useEffect(() => {
    setStuck(false);
    if (!choiceRight || coach !== 'task' || hold) return;
    const id = setTimeout(() => setStuck(true), 9000);
    return () => clearTimeout(id);
  }, [store.lesson, store.version, coach, !!hold, choiceRight]);

  const lineStyle = useAnimatedStyle(() => ({ opacity: 1 - Math.abs(lineIn.value), transform: [{ translateX: lineIn.value * 40 }, { scale: lineKick.value }], transformOrigin: 'center' }));

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
            {/* No score in the lessons: it teaches nothing there and would
                drop to 0 at the first game. No ×2 chip (2026-11-09): nothing
                taught it; a long chain's reward is the score's jump. */}
            {store.lesson === null ? <ScoreNum v={g.score} /> : null}
          </Animated.View>
          <Animated.View style={keyStyle}>
            <View ref={keyRef} collapsable={false}>
              <SweepKey studs={counted ? g.cfg.sweepsMax : 0} filled={g.sweeps - (bonusHeld ? 1 : 0)} ghost={earns} onPress={hintSweep} />
            </View>
          </Animated.View>
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
                style={[{ height: LESSON_H, justifyContent: 'center', alignItems: 'center' }, lineStyle]}>
                {/* One pair at a time: the merge the move starts with, then
                    each merge of the chain as it lands (see Lesson.task). */}
                <Formula key={eq ? eq.id : 'task'} terms={eq ? eq.terms : (lesson.task ?? lesson.formula)} cell={trayCell} gap={gap} open={!eq && coach === 'task'} fit={col} />
              </Animated.View>
            </View>
          ) : carried ? (
            // The lessons' line keeps its room in the game that goes on from them.
            <View style={{ width: col, height: LESSON_H, marginBottom: step }} />
          ) : null}
          <Animated.View style={[layer, boardStyle]} {...swipe.panHandlers}>
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
              <Field w={N} h={N} values={plateValues} cell={cell} gap={gap} look={look} open={lesson?.open} wave={wave} />
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
                {bursts.map((b) => (
                  <Burst key={b.id} at={b.at} v={b.v} n={b.n} power={b.power} cell={cell} gap={gap} />
                ))}
                {ripple ? <Ripple key={ripple.id} at={ripple.at} v={ripple.v} board={ripple.board} cell={cell} gap={gap} home={ripple.primaries ? null : trackHome(ripple.v)} primaries={ripple.primaries} /> : null}
                {/* Above the wave: the stud is what the eye should follow. */}
                {studFly ? <StudFlight key={studFly.id} from={studFly.from} to={studFly.to} mode={studFly.mode} loud={studFly.loud} cell={cell} /> : null}
              </View>
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
                <Animated.View style={slot === stuckSlot ? stuckStyle : mv && slot === mv.slot ? turnStyle : mv && slot === lockedSlot ? lockedStyle : undefined}>
                <TrayPiece
                  key={`${trayId.current}-${slot}-${JSON.stringify(p.cells)}`}
                  delay={slot * 60}
                  rise={trayCell}
                  opacity={p.used || hold?.slot === slot || returning === slot ? 0 : g.over || !fitsSomewhere(g.board, p) || (mv && mv.slot !== slot) ? 0.35 : 1}>
                  <Field variant="piece" {...pieceGrid(p)} cell={trayCell} gap={gap} />
                </TrayPiece>
                </Animated.View>
              ) : null}
            </View>
          ))}
        </View>
      </Screen>

      {lesson && coach === 'task' && !hold && !held && !sliding && geo ? (
        demoSlot >= 0 && geo.slot && mv ? (
          <Demo
            key={`demo-${store.lesson}-${store.version}-${demoRun}-${demoAt}`}
            piece={g.tray[demoSlot]!}
            from={geo.slot}
            to={{ x: geo.board.x + gap / 2 + (demoAt % N) * cell, y: geo.board.y + gap / 2 + ((demoAt / N) | 0) * cell }}
            cell={cell}
            gap={gap}
          />
        ) : lesson.dirs && g.sweeps === lesson.sweeps ? (
          <Finger key={`finger-${store.lesson}-${demoRun}`} board={geo.board} vertical={!!lesson.dirs?.includes('up')} />
        ) : null
      ) : null}

      {/* The lifted piece, above everything. No drop shadow: the lift reads
          from the scale-up and from the ghost on the board. */}
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0 }, layer, dragStyle]}>
        {hold || held ? <Field variant="piece" {...pieceGrid((hold?.piece ?? held)!)} cell={cell} gap={gap} /> : null}
      </Animated.View>
    </View>
  );
}

/** A tile in flight during a sweep: drawn the way an isolated tile sits on the
    board (its own fill inside the thick line), moving from its old cell to its
    new one. */
const SlidingTile = memo(function SlidingTile({ m, cell, gap, ms = SLIDE }: { m: Move; cell: number; gap: number; ms?: number }) {
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
});


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
const WAVE = WAVE_STEP; // ms per cell of distance from the milestone
const FLIP = 460; // ms the milestone tile turns over in the air
const FLY_HOME = 380; // ms its copy flies into the track

/** A milestone, played on the enamel. The tile that made it rises off the
    board and turns over once, light running across its face; a wave goes
    out from it and every tile on the board lifts out of its socket in turn,
    with a glint on its enamel, while the empty floor flashes the new colour.
    Then a copy of the tile drops into its square on the track under the
    board, which pops as it lands. */
const Ripple = memo(function Ripple({ at, v, board, cell, gap, home, primaries }: { at: number; v: number; board: number[]; cell: number; gap: number; home: { x: number; y: number; w: number; h: number } | null; primaries?: boolean }) {
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
        board[i] !== 0 ? null : (
          <FloorFlash key={`f${i}`} d={dist(i)} color={primaries ? c.tile[1 + (dist(i) % 3)] : c.tile[rank(v)]} style={{ left: pos(i).x + pad, top: pos(i).y + pad, width: cell - gap, height: cell - gap }} />
        ),
      )}
      {/* The other blocks lift in their own cells (Field's Wave). */}
      {primaries ? (
        board[at] > 0 ? <LiftTile key="hero" v={board[at]} d={0} at={pos(at)} cell={cell} gap={gap} hero home={null} /> : null
      ) : (
        <LiftTile key="hero" v={v} d={0} at={pos(at)} cell={cell} gap={gap} hero home={home} />
      )}
    </>
  );
});

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
/** Plastic crumbs off a merge: small blocks in the new tile's colour burst
    out of the cell, spin, and fall under gravity off the board. `power` 1-5
    sets how many and how far. Seeded by the cell, so a replay looks alike. */
const Burst = memo(function Burst({ at, v, n, power, cell, gap }: { at: number; v: number; n: number; power: number; cell: number; gap: number }) {
  const pad = gap / 2;
  const cx = pad + (at % N) * cell + cell / 2;
  const cy = pad + ((at / N) | 0) * cell + cell / 2;
  let seed = at * 9301 + v * 49297 + power;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const chips = Array.from({ length: n }, (_, k) => {
    const a = (k / n) * Math.PI * 2 + rnd() * 0.6;
    const speed = cell * (0.9 + power * 0.32) * (0.6 + rnd() * 0.6);
    return { vx: Math.cos(a) * speed, vy: Math.sin(a) * speed - cell * (0.6 + power * 0.15), spin: (rnd() - 0.5) * 720, size: Math.round(cell * (0.13 + rnd() * 0.08)), delay: Math.round(rnd() * 40) };
  });
  /* One clock for the whole burst: each chip reads it from its own small
     delay, so a burst of fifteen runs one animation, not fifteen. */
  const clock = useSharedValue(0);
  useEffect(() => {
    clock.value = withTiming(BURST_MS, { duration: BURST_MS, easing: Easing.linear });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { c } = useTheme();
  const color = c.tile[rank(v)];
  const ledge = plastic(color).ledge;
  return (
    <>
      {chips.map((ch, k) => (
        <Chip key={k} {...ch} cx={cx} cy={cy} color={color} ledge={ledge} cell={cell} clock={clock} />
      ))}
    </>
  );
});

function Chip({ vx, vy, spin, size, delay, cx, cy, color, ledge, cell, clock }: { vx: number; vy: number; spin: number; size: number; delay: number; cx: number; cy: number; color: string; ledge: string; cell: number; clock: SharedValue<number> }) {
  const g = cell * 3.2; // gravity, in cells per (burst time)^2
  const st = useAnimatedStyle(() => {
    const k = Math.max(0, Math.min(1, (clock.value - delay) / (BURST_MS - delay)));
    // Thrown out fast, slowed by the air, pulled down.
    const d = 1 - Math.pow(1 - k, 2.2);
    return {
      opacity: k === 0 ? 0 : k < 0.75 ? 1 : (1 - k) / 0.25,
      transform: [{ translateX: cx - size / 2 + vx * d }, { translateY: cy - size / 2 + vy * d + g * k * k }, { rotate: `${spin * k}deg` }, { scale: 1 - k * 0.3 }],
    };
  });
  return (
    // A flat chip with a ledge in a darker shade: no gradient, no shadow, so
    // a dozen of them cost almost nothing to draw.
    <Animated.View
      style={[{ position: 'absolute', left: 0, top: 0, width: size, height: size, borderRadius: Math.round(size * 0.22), backgroundColor: color, borderBottomWidth: Math.max(1, Math.round(size * 0.18)), borderBottomColor: ledge }, st]}
    />
  );
}

/** The stud of an earned sweep, flying from its merge to the sweep key in an
    arc, turning as it goes, and shrinking to the stud's size on arrival. */
/* A sweep's stud in flight, in the board's coordinates (top-left of the
   18 px chip). 'in': an arc into a socket of the sweep key. 'bounce': the
   same arc, but the key is full: it knocks on it and falls away. 'out': a
   spent sweep leaves its socket and drops off the edge the board went. */
type StudMode = 'in' | 'bounce' | 'out';
const StudFlight = memo(function StudFlight({ from, to, mode, loud, cell }: { from: { x: number; y: number }; to: { x: number; y: number }; mode: StudMode; loud: boolean; cell: number }) {
  const k = useSharedValue(0);
  const total = !loud ? STUD_QUIET : mode === 'in' ? STUD_FLY : mode === 'bounce' ? STUD_BOUNCE : STUD_OUT;
  useEffect(() => {
    k.value = withTiming(1, { duration: total, easing: Easing.linear });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const ease = (t: number) => {
    'worklet';
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };
  // pop: 0 to POP the stud jumps up and grows; it hangs till HANG; then flies.
  const POP = mode === 'in' ? 0.26 : 0.2;
  const HANG = mode === 'in' ? 0.42 : 0.3;
  const END = mode === 'in' ? 1 : STUD_KNOCK;
  const st = useAnimatedStyle(() => {
    const p = k.value;
    if (!loud) {
      // The small hop: a low arc, a touch bigger than the stud, no hang.
      const a = ease(p);
      return { opacity: 1, transform: [{ translateX: from.x + (to.x - from.x) * a }, { translateY: from.y + (to.y - from.y) * a - Math.sin(Math.PI * a) * cell * 0.5 }, { rotate: '0deg' }, { scale: 1.3 - a * 0.3 }] };
    }
    if (mode === 'out') {
      // Pops up out of the socket, big, then falls away along a short arc.
      const lift = Math.sin(Math.PI * Math.min(1, p * 1.6)) * cell * 0.9;
      return {
        opacity: p < 0.75 ? 1 : 1 - (p - 0.75) / 0.25,
        transform: [{ translateX: from.x + (to.x - from.x) * p }, { translateY: from.y + (to.y - from.y) * p * p - lift }, { rotate: `${p * 270}deg` }, { scale: 1 + Math.sin(Math.PI * Math.min(1, p * 1.4)) * 1.2 }],
      };
    }
    // High enough to stand clear of the tile it came out of, not sit on it.
    const rise = cell * 1.05;
    const up = Math.min(1, p / POP);
    const popScale = 1 + (1 - Math.pow(1 - up, 3)) * 1.6 + (up >= 1 && p < HANG ? Math.sin(((p - POP) / (HANG - POP)) * Math.PI) * 0.12 : 0);
    if (p < HANG) {
      return { opacity: 1, transform: [{ translateX: from.x }, { translateY: from.y - rise * (1 - Math.pow(1 - up, 3)) }, { rotate: '0deg' }, { scale: popScale }] };
    }
    const a = ease(Math.min(1, (p - HANG) / (END - HANG)));
    const sx = from.x;
    const sy = from.y - rise;
    const lift = Math.sin(Math.PI * a) * cell * 0.9;
    const base = { x: sx + (to.x - sx) * a, y: sy + (to.y - sy) * a - lift };
    const scale = 2.6 - a * 1.6;
    if (mode === 'bounce' && p > END) {
      // The key is full: the stud melts into light on it, swelling and fading.
      const b = (p - END) / (1 - END);
      return {
        opacity: 1 - b,
        transform: [{ translateX: to.x }, { translateY: to.y - b * cell * 0.3 }, { rotate: '0deg' }, { scale: 1 + b * 1.4 }],
      };
    }
    return { opacity: 1, transform: [{ translateX: base.x }, { translateY: base.y }, { rotate: `${a * 360}deg` }, { scale }] };
  });
  // A ring of yellow light behind the stud while it hangs: look here.
  const glow = useAnimatedStyle(() => {
    const p = k.value;
    if (!loud || mode === 'out' || p > HANG + 0.05) return { opacity: 0, transform: [{ scale: 1 }] };
    const g = Math.min(1, p / HANG);
    return { opacity: 0.55 * (1 - g), transform: [{ scale: 1 + g * 2.2 }] };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: 18, height: 18 }, st]}>
      <Animated.View style={[{ position: 'absolute', left: -3, top: -3, width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: '#FFD43B' }, glow]} />
      <View style={{ width: 18, height: 18, borderRadius: 5, backgroundColor: '#FFD43B', backgroundImage: 'linear-gradient(180deg, #FFE27A, #FFD43B)', boxShadow: '0 2px 0 #C9A21F, inset 0 1px 0 rgba(255,255,255,0.8)' }} />
    </Animated.View>
  );
});

/** The pushed piece: it rides in from beyond the far edge of the board,
    fading up as it crosses the frame, and stops on its cells with a small
    overshoot, the way the board itself meets a wall. */
const Incoming = memo(function Incoming({ piece, ox, oy, dir, delay, cell, gap }: { piece: Piece; ox: number; oy: number; dir: Dir; delay: number; cell: number; gap: number }) {
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
});

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
function Finger({ board, vertical = false }: { board: { x: number; y: number; w: number }; vertical?: boolean }) {
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
  // Side to side, or (vertical) bottom to top, across the middle.
  const mid = board.w / 2 - size / 2;
  const a0 = board.w * 0.75 - size / 2;
  const a1 = board.w * 0.25 - size / 2;
  const st = useAnimatedStyle(() => {
    const run = a0 + (a1 - a0) * k.value;
    return {
      opacity: o.value,
      transform: [{ translateX: board.x + (vertical ? mid : run) }, { translateY: board.y + (vertical ? run : mid) }, { scale: 1.1 - p.value * 0.1 }],
    };
  });
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

/** The sweep key: a four-way arrow and one stud socket per sweep the game
    can hold; a held sweep is a yellow chip in its socket. */
function SweepKey({ studs, filled, ghost = false, onPress }: { studs: number; filled: number; ghost?: boolean; onPress: () => void }) {
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
            <Stud key={k} on={k < filled} ghost={ghost && k === Math.max(0, filled)} />
          ))}
        </View>
      ) : null}
    </Key>
  );
}

function Stud({ on, ghost = false }: { on: boolean; ghost?: boolean }) {
  const { isDark } = useTheme();
  // A stud the held move would fill: its yellow breathes in, half lit.
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = ghost ? withRepeat(withSequence(withTiming(0.6, { duration: 300 }), withTiming(0.3, { duration: 300 })), -1) : withTiming(0, { duration: 100 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ghost]);
  const ghostSt = useAnimatedStyle(() => ({ opacity: pulse.value }));
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
      {!on ? <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: 14, height: 14, borderRadius: 4, backgroundColor: '#FFD43B' }, ghostSt]} /> : null}
    </View>
  );
}
