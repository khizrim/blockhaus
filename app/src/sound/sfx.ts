import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { AppState, Platform } from 'react-native';

import { getMusic, soundBytes, webAudio } from './music';

/* Sound and touch feedback in one place. Every game event calls one function
   here; it plays the sound if sound is on and the matching haptic if
   vibration is on. The sounds are synthesised by scripts/make-sounds.py.

   The game respects the silent switch and mixes with the player's own music:
   it is a quiet puzzle, not something that should stop a podcast.

   On the phone each sound has its own native players. In a browser they all
   go through the music's Web Audio context instead: an <audio> element
   starts late (tens of milliseconds, more on iOS Safari), stops the player's
   podcast and puts every click on the lock screen. */

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
  sweep: require('../../assets/sounds/sweep.wav'),
  settle: require('../../assets/sounds/settle.wav'),
  tray: require('../../assets/sounds/tray.wav'),
  tap: require('../../assets/sounds/tap.wav'),
  'toggle-on': require('../../assets/sounds/toggle-on.wav'),
  'toggle-off': require('../../assets/sounds/toggle-off.wav'),
  win: require('../../assets/sounds/win.wav'),
  over: require('../../assets/sounds/over.wav'),
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

const WEB = Platform.OS === 'web';
const buffers = new Map<SoundName, AudioBuffer>();

function init() {
  if (ready) return;
  ready = true;
  mode();
  if (WEB) {
    const ctx = webAudio();
    if (!ctx) return;
    for (const name of SOUND_NAMES) {
      soundBytes(SRC[name])
        .then((b) => ctx.decodeAudioData(b))
        .then((buf) => buffers.set(name, buf))
        .catch(() => {});
    }
    return;
  }
  for (const name of SOUND_NAMES) {
    pool.set(name, { players: Array.from({ length: VOICES }, () => createAudioPlayer(SRC[name])), next: 0 });
  }
}

/** A browser: start the decoded sound now, sample-exact, as many at once as needed. */
function playWeb(name: SoundName, rate: number) {
  const ctx = webAudio();
  const buf = buffers.get(name);
  if (!ctx || !buf) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = rate;
  src.connect(ctx.destination);
  src.start();
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

/** Play one sound, regardless of the haptic. */
export function play(name: SoundName, rate = 1) {
  kickMusic();
  if (!soundOn) return;
  init();
  if (WEB) return playWeb(name, rate);
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

/* The merge notes climb C major pentatonic from C5 (scripts/make-sounds.py),
   in the music's key. A later step of a chain moves its note further up the
   same scale, never by semitones: a semitone off C, D or G is out of key and
   grates on the loop underneath. */
const PENT = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31];
const CHAIN_STEPS = 4;
/** Playback rate that lifts rung `r` by `step` degrees of the scale. */
const climb = (r: number, step: number) => {
  const i = r - 3;
  return 2 ** ((PENT[i + Math.min(step, CHAIN_STEPS)] - PENT[i]) / 12);
};

/* Beats inside the sound files (scripts/make-sounds.py) that a press lands on. */
const WIN_CHORD = 520; // ms: win.wav's chord, as the goal block lands
const OVER_STEP = 220; // ms: over.wav's second note

/* ---------- game events ---------- */

export const fx = {
  pick: () => {
    play('pick');
    buzz(() => Haptics.selectionAsync());
  },
  /** A piece laid: a heavier knock and press for a bigger piece. */
  place: (cells: number) => {
    play(cells >= 3 ? 'place-3' : cells === 2 ? 'place-2' : 'place-1');
    buzz(() => Haptics.impactAsync(cells >= 3 ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light));
  },
  /** A piece let go off the board goes home: not a mistake, so no warning. */
  putBack: () => play('pick'),
  invalid: () => {
    play('invalid');
    buzz(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
  },
  /** One merge producing `value`. `step` is its place in a placed piece's
      cascade: each later step plays one degree higher on the scale (up to
      four) and presses a little harder, so a long chain is heard before its
      ×2 shows. */
  merge: (value: number, step = 0) => {
    const r = rungOf(value);
    play(`merge-${r}` as SoundName, climb(r, step));
    const style = step >= 4 ? Haptics.ImpactFeedbackStyle.Heavy : step >= 2 || r >= 6 ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Soft;
    buzz(() => Haptics.impactAsync(style));
  },
  /** A chain: each step one beat after the last, so it climbs audibly. */
  cascade: (values: number[], beat = 120) => {
    values.forEach((v, k) => setTimeout(() => fx.merge(v), k * beat));
  },
  /** The board lets go and slides: felt, no press yet. */
  sweep: () => play('sweep'),
  /** The board meets the wall it was pushed to: the knock and the press, on
      the frame of the hit. */
  settle: () => {
    play('settle');
    buzz(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid));
  },
  /** A fresh tray: one tick per piece as each springs into its slot. */
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
  /** The ladder runs up and the chord lands as the goal block does. */
  win: () => {
    play('win');
    setTimeout(() => buzz(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)), WIN_CHORD);
  },
  /** Two soft notes stepping down, a soft press on each. No error buzz:
      running out of room is the game ending, not the player failing. */
  over: () => {
    play('over');
    buzz(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
    setTimeout(() => buzz(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)), OVER_STEP);
  },
  /* UI */
  tap: () => play('tap'),
  toggle: (on: boolean) => {
    play(on ? 'toggle-on' : 'toggle-off');
    buzz(() => Haptics.selectionAsync());
  },
};
