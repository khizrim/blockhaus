import { Asset } from 'expo-asset';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { Platform } from 'react-native';

/* The background loop, without a seam.

   music.wav is LOOP seconds of music plus the first TAIL seconds again
   (scripts/make-music.py). Media players leave a small gap when they wrap a
   file, so the file is never wrapped:

   - On the web, Web Audio loops the first LOOP seconds of the decoded buffer
     sample-exactly.
   - On the phone, two players take turns: one starts from the top as the
     other reaches LOOP, and over the TAIL, where both play the same notes,
     one fades out while the other fades in. */

const SRC = require('../../assets/sounds/music.wav');
const BPM = 72;
const LOOP = (16 * 4 * 60) / BPM; // 16 bars of 4/4
const TAIL = 2;

type Music = { setVolume: (v: number, ms: number) => void; stop: () => void; resume: () => void };

/* ---------- web: Web Audio ---------- */

let ctxCache: AudioContext | null | undefined;
/** The page's one audio context, shared by the music and the sounds. Null
    where the browser has none. */
export function webAudio(): AudioContext | null {
  if (ctxCache !== undefined) return ctxCache;
  const g = globalThis as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext; navigator?: { audioSession?: { type: string } } };
  // Safari 17+: an ambient session obeys the silent switch and mixes with
  // the player's own music, the way the app's audio mode does on the phone.
  try {
    if (g.navigator?.audioSession) g.navigator.audioSession.type = 'ambient';
  } catch {}
  const AC = g.AudioContext ?? g.webkitAudioContext;
  ctxCache = AC ? new AC() : null;
  return ctxCache;
}

/** A bundled sound's bytes. A packed single-file build carries it as a data
    URI; that is decoded by hand, since a sandboxed page may not fetch data URIs. */
export async function soundBytes(module: number): Promise<ArrayBuffer> {
  const uri = Asset.fromModule(module).uri;
  if (uri.startsWith('data:')) {
    const bin = atob(uri.slice(uri.indexOf(',') + 1));
    const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u.buffer;
  }
  return (await fetch(uri)).arrayBuffer();
}

function webMusic(): Music {
  const ctx = webAudio();
  if (!ctx) return { setVolume: () => {}, stop: () => {}, resume: () => {} };
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(ctx.destination);
  let src: AudioBufferSourceNode | null = null;
  let buffer: AudioBuffer | null = null;
  let wanted = false;

  const start = async () => {
    if (src || !wanted) return;
    if (!buffer) buffer = await ctx.decodeAudioData(await soundBytes(SRC));
    if (src || !wanted) return;
    src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.loopStart = 0;
    src.loopEnd = LOOP;
    src.connect(gain);
    src.start();
  };

  return {
    setVolume: (v, ms) => {
      if (v > 0) {
        wanted = true;
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
        start().catch(() => {});
      }
      gain.gain.cancelScheduledValues(ctx.currentTime);
      gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(v, ctx.currentTime + ms / 1000);
      if (v === 0) {
        wanted = false;
        const s = src;
        setTimeout(() => {
          if (!wanted && s) {
            s.stop();
            if (src === s) src = null;
          }
        }, ms + 50);
      }
    },
    stop: () => {
      wanted = false;
      src?.stop();
      src = null;
    },
    // Browsers keep audio suspended until a tap; every tap tries again.
    resume: () => {
      if (wanted && ctx.state === 'suspended') ctx.resume().catch(() => {});
    },
  };
}

/* ---------- phone: two players, crossfaded over the tail ---------- */

function nativeMusic(): Music {
  const players: AudioPlayer[] = [createAudioPlayer(SRC), createAudioPlayer(SRC)];
  players.forEach((p) => (p.volume = 0));
  let level = 0; // the music's overall level, faded by setVolume
  let cur = 0; // which player carries the music now
  let mix = [1, 0]; // each player's share, for the crossfade
  let turn: ReturnType<typeof setTimeout> | null = null;
  let tick: ReturnType<typeof setInterval> | null = null;
  let fade: ReturnType<typeof setInterval> | null = null;
  let running = false;

  const apply = () => players.forEach((p, k) => (p.volume = level * mix[k]));

  const schedule = () => {
    turn = setTimeout(() => {
      if (!running) return;
      const next = 1 - cur;
      const a = players[cur];
      const b = players[next];
      b.seekTo(0);
      b.play();
      const t0 = Date.now();
      if (fade) clearInterval(fade);
      fade = setInterval(() => {
        const k = Math.min(1, (Date.now() - t0) / (TAIL * 1000));
        // Equal power: the sum stays level through the fade.
        mix[cur] = Math.cos((k * Math.PI) / 2);
        mix[next] = Math.sin((k * Math.PI) / 2);
        apply();
        if (k === 1) {
          if (fade) clearInterval(fade);
          fade = null;
          a.pause();
          cur = next;
        }
      }, 30);
      schedule();
    }, LOOP * 1000);
  };

  const begin = () => {
    if (running) return;
    running = true;
    cur = 0;
    mix = [1, 0];
    players[0].seekTo(0);
    players[0].play();
    schedule();
  };

  const end = () => {
    running = false;
    if (turn) clearTimeout(turn);
    // A crossfade cut short must not keep steering the volumes of the next start.
    if (fade) clearInterval(fade);
    fade = null;
    players.forEach((p) => p.pause());
  };

  return {
    setVolume: (v, ms) => {
      if (v > 0) begin();
      if (tick) clearInterval(tick);
      const from = level;
      const t0 = Date.now();
      tick = setInterval(() => {
        const k = Math.min(1, (Date.now() - t0) / ms);
        level = from + (v - from) * k;
        apply();
        if (k === 1) {
          if (tick) clearInterval(tick);
          if (v === 0) end();
        }
      }, 30);
    },
    stop: end,
    resume: () => {},
  };
}

let music: Music | null = null;
export function getMusic(): Music {
  if (!music) music = Platform.OS === 'web' ? webMusic() : nativeMusic();
  return music;
}
