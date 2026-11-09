"""G "Blocks": a small wooden chamber band on a 3+3+2 (tresillo) groove.

108 BPM, 32 bars = 71.1 s. One bar (2.2 s) is about one move of the player;
the music's 16th note (139 ms) is the grain of a merge chain (120-180 ms).

Form: groove 4 | A 8 (clarinet tune) | B 8 (bassoon answers, lighter) |
A' 8 (clarinet + bassoon counterline, pizzicato) | tag 4 (pizzicato echoes
the hook, woodblock turn back to the top).

The tune lives between G3 and C5, under the merge notes (D5-A6), and is
reed-coloured, not sine-coloured. The high register is left empty.
"""
from compose import phrase, tones, root, diatonic, CHORDS
from song import Song, DRUMS

MARIMBA, CLARINET, BASSOON, PIZZ, ABASS = 12, 71, 70, 45, 32

PROG = (['C', 'Am', 'F', 'G'] +                                   # groove
        ['C', 'Am', 'F', 'G', 'C', 'Am', 'F|G', 'C'] +            # A
        ['Am', 'Em', 'F', 'C', 'Dm', 'Am', 'F', 'G'] +            # B
        ['C', 'Am', 'F', 'G', 'C', 'Am', 'F|G', 'C'] +            # A'
        ['F', 'G', 'Am', 'G'])                                    # tag

# The hook: "G — E — G A" on the tresillo, rising to C5 in bar 2 and falling
# back; the second half answers and closes on C.
TUNE_A = [
    (0, 0, 67, 3), (0, 3, 64, 3), (0, 6, 67, 1), (0, 7, 69, 1),
    (1, 0, 72, 3), (1, 3, 69, 3), (1, 6, 64, 2),
    (2, 0, 69, 3), (2, 3, 67, 1), (2, 4, 65, 2), (2, 6, 64, 1), (2, 7, 65, 1),
    (3, 0, 71, 3), (3, 3, 67, 3), (3, 6, 62, 2),
    (4, 0, 67, 3), (4, 3, 64, 3), (4, 6, 67, 1), (4, 7, 69, 1),
    (5, 0, 72, 3), (5, 3, 71, 1), (5, 4, 69, 2), (5, 6, 67, 2),
    (6, 0, 65, 1), (6, 1, 67, 1), (6, 2, 69, 2), (6, 4, 67, 1), (6, 5, 65, 1), (6, 6, 62, 2),
    (7, 0, 64, 3), (7, 3, 62, 1), (7, 4, 60, 3),
]
# A': the second phrase climbs instead of answering at once.
TUNE_A2 = TUNE_A[:16] + [
    (4, 0, 67, 3), (4, 3, 64, 1), (4, 4, 67, 1), (4, 5, 69, 1), (4, 6, 72, 2),
    (5, 0, 69, 3), (5, 3, 67, 1), (5, 4, 64, 2), (5, 6, 67, 2),
    (6, 0, 65, 1), (6, 1, 67, 1), (6, 2, 69, 2), (6, 4, 71, 1), (6, 5, 69, 1), (6, 6, 67, 2),
    (7, 0, 64, 3), (7, 3, 67, 1), (7, 4, 72, 2), (7, 6, 67, 2),
]
# B: the chain idea, three notes climbing then a step down, a step lower
# each bar; low and woody on the bassoon.
TUNE_B = [
    (0, 0, 57, 2), (0, 2, 60, 1), (0, 3, 64, 3), (0, 6, 62, 2),
    (1, 0, 59, 2), (1, 2, 62, 1), (1, 3, 67, 3), (1, 6, 64, 2),
    (2, 0, 57, 2), (2, 2, 60, 1), (2, 3, 65, 3), (2, 6, 64, 1), (2, 7, 65, 1),
    (3, 0, 67, 5), (3, 6, 64, 1), (3, 7, 67, 1),
    (4, 0, 65, 2), (4, 2, 64, 1), (4, 3, 62, 3), (4, 6, 65, 2),
    (5, 0, 64, 2), (5, 2, 62, 1), (5, 3, 60, 3), (5, 6, 64, 2),
    (6, 0, 62, 2), (6, 2, 60, 1), (6, 3, 57, 3), (6, 6, 60, 2),
    (7, 0, 59, 3), (7, 3, 62, 3), (7, 6, 55, 2),
]
# A' counterline on the bassoon: guide tones creeping up against the falling tune
COUNTER = [
    (0, 0, 52, 6), (0, 6, 55, 1), (0, 7, 57, 1),
    (1, 0, 57, 7),
    (2, 0, 57, 6), (2, 6, 55, 2),
    (3, 0, 59, 6), (3, 6, 55, 1), (3, 7, 57, 1),
    (4, 0, 55, 7),
    (5, 0, 57, 3), (5, 3, 60, 3), (5, 6, 57, 2),
    (6, 0, 57, 3), (6, 4, 59, 4),
    (7, 0, 55, 3), (7, 3, 52, 3),
]
# tag: pizzicato echoes the hook over F and G, then Am
ECHO = [
    (0, 0, 69, 3), (0, 3, 65, 3), (0, 6, 69, 1), (0, 7, 71, 1),
    (1, 0, 74 - 12, 3), (1, 3, 67, 3), (1, 6, 71, 2),
    (2, 0, 72, 3), (2, 3, 69, 3), (2, 6, 64, 2),
]


def chords_at(bar):
    c = PROG[bar]
    return c.split('|') if '|' in c else [c, c]


def build():
    s = Song(108, len(PROG), seed=7)
    mar = s.part('marimba', MARIMBA, gain=-9, pan=-0.25, verb=1.0)
    bass = s.part('bass', ABASS, gain=-8.5, pan=0.0, verb=0.25, lo=45)
    cla = s.part('clarinet', CLARINET, gain=-6, pan=0.12, verb=1.2, hi=1400)
    bsn = s.part('bassoon', BASSOON, gain=-7, pan=-0.1, verb=1.1)
    piz = s.part('pizz', PIZZ, gain=-10, pan=0.35, verb=1.0)
    dr = s.part('drums', DRUMS, gain=-13, pan=0.05, verb=0.5, lo=90)
    shk = s.part('shaker', DRUMS, gain=-21, pan=0.4, verb=0.4)

    nb = len(PROG)
    for bar in range(nb):
        sec = 'G' if bar < 4 else 'A' if bar < 12 else 'B' if bar < 20 else 'A2' if bar < 28 else 'T'
        h1, h2 = chords_at(bar)
        nxt = chords_at((bar + 1) % nb)[0]
        t0 = bar * 4

        # marimba: chord tones grouped 3+3+2, accents on the tresillo
        if sec != 'B':
            for e in range(8):
                ch = h1 if e < 4 else h2
                tt = tones(ch, 47, 66)
                idx = [0, 1, 2, 3, 1, 2, 3, 2][e]
                acc = e in (0, 3, 6)
                v = (0.62 if acc else 0.40) * (0.85 if sec == 'G' and bar < 2 else 1)
                mar.add(t0 + e * 0.5, tt[idx], 0.45, v)
        else:
            # B: marimba thins to the tresillo itself, so the bassoon has room
            for e in (0, 3, 6):
                ch = h1 if e < 4 else h2
                tt = tones(ch, 47, 66)
                for k, q in enumerate(tt[1:3]):
                    mar.add(t0 + e * 0.5 + 0.01 * k, q, 0.6, 0.45)

        # bass: tresillo, root - fifth - octave, a step leading into the next bar
        r1, r2 = root(h1, 36), root(h2, 36)
        if bar >= 1 or True:
            bass.add(t0, r1, 1.3, 0.80)
            bass.add(t0 + 1.5, r1 + 7 if h1 == h2 else r2, 1.3, 0.66)
            bass.add(t0 + 3.0, (r2 + 12) if h1 == h2 else r2 + 7, 0.45, 0.62)
            nr = root(nxt, 36)
            step = diatonic(nr, 1 if nr < r2 + 6 else -1)
            if bar % 2 == 1 or sec == 'B':
                bass.add(t0 + 3.5, step, 0.4, 0.55)

        # drums: kick on the tresillo, side stick on 2 and 4, woodblock colour
        if not (sec == 'G' and bar < 2):
            if sec != 'B':
                dr.add(t0, 36, 0.2, 0.55)
                dr.add(t0 + 1.5, 36, 0.2, 0.42)
            dr.add(t0 + 1, 37, 0.1, 0.55)
            dr.add(t0 + 3, 37, 0.1, 0.60)
        if sec == 'B':
            dr.add(t0, 75, 0.1, 0.45)  # claves on the tresillo instead of the kick
            dr.add(t0 + 1.5, 75, 0.1, 0.40)
            dr.add(t0 + 3.0, 75, 0.1, 0.40)
        # shaker: 16ths, pushed on the offbeats
        for k in range(16):
            v = [0.5, 0.25, 0.75, 0.3][k % 4]
            if sec == 'G' and bar == 0 and k < 8:
                continue
            shk.add(t0 + k * 0.25, 70, 0.1, v)

    # melodies
    phrase(cla, 4, TUNE_A, vel=0.72)
    phrase(bsn, 12, TUNE_B, vel=0.72, legato=0.85)
    phrase(cla, 20, TUNE_A2, vel=0.74)
    phrase(bsn, 20, COUNTER, vel=0.5, legato=0.95)
    # pizzicato answers in B (the chord, on beats 2 and 4) and in A'
    for bar in range(12, 28):
        h1, h2 = chords_at(bar)
        for e in (2, 6) if bar < 20 else (3, 7):
            ch = h1 if e < 4 else h2
            for k, q in enumerate(tones(ch, 55, 67)[:3]):
                piz.add(bar * 4 + e * 0.5 + 0.012 * k, q, 0.3, 0.55)
    phrase(piz, 28, ECHO, vel=0.75)
    # the turn back to the top: low/high woodblocks on the last beat
    for k, (n, v) in enumerate([(77, 0.5), (76, 0.45), (77, 0.55), (76, 0.65)]):
        dr.add(31 * 4 + 3 + k * 0.25, n, 0.1, v)
    s.humanize(ms=4, vel=0.05)
    return s


def render():
    s = build()
    st = s.stems()
    return s, st, s.mix(st, rt=1.6, wet=0.22, damp=0.55, lo=55, hi=11000)
