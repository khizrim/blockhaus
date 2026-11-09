"""App icon, iOS dark/tinted variants, Android adaptive icon, splash and
favicon (2026-11-09): the game's light tray seen from above, one deep socket,
and a yellow 3 lying in it. Geometry was approved as a flat schema first
(three iOS-shaped squircles: icon, socket inset 0.13, cube inset 0.205; the
socket's far wall 0.05 and the cube's front face 0.035 in the gaps), then the
light and shadows were laid on top of it without moving any edge.

Run from app/ after `npm ci`:

    python3 scripts/make-icons.py

One scene, one light, one camera: the light is high above, from the top of the
icon; the camera looks down slightly from the front, so we see the faces that
look at us (the cube's front face, the socket's far wall) and never the ones
that look away. Every wall band and shadow length derives from two heights.
"""
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = 'assets/images'
FONT = 'node_modules/@expo-google-fonts/rubik/700Bold/Rubik_700Bold.ttf'

TILE = {1: '#356BFF', 2: '#FF4733', 3: '#FFD43B'}
INK = {1: '#FFFFFF', 2: '#FFFFFF', 3: '#2A2A2A'}


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



# ---------- the scene ----------

from PIL import ImageDraw as _D
SQN, SQK = 5.0, 0.5 / 0.2237     # iOS icon ≈ one superellipse n=5 over the whole square; same law for socket and cube

def squircle_pts(l, t, r, b, rad, steps=48):
    """Outline of a rect whose corners are quarter superellipses spanning rad*SQK."""
    e = min(rad * SQK, (r - l) / 2, (b - t) / 2)
    pts = []
    for cx, cy, a0 in ((r - e, t + e, -90), (r - e, b - e, 0), (l + e, b - e, 90), (l + e, t + e, 180)):
        for i in range(steps + 1):
            th = np.radians(a0 + 90 * i / steps)
            c_, s_ = np.cos(th), np.sin(th)
            pts.append((cx + e * np.sign(c_) * abs(c_) ** (2 / SQN), cy + e * np.sign(s_) * abs(s_) ** (2 / SQN)))
    return pts

def _mask(self, box, r):
    m = Image.new('L', (self.N, self.N), 0)
    l, t, rr, b = (self.p(v) for v in box)
    _D.Draw(m).polygon(squircle_pts(l, t, rr, b, self.u(r)), fill=255)
    return m
Canvas.mask = _mask

R_ICON = 0.2237
T_IN, C_IN = 0.13, 0.205
R_SOCK = R_ICON * (1 - 2 * T_IN)  # same proportion as the iOS icon: 22.37% of its own side
R_CUBE = R_ICON * (1 - 2 * C_IN)  # likewise for the cube
NUM = 0.54                        # numeral size (font size / cube side), was 0.42

# --- one scene: heights in picture units (already multiplied by the camera tilt F)
S_CUBE = 1 - 2 * C_IN             # 0.59
HF = S_CUBE * 0.06                # cube height as seen = its front ledge, 0.0354
WF = 0.050                        # socket depth as seen = the far-wall band (deeper than the cube: 1.4x)
K = 1.25                          # shadow length per seen height (light ~ high, from the top)
L_RIM, L_CUBE = WF * K, HF * K
TF = 0.0                          # tray front wall: none (approved schema, 2026-11-09)

TH = {
 'light': dict(front_top='#D2CFC7', front_bot='#BCB8AF', edge=(255,255,255), edgea=0.9, face='#EEECE6', face2='#DCDAD3', glow=(255, 255, 255), glowa=0.95, glowb=0.55,
               floor='#C3BFB6', wall_top='#9A968D', wall_bot='#8A867E',
               ao=0.30, rim=0.30, cast=0.62, contact=0.75, bounce=0.16,
               lip=(255, 255, 255), lipa=0.95, farlip=0.10, crease=0.25),
 'dark':  dict(front_top='#2A2C32', front_bot='#1B1C20', edge=(120,126,140), edgea=0.6, face='#3D4048', face2='#2B2D33', glow=(150, 158, 176), glowa=0.55, glowb=0.25,
               floor='#24262C', wall_top='#1D1F24', wall_bot='#111216',
               ao=0.45, rim=0.42, cast=0.75, contact=0.85, bounce=0.22,
               lip=(150, 158, 176), lipa=0.70, farlip=0.20, crease=0.45),
}


def arr(m): return np.asarray(m, np.float32) / 255
def img(a): return Image.fromarray(np.clip(a * 255, 0, 255).astype(np.uint8))
def blur(m, r, c): return m.filter(ImageFilter.GaussianBlur(c.u(r))) if r > 0 else m
def sh(box, dy): return (box[0], box[1] + dy, box[2], box[3] + dy)


def icon(v, t, S=1024, k=1.0, border=True):
    """border=False: no tray outline (Android - the launcher's own mask is the edge)."""
    c = Canvas(S, k=k); N = c.N; full = Image.new('L', (N, N), 255)
    # 1. tray top face: lit from above, faint top->bottom falloff
    # 0. front wall of the tray: faces the viewer, away from the key -> darker; seen because the
    #    camera is in front, exactly like the cube's ledge (and thicker: the tray is taller)
    c.grad(full, (0, 1 - TF, 1, 1), t['front_top'], t['front_bot'])
    topface = (0, -0.2, 1, 1 - TF)
    mt = c.mask(topface, R_ICON) if border else full
    c.grad(mt, (0, 0, 1, 1 - TF), t['face'], t['face2'])
    if border:
        _rim(c, t, mt, topface, N)
    return _scene(c, v, t, N)


def _rim(c, t, mt, topface, N):
    # rounded edge where the top face turns into the front wall catches a thin light line
    ed = np.clip(arr(c.mask(sh(topface, 0.006), R_ICON)) - arr(mt), 0, 1)
    c.put(t['edge'] + (0,), img(arr(blur(img(ed), 0.002, c)) * t['edgea']))
    # 2. outer rounded rim: bevel + fresnel. Strongest where the bevel faces the light (top),
    #    weaker at the bottom (faces the viewer, only fresnel/sky) - Things' glow, but lit.
    inset = blur(c.mask((0.03, 0.03, 0.97, 0.97 - TF), R_ICON - 0.03), 0.022, c)
    y = np.linspace(t['glowa'], t['glowb'], N)[:, None]
    c.put(t['glow'] + (0,), img((1 - arr(inset)) * y * arr(mt)))


def _scene(c, v, t, N):
    sock = (T_IN, T_IN, 1 - T_IN, 1 - TF - T_IN)   # rim = T_IN on all four sides of the tray's top face
    M = arr(c.mask(sock, R_SOCK))                       # the opening
    floor_img = sh(sock, WF)                            # floor outline, pushed down by the depth
    Mf = arr(c.mask(floor_img, R_SOCK)) * M             # visible floor
    Mw = np.clip(M - Mf, 0, 1)                          # visible far wall (faces the viewer)

    # 3. floor, lit
    c.put(t['floor'], img(M))
    # 4. ambient occlusion: the floor sees less sky near every wall, most in the corners
    ao = arr(blur(c.mask((floor_img[0] + 0.01, floor_img[1] + 0.01, floor_img[2] - 0.01, floor_img[3] - 0.01), R_SOCK - 0.01), 0.045, c))
    c.put((0, 0, 0, 0), img(Mf * (1 - ao) * t['ao']))
    # 5. rim shadow: far rim (height D) casts down the floor, length D*K, soft edge (far from the rim)
    lit = 0.5 * arr(blur(c.mask(sh(floor_img, L_RIM), R_SOCK), 0.012, c)) + \
          0.5 * arr(blur(c.mask(sh(floor_img, L_RIM * 1.15), R_SOCK), 0.026, c))
    c.put((0, 0, 0, 0), img(Mf * (1 - lit) * t['rim']))

    # the cube: its top face is a square (0.205-0.795), its front face hangs below it
    y0 = C_IN                                                # approved schema: the top face is a square
    y1 = 1 - C_IN + HF                                       # its front face hangs below it
    top = (C_IN, y0, 1 - C_IN, y1 - HF)
    base = (C_IN, y0 + HF, 1 - C_IN, y1)
    f = TILE[v]
    # 6. cube's shadow on the floor: tight dark contact + cast sweep (length H*K, shorter than the rim's),
    #    penumbra widening with distance from the cube
    for ext, bl, a in ((0.004, 0.004, t['contact']), (L_CUBE * 0.6, 0.010, 0.45 * t['cast']), (L_CUBE, 0.022, 0.40 * t['cast'])):
        m = arr(blur(c.mask((base[0] + 0.002, base[1], base[2] - 0.002, base[3] + ext), R_CUBE), bl, c))
        c.put((0, 0, 0, 0), img(m * Mf * a))
    # 7. occlusion around the cube's sides (crease between cube and floor)
    occ = arr(blur(c.mask((base[0] - 0.006, base[1], base[2] + 0.006, base[3]), R_CUBE), 0.018, c))
    c.put((0, 0, 0, 0), img(occ * Mf * 0.22 * t['ao'] / 0.34))
    # 8. colour bleeding: the cube's lit sides throw its colour onto the floor beside it
    bnc = arr(blur(c.mask((base[0] - 0.01, base[1] + 0.02, base[2] + 0.01, base[3] + 0.01), R_CUBE), 0.035, c))
    c.put(f, img(bnc * Mf * t['bounce']))

    # 9. far wall: faces the viewer, turned away from the key -> in form shadow, lit only by the
    #    floor's bounce; darkest at the crease with the floor
    if Mw.max() > 0:
        tw, bw = c.p(sock[1]), c.p(sock[1] + WF)
        k = np.clip((np.arange(N, dtype=np.float32) - tw) / (bw - tw), 0, 1)[:, None]
        a, b = np.array(rgba(t['wall_top'])[:3], np.float32), np.array(rgba(t['wall_bot'])[:3], np.float32)
        col = a[None, None] * (1 - k[..., None]) + b[None, None] * k[..., None]
        layer = Image.fromarray(np.dstack([col * np.ones((1, N, 1)), Mw[..., None] * 255]).astype(np.uint8), 'RGBA')
        c.im.alpha_composite(layer)
        crease = np.clip(arr(c.mask(sh(floor_img, -0.006), R_SOCK)) - arr(c.mask(floor_img, R_SOCK)), 0, 1) * M
        c.put((0, 0, 0, 0), img(arr(blur(img(crease), 0.003, c)) * t['crease']))

    # 10. bevel round the opening, shaded by its orientation:
    #     near edge slopes back toward the light -> bright lip; far edge slopes toward us -> dim
    near = np.clip(arr(blur(c.mask(sh(sock, 0.010), R_SOCK), 0.003, c)) - M, 0, 1)
    c.put(t['lip'] + (0,), img(near * t['lipa']))
    far = np.clip(arr(blur(c.mask(sh(sock, -0.008), R_SOCK), 0.004, c)) - M, 0, 1)
    c.put((0, 0, 0, 0), img(far * t['farlip']))

    # 11. the cube: front ledge (faces viewer, away from the key, a touch of floor bounce at its foot)
    l, tp, r, b = top
    c.put(mix('#000000', f, 0.32), c.mask((l, tp, r, base[3]), R_CUBE))
    ledge = np.clip(arr(c.mask((l, tp, r, base[3]), R_CUBE)) - arr(c.mask(top, R_CUBE)), 0, 1)
    yy = np.clip((np.arange(N, dtype=np.float32) - c.p(b)) / c.u(HF + 0.02), 0, 1)[:, None]
    c.put(mix('#FFFFFF', f, 0.20), img(ledge * yy * 0.22))
    #     top face: faces the light; brighter toward the far edge (glossy reflection of the sky)
    mf = c.mask(top, R_CUBE)
    c.grad(mf, top, mix('#FFFFFF', f, 0.26), f)
    #     specular on the far rounded edge: thin and soft, NOT a band (we can't see the back face)
    c.inner(mf, top, R_CUBE, S_CUBE * 0.012, S_CUBE * 0.006, 0.55, (255, 255, 255, 0))
    #     front edge rounds over into shade (terminator)
    fe = np.clip(arr(blur(mf, 0.008, c)) - arr(blur(c.mask(sh(top, -0.012), R_CUBE), 0.008, c)), 0, 1) * arr(mf)
    c.put((0, 0, 0, 0), img(fe * 0.10))
    c.text(str(v), ((l + r) / 2, (tp + b) / 2), S_CUBE * NUM, INK[v])
    return c.out()


# ---------- outputs ----------

# The single-tone source iOS uses for tinted and clear (glass): luminance is
# how much glass. Dark tray, white cube, numeral cut dark.
MONO = dict(TH['dark'], face='#3A3A3A', face2='#2C2C2C', floor='#1C1C1C', wall_top='#141414',
            wall_bot='#0C0C0C', glow=(150, 150, 150), lip=(150, 150, 150), bounce=0.0)


def mono(S=1024, k=1.0, border=True):
    TILE[3], INK[3] = '#F4F4F4', '#0A0A0A'
    try:
        return icon(3, MONO, S, k, border).convert('L')
    finally:
        TILE[3], INK[3] = '#FFD43B', '#2A2A2A'


def main():
    icon(3, TH['light']).convert('RGB').save(f'{OUT}/icon.png')
    icon(3, TH['dark']).convert('RGB').save(f'{OUT}/ios-icon-dark.png')
    mono().convert('RGB').save(f'{OUT}/ios-icon-tinted.png')
    # Android adaptive: the launcher shows the central 72dp of the 108dp layer and
    # masks it (circle, squircle...). No drawn tray outline: the mask is the tray's
    # edge, and the face fills the whole layer so any mask edge lands on plastic; the scene sits in the window, shrunk so the socket's
    # corners clear the 66dp circle.
    win = 72 / 108 * 0.86
    Image.new('RGBA', (432, 432), rgba(TH['light']['face'])).save(f'{OUT}/android-icon-background.png')
    icon(3, TH['light'], 432, win, border=False).save(f'{OUT}/android-icon-foreground.png')
    m = mono(432, win, border=False)
    white = Image.new('RGBA', (432, 432), (255, 255, 255, 0))
    white.putalpha(m)
    white.save(f'{OUT}/android-icon-monochrome.png')
    # Native splash: empty; the in-app splash starts on a bare page.
    Image.new('RGBA', (16, 16), (0, 0, 0, 0)).save(f'{OUT}/splash-icon.png')
    # Favicon: a browser tab has no mask, so cut the iOS shape out of it.
    fav = icon(3, TH['light'], 192).convert('RGBA')
    c = Canvas(192)
    fav.putalpha(c.mask((0, 0, 1, 1), R_ICON).resize((192, 192), Image.LANCZOS))
    fav.resize((48, 48), Image.LANCZOS).save(f'{OUT}/favicon.png')
    print('icons written')


if __name__ == '__main__':
    main()
