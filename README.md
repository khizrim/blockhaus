# blockhaus

A merge puzzle on a 6×6 board. Drag pieces from a tray of three onto the board; a cell that lands beside a partner merges with it, and merges cascade.

- **Pairing (Threes economy):** `1 + 2 → 3`, then equals double: `3 → 6 → 12 → 24 → 48 → 96`. `1 + 1` and `2 + 2` do not merge.
- **Sweeps:** two per tray. A sweep slides the whole board one way, 2048-style, merging pairs that meet.
- **Deck:** singles, dominoes and trominoes; 1s and 2s dealt 50/50, never an all-same tray.

## Prototype

`prototype/index.html` is the current playable prototype, a single self-contained page. Open it in a browser.

## Next

- Split into a pure rules engine with tests, a balance simulator, and the UI.
- Make the game winnable.
- Wrap in Expo and ship an Android build.
