"""App icon, Android adaptive icon, splash and favicon: the menu poster
reduced to four fields and thick lines. Run from app/:

    python3 scripts/make-icons.py

The composition is laid out in "window" units: the part of the canvas a
launcher actually shows. On iOS that is the whole square; on Android it is
the central 72dp of the 108dp adaptive layer, and the lines simply run on
to the edge so any mask shape (circle, squircle, square) looks complete.
"""
from PIL import Image, ImageDraw

PAPER = (243, 239, 228, 255)
LINE = (17, 18, 21, 255)
WHITE = (255, 255, 255, 255)
CLEAR = (0, 0, 0, 0)
RED, YELLOW, BLUE = (217, 52, 43, 255), (244, 194, 28, 255), (31, 79, 178, 255)
OUT = 'assets/images'
ADAPTIVE = (18 / 108, 18 / 108, 72 / 108)  # window inside the 108dp layer


def mix(a, b, t):
    return tuple(round(x * t + y * (1 - t)) for x, y in zip(a[:3], b[:3])) + (255,)


def enamel(d, box, c, sides, e):
    """Enamel edges inside a colour field, as in src/design/depth.tsx: light
    on top and left, dark on bottom and right, only on sides facing a line."""
    l, t, r, b = box
    hi, lo = mix((255, 255, 255), c, 0.34), mix((0, 0, 0), c, 0.24)
    if 'b' in sides: d.rectangle([l, b - e, r, b], fill=lo)
    if 'r' in sides: d.rectangle([r - e, t, r, b], fill=lo)
    if 't' in sides: d.rectangle([l, t, r, t + e], fill=hi)
    if 'l' in sides: d.rectangle([l, t, l + e, b], fill=hi)


def poster(S, win=(0, 0, 1), mono=False, frame=False):
    """Three colour fields and one paper field split by thick lines.

    win = (left, top, size) of the visible window as fractions of S.
    mono: white fields on transparent, lines cut out (Android themed icon).
    frame: an outer line round the whole square (splash, favicon)."""
    x0, y0, w = (v * S for v in win)
    X = lambda u: x0 + u * w
    Y = lambda v: y0 + v * w
    L = round(w * 0.09)
    im = Image.new('RGBA', (S, S), CLEAR if mono else LINE)
    d = ImageDraw.Draw(im)
    fill = lambda c: WHITE if mono else c
    o = L if frame else 0
    vx, hy, hr = X(0.6), Y(0.58), Y(0.36)
    e = max(1, round(w * 0.022))
    edge = 'tlrb' if frame else ''  # sides closed by the outer line
    fields = [
        ([o, o, vx - L / 2, hy - L / 2], RED, 'rb'),
        ([vx + L / 2, o, S - 1 - o, hr - L / 2], PAPER, None),
        ([vx + L / 2, hr + L / 2, S - 1 - o, S - 1 - o], BLUE, 'lt'),
        ([o, hy + L / 2, vx - L / 2, S - 1 - o], YELLOW, 'tr'),
    ]
    for box, c, sides in fields:
        d.rectangle(box, fill=fill(c))
        # Paper is an empty field: it sits level, no enamel.
        if not mono and sides is not None:
            enamel(d, box, c, sides + edge, e)
    return im


# iOS / store icon: full bleed; the system rounds the corners.
poster(1024).convert('RGB').save(f'{OUT}/icon.png')
# Android adaptive: the whole drawing lives in the foreground (full bleed, so
# the mask never shows a gap); the background is plain ink behind it.
Image.new('RGBA', (432, 432), LINE).save(f'{OUT}/android-icon-background.png')
poster(432, ADAPTIVE).save(f'{OUT}/android-icon-foreground.png')
poster(432, ADAPTIVE, mono=True).save(f'{OUT}/android-icon-monochrome.png')
# Splash and favicon: the same poster inside an outer line.
poster(456, frame=True).save(f'{OUT}/splash-icon.png')
poster(192, frame=True).resize((48, 48), Image.LANCZOS).save(f'{OUT}/favicon.png')
print('icons written')
