# blockhaus

A merge puzzle on a 6×6 board. Drag pieces from a tray of three onto the board; a cell that lands beside a partner merges with it, and merges cascade into chains.

Play it on the web at https://blockhaus-game.netlify.app, or install the Android test build from the [`android-latest`](https://github.com/khizrim/blockhaus/releases/tag/android-latest) pre-release.

## Rules

These are the app's rules (`CASCADE` in the engine).

- **Pairing (Threes economy):** `1 + 2 → 3`, then equals double: `3 → 6 → 12 → 24 → 48 → 96 → 192 → 384 → 768 → …`. `1 + 1` and `2 + 2` do not merge. The bigger tile takes the smaller in.
- **Chains:** a tile that has just merged looks again for a partner, so one placement can climb several rungs. At a fork the chain climbs the longer ladder; a tie pulls toward the bottom-left. The third and fourth merges of a chain score double, the fifth and beyond triple.
- **Sweeps:** swipe in the direction that brings pairs together or clears room for a piece. A moving tile can merge several times in a line. A new tray replenishes an empty sweep key to one. A placement with three or more merges earns one sweep, up to three in reserve.
- **Deck:** the main game starts with singles and dominoes. A best tile of 48 unlocks trominoes for future deals, and 192 unlocks the 2×2 square. The dealer leans toward whichever of 1 and 2 has more open sides to pair with, never hands over an all-same tray, and shows the next tray's shapes ahead.
- **Personal best:** aim for 24, then for one rung above your best tile. A new record advances the target immediately. The run ends when no legal move remains.
- **Daily game:** the local date determines the starting board and random seed. One run of up to 30 pieces earns a medal by score. It can be paused and resumed independently of the main game.

## App

`app/` is the Expo app (iOS, Android, web): the full game on the rules engine, saved after every move, with a tutorial that teaches chains on a board that grows, sound, background music, haptics, light and dark themes, and Russian and English. See `app/README.md`.

## Rules engine, tests, simulator

- `prototype/engine.js`: the rules with no DOM, shared by the prototype page, the tests, the simulator and the app. Balance knobs are a config object: `CASCADE` is what the app plays, `DEFAULTS` the free-sweeps balance it builds on, `LIMITED` and `ORIGINAL` earlier balances kept to measure against, and `DAILY` and `WEEKDAY` a game of the day.
- `npm test`: engine tests (Node 18+, no dependencies). They also fail if the app's copy of the engine drifts from this one.
- `npm run sim`: plays seeded games with a greedy bot at three skill levels across the variants in `sim/variants.js`. Latest numbers and conclusions in `sim/RESULTS.md`.

## Prototype

`prototype/index.html` is the first playable prototype. Open it in a browser; it loads the rules from `prototype/engine.js` next to it.

## CI

- **Android APK** (`.github/workflows/android-apk.yml`): on pushes to `main` and `claude/**` that touch `app/`, builds a release APK signed with the debug key and publishes it to the `android-latest` pre-release. Store builds go through EAS (`app/eas.json`); the Google Play release steps are in `docs/release-android.md` and the listing in `docs/store-listing.md`.
- **Web** (`.github/workflows/web-netlify.yml`): exports the web build and deploys it to Netlify. `main` goes to production, each pull request gets a preview at `https://pr-<number>--blockhaus-game.netlify.app`. Needs the `NETLIFY_AUTH_TOKEN` secret.
