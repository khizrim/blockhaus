"""Small helpers for writing the scores: chords, phrases on an eighth-note
grid, diatonic harmony. Pitches are MIDI numbers (C4 = 60)."""

C_MAJOR = {0, 2, 4, 5, 7, 9, 11}
PENTA = {0, 2, 4, 7, 9}

# root (MIDI, bass octave) and chord pitch classes relative to the root
CHORDS = {
    'C': (36, [0, 4, 7]), 'Cmaj7': (36, [0, 4, 7, 11]), 'C6': (36, [0, 4, 7, 9]), 'C69': (36, [0, 4, 9, 14]),
    'Dm': (38, [0, 3, 7]), 'Dm7': (38, [0, 3, 7, 10]), 'Dm9': (38, [0, 3, 10, 14]),
    'Em': (40, [0, 3, 7]), 'Em7': (40, [0, 3, 7, 10]),
    'F': (41, [0, 4, 7]), 'Fmaj7': (41, [0, 4, 7, 11]), 'F6': (41, [0, 4, 7, 9]), 'Fmaj9': (41, [0, 4, 11, 14]),
    'G': (43, [0, 4, 7]), 'G7': (43, [0, 4, 7, 10]), 'Gsus': (43, [0, 5, 7, 10]), 'G6': (43, [0, 4, 7, 9]),
    'Am': (45, [0, 3, 7]), 'Am7': (45, [0, 3, 7, 10]), 'Am9': (45, [0, 3, 10, 14]),
}


def root(ch, lo=36):
    r = CHORDS[ch][0]
    while r < lo:
        r += 12
    while r >= lo + 12:
        r -= 12
    return r


def tones(ch, lo, hi):
    """All chord tones of `ch` in [lo, hi], ascending."""
    r, iv = CHORDS[ch]
    pcs = {(r + i) % 12 for i in iv}
    return [p for p in range(lo, hi + 1) if p % 12 in pcs]


def voicing(ch, lo, n=3):
    """The n chord tones from the first one at or above lo (close position)."""
    return tones(ch, lo, lo + 24)[:n]


def phrase(part, bar0, notes, beats=4, legato=0.92, vel=0.7, shift=0):
    """notes: (bar, eighth, pitch, eighths[, vel]); bar relative to bar0."""
    for nt in notes:
        b, e, p, n = nt[:4]
        v = nt[4] if len(nt) > 4 else vel
        if p is None:
            continue
        part.add((bar0 + b) * beats + e * 0.5, p + shift, n * 0.5 * legato, v)


def diatonic(p, steps):
    """Move pitch p by `steps` scale degrees of C major (negative = down)."""
    d = 1 if steps > 0 else -1
    for _ in range(abs(steps)):
        p += d
        while p % 12 not in C_MAJOR:
            p += d
    return p


def all_pitches(song):
    out = {}
    for name, p in song.parts.items():
        out[name] = sorted({n for (_, n, _, _) in p.notes})
    return out
