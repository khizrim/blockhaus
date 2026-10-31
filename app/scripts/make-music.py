"""Synthesise the background loop. Same rules as make-sounds.py: numpy only.

    python3 scripts/make-music.py      # writes assets/sounds/music.wav

A slow, quiet loop in C major pentatonic, so every merge note (C5 up to C6)
lands in key on top of it. It lives an octave below the merges: a felt-mallet
marimba plays a sparse figure in octave 4, a soft pad holds the chords and a
round sine bass walks the roots. No drums: the player's own placements are
the rhythm. Eight bars of four chords, twice, with the second pass varied,
rendered circularly so the end flows into the start without a seam.
"""
import os
import wave

import numpy as np

SR = 22050  # the loop has nothing above 8 kHz; half rate keeps the file small
BPM = 72
BEAT = 60 / BPM
BARS = 16
LEN = int(SR * BEAT * 4 * BARS)
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'sounds', 'music.wav')
rng = np.random.default_rng(42)


def hz(semis_from_c4):
    return 261.63 * 2 ** (semis_from_c4 / 12)


def put(buf, sig, at):
    """Add sig into the circular buffer at sample `at`, wrapping the tail."""
    i = int(at) % LEN
    n = len(sig)
    first = min(n, LEN - i)
    buf[i : i + first] += sig[:first]
    if n > first:
        put(buf, sig[first:], 0)


def tt(d):
    return np.arange(int(SR * d)) / SR


def marimba(f, d=1.6, vel=1.0):
    x = tt(d)
    s = np.sin(2 * np.pi * f * x) * np.exp(-x / 0.45)
    s += 0.18 * np.sin(2 * np.pi * f * 3.99 * x) * np.exp(-x / 0.08)
    s *= np.clip(x / 0.006, 0, 1)
    return vel * s


def pad(freqs, d, vel=1.0):
    """Detuned sines with a slow swell and release: a soft organ-like bed."""
    x = tt(d)
    s = np.zeros_like(x)
    for f in freqs:
        for det in (-0.12, 0.12):
            ff = f * 2 ** (det / 12)
            s += np.sin(2 * np.pi * ff * x + rng.uniform(0, 6.28))
            s += 0.15 * np.sin(2 * np.pi * 2 * ff * x)
    att, rel = 1.2, 1.6
    e = np.clip(x / att, 0, 1) * np.clip((d - x) / rel, 0, 1)
    return vel * s * e / len(freqs)


def bass(f, d, vel=1.0):
    x = tt(d)
    s = np.sin(2 * np.pi * f * x) + 0.2 * np.sin(2 * np.pi * 2 * f * x)
    e = np.clip(x / 0.04, 0, 1) * np.exp(-x / 1.6) * np.clip((d - x) / 0.2, 0, 1)
    return vel * s * e


# Chords, as semitones from C4, two bars each: C6/9, Am7, Fmaj9, Dm7, then a
# variation that turns on G (sus, no B, to stay inside the pentatonic merges).
CHORDS = [
    (0, [0, 4, 7, 9, 14]),     # C6/9
    (-3, [-3, 0, 4, 7]),       # Am7
    (-7, [-7, -3, 0, 4, 7]),   # Fmaj9 (F A C E G)
    (-10, [-10, -7, -3, 0]),   # Dm7 (D F A C)
    (0, [0, 4, 7, 9, 14]),     # C6/9
    (-3, [-3, 0, 4, 7, 9]),    # Am7 add 9 colour
    (-7, [-7, -3, 0, 4, 7]),   # Fmaj9
    (-5, [-5, 0, 2, 7]),       # G sus (G C D G)
]
PENT4 = [0, 2, 4, 7, 9]  # C D E G A in octave 4


def main():
    buf = np.zeros(LEN)
    bar = BEAT * 4
    for k, (root, tones) in enumerate(CHORDS):
        t0 = k * 2 * bar * SR
        d = 2 * bar + 1.0  # overlaps into the next chord; the release wraps
        put(buf, pad([hz(s) for s in tones], d, 0.22), t0)
        put(buf, bass(hz(root - 12), bar * 0.95, 0.5), t0)
        put(buf, bass(hz(root - 12 + (7 if k % 2 == 0 else 0)), bar * 0.95, 0.35), t0 + bar * SR)

        # The mallet figure: chord tones and pentatonic neighbours on eighth
        # notes, about half of them sounding, softer off the beat.
        pool = sorted({s % 12 for s in tones} & set(PENT4)) or PENT4
        second = k >= 4
        for step in range(16):
            beat_on = step % 2 == 0
            p = 0.55 if beat_on else 0.3
            if second:
                p += 0.1
            if rng.random() > p:
                continue
            pc = pool[rng.integers(len(pool))]
            octave = 0 if rng.random() < 0.8 else 12
            f = hz(pc + octave)
            vel = (0.32 if beat_on else 0.2) * rng.uniform(0.85, 1.1)
            swing = 0 if beat_on else 0.04 * BEAT
            put(buf, marimba(f, vel=vel), t0 + (step * BEAT / 2 + swing) * SR)

    # Gentle low-pass for warmth.
    a = np.exp(-2 * np.pi * 3500 / SR)
    y = np.zeros_like(buf)
    acc = 0.0
    for _ in range(2):  # run twice so the filter state at the seam is settled
        for i in range(LEN):
            acc = (1 - a) * buf[i] + a * acc
            y[i] = acc
    y -= y.mean()
    y = y / np.max(np.abs(y)) * 0.6
    with wave.open(OUT, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((y * 32767).astype('<i2').tobytes())
    print(f'{LEN / SR:.1f}s, {os.path.getsize(OUT) // 1024} KB')


if __name__ == '__main__':
    main()
