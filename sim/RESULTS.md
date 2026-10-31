# Balance results

`npm run sim` (`node sim/simulate.js 500`), same 500 seeds for every row.

The bot is greedy and one move deep. Three profiles, the same bot with more or less noise in its judgement:

- **casual** (noise 200): close to placing pieces at random among what fits. Ends where a first-time human did in testing, around 45 merges and a best tile of 12 to 24.
- **regular** (noise 60): finds most merges, misses some.
- **expert** (noise 10): sees every merge in the tray. Not a planner, so a thoughtful human can beat it.

Win means making a 96, the top of the ladder.

```
┌──────────────────────┬──────────────┬─────────────┬─────────────┬───────────────┬──────────────┬──────────────┬──────────────┬─────────────┬─────────────┬─────────────┬─────────────┬────────────┐
│ (index)              │ casual moves │ casual best │ casual win% │ regular moves │ regular best │ regular win% │ expert moves │ expert best │ expert win% │ expert ≥48% │ expert win@ │ casual 2s% │
├──────────────────────┼──────────────┼─────────────┼─────────────┼───────────────┼──────────────┼──────────────┼──────────────┼─────────────┼─────────────┼─────────────┼─────────────┼────────────┤
│ original             │ 31           │ 24          │ 1           │ 52            │ 48           │ 16           │ 62           │ 48          │ 28          │ 71          │ 60          │ 48         │
│ shipped              │ 47           │ 24          │ 4           │ 116           │ 96           │ 63           │ 176          │ 96          │ 84          │ 99          │ 69          │ 49         │
│ need                 │ 34           │ 24          │ 1           │ 71            │ 48           │ 35           │ 107          │ 96          │ 65          │ 92          │ 63          │ 49         │
│ light                │ 41           │ 24          │ 1           │ 71            │ 48           │ 27           │ 83           │ 48          │ 43          │ 79          │ 66          │ 47         │
│ cellTray             │ 33           │ 24          │ 1           │ 62            │ 48           │ 28           │ 79           │ 48          │ 46          │ 87          │ 60          │ 49         │
│ sweeps3              │ 29           │ 24          │ 1           │ 50            │ 48           │ 16           │ 59           │ 48          │ 29          │ 69          │ 59          │ 48         │
│ threes               │ 29           │ 24          │ 1           │ 50            │ 48           │ 13           │ 62           │ 48          │ 30          │ 73          │ 57          │ 47         │
│ mixed                │ 32           │ 24          │ 1           │ 50            │ 48           │ 13           │ 59           │ 48          │ 26          │ 71          │ 57          │ 50         │
│ shippedCellTray      │ 46           │ 24          │ 4           │ 113           │ 96           │ 61           │ 176          │ 96          │ 88          │ 100         │ 66          │ 50         │
│ shippedMixed         │ 52           │ 24          │ 8           │ 136           │ 96           │ 73           │ 215          │ 192         │ 91          │ 99          │ 66          │ 50         │
│ shippedMixedCellTray │ 56           │ 24          │ 13          │ 135           │ 96           │ 76           │ 194          │ 192         │ 88          │ 99          │ 63          │ 50         │
└──────────────────────┴──────────────┴─────────────┴─────────────┴───────────────┴──────────────┴──────────────┴──────────────┴─────────────┴─────────────┴─────────────┴─────────────┴────────────┘
```

## What it says

- **The dealer is the biggest lever.** The prototype flipped a coin for each piece, so a run of 2-pieces could bury the board in 2s that nothing pairs with. Dealing whichever low value the board is short of (`need`) doubles the regular player's win rate on its own, 16% to 35%.
- **Smaller pieces are the second.** A placement lays all its cells, a merge clears one, so piece size sets how fast the board fills. Cutting trominoes from 6 of 14 draws to a quarter (`light`) helps every profile, and it is the only single change that lengthens a casual run.
- **Together they compound** (`shipped`): regular 16% → 63% wins, expert 28% → 84%, casual median run 31 → 47 moves.
- **Things that didn't help:** a third sweep per tray, dealing 3s as singles, and pieces that mix 1s and 2s, each alone.
- **If it is still too hard:** `shippedMixed` or `shippedMixedCellTray` push casual wins to 8–13% and regular to about 75%. Mixed pieces carry two colours, so that one changes how the tray looks.
- **Leftover 1s vs 2s** at game end are close to even in every variant, so the board doesn't drown in 2s on average; the 2-fields seen in play were bad streaks, which the `need` dealer now corrects as they happen.
