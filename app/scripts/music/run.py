"""Render the designer's loops and their previews.

    python3 run.py OUTDIR g      # needs fluidsynth + FluidR3_GM.sf2 (apt), scipy, mido

The game's assets/sounds/music.wav is <OUT>/wav/G-blocks-asset.wav.

For each loop writes
  <OUT>/<X>-<name>.mp3         preview: music x0.35 + simulated game SFX from 0:12,
                               the loop once and then its first 20 s again (seam audible)
  <OUT>/<X>-<name>-music.mp3   the same without SFX, music at full level
  <OUT>/wav/<X>-<name>-loop.wav   exact loop, 44.1 kHz stereo (for checks)
  <OUT>/wav/<X>-<name>-asset.wav  app-asset candidate: mono 22.05 kHz, loop + 2 s tail
"""
import importlib
import os
import subprocess
import sys
import wave

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from engine import SR  # noqa: E402
import preview  # noqa: E402  (game() and load() from the earlier rounds)

EXTRA = 20.0
TAIL = 2.0
LOOPS = {'g': ('G-blocks', 'g_blocks')}


def write_wav(path, y, sr=SR):
    y = np.clip(y, -1, 1)
    if y.ndim == 1:
        y = y[None]
    with wave.open(path, 'wb') as w:
        w.setnchannels(y.shape[0])
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes((y.T * 32767).astype('<i2').tobytes())


def mp3(path, y):
    tmp = path + '.tmp.wav'
    write_wav(tmp, y)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-b:a', '192k', path], check=True)
    os.remove(tmp)


def main():
    out = sys.argv[1]
    os.makedirs(os.path.join(out, 'wav'), exist_ok=True)
    for key in sys.argv[2:]:
        name, mod = LOOPS[key]
        s, stems, m = importlib.import_module(mod).render()
        np.save(os.path.join(out, 'wav', name + '.npy'), m.astype(np.float32))
        write_wav(os.path.join(out, 'wav', f'{name}-loop.wav'), m)
        # asset candidate: mono, 22.05 kHz, loop + tail
        mono = m.mean(axis=0)
        mono = np.concatenate([mono, mono[:int(TAIL * SR)]])
        half = mono.reshape(-1)[: len(mono) // 2 * 2]
        from scipy.signal import resample_poly
        write_wav(os.path.join(out, 'wav', f'{name}-asset.wav'), resample_poly(half, 1, 2), SR // 2)
        full = np.concatenate([m, m[:, :int(EXTRA * SR)]], axis=1)
        mp3(os.path.join(out, f'{name}-music.mp3'), full)
        y = full * preview.MUSIC_LEVEL + preview.game(full.shape[1] / SR)
        mp3(os.path.join(out, f'{name}.mp3'), y)
        print(name, f'{s.seconds:.1f}s loop, {s.bpm} BPM, {s.bars} bars; stems:',
              {k: round(float(np.sqrt((v ** 2).mean())), 4) for k, v in stems.items()}, flush=True)


if __name__ == '__main__':
    main()
