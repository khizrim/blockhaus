# Blockhaus app (Expo)

The native app. Stage 1 is the full visual design with **no game rules wired in**, so the look can be prototyped freely. Sound comes next, then the rules from `../prototype/engine.js`.

## Run it

```bash
cd app
npm install
npx expo start        # scan the QR code with Expo Go (SDK 58) on your phone
npx expo start --web  # or open in a browser
```

## What is here

- `src/app/` screens (Expo Router): `index` poster menu, `game`, `pause`, `win`, `over`, `settings`, `howto`, `kit` (design kit).
- `src/components/Field.tsx` the one renderer for every grid: board, tray pieces, cover, tutorial art. Same-value touching tiles form a field: thick lines between fields, thin folds inside.
- `src/components/ui.tsx` buttons, toggles, ladder, wordmark, icons.
- `src/design/tokens.ts` colours (light/dark), fonts, `rank`/`pairs` helpers.
- `src/design/mock.ts` hand-placed scenes (mid game, first tray, crowded, made 96).
- Identity: poster menu (`src/brand/`), Dela Gothic One for display, Onest for text (both Cyrillic).
- Two font families only, both from @expo-google-fonts.

## What works without rules

- Pick up a tray piece: partners stay bright, others fade, the ghost is hatched, partner tiles get a frame. Drop it on empty cells and it lands (nothing merges).
- Tap a tile to replay the merge pop. Sweep buttons nudge the board and spend a sweep.
- Pause menu has prototype scenes and shortcuts to the win and game-over screens. The design kit lists every colour, type style, control and scene.
- Theme, sound, haptics and hints toggles live in memory only.

## Sound

All sounds are synthesised by `scripts/make-sounds.py` (numpy only) into `assets/sounds/*.wav`; there are no third-party samples. Pieces sound like painted wood (pick tick, a knock per piece size, two muffled taps when a drop does not fit, a felt slide for a sweep). Merges are a soft marimba climbing the C major pentatonic one step per rung, 3 = C5 up to 96 = C6, so a cascade audibly climbs. `src/sound/sfx.ts` plays them with the matching haptic, follows the Sound and Vibration settings, respects the silent switch and mixes with other apps' audio. Settings → Прототип → Все звуки auditions every sound.
