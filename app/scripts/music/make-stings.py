"""Game sounds that belong to the music: merges, milestones, win, game over.

    python3 scripts/music/make-stings.py      # needs fluidsynth + FluidR3_GM.sf2, mido, scipy

They are played by the same General MIDI band as the "Blocks" loop
(FluidR3_GM, MIT licence) so a chain sounds like part of the ensemble:
- merges: vibraphone, one C major pentatonic degree per merge from D5, the
  same staircase as before, above the music (which stays below C5);
- milestones: the rung's vibraphone note with its fifth and octave, a
  pizzicato octave below;
- win: the block lands (the plastic thud from make-sounds.py), then the
  marimba and vibraphone climb C E A E and a clarinet holds the top;
- game over: two soft clarinet notes stepping down, G4 to E4, over a low
  pizzicato C.
Each file keeps the loudness (RMS of its first 0.4 s) of the synthesised
sound it replaces, so the in-game balance stays as tuned.
Everything else (plastic placements, sweeps, keys, lessons) stays in
make-sounds.py: that is the physics of the board, not the band.
"""
import importlib.util
import os
import subprocess
import tempfile
import wave

import mido
import numpy as np
from scipy.io import wavfile

SR = 44100
SF2 = '/usr/share/sounds/sf2/FluidR3_GM.sf2'
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'assets', 'sounds')

VIBES, MARIMBA, CLARINET, PIZZ = 11, 12, 71, 45

spec = importlib.util.spec_from_file_location('mk', os.path.join(HERE, '..', 'make-sounds.py'))
mk = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mk)


def note(i):
    """MIDI note of degree i of the C major pentatonic from C5 (72)."""
    return 72 + 12 * (i // 5) + [0, 2, 4, 7, 9][i % 5]


def render(events, length):
    """events: (time s, program, midi note, length s, velocity 1..127)."""
    mid = mido.MidiFile(ticks_per_beat=480)  # 120 BPM: 960 ticks a second
    tr = mido.MidiTrack()
    mid.tracks.append(tr)
    progs = {}
    msgs = []
    for (t, prog, n, d, v) in events:
        ch = progs.setdefault(prog, len(progs))
        msgs.append((t, 0, mido.Message('program_change', program=prog, channel=ch)))
        msgs.append((t, 2, mido.Message('note_on', note=n, velocity=v, channel=ch)))
        msgs.append((t + d, 1, mido.Message('note_off', note=n, velocity=0, channel=ch)))
    msgs.append((length, 3, mido.Message('note_off', note=0, velocity=0, channel=0)))
    msgs.sort(key=lambda m: (m[0], m[1]))
    now = 0
    for (t, _, m) in msgs:
        tick = int(round(t * 960))
        tr.append(m.copy(time=tick - now))
        now = tick
    with tempfile.TemporaryDirectory() as d:
        mp, wp = os.path.join(d, 'p.mid'), os.path.join(d, 'p.wav')
        mid.save(mp)
        subprocess.run(['fluidsynth', '-ni', '-q', '-R', '0', '-C', '0', '-g', '1.0', '-r', str(SR),
                        '-o', 'audio.file.format=float', '-F', wp, SF2, mp],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        sr, x = wavfile.read(wp)
    assert sr == SR
    x = x.astype(np.float64).mean(axis=1)[:int(length * SR)]
    return np.pad(x, (0, max(0, int(length * SR) - len(x))))


def rms_head(x):
    h = x[:int(0.4 * SR)]
    return np.sqrt((h ** 2).mean())


def old(name):
    with wave.open(os.path.join(OUT, name + '.wav')) as w:
        return np.frombuffer(w.readframes(w.getnframes()), '<i2') / 32768


def write(name, x, fade=0.12):
    """Match the loudness of the sound being replaced, fade the tail, write."""
    ref = rms_head(old(name))
    x = x - x.mean()
    n = int(fade * SR)
    x[-n:] *= np.linspace(1, 0, n) ** 2
    x = x * ref / (rms_head(x) + 1e-12)
    peak = np.max(np.abs(x))
    if peak > 0.95:
        x *= 0.95 / peak
    with wave.open(os.path.join(OUT, name + '.wav'), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((x * 32767).astype('<i2').tobytes())
    print(f'{name}: rms {rms_head(x):.3f} (was {ref:.3f}) peak {np.max(np.abs(x)):.2f}')


def main():
    # Merges: merge-3 … merge-11 are the 1st … 9th merge of a cascade.
    for k in range(9):
        write(f'merge-{k + 3}', render([(0, VIBES, note(1 + k), 0.4, 96)], 0.6))

    # Milestones: the note, its fifth and octave 70 ms apart, pizzicato below.
    for r in range(6, 12):
        i = r - 2
        ev = [(0.00, VIBES, note(i), 0.8, 100), (0.07, VIBES, note(i + 3), 0.8, 84),
              (0.14, VIBES, note(i + 5), 1.0, 92), (0.00, PIZZ, note(i) - 12, 0.4, 90)]
        write(f'milestone-{r}', render(ev, 1.1), 0.25)

    # Win: thud, then the climb at 90 ms a note (lands at 360 ms), clarinet on top.
    climb = [note(d) for d in (0, 2, 4, 7)]
    ev = []
    for k, n in enumerate(climb):
        t = 0.09 + 0.09 * k
        ev += [(t, VIBES, n, 0.9, 92), (t, MARIMBA, n - 12, 0.5, 80)]
    ev += [(0.36, CLARINET, climb[-1] - 12, 0.7, 70), (0.09, PIZZ, 48, 0.5, 90)]
    band = render(ev, 1.3)
    thud = mk.thud(1.8)
    thud = thud / np.max(np.abs(thud)) * np.max(np.abs(band)) * 0.8
    band[:len(thud)] += thud
    write('win', band, 0.3)

    # Game over: G4 then E4 on a soft clarinet, a low pizzicato C under.
    ev = [(0.0, CLARINET, 67, 0.28, 64), (0.2, CLARINET, 64, 0.5, 58), (0.2, PIZZ, 36, 0.5, 70)]
    write('over', render(ev, 0.9), 0.25)


if __name__ == '__main__':
    main()
