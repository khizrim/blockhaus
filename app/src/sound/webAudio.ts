/* One Web Audio context for the whole page, shared by the music and the
   sound effects (web only).

   The effects used to be one HTML <audio> element per voice, a hundred of
   them. Safari on the iPhone loads such an element only when it is played,
   and starting one blocks the page for a moment, so every merge note came
   late and the board stuttered under it. Web Audio plays a decoded buffer
   on the audio thread: on time, and free for the page. */

type Ctx = AudioContext;

let ctx: Ctx | null | undefined;

/** The page's audio context, or null where the browser has none. */
export function audioContext(): Ctx | null {
  if (ctx !== undefined) return ctx;
  const g = globalThis as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext; navigator?: { audioSession?: { type: string } } };
  const AC = g.AudioContext ?? g.webkitAudioContext;
  if (!AC) return (ctx = null);
  // The game is a quiet puzzle: like the app, it follows the silent switch
  // and mixes with the player's own music instead of stopping it (Safari 17+).
  try {
    if (g.navigator?.audioSession) g.navigator.audioSession.type = 'ambient';
  } catch {
    // Not every browser lets the page choose.
  }
  ctx = new AC();
  /* Browsers keep audio suspended until the player touches the page. Every
     touch tries again, so the first sound after a tap is never lost. */
  const wake = () => {
    if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
  };
  if (typeof document !== 'undefined') {
    for (const e of ['pointerdown', 'touchend', 'keydown']) document.addEventListener(e, wake, { capture: true, passive: true });
  }
  return ctx;
}

/** The bytes of a bundled asset, also when a packed build inlines it as a data URI. */
export async function assetBytes(uri: string): Promise<ArrayBuffer> {
  // A packed single-file build carries the sound as a data URI; decode it
  // by hand, since a sandboxed page may not fetch data URIs.
  if (uri.startsWith('data:')) {
    const bin = atob(uri.slice(uri.indexOf(',') + 1));
    const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u.buffer;
  }
  return (await fetch(uri)).arrayBuffer();
}

/** decodeAudioData, also in old Safari, which only has the callback form. */
export function decode(c: Ctx, bytes: ArrayBuffer): Promise<AudioBuffer> {
  return new Promise((res, rej) => {
    const p = c.decodeAudioData(bytes, res, rej) as Promise<AudioBuffer> | undefined;
    if (p && typeof p.then === 'function') p.then(res, rej);
  });
}
