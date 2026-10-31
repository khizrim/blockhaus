import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

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
  sweep: require('../../assets/sounds/sweep.wav'),
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

function init() {
  if (ready) return;
  ready = true;
  setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers', shouldPlayInBackground: false }).catch(() => {});
  for (const name of SOUND_NAMES) {
    pool.set(name, { players: Array.from({ length: VOICES }, () => createAudioPlayer(SRC[name])), next: 0 });
  }
}

export function setFeedback(o: { sound: boolean; haptics: boolean; music: boolean }) {
  soundOn = o.sound;
  hapticsOn = o.haptics;
  musicOn = o.music;
  if (soundOn) init();
  syncMusic();
}

/* ---------- background music ----------
   One quiet loop (scripts/make-music.py), in the same key as the merge notes.
   It fades in and out instead of starting or stopping dead, and drops to a
   murmur on the pause screen. */

const MUSIC_LEVEL = 0.35;
let dimmed = false;

function syncMusic() {
  getMusic().setVolume(musicOn ? (dimmed ? MUSIC_LEVEL * 0.35 : MUSIC_LEVEL) : 0, 600);
}

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
export function play(name: SoundName) {
  kickMusic();
  if (!soundOn) return;
  init();
  const v = pool.get(name);
  if (!v) return;
  const p = v.players[v.next];
  v.next = (v.next + 1) % VOICES;
  try {
    p.seekTo(0);
    p.play();
  } catch {
    // Sound is a garnish: a failed play never reaches the game.
  }
}

const canBuzz = Platform.OS === 'ios' || Platform.OS === 'android';
const buzz = (f: () => Promise<void>) => {
  if (hapticsOn && canBuzz) f().catch(() => {});
};

/** Merge result value to the rung whose note it plays: 3 → 3 … 96 and up → 8. */
const rungOf = (v: number) => Math.max(3, Math.min(8, v < 3 ? 3 : 3 + Math.round(Math.log2(v / 3))));

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
  invalid: () => {
    play('invalid');
    buzz(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
  },
  /** One merge producing `value`. */
  merge: (value: number) => {
    const r = rungOf(value);
    play(`merge-${r}` as SoundName);
    buzz(() => Haptics.impactAsync(r >= 6 ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Soft));
  },
  /** A chain: each step one beat after the last, so it climbs audibly. */
  cascade: (values: number[], beat = 120) => {
    values.forEach((v, k) => setTimeout(() => fx.merge(v), k * beat));
  },
  sweep: () => {
    play('sweep');
    buzz(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft));
  },
  tray: () => play('tray'),
  win: () => {
    play('win');
    buzz(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  },
  over: () => {
    play('over');
    buzz(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
  },
  /* UI */
  tap: () => play('tap'),
  toggle: (on: boolean) => {
    play(on ? 'toggle-on' : 'toggle-off');
    buzz(() => Haptics.selectionAsync());
  },
};
