"""Render previews: the loop once, then its first EXTRA seconds again (so the
seam is heard), with simulated game sounds from GAME_FROM on, mixed at the
game's own levels (music at 0.35)."""
import os
import subprocess
import sys
import wave

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from engine import SR  # noqa: E402

APP = '/home/user/blockhaus/app'
SND = os.path.join(APP, 'assets/sounds')
EXTRA = 20.0
GAME_FROM = 12.0
MUSIC_LEVEL = 0.35


def load(path):
    w = wave.open(path)
    sr, ch, n = w.getframerate(), w.getnchannels(), w.getnframes()
    x = np.frombuffer(w.readframes(n), '<i2').astype(float) / 32768
    if ch == 2:
        x = x.reshape(-1, 2).T
    else:
        x = np.vstack([x, x])
    if sr != SR:
        m = int(x.shape[1] * SR / sr)
        src = np.arange(m) * sr / SR
        x = np.vstack([np.interp(src, np.arange(x.shape[1]), c) for c in x])
    return x


def game(total, seed=5):
    rng = np.random.default_rng(seed)
    out = np.zeros((2, int(total * SR)))
    cache = {}

    def play(name, at):
        if name not in cache:
            cache[name] = load(os.path.join(SND, name + '.wav'))
        s = cache[name]
        i = int(at * SR)
        if i >= out.shape[1]:
            return
        n = min(s.shape[1], out.shape[1] - i)
        out[:, i:i + n] += s[:, :n]

    t = GAME_FROM
    placed = 0
    while t < total - 2:
        play('pick', t)
        t += rng.uniform(0.5, 1.0)
        play('place-%d' % rng.integers(1, 4), t)
        placed += 1
        if rng.random() < 0.5:
            chain = rng.choice([1, 1, 1, 2, 2, 3, 4], 1)[0]
            for k in range(chain):
                play('merge-%d' % (3 + k), t + 0.12 + 0.12 * k)
            if chain >= 3:
                play('slam-%d' % (chain - 2), t + 0.12 + 0.12 * (chain - 1))
        if placed % 3 == 0:
            play('tray', t + 0.5)
        if rng.random() < 0.08:
            play('sweep-1', t + 1.2)
            play('knock-2', t + 1.4)
            t += 0.8
        t += rng.uniform(1.4, 3.2)
    return out


def write(path, y):
    y = np.clip(y, -1, 1)
    tmp = path + '.wav'
    with wave.open(tmp, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((y.T * 32767).astype('<i2').tobytes())
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-b:a', '192k', path], check=True)
    os.remove(tmp)
