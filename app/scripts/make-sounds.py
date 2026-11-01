"""Synthesise every Blockhaus sound. No samples, no third-party assets.

    python3 scripts/make-sounds.py      # writes assets/sounds/*.wav

The palette follows the board: physical blocks of painted wood. Placing,
picking up and sweeping are wood (short inharmonic modes, a puff of noise for
the contact). Merges are a tuned mallet, a soft marimba, that climbs the major
pentatonic one step per rung, so a cascade audibly goes up a staircase. The
win plays the whole ladder; game over steps down two notes. Everything is
short, soft at the attack and quiet: a puzzle you play for an hour must not
tire the ear.
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


# ---------- wood ----------

def knock(f0, d=0.16, bright=1.0):
    """A block of wood set down on wood: low body modes plus a contact click."""
    body = modes([f0, f0 * 2.31, f0 * 3.9, f0 * 5.6], [1, 0.5 * bright, 0.25 * bright, 0.1 * bright], [0.05, 0.025, 0.012, 0.007], d)
    click = lowpass(highpass(noise(d), 1500), 3500) * env(d, 0.0005, 0.004) * 0.3 * bright
    return lowpass(lowpass(body + click, 4000), 5000)


def tick(f0, d=0.06):
    """A light tap: the piece leaving the tray, a button."""
    body = modes([f0, f0 * 2.7], [1, 0.35], [0.012, 0.006], d, attack=0.0008)
    click = lowpass(highpass(noise(d), 2000), 4500) * env(d, 0.0003, 0.002) * 0.2
    return lowpass(body + click, 6000)


# ---------- mallet ----------

def marimba(f, d=0.7, soft=1.0):
    """A soft marimba bar: fundamental, the 4th partial a bar is tuned to, a
    faint 10th, and a felt-mallet thump."""
    x = modes([f, f * 3.99, f * 9.9], [1, 0.22 * soft, 0.05 * soft], [0.28, 0.06, 0.02], d, attack=0.004)
    thump = lowpass(noise(d), 900) * env(d, 0.001, 0.008) * 0.25
    return x + thump


def note(semis_from_c5):
    return 523.25 * 2 ** (semis_from_c5 / 12)


# Major pentatonic from C5, one step per rung. Rung 3 (the first merge, 1+2)
# is C5; 96, rung 8, is C6 an octave above; 192 steps on to D6, 384 to E6
# and 768 to G6.
PENT = [0, 2, 4, 7, 9, 12, 14, 16, 19]
RUNG_NOTE = {r: note(PENT[r - 3]) for r in range(3, 12)}


ONLY = set(sys.argv[1:])


def main():
    os.makedirs(OUT, exist_ok=True)

    # Placing: the wood knock. Three sizes so a three-cell piece sounds a
    # touch heavier than a single cell.
    write('place-1', knock(330, bright=1.0), 0.55)
    write('place-2', layer(knock(280, bright=0.9), knock(300, bright=0.6), 0.012, 0.4), 0.6)
    write('place-3', layer(knock(230, d=0.2, bright=0.85), knock(260, bright=0.5), 0.016, 0.4), 0.65)

    # Picking up: a light upward tick.
    write('pick', tick(1100) + 0.5 * tick(1500), 0.3)

    # Dropped where it does not fit: two muffled low taps, never a buzzer.
    d = 0.2
    a = lowpass(knock(180, d=d, bright=0.3), 1200)
    write('invalid', layer(a, lowpass(knock(160, d=d, bright=0.3), 1000), 0.075, 0.8), 0.4)

    # Merges, one per rung the merge produces.
    for r in range(3, 12):
        write(f'merge-{r}', marimba(RUNG_NOTE[r]), 0.5)

    # A milestone (a new best of 24, rung 6, and up): the rung's note struck with its
    # octave and fifth a beat apart, like a bell, then a soft held shimmer.
    for r in range(6, 12):
        f = RUNG_NOTE[r]
        out = np.zeros(int(SR * 1.3))
        out = layer(out, marimba(f, 0.9) * 0.8, 0.0)
        out = layer(out, marimba(f * 1.5, 0.8) * 0.5, 0.07)
        out = layer(out, marimba(f * 2, 0.9) * 0.55, 0.14)
        bell = modes([f * 2, f * 2 * 2.76], [0.25, 0.06], [0.9, 0.3], 1.1, attack=0.01)
        out = layer(out, bell, 0.14)
        write(f'milestone-{r}', out, 0.5)

    # Sweep: the board slides on felt. Band-limited noise with a falling
    # cutoff, then a knock as it settles.
    d = 0.24
    x = t(d)
    cut = 2200 * np.exp(-x / 0.08) + 250
    sweep = lowpass(lowpass(highpass(noise(d), 200), cut), cut) * np.sin(np.pi * np.clip(x / d, 0, 1)) ** 0.6
    write('sweep', layer(sweep * 0.8, knock(240, d=0.12, bright=0.5), 0.16, 0.6), 0.4)

    # A fresh tray: three quick ticks, rising.
    out = np.zeros(int(SR * 0.22))
    for k, f in enumerate([700, 850, 1000]):
        s = tick(f, 0.06)
        out = layer(out, s, 0.055 * k)
    write('tray', out, 0.25)

    # UI: a quiet paper tap for buttons, and two for a switch.
    write('tap', lowpass(tick(1400, 0.04), 5000), 0.18)
    write('toggle-on', layer(tick(1200, 0.05), tick(1600, 0.05), 0.03, 0.6), 0.2)
    write('toggle-off', layer(tick(1600, 0.05), tick(1200, 0.05), 0.03, 0.6), 0.2)

    # Win: the ladder, rung by rung, then the top note and its fifth held.
    total = 2.0
    out = np.zeros(int(SR * total))
    for k, r in enumerate(range(3, 9)):
        s = marimba(RUNG_NOTE[r], 0.5) * 0.7
        out = layer(out, s, 0.09 * k)
    i = int(SR * 0.09 * 6 + 0.05 * SR)
    for f, a in [(RUNG_NOTE[9], 1.0), (RUNG_NOTE[9] * 1.5, 0.5), (RUNG_NOTE[9] / 2, 0.45)]:
        s = modes([f, f * 3.99], [a, 0.15 * a], [0.6, 0.1], total - i / SR, attack=0.005)
        out = layer(out, s, i / SR)
    write('win', out, 0.55)

    # Game over: two soft notes stepping down, no drama.
    out = np.zeros(int(SR * 1.2))
    for k, f in enumerate([note(4), note(-3)]):
        s = marimba(f, 0.9, soft=0.6) * (1 - 0.2 * k)
        out = layer(out, s, 0.22 * k)
    write('over', lowpass(out, 3000), 0.45)


if __name__ == '__main__':
    main()
