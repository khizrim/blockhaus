import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { AppState, Platform } from 'react-native';

import { getMusic } from './music';

/* Sound and touch feedback in one place. Every game event calls one function
   here; it plays the sound if sound is on and the matching haptic if
   vibration is on. The sounds are synthesised by scripts/make-sounds.py.

   The game respects the silent switch and mixes with the player's own music:
   it is a quiet puzzle, not something that should stop a podcast. */

const SRC = {
  pick: require('../../assets/sounds/pick.wav'),
  'place-1': require('../../assets/sounds/place-1.wav'),
  'place-2': require('../../assets/sounds/place-2.wav'),
  'place-3': require('../../assets/sounds/place-3.wav'),
  invalid: require('../../assets/sounds/invalid.wav'),
  'merge-3': require('../../assets/sounds/merge-3.wav'),
  'merge-4': require('../../assets/sounds/merge-4.wav'),
  'merge-5': require('../../assets/sounds/merge-5.wav'),
  'merge-6': require('../../assets/sounds/merge-6.wav'),
  'merge-7': require('../../assets/sounds/merge-7.wav'),
  'merge-8': require('../../assets/sounds/merge-8.wav'),
  'merge-9': require('../../assets/sounds/merge-9.wav'),
  'merge-10': require('../../assets/sounds/merge-10.wav'),
  'merge-11': require('../../assets/sounds/merge-11.wav'),
  'milestone-6': require('../../assets/sounds/milestone-6.wav'),
  'milestone-7': require('../../assets/sounds/milestone-7.wav'),
  'milestone-8': require('../../assets/sounds/milestone-8.wav'),
  'milestone-9': require('../../assets/sounds/milestone-9.wav'),
  'milestone-10': require('../../assets/sounds/milestone-10.wav'),
  'milestone-11': require('../../assets/sounds/milestone-11.wav'),
  'sweep-1': require('../../assets/sounds/sweep-1.wav'),
  'sweep-2': require('../../assets/sounds/sweep-2.wav'),
  'knock-1': require('../../assets/sounds/knock-1.wav'),
  'knock-2': require('../../assets/sounds/knock-2.wav'),
  'knock-3': require('../../assets/sounds/knock-3.wav'),
  'slam-1': require('../../assets/sounds/slam-1.wav'),
  'slam-2': require('../../assets/sounds/slam-2.wav'),
  'slam-3': require('../../assets/sounds/slam-3.wav'),
  tray: require('../../assets/sounds/tray.wav'),
  tap: require('../../assets/sounds/tap.wav'),
  'toggle-on': require('../../assets/sounds/toggle-on.wav'),
  'toggle-off': require('../../assets/sounds/toggle-off.wav'),
  win: require('../../assets/sounds/win.wav'),
  over: require('../../assets/sounds/over.wav'),
  hum: require('../../assets/sounds/hum.wav'),
  repel: require('../../assets/sounds/repel.wav'),
  boop: require('../../assets/sounds/boop.wav'),
  grow: require('../../assets/sounds/grow.wav'),
  'step-0': require('../../assets/sounds/step-0.wav'),
  'step-1': require('../../assets/sounds/step-1.wav'),
  'step-2': require('../../assets/sounds/step-2.wav'),
  'step-3': require('../../assets/sounds/step-3.wav'),
  'step-4': require('../../assets/sounds/step-4.wav'),
  'step-5': require('../../assets/sounds/step-5.wav'),
  learned: require('../../assets/sounds/learned.wav'),
  full: require('../../assets/sounds/full.wav'),
} as const;

export type SoundName = keyof typeof SRC;
export const SOUND_NAMES = Object.keys(SRC) as SoundName[];

/** Two players per sound so a quick repeat (two placements, a chain) never cuts itself off. */
const VOICES = 2;
const pool = new Map<SoundName, { players: AudioPlayer[]; next: number }>();

let soundOn = true;
let hapticsOn = true;
let musicOn = true;
let ready = false;

/* The audio session is set before anything plays, music included: with sound
   off and music on, the defaults would play through the silent switch. */
let moded = false;
function mode() {
  if (moded) return;
  moded = true;
  setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers', shouldPlayInBackground: false }).catch(() => {});
}

function init() {
  if (ready) return;
  ready = true;
  mode();
  for (const name of SOUND_NAMES) {
    pool.set(name, { players: Array.from({ length: VOICES }, () => createAudioPlayer(SRC[name])), next: 0 });
  }
}

export function setFeedback(o: { sound: boolean; haptics: boolean; music: boolean }) {
  soundOn = o.sound;
  hapticsOn = o.haptics;
  musicOn = o.music;
  mode();
  if (soundOn) init();
  syncMusic();
}

/* ---------- background music ----------
   One quiet loop (scripts/make-music.py), in the same key as the merge notes.
   It fades in and out instead of starting or stopping dead, and drops to a
   murmur on the pause screen. */

const MUSIC_LEVEL = 0.35;
let dimmed = false;
let away = false;

function syncMusic() {
  getMusic().setVolume(musicOn && !away ? (dimmed ? MUSIC_LEVEL * 0.35 : MUSIC_LEVEL) : 0, away ? 150 : 600);
}

/* Silent while the app is in the background or the browser tab is hidden,
   and back when the player returns. */
AppState.addEventListener('change', (s) => {
  const next = s !== 'active';
  if (next === away) return;
  away = next;
  syncMusic();
});

/** Lower the music while a screen like pause is open. */
export function dimMusic(on: boolean) {
  dimmed = on;
  syncMusic();
}

/** Browsers refuse audio until the first tap; every tap retries the music. */
function kickMusic() {
  if (musicOn) getMusic().resume();
}

/* A cascade's notes ring one over the next, so a long chain piles up into
   a cluster. At most two merge notes ring at once: a third one stops the
   oldest, so the chain stays a climbing line. */
const ringing: AudioPlayer[] = [];

/** Play one sound, regardless of the haptic. */
export function play(name: SoundName, rate = 1) {
  kickMusic();
  if (!soundOn) return;
  init();
  const v = pool.get(name);
  if (!v) return;
  const p = v.players[v.next];
  v.next = (v.next + 1) % VOICES;
  try {
    // The pitch moves with the rate: a step up the chain is a step up the scale.
    p.shouldCorrectPitch = false;
    p.setPlaybackRate(rate);
    p.seekTo(0).catch(() => {});
    p.play();
    if (name.startsWith('merge-')) {
      const i = ringing.indexOf(p);
      if (i >= 0) ringing.splice(i, 1);
      ringing.push(p);
      while (ringing.length > 2) ringing.shift()!.pause();
    }
  } catch {
    // Sound is a garnish: a failed play never reaches the game.
  }
}

const canBuzz = Platform.OS === 'ios' || Platform.OS === 'android';
const buzz = (f: () => Promise<void>) => {
  if (hapticsOn && canBuzz) f().catch(() => {});
};

/** Merge result value to the rung whose note it plays: 3 → 3 … 96 → 8, 192 → 9, 384 → 10, 768 and up → 11. */
const rungOf = (v: number) => Math.max(3, Math.min(11, v < 3 ? 3 : 3 + Math.round(Math.log2(v / 3))));

/* ---------- game events ---------- */

export const fx = {
  pick: () => {
    play('pick');
    buzz(() => Haptics.selectionAsync());
  },
  place: (cells: number) => {
    play(cells >= 3 ? 'place-3' : cells === 2 ? 'place-2' : 'place-1');
    buzz(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  },
  /** A piece let go off the board goes home: not a mistake, so no warning. */
  putBack: () => play('pick'),
  invalid: () => {
    play('invalid');
    buzz(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
  },
  /** One merge producing `value`. `step` is its place in the cascade: each
      merge plays the next degree of the pentatonic, so a chain climbs a
      staircase; the hand presses harder as the chain grows and as the tile
      gets heavier. */
  merge: (value: number, step = 0) => {
    const r = rungOf(value);
    play(`merge-${3 + Math.min(8, step)}` as SoundName);
    const style = step >= 4 ? Haptics.ImpactFeedbackStyle.Heavy : step >= 2 || r >= 6 ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Soft;
    buzz(() => Haptics.impactAsync(style));
  },
  /** A chain: each step one beat after the last, so it climbs audibly. */
  cascade: (values: number[], beat = 120) => {
    values.forEach((v, k) => setTimeout(() => fx.merge(v, k), k * beat));
  },
  /** A sweep's slide, on release: the skid swells as the blocks speed up.
      `moved` is how many blocks travel. */
  sweep: (moved = 4) => {
    play(moved > 4 ? 'sweep-2' : 'sweep-1');
  },
  /** The blocks hit the wall, on the frame they arrive: a clack, and the
      hand feels the stop. Heavier when more blocks hit. */
  knock: (moved = 4) => {
    play(moved > 8 ? 'knock-3' : moved > 3 ? 'knock-2' : 'knock-1');
    buzz(() => Haptics.impactAsync(moved > 8 ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Rigid));
  },
  /** The last merge of a long chain (3 and more): a low slam under the
      note, heavier for a longer chain, and a heavy press; a chain of five
      and more presses twice. */
  slam: (merges: number) => {
    play(merges >= 5 ? 'slam-3' : merges === 4 ? 'slam-2' : 'slam-1');
    buzz(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
    if (merges >= 5) setTimeout(() => buzz(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)), 70);
  },
  tray: () => play('tray'),
  /** A new best of 24 and up: the rung's bell, and a firm tap. */
  milestone: (value: number) => {
    const r = Math.max(6, rungOf(value));
    play(`milestone-${r}` as SoundName);
    buzz(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  },
  /** A chain earned a sweep. */
  bonus: () => {
    play('toggle-on');
    buzz(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  },
  /** A chain earned a sweep the full key has no room for: it taps the key and melts. */
  full: () => {
    play('full');
    buzz(() => Haptics.selectionAsync());
  },
  win: () => {
    play('win');
    buzz(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  },
  over: () => {
    play('over');
    buzz(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
  },
  /* The magnets have a voice (2026-11-09). A held piece over a cell beside
     its partner: the partner hums at its own pitch, a degree higher for each
     rung, so a 6 sings above a 3. Beside a like pole: two low pushes. */
  hum: (partner: number) => {
    const semi = [0, 2, 4, 7, 9];
    const d = Math.max(0, Math.min(9, rungOf(Math.max(3, partner)) - 3 + (partner < 3 ? 0 : 1)));
    play('hum', 2 ** ((12 * Math.floor(d / 5) + semi[d % 5]) / 12));
    buzz(() => Haptics.selectionAsync());
  },
  repel: () => {
    play('repel');
    buzz(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft));
  },
  /* The lessons. A tile pops up onto the board, each one a step higher; the
     plate grows a ring; a step proved closes on its own figure, higher each
     step; the end plays all the figures as one phrase. */
  boop: (k = 0) => {
    const semi = [0, 2, 4, 7, 9, 12, 14];
    play('boop', 2 ** (semi[Math.min(k, semi.length - 1)] / 12));
  },
  grow: () => {
    play('grow');
    buzz(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
  },
  lessonStep: (k: number) => {
    play(`step-${Math.max(0, Math.min(5, k))}` as SoundName);
    buzz(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  },
  learned: () => {
    play('learned');
    buzz(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  },
  /* UI */
  tap: () => play('tap'),
  toggle: (on: boolean) => {
    play(on ? 'toggle-on' : 'toggle-off');
    buzz(() => Haptics.selectionAsync());
  },
};
