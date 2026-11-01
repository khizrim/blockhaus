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
CANVAS_DARK = (56, 58, 66, 255)  # empty field in the dark theme
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


def poster(S, win=(0, 0, 1), mono=False, frame=False, paper=PAPER):
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
        ([vx + L / 2, o, S - 1 - o, hr - L / 2], paper, None),
        ([vx + L / 2, hr + L / 2, S - 1 - o, S - 1 - o], BLUE, 'lt'),
        ([o, hy + L / 2, vx - L / 2, S - 1 - o], YELLOW, 'tr'),
    ]
    for box, c, sides in fields:
        d.rectangle(box, fill=fill(c))
        # Paper is an empty field: it sits level, no enamel.
        if not mono and sides is not None:
            enamel(d, box, c, sides + edge, e)
    return im


def glyph(S, inset=0.17):
    """Single-tone mark for the iOS tinted and clear appearances."""
    im = Image.new('RGBA', (S, S), (0, 0, 0, 255))
    d = ImageDraw.Draw(im)
    x0 = inset * S
    w = S - 2 * x0
    L = w * 0.09
    r = round(S * 0.035)
    vx, hy, hr, e = x0 + w * 0.6, x0 + w * 0.58, x0 + w * 0.36, x0 + w
    d.rounded_rectangle([x0, x0, vx - L / 2, hy - L / 2], r, fill=WHITE)
    d.rounded_rectangle([vx + L / 2, x0, e, hr - L / 2], r, outline=WHITE, width=round(S * 0.034))
    d.rounded_rectangle([vx + L / 2, hr + L / 2, e, e], r, fill=WHITE)
    d.rounded_rectangle([x0, hy + L / 2, vx - L / 2, e], r, fill=WHITE)
    return im


# iOS / store icon: full bleed; the system rounds the corners.
poster(1024).convert('RGB').save(f'{OUT}/icon.png')
# iOS dark appearance: the paper field turns into the dark theme's canvas,
# so no bright patch glows on a dark home screen.
poster(1024, paper=CANVAS_DARK).convert('RGB').save(f'{OUT}/ios-icon-dark.png')
# iOS tinted / clear (glass): the system turns luminance into one glass tone,
# so the full poster came out as four mismatched greys. Give it a single-tone
# glyph instead: the poster in miniature, three solid fields and the paper
# field left empty as an outline, white on black.
glyph(1024).convert('RGB').save(f'{OUT}/ios-icon-tinted.png')
# Android adaptive: the whole drawing lives in the foreground (full bleed, so
# the mask never shows a gap); the background is plain ink behind it.
Image.new('RGBA', (432, 432), LINE).save(f'{OUT}/android-icon-background.png')
poster(432, ADAPTIVE).save(f'{OUT}/android-icon-foreground.png')
poster(432, ADAPTIVE, mono=True).save(f'{OUT}/android-icon-monochrome.png')
# Splash and favicon: the same poster inside an outer line.
poster(456, frame=True).save(f'{OUT}/splash-icon.png')
poster(192, frame=True).resize((48, 48), Image.LANCZOS).save(f'{OUT}/favicon.png')
print('icons written')
