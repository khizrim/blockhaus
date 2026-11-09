"""Score -> audio for the designer's loops.

A song is a tempo, a length in bars and a set of parts. Each part is a list of
notes (time in beats, MIDI pitch, length in beats, velocity 0..1) and a voice:
either a General MIDI program played by FluidSynth from FluidR3_GM.sf2 (MIT
licence), or a numpy/numba synth function.

Everything ends up in a circular buffer of exactly one loop:
- synth notes are written with wrap-around (engine.Loop.put);
- FluidSynth parts are rendered three times in a row and the middle copy is
  kept, so the release tails of the last bar sit at the top of the loop;
- reverb and EQ are circular FFT operations.
So the loop has no seam by construction.
"""
import os
import subprocess
import tempfile

import mido
import numpy as np
from scipy.io import wavfile

from engine import SR, Loop, circ_reverb, circ_tone

SF2 = '/usr/share/sounds/sf2/FluidR3_GM.sf2'
DRUMS = 'drums'


class Part:
    def __init__(self, name, voice, gain=0.0, pan=0.0, lo=None, hi=None, verb=1.0, bank=0):
        self.name, self.voice, self.gain, self.pan = name, voice, gain, pan
        self.lo, self.hi, self.verb, self.bank = lo, hi, verb, bank
        self.notes = []  # (t_beats, midi, dur_beats, vel)

    def add(self, t, p, d, v=0.7):
        self.notes.append((float(t), int(p), float(d), float(v)))


class Song:
    def __init__(self, bpm, bars, beats=4, seed=1):
        self.bpm, self.bars, self.beats = bpm, bars, beats
        self.beat = 60 / bpm
        self.len_beats = bars * beats
        self.seconds = self.len_beats * self.beat
        self.n = int(round(self.seconds * SR))
        self.parts = {}
        self.rng = np.random.default_rng(seed)

    def part(self, name, voice, **kw):
        p = Part(name, voice, **kw)
        self.parts[name] = p
        return p

    def humanize(self, ms=5.0, vel=0.06):
        """Small fixed random push and pull, the same on every pass of the loop."""
        for p in self.parts.values():
            p.notes = [(t + self.rng.normal(0, ms / 1000) / self.beat if t > 0.01 else t, n, d,
                        float(np.clip(v * (1 + self.rng.normal(0, vel)), 0.05, 1.0))) for (t, n, d, v) in p.notes]

    # ------------------------------------------------------------ rendering
    def _render_fluid(self, p):
        tpb = 960
        mid = mido.MidiFile(ticks_per_beat=tpb)
        tr = mido.MidiTrack()
        mid.tracks.append(tr)
        ch = 9 if p.voice == DRUMS else 0
        ev = [(0, mido.MetaMessage('set_tempo', tempo=mido.bpm2tempo(self.bpm)))]
        if ch == 0:
            ev.append((0, mido.Message('control_change', control=0, value=p.bank, channel=ch)))
            ev.append((0, mido.Message('program_change', program=p.voice, channel=ch)))
        ev.append((0, mido.Message('control_change', control=91, value=0, channel=ch)))
        ev.append((0, mido.Message('control_change', control=93, value=0, channel=ch)))
        for rep in range(3):
            off = rep * self.len_beats
            for (t, n, d, v) in p.notes:
                a = int(round((t + off + 0.25) * tpb))  # +1/4 beat lead-in, removed below
                b = a + max(1, int(round(d * tpb)))
                vel = int(np.clip(round(v * 127), 1, 127))
                ev.append((a, mido.Message('note_on', note=n, velocity=vel, channel=ch)))
                ev.append((b, mido.Message('note_off', note=n, velocity=0, channel=ch)))
        # note_offs before note_ons at the same tick, so repeated notes restrike
        ev.sort(key=lambda e: (e[0], 0 if e[1].type == 'note_off' else 1))
        last = 0
        for tick, m in ev:
            m.time = tick - last
            last = tick
            tr.append(m)
        tr.append(mido.Message('note_off', note=0, velocity=0, channel=ch, time=int(4 * tpb)))
        with tempfile.TemporaryDirectory() as d:
            mp, wp = os.path.join(d, 'p.mid'), os.path.join(d, 'p.wav')
            mid.save(mp)
            subprocess.run(['fluidsynth', '-ni', '-q', '-R', '0', '-C', '0', '-g', '1.0', '-r', str(SR),
                            '-o', 'audio.file.format=float', '-o', 'synth.polyphony=256',
                            '-F', wp, SF2, mp], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            sr, x = wavfile.read(wp)
        assert sr == SR
        x = x.astype(np.float64).mean(axis=1)
        lead = int(round(0.25 * self.beat * SR))
        start = lead + self.n
        seg = x[start:start + self.n]
        if len(seg) < self.n:
            seg = np.pad(seg, (0, self.n - len(seg)))
        return seg

    def _render_synth(self, p, seed):
        L = Loop(self.seconds, seed=seed)
        L.n = self.n
        L.buf = np.zeros((2, self.n))
        for (t, n, d, v) in p.notes:
            sig = p.voice(n, d * self.beat, v, L.rng)
            L.put(sig, t * self.beat, 0.0)
        return L.buf[0]

    def stems(self):
        out = {}
        for k, (name, p) in enumerate(self.parts.items()):
            if not p.notes:
                continue
            mono = self._render_fluid(p) if (isinstance(p.voice, int) or p.voice == DRUMS) else self._render_synth(p, 100 + k)
            if p.lo or p.hi:
                mono = circ_tone(np.vstack([mono, mono]), p.lo or 20, p.hi or 18000)[0]
            out[name] = mono
        return out

    def mix(self, stems=None, rt=1.5, wet=0.2, damp=0.5, lo=60, hi=12000, rms=0.139, pocket=(1050, -4.0, 0.8)):
        stems = stems or self.stems()
        dry = np.zeros((2, self.n))
        send = np.zeros((2, self.n))
        for name, mono in stems.items():
            p = self.parts[name]
            g = 10 ** (p.gain / 20) / active_rms(mono)  # gain is dB of the part while it plays
            l = np.cos((p.pan + 1) * np.pi / 4) * g
            r = np.sin((p.pan + 1) * np.pi / 4) * g
            st = np.vstack([l * mono, r * mono])
            dry += st
            send += st * p.verb
        verb = circ_reverb(send, rt=rt, wet=1.0, damp=damp)  # fully wet (x1.6 inside)
        y = dry + wet * verb
        y = circ_tone(y, lo, hi)
        if pocket:
            # a broad dip where the merge notes live (D5-A6, 587-1760 Hz), so
            # the music makes room for them instead of fighting them
            fc, db, wo = pocket
            fr = np.fft.rfftfreq(self.n, 1 / SR)
            g = 10 ** (db / 20 * np.exp(-0.5 * (np.log2(np.maximum(fr, 1) / fc) / wo) ** 2))
            y = np.fft.irfft(np.fft.rfft(y, axis=1) * g, self.n, axis=1)
        y = y - y.mean(axis=1, keepdims=True)
        y = y * rms / np.sqrt((y ** 2).mean())
        # soft knee above 0.7 so no peak passes ~0.9 (rarely touches anything)
        for _ in range(2):
            a = np.abs(y)
            y = np.where(a > 0.7, np.sign(y) * (0.7 + 0.25 * np.tanh((a - 0.7) / 0.25)), y)
            y = y * rms / np.sqrt((y ** 2).mean())
        return y


def active_rms(x, win=0.05):
    """RMS over the 50 ms frames where the part actually sounds."""
    w = int(SR * win)
    f = x[:len(x) // w * w].reshape(-1, w)
    e = np.sqrt((f ** 2).mean(axis=1))
    on = e > e.max() * 0.03
    return float(np.sqrt((e[on] ** 2).mean())) + 1e-12


def stem_rms(stems):
    return {k: float(np.sqrt((v ** 2).mean())) for k, v in stems.items()}
