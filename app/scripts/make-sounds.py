"""Synthesise every Blockhaus sound. No samples, no third-party assets.

    python3 scripts/make-sounds.py      # writes assets/sounds/*.wav

The palette follows the board: glossy plastic blocks on a plastic plate
(2026-11-08). Placing is a short plastic thud, a triangle wave falling in
pitch with a puff of band-passed noise for the contact; heavier pieces sit
lower. Keys are a bright plastic click. Merges, milestones, the win and
game over belong to the music and live in scripts/music/make-stings.py. A new tray is
one soft pop. Everything is short and quiet: a puzzle you play for an hour
must not tire the ear.
"""
import os
import sys
import wave

import numpy as np

SR = 44100
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'sounds')
rng = np.random.default_rng(7)


def t(d):
    return np.arange(int(SR * d)) / SR


def env(d, attack=0.003, decay=0.1):
    x = t(d)
    a = np.clip(x / attack, 0, 1)
    return a * np.exp(-x / decay)


def modes(freqs, amps, decays, d, attack=0.002):
    x = t(d)
    out = np.zeros_like(x)
    for f, a, k in zip(freqs, amps, decays):
        out += a * np.sin(2 * np.pi * f * x + rng.uniform(0, 6.28)) * np.exp(-x / k)
    return out * np.clip(x / attack, 0, 1)


def lowpass(x, cutoff):
    """One-pole low-pass; cutoff may be a scalar or an array per sample."""
    c = np.broadcast_to(np.asarray(cutoff, dtype=float), x.shape)
    a = np.exp(-2 * np.pi * c / SR)
    y = np.zeros_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc = (1 - a[i]) * x[i] + a[i] * acc
        y[i] = acc
    return y


def highpass(x, cutoff):
    return x - lowpass(x, cutoff)


def noise(d):
    return rng.standard_normal(int(SR * d))


def pad(x, tail=0.02):
    return np.concatenate([x, np.zeros(int(SR * tail))])


def fade_out(x, d=0.01):
    n = min(len(x), int(SR * d))
    x = x.copy()
    x[-n:] *= np.linspace(1, 0, n)
    return x


def layer(a, b, delay=0.0, gain=1.0):
    """Mix b into a, starting `delay` seconds in; the result is as long as needed."""
    i = int(SR * delay)
    n = max(len(a), i + len(b))
    out = np.zeros(n)
    out[: len(a)] += a
    out[i : i + len(b)] += gain * b
    return out


def write(name, x, peak=0.5):
    if ONLY and not any(name.startswith(o) for o in ONLY):
        return
    x = fade_out(pad(x))
    x = x / (np.max(np.abs(x)) + 1e-9) * peak
    data = (x * 32767).astype('<i2')
    with wave.open(os.path.join(OUT, name + '.wav'), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


# ---------- the two voices of the sandbox ----------

def osc(kind, f0, f1, d, vol, delay=0.0):
    """An oscillator gliding exponentially from f0 to f1 over d, 3 ms attack, exponential decay."""
    x = t(d + 0.02)
    f = f0 * (f1 / f0) ** np.clip(x / d, 0, 1)
    ph = 2 * np.pi * np.cumsum(f) / SR
    if kind == 'triangle':
        w = 2 / np.pi * np.arcsin(np.sin(ph))
    else:
        w = np.sin(ph)
    g = np.where(x < 0.003, x / 0.003 * vol, vol * (0.0001 / vol) ** np.clip((x - 0.003) / (d - 0.003), 0, 1))
    return layer(np.zeros(0), w * g, delay)


def biquad_bandpass(x, f, q):
    w0 = 2 * np.pi * f / SR
    al = np.sin(w0) / (2 * q)
    b0, b2 = al, -al
    a0, a1, a2 = 1 + al, -2 * np.cos(w0), 1 - al
    y = np.zeros_like(x)
    x1 = x2 = y1 = y2 = 0.0
    for i in range(len(x)):
        y0 = (b0 * x[i] + b2 * x2 - a1 * y1 - a2 * y2) / a0
        x2, x1, y2, y1 = x1, x[i], y1, y0
        y[i] = y0
    return y


def burst(d, f, q, vol, delay=0.0):
    """White noise fading out linearly over d, through a band-pass at f."""
    n = int(SR * d)
    x = rng.uniform(-1, 1, n) * (1 - np.arange(n) / n)
    return layer(np.zeros(0), biquad_bandpass(x, f, q) * vol, delay)


def mix(*parts):
    out = np.zeros(0)
    for p in parts:
        out = layer(out, p)
    return out


def thud(h=1.0):
    """A plastic block set down; h is its weight, 1 for 1s and 2s."""
    return mix(osc('triangle', 320 / h, 150 / h, 0.07 * h, 0.22), burst(0.035, 1900 / h, 0.8, 0.22))


def click():
    return mix(burst(0.015, 5200, 2, 0.35), osc('triangle', 1400, 1100, 0.03, 0.08))


def note(i):
    """Degree i of the C major pentatonic from C5."""
    semi = 12 * (i // 5) + [0, 2, 4, 7, 9][i % 5]
    return 523.25 * 2 ** (semi / 12)


def tone(f, d=0.5, vol=0.2):
    return mix(osc('sine', f, f, d, vol), osc('sine', f * 2, f * 2, d * 0.24, vol * 0.25))


def slide(d, h=1.0):
    """Plastic skidding on plastic, speeding up: band-passed noise whose band
    climbs as it swells (t squared), over a faint rising hum; a 3 ms cut at
    the end so the knock lands on silence."""
    n = int(SR * d)
    k = np.arange(n) / n
    x = rng.uniform(-1, 1, n)
    out = np.zeros(n)
    # The band climbs in steps of 10 ms so a fixed biquad can follow it.
    seg = int(SR * 0.01)
    for a in range(0, n, seg):
        f = (600 + 1300 * (a / n) ** 1.5) / h
        out[a:a + seg] = biquad_bandpass(x[max(0, a - 256):a + seg], f, 1.1)[-len(out[a:a + seg]):]
    g = 0.04 + 0.96 * k ** 2
    tail = np.minimum(1, (n - np.arange(n)) / (SR * 0.003))
    hum = osc('triangle', 70 / h, 120 / h, d, 0.08)[:n]
    hum = hum * (0.2 + 0.8 * k) * tail
    return out * g * tail * 0.5 + hum


def knock(h=1.0, vol=1.0):
    """A block hitting the board's wall: a hard click and a short hollow body."""
    return mix(burst(0.018, 2600 / h, 1.4, 0.4 * vol), osc('triangle', 240 / h, 120 / h, 0.06 * h, 0.26 * vol))


def mallet(f, d=0.45, vol=0.22):
    """A small plastic mallet on a tuned bar: the note, a quick fourth
    partial for the strike, and a whisper of the tenth."""
    return modes([f, f * 3.98, f * 9.9], [vol, vol * 0.32, vol * 0.08], [d * 0.45, 0.04, 0.012], d)


LESSON_FIGURES = [[0, 2], [1, 3], [2, 4], [3, 5], [4, 6], [5, 7]]
"""Each lesson step closes on a two-note figure, a step higher than the last
(pentatonic degrees from C5); the end of the lessons plays them all as one
phrase and lands on a chord."""


def figure(degs, beat=0.11):
    out = np.zeros(0)
    for k, i in enumerate(degs):
        out = layer(out, mallet(note(i), 0.6 if k == len(degs) - 1 else 0.4), beat * k)
    return out


ONLY = set(sys.argv[1:])


def main():
    os.makedirs(OUT, exist_ok=True)

    # Placing: the plastic thud, a touch heavier for a bigger piece.
    write('place-1', thud(1.0), 0.55)
    write('place-2', thud(1.08), 0.6)
    write('place-3', thud(1.16), 0.65)

    # Picking up: a short breath of noise.
    write('pick', burst(0.05, 1800, 1.2, 0.12), 0.3)

    # Dropped where it does not fit: the repelling magnet, two low pushes.
    write('invalid', mix(osc('sine', 110, 80, 0.12, 0.25), osc('sine', 110, 80, 0.1, 0.18, 0.07)), 0.4)

    # Merges and milestones are played by the music's band now:
    # scripts/music/make-stings.py (vibraphone, FluidR3_GM).

    # Sweep, in two halves on the frames of the animation. The slide plays on
    # release: the blocks accelerate for 200 ms (ease-in), so the skid swells
    # and climbs instead of fading, and stops dead where the knock takes over.
    # sweep-1 for a few blocks, sweep-2 for many.
    write('sweep-1', slide(0.19, 1.0), 0.32)
    write('sweep-2', slide(0.19, 1.25), 0.4)
    # The knock at the wall, on the frame the blocks arrive (with the board's
    # 2 px bump): a hard plastic clack with a short body. More blocks hit a
    # hair apart, so the heavier ones are a flam, lower and fuller.
    write('knock-1', knock(1.0), 0.5)
    write('knock-2', mix(knock(1.12), layer(np.zeros(0), knock(1.2, 0.6), 0.009)), 0.58)
    write('knock-3', mix(knock(1.25), layer(np.zeros(0), knock(1.35, 0.7), 0.008), layer(np.zeros(0), knock(1.3, 0.5), 0.017)), 0.65)

    # A fresh tray: one soft pop.
    write('tray', osc('triangle', 520, 820, 0.07, 0.1), 0.25)

    # Keys: the plastic click, and two for a switch.
    write('tap', click(), 0.2)
    write('toggle-on', mix(click(), layer(np.zeros(0), osc('triangle', 1400, 1900, 0.04, 0.08), 0.03)), 0.22)
    write('toggle-off', mix(click(), layer(np.zeros(0), osc('triangle', 1400, 1000, 0.04, 0.08), 0.03)), 0.22)

    # Win and game over: scripts/music/make-stings.py.

    # ---- the lessons' voice (2026-11-09) ----
    # A held piece over a cell beside its partner: the partner hums, a soft
    # rising "mm" (played at the partner's pitch by rate).
    write('hum', mix(osc('sine', note(0) * 0.98, note(0) * 1.02, 0.2, 0.18), osc('sine', note(0) * 2, note(0) * 2.03, 0.08, 0.04)), 0.28)
    # Beside a like pole: two quick low pushes, softer than a refusal.
    write('repel', mix(osc('triangle', 150, 120, 0.05, 0.2), osc('triangle', 150, 120, 0.045, 0.14, 0.055)), 0.3)
    # A tile popping up onto the lesson board: a short rising boop.
    write('boop', mix(osc('triangle', 420, 760, 0.07, 0.16), burst(0.012, 3800, 2, 0.12)), 0.32)
    # The plate growing a ring: a quick ratchet of plastic clicks, climbing.
    out = np.zeros(0)
    for k in range(5):
        out = layer(out, mix(burst(0.012, 3000 + 400 * k, 2, 0.3), osc('triangle', 900 + 120 * k, 800 + 120 * k, 0.02, 0.06)), 0.045 * k)
    out = layer(out, thud(1.3), 0.24)
    write('grow', out, 0.4)
    # A step proved, and the whole phrase at the end.
    for k, degs in enumerate(LESSON_FIGURES):
        write(f'step-{k}', figure(degs), 0.45)
    out = np.zeros(0)
    tk = 0.0
    for degs in LESSON_FIGURES:
        out = layer(out, figure(degs, 0.075), tk)
        tk += 0.16
    for i in [5, 7, 9]:
        out = layer(out, mallet(note(i), 1.1, 0.18), tk + 0.06)
    write('learned', out, 0.5)
    # An earned stud on a full key: it taps the key (a muted plastic tick)
    # and melts away as two high bars stepping down, softer than a stud
    # clicking home (toggle-on), so "kept" and "no room" never sound alike.
    out = mix(burst(0.01, 4200, 2, 0.18), osc('triangle', 1100, 900, 0.025, 0.05))
    out = layer(out, mallet(note(9), 0.35, 0.12), 0.03)
    out = layer(out, mallet(note(7), 0.5, 0.09), 0.13)
    write('full', out, 0.32)

    # The end of a long chain (2026-11-09): a low slam under the last note.
    # A sub drop and a plastic crack, with C and G an octave down so it sits
    # in the key; heavier and longer for a chain of 4, and of 5 and more.
    for k, h in enumerate([1.0, 1.25, 1.5]):
        boom = osc('sine', 120 / h, 42 / h, 0.22 * h, 0.5)
        crack = mix(burst(0.03, 1500 / h, 0.9, 0.35), knock(1.2 * h, 0.8))
        body = mix(mallet(note(0) / 2, 0.5 * h, 0.16), layer(np.zeros(0), mallet(note(3) / 2, 0.5 * h, 0.12), 0.01))
        write(f'slam-{k + 1}', mix(boom, crack, body), 0.5 + 0.08 * k)


if __name__ == '__main__':
    main()
