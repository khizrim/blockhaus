"""App icon, adaptive icon, splash and favicon, drawn from the Glyph in
src/components/ui.tsx: the menu poster in miniature. Run from app/:

    python3 scripts/make-icons.py
"""
from PIL import Image, ImageDraw

PAPER = (243, 239, 228, 255)
LINE = (17, 18, 21, 255)
RED, YELLOW, BLUE = (217, 52, 43, 255), (244, 194, 28, 255), (31, 79, 178, 255)
OUT = 'assets/images'


def glyph(S, frame=True, mono=False, bg=PAPER):
    """The Glyph at S px, same proportions as the component. With a frame,
    the drawing sits inside it, as children sit inside a border in RN."""
    if frame:
        L = max(2, round(S * 0.08))
        ink = (255, 255, 255, 255) if mono else LINE
        im = Image.new('RGBA', (S, S), ink)
        inner = glyph(S - 2 * L, frame=False, mono=mono, bg=bg)
        if mono:
            hole = Image.new('RGBA', (S - 2 * L, S - 2 * L), (0, 0, 0, 0))
            im.paste(hole, (L, L))
        im.alpha_composite(inner, (L, L))
        return im
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0) if mono else bg)
    d = ImageDraw.Draw(im)
    L = max(2, round(S * 0.08))
    v1, hl, hr, vs, hb = (round(S * k) for k in (0.62, 0.6, 0.38, 0.22, 0.78))
    box = lambda l, t, w, h, c: d.rectangle([l, t, l + w - 1, t + h - 1], fill=c)
    if not mono:
        box(v1 + L, 0, S, hr, RED)
        box(0, hl + L, vs, S, YELLOW)
        box(v1 + L, hb + L, S, S, BLUE)
    ink = (255, 255, 255, 255) if mono else LINE
    for r in [(v1, 0, L, S), (0, hl, v1, L), (v1, hr, S, L), (vs, hl, L, S), (v1, hb, S, L)]:
        box(*r, ink)
    return im


def on(canvas, inner, size, bg):
    """`inner` drawn at `size`, centred on a square canvas."""
    im = Image.new('RGBA', (canvas, canvas), bg)
    g = inner(size)
    o = (canvas - size) // 2
    im.alpha_composite(g, (o, o))
    return im


# iOS / store icon: the poster fills the square; the system rounds the corners.
# No outer frame, since the mask would cut it unevenly.
glyph(1024, frame=False).convert('RGB').save(f'{OUT}/icon.png')
# Android adaptive: the background is paper, the foreground keeps the glyph
# inside the 66% safe circle area.
Image.new('RGBA', (512, 512), PAPER).save(f'{OUT}/android-icon-background.png')
on(512, lambda s: glyph(s, frame=True), 300, (0, 0, 0, 0)).save(f'{OUT}/android-icon-foreground.png')
on(432, lambda s: glyph(s, frame=True, mono=True), 252, (0, 0, 0, 0)).save(f'{OUT}/android-icon-monochrome.png')
# Splash: the framed glyph on its own; the screen colour comes from app.json.
glyph(456, frame=True).save(f'{OUT}/splash-icon.png')
glyph(48, frame=True).save(f'{OUT}/favicon.png')
print('icons written')
