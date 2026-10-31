# blockhaus

A merge puzzle on a 6×6 board. Drag pieces from a tray of three onto the board; a cell that lands beside a partner merges with it, and merges cascade.

- **Pairing (Threes economy):** `1 + 2 → 3`, then equals double: `3 → 6 → 12 → 24 → 48 → 96`. `1 + 1` and `2 + 2` do not merge.
- **Sweeps:** two per tray. A sweep slides the whole board one way, 2048-style, merging pairs that meet.
- **Deck:** singles, dominoes and some trominoes (a quarter of draws). The dealer leans toward whichever of 1 and 2 the board is short of, and never hands over an all-same tray.
- **Goal:** make a 96. The run can carry on past it for score.

## Prototype

`prototype/index.html` is the playable prototype. Open it in a browser; it loads the rules from `prototype/engine.js` next to it.

## Rules engine, tests, simulator

- `prototype/engine.js`: the rules with no DOM, shared by the page, the tests and the simulator. Balance knobs are a config object; `DEFAULTS` is what ships, `ORIGINAL` is the first prototype's balance.
- `npm test`: engine tests (Node 18+, no dependencies).
- `npm run sim`: plays seeded games with a greedy bot at three skill levels across the variants in `sim/variants.js`. Latest numbers and conclusions in `sim/RESULTS.md`.

## Next

- Tune balance from play feedback.
- Wrap in Expo and ship an Android build.
