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
    d.rectangle([o, o, vx - L / 2, hy - L / 2], fill=fill(RED))
    d.rectangle([vx + L / 2, o, S - 1 - o, hr - L / 2], fill=fill(PAPER))
    d.rectangle([vx + L / 2, hr + L / 2, S - 1 - o, S - 1 - o], fill=fill(BLUE))
    d.rectangle([o, hy + L / 2, vx - L / 2, S - 1 - o], fill=fill(YELLOW))
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
