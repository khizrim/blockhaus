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

## Sweeps that fold the whole line (2026-11-01)

`node sim/simulate.js 500 shipped shippedChain`, with the goal at 192. `shippedChain` lets a tile merged by a sweep merge again with the next tile in its line (3 3 6 → 12, 1 2 3 → 6), instead of once per sweep as in 2048. It is now the shipped rule (`sweepChain: true`).

| | casual moves | regular moves | regular win% | expert moves | expert win% | expert win@ |
|---|---|---|---|---|---|---|
| once per sweep | 47 | 119 | 25 | 185 | 55 | 122 |
| fold the line | 52 | 125 | 28 | 197 | 58 | 118 |

A small, even lift: about three points of win rate and a few moves longer for every profile. The bot sweeps only when a sweep beats its best placement and never sets a fold up, so a player who builds lines for it will gain more than this.

## Free sweeps and a higher goal (2026-11-01)

`SWEEPERS=1 node sim/simulate.js 200 limited freeNone freeMerge spawn192 spawn384 spawn768`. Win % against each variant's own goal. The `sw*` profiles are a new bot that may swipe before each piece (it tries every sweep, then the best placement on the board that leaves); they are far stronger than the naive bots, and a person who swipes a lot sits between the two families.

| | goal | casual | regular | expert | swCasual | swRegular | swExpert | swExpert moves |
|---|---|---|---|---|---|---|---|---|
| limited (before) | 192 | 1 | 26 | 59 | 96 | 100 | 100 | 1049 |
| free, no price | 768 | 0 | 1 | 1 | 58 | 97 | 99 | 1637 |
| free, merge only | 768 | 0 | 1 | 1 | 0 | 3 | 6 | 221 |
| **free, new tile per sweep** | 192 | 1 | 35 | 66 | 91 | 98 | 100 | 446 |
| **free, new tile per sweep** | **384** | 0 | 4 | 27 | 56 | 92 | 97 | 446 |
| free, new tile per sweep | 768 | 0 | 1 | 3 | 10 | 62 | 75 | 446 |

- **Sweeps with no price break the game**: a swiping player reaches 1536 and runs past 1600 pieces. The game never really ends.
- **"Only if it merges"** is the opposite: a swipe can no longer make room, and the swiping bots fall below the naive ones.
- **First shipped, then replaced: every sweep slides a new 1 or 2 in from the edge the tiles left** (`sweepCost: 'spawn'`, as in Threes). Swiping is free but fills the board, so games end; a swiping player's runs are less than half as long as with counted sweeps (which, with two per tray plus chain bonuses, already let the bot swipe almost every piece).
- **Goal 384**: for a player who swipes it is a little harder than 192 was with counted sweeps (swCasual 96% → 56%), and the naive players rarely get there. 768 would be out of reach for most.

Game of the day (30 pieces, 6 start tiles), 400 runs: with spawn, scores rise 10% (casual) to 45% (swiping bots).

**Shipped after Khizri's pick (2026-11-01): a sweep goes only if it merges** (`sweepCost: 'merge'`), no new tiles. Goal stays 384, which makes it a long climb: at 384 swCasual 6%, swRegular 23%, swExpert 40%, regular 8% (100-game run in the thread; at 192 they would be 46 / 65 / 82 / 31%). The milestones on the way carry the motivation. Game-of-the-day scores barely move under this rule (regular median 357 vs 354), so the medals stay at 250 / 350 / 450.

## Sweeps that never refuse (2026-11-01)

Merge-only sweeps refused any swipe that merged nothing, and players felt the game holding them back. Shipped now: every swipe goes, and after the slide the first unused tray piece rides in from the edge the tiles left, as near the middle as it fits, and merges as if placed (`sweepCost: 'push'`). A swipe is a move: it spends a piece. `SWEEPERS=1 node sim/simulate.js 200 freePush freeMerge`, win % at 384:

| rule | casual | regular | expert | swCasual | swRegular | swExpert |
|---|---|---|---|---|---|---|
| push (shipped) | 0 | 2 | 6 | 15 | 36 | 53 |
| merge-only (before) | 0 | 7 | 22 | 4 | 21 | 40 |

A player who swipes does better than before; one who only places loses a little. Also tried: `tilt` (tiles slide, nothing merges on a sweep) no bot reached 96, so it was dropped. The game still ends: a swipe counts toward the end check only if it merges or the piece can land.

The daily (30 pieces) scores come down because swipes spend pieces: medals 250 / 330 / 420 (were 250 / 350 / 450).

## A cascade pays more (2026-11-01)

Points used to be the plain sum of merge levels, so a five-merge cascade scored the same as five merges made one by one. Shipped now: in a placed piece's cascade (the hand's or the one a swipe pushes in) the third and fourth merge score their level ×2 and the fifth and later ×3 (`chainScore: [1, 1, 2, 2, 3]`). Merges made by the slide of a sweep score plain.

First tried ×2 from the second merge and ×3 from the third (`[1, 2, 3]`). Cascades of three or more merges happen in 32–40% of placements, mostly on their own (1+2=3, then 3+3, then 6+6), so that curve lifted every score alike: the bonus made 40% of a casual bot's points and 30% of an expert's, and the expert/casual score gap shrank. Scores of the same 120 classic games per profile under each curve (bots don't aim for cascades, so tile play is identical):

| curve | casual | regular | expert | swRegular | expert / casual | swRegular / regular |
|---|---|---|---|---|---|---|
| none | 438 | 1557 | 2325 | 4008 | 5.3× | 2.6× |
| [1, 2, 3] | 729 | 2250 | 3372 | 5148 | 4.6× | 2.3× |
| **[1, 1, 2, 2, 3]** | 552 | 1818 | 2808 | 4500 | 5.1× | 2.5× |

`node sim/daily.js 300 - 1,1,2,2,3`, game of the day: median regular 342 → 402, casual 258 → 318. Medals kept at the same share of runs (all six profiles pooled): 250 / 330 / 420 → 300 / 380 / 500.

## Sweeps earned by cascades, weekday dailies (2026-11-01)

A second rule set for the free game, `engine.CASCADE`, chosen from nine
variants (doc "Blockhaus: развитие механики и вовлечения"): each tray brings
one sweep, a placed cascade of four merges or more earns one more, two at
most in hand, a sweep is a plain slide. `SWEEPERS=1 node sim/simulate.js 100 shipped cascade`:

| | expert 384 | swExpert 384 |
|---|---|---|
| shipped (free push sweeps) | 3% | 51% |
| cascade | 16% | 15% |

The placing player and the swiping one end up level: a sweep is bought by
placing well.

Weekday rules of the game of the day (`engine.WEEKDAY`), medal lines from
`node sim/daily.js 400 weekdays`, each kept at the plain day's share of runs
(the plain lines scaled by the rule's percentile over the plain one):

| rule | day | bronze | silver | gold |
|---|---|---|---|---|
| plain | Tue, Thu, Sat | 300 | 380 | 500 |
| domino | Mon | 330 | 400 | 530 |
| stone | Wed | 210 | 310 | 460 |
| still (no sweeps) | Fri | 160 | 200 | 290 |
| big start | Sun | 450 | 510 | 860 |

## The bigger tile takes the smaller in (2026-11-02)

A placed merge used to stay in the laid cell: a 1 laid by a 2 made its 3 where the 1 went, and every cascade ran into the laid cell. Players expected the opposite. Now the bigger of the two takes the smaller in, and of two equals the tile already on the board takes the newcomer (`absorb: 'big'`; `'new'` is the old rule). A cascade walks along the tiles it eats.

Lab run (copy of the engine, naive bot "новичок", sweeper bot "свайпер", 200 games each), share of games reaching a tile:

| | old rule | bigger takes smaller |
|---|---|---|
| No sweeps: 24 / 48 | 10% / 0% | 38% / 2% |
| Free sweeps, naive: 384 | 4% | 4% |
| Free sweeps, sweeper: 384 | 56% | 70% |
| Cascade sweeps, naive: 384 | 4% | 4% |
| Cascade sweeps, sweeper: 384 | 18% | 75% |

A beginner sees no difference; a player who plans gets a good deal further, most of all in the cascade mode, whose goal may want raising later.

Daily medals (`node sim/daily.js 300 weekdays`, new rule over old, each line scaled by its own ratio): plain 300/380/500 → 310/390/670, domino 330/400/530 → 350/410/670, stone 210/310/460 → 220/320/580, still 160/200/290 → 180/240/350, big 450/510/860 → 450/520/960.
