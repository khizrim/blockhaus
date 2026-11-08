"""App icon, iOS dark/tinted variants, Android adaptive icon, splash and
favicon, drawn with the game's own plastic block (src/components/Block.tsx)
and palette (src/design/tokens.ts). Run from app/ after `npm ci`:

    python3 scripts/make-icons.py            # the chosen icon (magnet)
    python3 scripts/make-icons.py three      # another scene: magnet | three | plate

Scenes are laid out in unit coordinates of the visible window: the whole
square on iOS (the system rounds it), the central 72dp of the 108dp layer on
Android, shrunk further so a circle mask never cuts a block.
"""
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = 'assets/images'
FONT = 'node_modules/@expo-google-fonts/rubik/700Bold/Rubik_700Bold.ttf'

LIGHT = dict(bg='#ECEBE7', plate='#FFFFFF', edge='#D3D1CA', canvas='#ECEAE4', sock=0.10)
DARK = dict(bg='#18191C', plate='#2F3238', edge='#141518', canvas='#23252A', sock=0.40)
TILE = {1: '#356BFF', 2: '#FF4733', 3: '#FFD43B'}
INK = {1: '#FFFFFF', 2: '#FFFFFF', 3: '#2A2A2A'}
MONO = dict(mono=True)  # single-tone glyph: white shapes, numerals cut out


def rgba(h, a=255):
    if not isinstance(h, str):
        return h
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (a,)


def mix(a, b, t):
    a, b = rgba(a), rgba(b)
    return tuple(round(x * t + y * (1 - t)) for x, y in zip(a[:3], b[:3])) + (255,)


class Canvas:
    """Draws at 2x and scales down. `k` shrinks the scene about the centre."""

    def __init__(self, S, bg=None, k=1.0, ss=2):
        self.S, self.ss, self.k = S, ss, k
        self.N = S * ss
        self.im = Image.new('RGBA', (self.N, self.N), rgba(bg) if bg else (0, 0, 0, 0))

    def u(self, v):  # a length
        return v * self.k * self.N

    def p(self, v):  # a coordinate
        return (0.5 + (v - 0.5) * self.k) * self.N

    def mask(self, box, r):
        m = Image.new('L', (self.N, self.N), 0)
        l, t, rr, b = box
        ImageDraw.Draw(m).rounded_rectangle([self.p(l), self.p(t), self.p(rr), self.p(b)], radius=self.u(r), fill=255)
        return m

    def put(self, color, alpha_mask):
        layer = Image.new('RGBA', (self.N, self.N), rgba(color))
        layer.putalpha(alpha_mask)
        self.im.alpha_composite(layer)

    def grad(self, m, box, top, bot):
        t, b = self.p(box[1]), self.p(box[3])
        k = np.clip((np.arange(self.N, dtype=np.float32) - t) / max(1, b - t), 0, 1)[:, None, None]
        arr = np.array(rgba(top), np.float32) * (1 - k) + np.array(rgba(bot), np.float32) * k
        layer = Image.fromarray((arr * np.ones((1, self.N, 1), np.float32)).astype(np.uint8), 'RGBA')
        layer.putalpha(m)
        self.im.alpha_composite(layer)

    def shadow(self, box, r, dy, blur, alpha):
        l, t, rr, b = box
        m = self.mask((l, t + dy, rr, b + dy), r).filter(ImageFilter.GaussianBlur(self.u(blur)))
        self.put((0, 0, 0, 0), m.point(lambda v: round(v * alpha)))

    def inner(self, m, box, r, dy, blur, alpha, color):
        """A shade inside mask m along its top edge (an inset shadow)."""
        l, t, rr, b = box
        sh = self.mask((l, t + dy, rr, b + dy), r).filter(ImageFilter.GaussianBlur(self.u(blur))) if blur else \
            self.mask((l, t + dy, rr, b + dy), r)
        a = (255 - np.asarray(sh, np.float32)) * np.asarray(m, np.float32) / 255 * alpha
        self.put(color, Image.fromarray(a.astype(np.uint8)))

    def plate(self, box, r, th, edge=0.012):
        """The white plate: a face with a faint gradient on a bottom edge."""
        l, t, rr, b = box
        self.shadow((l, t, rr, b + edge), r, edge + 0.01, 0.022, 0.10)
        self.put(th['edge'], self.mask((l, t + edge, rr, b + edge), r))
        self.grad(self.mask(box, r), box, th['plate'], mix('#000000', th['plate'], 0.03))

    def socket(self, box, th):
        r = (box[3] - box[1]) * 0.18
        m = self.mask(box, r)
        self.put(th['canvas'], m)
        size = box[3] - box[1]
        self.inner(m, box, r, size * 0.035, size * 0.04, th['sock'], (0, 0, 0, 0))

    def block(self, box, v, rot=0, mono=False):
        """A glossy plastic block: a face lighter at the top on a ledge of its
        own colour darkened, a thin highlight along the top edge, the numeral
        at 0.42 of the block. mono: a flat white block, numeral cut out."""
        if rot:
            sub = Canvas(self.S, k=self.k, ss=self.ss)
            sub.block(box, v, 0, mono)
            c = (self.p((box[0] + box[2]) / 2), self.p((box[1] + box[3]) / 2))
            self.im.alpha_composite(sub.im.rotate(rot, Image.BICUBIC, center=c))
            return
        l, t, rr, b = box
        size = min(rr - l, b - t)
        r = size * 0.18
        if mono:
            self.put('#FFFFFF', self.mask(box, r))
            self.text(str(v), ((l + rr) / 2, (t + b) / 2), size * 0.42, (0, 0, 0, 0), cut=True)
            return
        f = TILE[v]
        ledge = size * 0.06
        self.shadow(box, r, size * 0.05, size * 0.05, 0.16)
        self.put(mix('#000000', f, 0.28), self.mask(box, r))
        face = (l, t, rr, b - ledge)
        m = self.mask(face, r)
        self.grad(m, face, mix('#FFFFFF', f, 0.22), f)
        self.inner(m, face, r, size * 0.03, 0, 0.35, (255, 255, 255, 0))
        self.text(str(v), ((l + rr) / 2, (t + b - ledge) / 2), size * 0.42, INK[v])

    def text(self, s, centre, h, color, cut=False):
        fnt = ImageFont.truetype(FONT, round(self.u(h)))
        cx, cy = self.p(centre[0]), self.p(centre[1])
        m = Image.new('L', (self.N, self.N), 0)
        d = ImageDraw.Draw(m)
        bb = d.textbbox((0, 0), s, font=fnt)  # centre the digit's ink, not the font box
        d.text((cx - (bb[0] + bb[2]) / 2, cy - (bb[1] + bb[3]) / 2), s, font=fnt, fill=255)
        if cut:
            a = np.asarray(self.im.getchannel('A'), np.float32) * (1 - np.asarray(m, np.float32) / 255)
            self.im.putalpha(Image.fromarray(a.astype(np.uint8)))
        else:
            self.put(color, m)

    def out(self, size=None):
        return self.im.resize((size or self.S,) * 2, Image.LANCZOS)


# ---------- scenes ----------

def magnet(c, th, mono=False):
    """1 and 2 lean toward each other, the moment before they snap into a 3
    (the splash, frozen)."""
    s, y = 0.40, 0.31
    c.block((0.09, y, 0.09 + s, y + s), 1, rot=-6, mono=mono)
    c.block((0.51, y, 0.51 + s, y + s), 2, rot=6, mono=mono)


def three(c, th, mono=False):
    """One big yellow 3, the first thing two blocks make together."""
    s = 0.62
    o = (1 - s) / 2
    c.block((o, o - 0.02, o + s, o + s - 0.02), 3, mono=mono)


def plate(c, th, mono=False):
    """A 2×2 corner of the board: 1, 2, 3 and an empty socket."""
    s, g = 0.30, 0.04
    x0, y0 = 0.5 - s - g / 2, 0.495 - s - g / 2
    cells = [(x0, y0, 1), (x0 + s + g, y0, 2), (x0, y0 + s + g, 3), (x0 + s + g, y0 + s + g, 0)]
    if mono:
        for x, y, v in cells:
            if v:
                c.block((x, y, x + s, y + s), v, mono=True)
            else:
                m = c.mask((x, y, x + s, y + s), s * 0.18)
                c.inner(m, (x + 0.02, y + 0.02, x + s - 0.02, y + s - 0.02), s * 0.12, 0, 0, 1.0, '#FFFFFF')
        return
    c.plate((0.14, 0.135, 0.86, 0.855), 0.09, th)
    for x, y, v in cells:
        c.socket((x, y, x + s, y + s), th)
    for x, y, v in cells:
        if v:
            c.block((x + 0.004, y - 0.012, x + s - 0.004, y + s - 0.012), v)


SCENES = dict(magnet=magnet, three=three, plate=plate)


def render(scene, S, bg=None, th=LIGHT, k=1.0, mono=False):
    c = Canvas(S, bg, k)
    scene(c, th, mono)
    return c.out()


def main(name):
    scene = SCENES[name]
    # iOS / store icon: full bleed on the page colour; the system rounds it.
    render(scene, 1024, LIGHT['bg']).convert('RGB').save(f'{OUT}/icon.png')
    # iOS dark appearance: the dark theme's table and plate.
    render(scene, 1024, DARK['bg'], DARK).convert('RGB').save(f'{OUT}/ios-icon-dark.png')
    # iOS tinted / clear (glass): the system maps luminance to one glass tone,
    # so give it one: white blocks with their numerals cut out, on black.
    render(scene, 1024, '#000000', k=0.86, mono=True).convert('RGB').save(f'{OUT}/ios-icon-tinted.png')
    # Android adaptive: blocks in the foreground, kept inside the 66dp circle
    # (window 72/108, scene shrunk again so the tilted corners clear it); the
    # background is the plain page colour.
    win = 72 / 108 * 0.84
    Image.new('RGBA', (432, 432), rgba(LIGHT['bg'])).save(f'{OUT}/android-icon-background.png')
    render(scene, 432, k=win).save(f'{OUT}/android-icon-foreground.png')
    render(scene, 432, k=win, mono=True).save(f'{OUT}/android-icon-monochrome.png')
    # Native splash: empty. The splash in the app starts on a bare page and
    # sets the 2 down 200ms later, so the native one is just that page
    # (colours in app.json) and the hand-over is seamless.
    Image.new('RGBA', (16, 16), (0, 0, 0, 0)).save(f'{OUT}/splash-icon.png')
    # Favicon: the same scene, small; a browser tab has no mask, so round it.
    fav = render(scene, 192, LIGHT['bg'])
    m = Image.new('L', (192, 192), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, 191, 191], radius=40, fill=255)
    fav.putalpha(m)
    fav.resize((48, 48), Image.LANCZOS).save(f'{OUT}/favicon.png')
    print(f'icons written ({name})')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'magnet')
