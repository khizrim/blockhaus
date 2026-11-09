"""Shared synthesis engine for Blockhaus background loops (numpy only).

Everything renders into a circular stereo buffer: a note that runs past the
end wraps to the start, and the reverb and tone filter are circular FFT
operations, so the loop has no seam at all.
"""
import numpy as np

SR = 44100


def hz(s):
    """Semitones from C4."""
    return 261.63 * 2 ** (s / 12)


def tt(d):
    return np.arange(int(SR * d)) / SR


class Loop:
    def __init__(self, seconds, seed=1):
        self.n = int(round(seconds * SR))
        self.buf = np.zeros((2, self.n))
        self.rng = np.random.default_rng(seed)

    def put(self, sig, at, pan=0.0, gain=1.0):
        """Add a mono sig at time `at` (s), equal-power pan -1..1, wrapping."""
        l = np.cos((pan + 1) * np.pi / 4) * gain
        r = np.sin((pan + 1) * np.pi / 4) * gain
        i = int(round(at * SR)) % self.n
        n = len(sig)
        pos = 0
        while pos < n:
            take = min(n - pos, self.n - i)
            self.buf[0, i:i + take] += l * sig[pos:pos + take]
            self.buf[1, i:i + take] += r * sig[pos:pos + take]
            pos += take
            i = 0

    def put2(self, sig2, at, gain=1.0):
        i = int(round(at * SR)) % self.n
        n = sig2.shape[1]
        pos = 0
        while pos < n:
            take = min(n - pos, self.n - i)
            self.buf[:, i:i + take] += gain * sig2[:, pos:pos + take]
            pos += take
            i = 0


# ---------------------------------------------------------------- instruments

def felt_piano(f, d=4.0, vel=0.6, rng=None):
    """Soft felt piano: inharmonic partials in string pairs, brightness by
    velocity, two-stage decay, and a muted hammer thump."""
    rng = rng or np.random.default_rng()
    x = tt(d)
    B = 0.00035
    out = np.zeros_like(x)
    bright = 0.35 + 0.65 * vel
    base = 2.2 * (261.63 / f) ** 0.45  # low notes ring longer
    for n in range(1, 13):
        fn = f * n * np.sqrt(1 + B * n * n)
        if fn > 9000:
            break
        a = (1 / n ** 1.4) * np.exp(-(n - 1) * (1.1 - bright) * 0.9)
        k_fast = 0.25 / n ** 0.5
        k_slow = base / (1 + 0.35 * (n - 1))
        e = 0.55 * np.exp(-x / k_fast) + 0.45 * np.exp(-x / k_slow)
        for det in (-0.6, 0.6):  # cents apart: the strings beat slowly
            ff = fn * 2 ** (det / 1200)
            out += 0.5 * a * e * np.sin(2 * np.pi * ff * x + rng.uniform(0, 6.28))
    # hammer: a short low thump of noise
    m = int(SR * 0.03)
    h = rng.standard_normal(m) * np.exp(-np.arange(m) / (SR * 0.006))
    h = np.convolve(h, np.ones(18) / 18, 'same')
    out[:m] += 0.06 * vel * h
    att = np.clip(x / (0.004 + 0.006 * (1 - vel)), 0, 1)
    rel = np.clip((d - x) / 0.3, 0, 1)
    return vel * out * att * rel


def epiano(f, d=3.0, vel=0.6, rng=None):
    """Two-operator FM electric piano: a mellow bar with a soft tine ping."""
    x = tt(d)
    idx = (0.4 + 1.6 * vel) * np.exp(-x / 0.35) + 0.15
    mod = idx * np.sin(2 * np.pi * f * x)
    s = np.sin(2 * np.pi * f * x + mod) * (0.6 * np.exp(-x / 0.6) + 0.4 * np.exp(-x / 2.4))
    s += 0.12 * vel * np.sin(2 * np.pi * f * 14 * x) * np.exp(-x / 0.025)
    att = np.clip(x / 0.003, 0, 1)
    rel = np.clip((d - x) / 0.25, 0, 1)
    return vel * s * att * rel


def glass(f, d=6.0, vel=0.5, rng=None):
    """A struck glass bowl: few inharmonic modes, long and pure."""
    rng = rng or np.random.default_rng()
    x = tt(d)
    ratios = [1.0, 2.32, 4.25, 6.63]
    amps = [1.0, 0.28, 0.1, 0.04]
    decs = [d * 0.42, d * 0.2, 0.6, 0.25]
    out = np.zeros_like(x)
    for r, a, k in zip(ratios, amps, decs):
        ff = f * r
        if ff > 10000:
            continue
        out += a * np.sin(2 * np.pi * ff * x + rng.uniform(0, 6.28)) * np.exp(-x / k)
        out += 0.4 * a * np.sin(2 * np.pi * (ff + 0.7) * x) * np.exp(-x / k)  # slow shimmer
    att = np.clip(x / 0.012, 0, 1)
    rel = np.clip((d - x) / 0.5, 0, 1)
    return vel * out * att * rel / 1.4


def kalimba(f, d=1.8, vel=0.5, rng=None):
    """A thumb-piano tine: the note, a bright overtone near 5.9x that dies at
    once, and a tiny tick of the thumb."""
    rng = rng or np.random.default_rng()
    x = tt(d)
    s = np.sin(2 * np.pi * f * x) * (0.5 * np.exp(-x / 0.18) + 0.5 * np.exp(-x / 0.9))
    s += 0.25 * np.sin(2 * np.pi * f * 5.92 * x) * np.exp(-x / 0.03)
    s += 0.08 * np.sin(2 * np.pi * f * 2.0 * x) * np.exp(-x / 0.25)
    m = int(SR * 0.004)
    s[:m] += 0.05 * rng.standard_normal(m)
    att = np.clip(x / 0.0015, 0, 1)
    rel = np.clip((d - x) / 0.2, 0, 1)
    return vel * s * att * rel


def pad(freqs, d, vel=0.5, attack=1.5, release=2.0, bright=0.5, rng=None):
    """Warm string-ish pad, stereo: detuned voices of soft harmonics with
    their own slow vibrato, swelling in and out. Returns (2, n)."""
    rng = rng or np.random.default_rng()
    x = tt(d)
    out = np.zeros((2, len(x)))
    for f in freqs:
        for v, det in enumerate((-7, 0, 7)):  # cents
            ch = v % 2 if det else None
            ff = f * 2 ** (det / 1200)
            vib = 0.0025 * np.sin(2 * np.pi * rng.uniform(0.15, 0.35) * x + rng.uniform(0, 6.28))
            phase = 2 * np.pi * ff * np.cumsum(1 + vib) / SR
            s = np.zeros_like(x)
            for n in range(1, 9):
                if ff * n > 6000:
                    break
                s += (bright ** (n - 1)) / n * np.sin(n * phase + rng.uniform(0, 6.28))
            if ch is None:
                out += 0.5 * s
            else:
                out[ch] += 0.8 * s
                out[1 - ch] += 0.2 * s
    e = np.clip(x / attack, 0, 1) ** 2 * np.clip((d - x) / release, 0, 1)
    return vel * out * e / (len(freqs) * 2)


def sub(f, d, vel=0.5):
    x = tt(d)
    s = np.sin(2 * np.pi * f * x) + 0.15 * np.sin(2 * np.pi * 2 * f * x)
    e = np.clip(x / 0.03, 0, 1) * (0.6 * np.exp(-x / 0.8) + 0.4 * np.exp(-x / 3.0)) * np.clip((d - x) / 0.25, 0, 1)
    return vel * s * e


def shaker(vel=0.1, rng=None):
    rng = rng or np.random.default_rng()
    n = int(SR * 0.06)
    s = rng.standard_normal(n)
    s = s - np.convolve(s, np.ones(6) / 6, 'same')  # keep the top
    x = np.arange(n) / SR
    return vel * s * np.clip(x / 0.008, 0, 1) * np.exp(-x / 0.018)


# ---------------------------------------------------------------- processing

def circ_reverb(buf, rt=2.8, wet=0.3, pre=0.02, damp=0.6, seed=3):
    """Circular convolution with a stereo noise tail whose highs die faster."""
    n = buf.shape[1]
    rng = np.random.default_rng(seed)
    ln = int(SR * rt * 1.6)
    x = np.arange(ln) / SR
    out = np.zeros_like(buf)
    for c in range(2):
        noise = rng.standard_normal(ln)
        spec = np.fft.rfft(noise)
        fr = np.fft.rfftfreq(ln, 1 / SR)
        # split into bands with their own decay
        ir = np.zeros(ln)
        edges = [0, 400, 1500, 4000, 22050]
        for b in range(4):
            mask = (fr >= edges[b]) & (fr < edges[b + 1])
            band = np.fft.irfft(spec * mask, ln)
            t60 = rt * (1 - damp * b / 4)
            ir += band * np.exp(-6.9 * x / t60)
        ir *= np.clip(x / 0.01, 0, 1)
        ir = np.concatenate([np.zeros(int(SR * pre)), ir])[:ln]
        ir /= np.sqrt((ir ** 2).sum())
        full = np.zeros(n)
        full[:ln] = ir
        out[c] = np.fft.irfft(np.fft.rfft(buf[c]) * np.fft.rfft(full), n)
    return buf * (1 - wet) + out * wet * 1.6


def circ_tone(buf, lo=40, hi=9000):
    """Gentle circular high-pass/low-pass shelf in the frequency domain."""
    n = buf.shape[1]
    fr = np.fft.rfftfreq(n, 1 / SR)
    g = 1 / np.sqrt(1 + (fr / hi) ** 4) * (1 / np.sqrt(1 + (lo / np.maximum(fr, 1)) ** 4))
    # a broad -3.5 dB dip around 220 Hz: less mud, so the phone speaker keeps the tune
    g *= 1 - 0.33 * np.exp(-0.5 * (np.log2(np.maximum(fr, 1) / 220) / 0.7) ** 2)
    return np.fft.irfft(np.fft.rfft(buf, axis=1) * g, n, axis=1)


def master(buf, rms=0.12):
    buf = buf - buf.mean(axis=1, keepdims=True)
    cur = np.sqrt((buf ** 2).mean())
    buf = buf * rms / cur
    # soft limiter for the odd peak
    return np.tanh(buf * 1.2) / 1.2


# ---------------------------------------------------------------- light band (v2)

def pluck(f, d=1.2, vel=0.5, bright=0.6, damp=0.996, rng=None):
    """Karplus-Strong string, computed a period at a time (vectorised).
    bright 0..1 sets how much of the top survives each pass."""
    rng = rng or np.random.default_rng()
    n = int(SR * d)
    P = max(2, int(round(SR / f)))
    k = max(1, int((1 - bright) * 8))
    exc = np.convolve(rng.uniform(-1, 1, P), np.ones(k) / k, 'same')
    a = 0.5 + 0.45 * bright  # weight of the newer sample: higher keeps the top
    y = np.zeros(n + 2 * P)
    y[1:P + 1] = exc
    i = P + 1
    while i < len(y):
        j = min(i + P, len(y))
        y[i:j] = damp * (a * y[i - P:j - P] + (1 - a) * y[i - P - 1:j - P - 1])
        i = j
    s = y[1:n + 1].copy()
    x = np.arange(n) / SR
    s *= np.clip((d - x) / 0.05, 0, 1)
    return vel * s / (np.abs(s).max() + 1e-9) * 0.8


def kick(vel=0.5):
    """A soft, short kick: felt more than heard, so it never eats the mix."""
    x = tt(0.2)
    f = 68 + 90 * np.exp(-x / 0.02)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x / 0.06)
    return 0.5 * vel * s * np.clip(x / 0.002, 0, 1)


def _bp_noise(d, lo, hi, rng):
    n = int(SR * d)
    s = rng.standard_normal(n)
    S = np.fft.rfft(s)
    fr = np.fft.rfftfreq(n, 1 / SR)
    S *= (fr > lo) & (fr < hi)
    return np.fft.irfft(S, n)


def snap(vel=0.3, rng=None):
    """A finger snap: a sharp band of noise and a tiny pitched body."""
    rng = rng or np.random.default_rng()
    x = tt(0.12)
    s = _bp_noise(0.12, 1800, 6000, rng) * np.exp(-x / 0.018)
    s += 0.3 * np.sin(2 * np.pi * 1400 * x) * np.exp(-x / 0.01)
    return vel * s * np.clip(x / 0.0008, 0, 1) / 2


def clap(vel=0.3, rng=None):
    rng = rng or np.random.default_rng()
    x = tt(0.25)
    base = _bp_noise(0.25, 700, 4500, rng)
    e = np.zeros_like(x)
    for k, o in enumerate([0, 0.009, 0.019, 0.03]):
        e += (x >= o) * np.exp(-np.maximum(x - o, 0) / (0.006 if k < 3 else 0.07))
    return vel * base * e / 3


def hat(vel=0.1, rng=None, d=0.05):
    rng = rng or np.random.default_rng()
    x = tt(d)
    return vel * _bp_noise(d, 6000, 15000, rng) * np.exp(-x / (d / 4)) / 1.5


def whistle(f, d=0.5, vel=0.4, rng=None):
    """A soft whistled note: sine with a breath, vibrato arriving late."""
    rng = rng or np.random.default_rng()
    x = tt(d + 0.12)
    vib = 0.006 * np.clip((x - 0.15) / 0.2, 0, 1) * np.sin(2 * np.pi * 5.5 * x)
    scoop = -0.02 * np.exp(-x / 0.03)  # slides up into the note
    ph = 2 * np.pi * f * np.cumsum(1 + vib + scoop) / SR
    s = np.sin(ph) + 0.06 * np.sin(2 * ph)
    s += 0.03 * np.resize(_bp_noise(len(x) / SR + 0.01, f * 0.8, f * 3, rng), len(x))
    e = np.clip(x / 0.025, 0, 1) * np.clip((d + 0.12 - x) / 0.1, 0, 1)
    return vel * s * e


def xylo(f, d=0.8, vel=0.5, rng=None):
    """A wooden bar: short, dry, with the 4th partial bright at the strike."""
    rng = rng or np.random.default_rng()
    x = tt(d)
    s = np.sin(2 * np.pi * f * x) * np.exp(-x / 0.22)
    s += 0.35 * np.sin(2 * np.pi * f * 3.93 * x) * np.exp(-x / 0.04)
    s += 0.1 * np.sin(2 * np.pi * f * 9.1 * x) * np.exp(-x / 0.012)
    return vel * s * np.clip(x / 0.001, 0, 1)


def tuba(f, d=0.4, vel=0.5):
    """A soft round brass bass: a few harmonics opening at the attack."""
    x = tt(d + 0.1)
    br = 0.25 + 0.35 * np.exp(-x / 0.08)
    s = np.zeros_like(x)
    for n in range(1, 7):
        s += (br ** (n - 1)) / n * np.sin(2 * np.pi * f * n * x)
    e = np.clip(x / 0.03, 0, 1) * np.clip((d + 0.1 - x) / 0.1, 0, 1)
    return vel * s * e


def toy(f, d=0.6, vel=0.4, rng=None):
    """Toy piano / celesta-ish: bright FM ping, short."""
    x = tt(d)
    idx = 2.0 * np.exp(-x / 0.06) + 0.2
    s = np.sin(2 * np.pi * f * x + idx * np.sin(2 * np.pi * f * 3.5 * x)) * np.exp(-x / 0.3)
    return vel * s * np.clip(x / 0.001, 0, 1)
