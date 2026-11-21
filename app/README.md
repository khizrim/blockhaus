# Blockhaus app (Expo)

The game for iOS, Android and the web, on Expo SDK 58 with Expo Router and Reanimated. It plays the full rules from `../prototype/engine.js`, saves after every move, teaches itself on the first run, and speaks Russian and English.

## Run it

```bash
cd app
npm install
npx expo start        # scan the QR code with Expo Go (SDK 58) on your phone
npx expo start --web  # or open in a browser
```

Builds: CI makes an Android APK and a Netlify web deploy (see the root README); `eas.json` holds the EAS profiles for store builds.

## What is here

- `src/app/` screens (Expo Router): `index` poster menu, `game`, `pause`, `win`, `over`, `settings`, `howto` (rules in five pages).
- `src/game/` the running game: `engine.js` (the rules), `store.tsx` (game and record), `lessons.ts` (the tutorial), `slide.ts` (sweep animation moves), `seen.ts` (sweep moments play big only the first few times).
- `src/components/Field.tsx` the one renderer for every grid: board, tray pieces, cover, lesson art. Same-value touching tiles form a field: thick lines between fields, thin folds inside.
- `src/components/` also: `Block`, `TileNum`, `Track` (the ladder), `Formula` (lesson formulas), `Overlay`, `ui.tsx` (buttons, toggles, wordmark), `icons.tsx`.
- `src/design/` `tokens.ts` colours (light/dark) and `rank`/`pairs` helpers, `system.ts` spacing, type and motion, `theme.tsx` settings, `mock.ts` still scenes and the menu's cover.
- `src/i18n/` Russian and English strings. The language follows the device (Russian for ru, be, kk, ky) and can be switched in the settings.
- `src/sound/` `sfx.ts` game sounds and haptics, `music.ts` background music, `webAudio.ts` playback through Web Audio on the web (Safari).
- Identity: poster menu (`src/brand/`), Dela Gothic One for display, Onest for text (both Cyrillic), both from @expo-google-fonts.

## Rules and saving

The game runs `src/game/engine.js`, a verbatim copy of `prototype/engine.js` (the engine the tests and the balance simulator use; `npm test` at the repo root fails if the copy drifts), with the `CASCADE` balance: one sweep per tray, one more for a chain of three merges, two at most in hand. `src/game/store.tsx` holds the running game and the record, saved to AsyncStorage after every move, so closing the app never loses a game. A placement shows the laid piece, then each merge of the chain one beat apart with its note, and the board stays playable while a chain runs. Holding a piece shows how far each spot's chain would run and whether it earns a sweep.

## Tutorial

The first game teaches itself (`src/game/lessons.ts`): no cards, one thing at a time on a board that grows from 2×2 to 4×4 to the full 6×6. It teaches `1 + 2 = 3`, the first chain, choosing the longer chain, building one and firing it, the swipe, and the 2×2 square, then the game carries on from that board. A wrong move replays the step. Lessons can be skipped from the pause menu and replayed from Settings → Help; the rules pages are there too.

## Settings

Theme (system, light, dark), language (system, Русский, English), sound, music, vibration and hints, all saved on the device. The record (best score) can be wiped from the same screen.

## Sound

The board's sounds are synthesised by `scripts/make-sounds.py` (numpy only) into `assets/sounds/*.wav`; they use no samples. Placing, sweeps and the wall knock match the music (`scripts/music/make-stings.py`): a short low marimba note per piece size, a cabasa roll that swells as the blocks speed up, and a soft felt thump when they hit the wall. Merges, milestones, the win and game over are played by the music's band (`scripts/music/make-stings.py`): a vibraphone climbing the C major pentatonic one step per merge of a chain, D5 upwards, so a cascade audibly climbs, and the music steps back for a moment under a long chain, a new best and the win. `src/sound/sfx.ts` plays them with the matching haptic, follows the Sound and Vibration settings, respects the silent switch and mixes with other apps' audio. On the web, sounds go through Web Audio (`src/sound/webAudio.ts`) so Safari plays them without lag.

Background music is "Blocks", one 71-second loop from `scripts/music/run.py` (22 kHz mono WAV, loops without a gap): a small wooden band on a 3+3+2 groove at 108 BPM, one bar per move, with marimba, upright bass, a clarinet tune and a bassoon answer, all in C major and below the merge notes. The music and its stings are made from samples: General MIDI instruments from FluidR3_GM (MIT licence), rendered offline with FluidSynth. It has its own Music toggle, fades in and out and dims on pause.

## Playable link

`scripts/build-playable.py` packs a web export into one self-contained HTML file (bundle, fonts and sounds inlined) that runs from any static host or a claude.ai artifact.

## Other scripts

- `scripts/make-icons.py` draws the app icon, the iOS dark and tinted variants, the Android adaptive icon, the splash and the favicon.
- `scripts/patch-native.js` runs after every install and patches `react-native-view-shot` so the iOS build compiles on React Native 0.88.
