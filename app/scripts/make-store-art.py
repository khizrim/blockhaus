"""Google Play listing art, drawn from the same scene as the app icon
(scripts/make-icons.py), so the store and the launcher show one object.

Run from app/ after `npm ci`:

    python3 scripts/make-store-art.py

Writes to store/ (not bundled into the app):
- play-icon-512.png: the 512x512 hi-res icon. Play cuts its own rounded
  corners and adds the shadow, so this one is full-bleed with no drawn tray
  outline, like the Android adaptive icon.
- feature-graphic.png: the 1024x500 feature graphic, light paper with the tray
  on the left and the wordmark on the right. Play may crop or overlay the
  edges, so nothing important sits near them.
"""
import importlib.util
import os

from PIL import Image, ImageDraw, ImageFont

spec = importlib.util.spec_from_file_location('icons', os.path.join(os.path.dirname(__file__), 'make-icons.py'))
icons = importlib.util.module_from_spec(spec)
spec.loader.exec_module(icons)

OUT = 'store'
WORD = 'node_modules/@expo-google-fonts/rubik/700Bold/Rubik_700Bold.ttf'
BODY = 'node_modules/@expo-google-fonts/rubik/500Medium/Rubik_500Medium.ttf'
INK = '#2A2A2A'
SUB = '#6B6860'


def main():
    os.makedirs(OUT, exist_ok=True)
    light = icons.TH['light']

    # Full-bleed: Play's own mask is the tray's edge, as on an Android launcher.
    icons.icon(3, light, 512, 0.9, border=False).convert('RGB').save(f'{OUT}/play-icon-512.png')

    W, H = 1024, 500
    fg = Image.new('RGB', (W, H), light['face'])
    tray = icons.icon(3, light, 360).convert('RGBA')
    c = icons.Canvas(360)
    tray.putalpha(c.mask((0, 0, 1, 1), icons.R_ICON).resize((360, 360), Image.LANCZOS))
    fg.paste(tray, (90, (H - 360) // 2), tray)

    d = ImageDraw.Draw(fg)
    x = 500
    word = ImageFont.truetype(WORD, 84)
    d.text((x, 180), 'Blockhaus', font=word, fill=INK)
    # GUESS: the tagline is a placeholder, swap it for the listing's short line.
    sub = ImageFont.truetype(BODY, 30)
    d.text((x + 4, 290), '1 + 2 = 3, равные удваиваются', font=sub, fill=SUB)
    fg.save(f'{OUT}/feature-graphic.png')
    print('store art written')


if __name__ == '__main__':
    main()
