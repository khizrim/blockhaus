/* Blockhaus rules engine.

   Pure game logic with no DOM: the prototype page, the tests and the balance
   simulator all run this same file. It loads as a plain <script> (exposing
   `BlockhausEngine`) so the page still opens straight from disk, and as a
   CommonJS module under Node.

   Everything that is a balance decision lives in a config object, so the
   simulator can try a variant without touching the rules. DEFAULTS is the
   shipped balance; ORIGINAL is the balance this engine was extracted from,
   kept so the two can be measured side by side.                           */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BlockhausEngine = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const N = 6;

  /* ---- shapes ------------------------------------------------------------
     Cells as [dx, dy]. Each entry carries a weight; a piece's shape is drawn
     in proportion to it.                                                   */
  const S = {
    single: [[0, 0]],
    domH: [[0, 0], [1, 0]],
    domV: [[0, 0], [0, 1]],
    triH: [[0, 0], [1, 0], [2, 0]],
    triV: [[0, 0], [0, 1], [0, 2]],
    l1: [[0, 0], [1, 0], [0, 1]],
    l2: [[0, 0], [1, 0], [1, 1]],
    l3: [[0, 0], [0, 1], [1, 1]],
    l4: [[1, 0], [0, 1], [1, 1]],
  };

  // The prototype's mix: 2 singles, 6 dominoes, 6 trominoes out of 14.
  const ORIGINAL_SHAPES = [
    [S.single, 2], [S.domH, 3], [S.domV, 3],
    [S.triH, 1], [S.triV, 1], [S.l1, 1], [S.l2, 1], [S.l3, 1], [S.l4, 1],
  ];

  const ORIGINAL = {
    shapes: ORIGINAL_SHAPES,
    sweepsPerTray: 2,
    // How a piece's value is picked: 'coin' is 50/50 per piece.
    dealer: 'coin',
    // Re-roll an all-same tray so it holds both values.
    mixedTray: true,
    // Chance that a multi-cell piece mixes 1s and 2s cell by cell (0 = never).
    mixedPieces: 0,
    // Cell-count gap a tray may carry between 1s and 2s (0/false = unchecked).
    balancedTray: 0,
    // Chance that a single comes as a 3 instead of a 1 or 2.
    threeChance: 0,
    // A placement whose chain makes at least this many merges earns a sweep
    // (0 = never), up to sweepsMax in hand. Earned sweeps outlast the tray.
    chainBonus: 0,
    sweepsMax: 2,
    // The game ends after this many pieces are placed (0 = no limit): the
    // short game of the day.
    pieceLimit: 0,
    // Tiles (3 to 24) set on the board before the first tray: the prepared
    // position of the game of the day (0 = an empty board).
    startTiles: 0,
    // The values those start tiles are drawn from.
    startPool: [3, 3, 3, 6, 6, 12, 12, 24],
    // Cells that hold a stone (STONE) from the start: nothing is placed on
    // a stone, nothing merges with it, and a sweep stops at it as at a wall.
    stones: [],
    // A tile merged by a sweep may merge again with the next tile in its
    // line (3 3 6 -> 12), instead of once per sweep as in 2048.
    sweepChain: false,
    // Sweeps cost nothing and never run out. The game then ends when no
    // piece fits and no sweep would merge or open room for one.
    freeSweeps: false,
    // What keeps free sweeps honest. 'spawn': every sweep slides a new 1 or
    // 2 in from the far edge, as in Threes and 2048, so swiping fills the
    // board. 'merge': a sweep is allowed only if it merges something.
    // 'none': sweeps are truly free (too easy, kept to measure).
    sweepCost: 'none',
    // A placement's cascade pays more the longer it runs: its k-th merge
    // scores its level times chainScore[k-1], the last entry repeating
    // (empty = every merge scores its level). Merges made by the slide of a
    // sweep score plain, so the bonus rewards setting a cascade up, not
    // swiping.
    chainScore: [],
    goal: 192,
  };

  /* ---- pairing ------------------------------------------------------------
     Threes' economy: 1 + 2 makes 3, and from 3 upward equals double.       */
  const pairs = (a, b) => (a === 1 && b === 2) || (a === 2 && b === 1) || (a >= 3 && a === b);
  /** A stone: a cell that is taken but holds no tile. */
  const STONE = -1;
  const merged = (a, b) => (a >= 3 ? a * 2 : 3);
  const rank = v => (v === 1 ? 1 : v === 2 ? 2 : Math.min(11, 3 + Math.round(Math.log2(v / 3))));

  const idx = (x, y) => y * N + x;
  function neighbours(i) {
    const x = i % N, y = (i / N) | 0, out = [];
    if (x > 0) out.push(i - 1);
    if (x < N - 1) out.push(i + 1);
    if (y > 0) out.push(i - N);
    if (y < N - 1) out.push(i + N);
    return out;
  }

  /* ---- pieces -------------------------------------------------------------
     A piece is a list of cells, each [dx, dy, value]. Most pieces hold one
     value throughout; the dealer decides.                                  */
  const size = p => ({
    w: Math.max(...p.cells.map(c => c[0])) + 1,
    h: Math.max(...p.cells.map(c => c[1])) + 1,
  });

  function fits(board, piece, ox, oy) {
    return piece.cells.every(([dx, dy]) => {
      const x = ox + dx, y = oy + dy;
      return x >= 0 && y >= 0 && x < N && y < N && board[idx(x, y)] === 0;
    });
  }

  /** Lays `piece` on `board` (mutating it) and resolves the merges.
      Every laid cell that sits beside a partner merges into it, and a tile
      that has just merged gets another look, so merges cascade. */
  function applyPlacement(board, piece, ox, oy) {
    const laid = piece.cells.map(([dx, dy]) => idx(ox + dx, oy + dy));
    piece.cells.forEach(([, , v], k) => { board[laid[k]] = v; });

    const steps = [];
    const taken = new Set();
    const frontier = [...laid];
    while (frontier.length) {
      const i = frontier.shift();
      if (board[i] === 0) continue;
      const partner = neighbours(i).find(n => !taken.has(n) && board[n] > 0 && pairs(board[i], board[n]));
      if (partner === undefined) continue;
      taken.add(partner);
      const lvl = merged(board[i], board[partner]);
      steps.push({ absorbed: [partner], anchor: i, level: lvl });
      board[partner] = 0;
      board[i] = lvl;
      frontier.push(i);
    }
    return { laid, steps };
  }

  /* ---- sweeping ----------------------------------------------------------
     A 2048 slide: everything shifts one way and pairs that meet combine.   */
  function lanes(dir) {
    const out = [];
    for (let a = 0; a < N; a++) {
      const lane = [];
      for (let b = 0; b < N; b++) {
        if (dir === 'left') lane.push(a * N + b);
        else if (dir === 'right') lane.push(a * N + (N - 1 - b));
        else if (dir === 'up') lane.push(b * N + a);
        else lane.push((N - 1 - b) * N + a);
      }
      out.push(lane);
    }
    return out;
  }

  /** Collapses one lane's tiles (values in order, nearest the wall first).
      Each result tile records which inputs went into it and the levels of
      the merges that made it, in the order they happen.

      Without `chain` it is the 2048 rule: a tile merges at most once per
      sweep, so 3 3 6 gives 6 6. With `chain` a tile that has just merged
      can merge again with the next one in line, so 3 3 6 gives 12, and
      the lane keeps folding until no two neighbours pair. */
  function collapse(vals, chain) {
    const out = [];
    vals.forEach((v, k) => {
      out.push({ v, from: [k], levels: [] });
      while (out.length > 1) {
        const a = out[out.length - 2], b = out[out.length - 1];
        if (!pairs(a.v, b.v) || (!chain && (a.levels.length || b.levels.length))) break;
        const lvl = merged(a.v, b.v);
        out.pop();
        a.v = lvl;
        a.from.push(...b.from);
        a.levels.push(...b.levels, lvl);
      }
    });
    return out;
  }

  /** The lanes of a sweep, cut at stones: each run of free-or-tiled cells
      between the walls and the stones, nearest the wall first. */
  function laneRuns(board, dir) {
    const out = [];
    for (const lane of lanes(dir)) {
      let run = [];
      for (const i of lane) {
        if (board[i] === STONE) { if (run.length) out.push(run); run = []; } else run.push(i);
      }
      if (run.length) out.push(run);
    }
    return out;
  }

  /** Slides `board` (mutating it). Returns the merges and whether anything
      moved. `chain` lets a merged tile merge again (see collapse). */
  function applySweep(board, dir, chain, slideOnly) {
    const before = board.join();
    const made = [];
    for (const lane of laneRuns(board, dir)) {
      const vals = lane.map(i => board[i]).filter(v => v !== 0);
      // slideOnly: the board tilts, tiles slide to the wall, nothing merges.
      const out = slideOnly ? vals.map((v, k) => ({ v, from: [k], levels: [] })) : collapse(vals, chain);
      out.forEach((t, k) => t.levels.forEach(level => made.push({ at: lane[k], level })));
      lane.forEach((i, k) => { board[i] = out[k] ? out[k].v : 0; });
    }
    return { made, moved: board.join() !== before };
  }

  /* ---- dealing ------------------------------------------------------------ */
  function pickShape(cfg, rng) {
    const total = cfg.shapes.reduce((s, [, w]) => s + w, 0);
    let r = rng() * total;
    for (const [shape, w] of cfg.shapes) { if ((r -= w) < 0) return shape; }
    return cfg.shapes[cfg.shapes.length - 1][0];
  }

  /** Chance the next piece is made of 1s. 'coin' is always a half. 'need'
      leans toward whichever low value the board is short of: every merge at
      the bottom eats one 1 and one 2, so a board with ten 2s and two 1s wants
      1s, and dealing more 2s only buries it. */
  function chanceOfOnes(cfg, board) {
    if (cfg.dealer !== 'need') return 0.5;
    let ones = 0, twos = 0;
    for (const v of board) { if (v === 1) ones++; else if (v === 2) twos++; }
    const k = cfg.needSmoothing ?? 2;
    const p = (twos + k) / (ones + twos + 2 * k);
    const lo = cfg.needFloor ?? 0.15;
    return Math.min(1 - lo, Math.max(lo, p));
  }

  function deal(cfg, board, rng) {
    const shape = pickShape(cfg, rng);
    if (shape.length === 1 && cfg.threeChance && rng() < cfg.threeChance) {
      return { cells: [[0, 0, 3]], used: false };
    }
    let v = rng() < chanceOfOnes(cfg, board) ? 1 : 2;
    if (shape.length > 1 && cfg.mixedPieces && rng() < cfg.mixedPieces) {
      // A checkerboard of the two low values. Cells of a piece that touch
      // each other would merge on landing, so the pattern alternates by
      // parity: adjacent cells always differ, and the piece pairs with
      // itself the moment it lands.
      return { cells: shape.map(([x, y]) => [x, y, (x + y) % 2 === 0 ? v : 3 - v]), used: false };
    }
    return { cells: shape.map(([x, y]) => [x, y, v]), used: false };
  }

  /** A uniform value for a piece, or null if it mixes values. */
  const pieceValue = p => (p.cells.every(c => c[2] === p.cells[0][2]) ? p.cells[0][2] : null);

  function dealTray(cfg, board, rng) {
    const tray = [deal(cfg, board, rng), deal(cfg, board, rng), deal(cfg, board, rng)];
    if (cfg.mixedTray) {
      const vals = tray.map(pieceValue);
      if (vals.every(v => v !== null && (v === 1 || v === 2) && v === vals[0])) {
        const p = tray[(rng() * tray.length) | 0];
        const flip = vals[0] === 1 ? 2 : 1;
        p.cells = p.cells.map(([x, y]) => [x, y, flip]);
      }
    }
    if (cfg.balancedTray) balanceTray(tray, cfg.balancedTray);
    return tray;
  }

  /** Counts cells, not pieces: a tray of an L of 2s, a domino of 2s and a
      single 1 passes the mixed-tray rule while laying five 2s against one 1.
      Flips whole uniform pieces from the heavier value to the lighter one
      while that narrows the gap, until the gap is at most `slack` cells. */
  function balanceTray(tray, slack) {
    for (let guard = 0; guard < 3; guard++) {
      let ones = 0, twos = 0;
      for (const p of tray) for (const c of p.cells) { if (c[2] === 1) ones++; else if (c[2] === 2) twos++; }
      const gap = twos - ones;
      if (Math.abs(gap) <= slack) return;
      const heavy = gap > 0 ? 2 : 1;
      // The piece whose flip lands closest to even.
      let best = null;
      for (const p of tray) {
        if (pieceValue(p) !== heavy) continue;
        const after = Math.abs(gap - Math.sign(gap) * 2 * p.cells.length);
        if (after < Math.abs(gap) && (!best || after < best.after)) best = { p, after };
      }
      if (!best) return;
      best.p.cells = best.p.cells.map(([x, y]) => [x, y, 3 - heavy]);
    }
  }

  /* ---- game state --------------------------------------------------------- */
  function newGame(config, rng = Math.random) {
    const cfg = { ...DEFAULTS, ...config };
    const g = {
      cfg, rng,
      board: new Array(N * N).fill(0),
      tray: [], sweeps: cfg.sweepsPerTray,
      score: 0, merges: 0, bestTile: 0, moves: 0,
      won: false, over: false,
    };
    for (const i of cfg.stones || []) g.board[i] = STONE;
    if (cfg.startTiles) setStart(g.board, cfg.startTiles, rng, cfg.startPool);
    g.tray = dealTray(cfg, g.board, rng);
    g.bestTile = Math.max(0, ...g.board);
    return g;
  }

  /** Scatters `count` tiles from 3 to 24, never two equal side by side, so
      the position starts calm and every pair is the player's to make. */
  function setStart(board, count, rng, pool = [3, 3, 3, 6, 6, 12, 12, 24]) {
    for (let k = 0, guard = 0; k < count && guard < 500; guard++) {
      const i = Math.floor(rng() * N * N);
      const v = pool[Math.floor(rng() * pool.length)];
      if (board[i] || neighbours(i).some(j => board[j] === v)) continue;
      board[i] = v;
      k++;
    }
  }

  function canPlaceAnywhere(board, piece) {
    const { w, h } = size(piece);
    for (let y = 0; y <= N - h; y++) for (let x = 0; x <= N - w; x++) if (fits(board, piece, x, y)) return true;
    return false;
  }

  /** The game ends when no unused piece fits and no sweep is left that would
      move anything. A sweep can rearrange the board so a piece fits again, so
      while one is in hand and it would move tiles, the game goes on. */
  const DIRS = ['left', 'right', 'up', 'down'];
  const canSweep = g => {
    if (g.cfg.freeSweeps) {
      // Free sweeps would keep any board with a gap alive forever, so only a
      // sweep that merges, or that makes room for a piece in hand, counts.
      return DIRS.some(d => {
        const b = g.board.slice();
        const r = applySweep(b, d, g.cfg.sweepChain, g.cfg.sweepCost === 'tilt');
        if (!r.moved) return false;
        if (g.cfg.sweepCost === 'spawn') return true;
        if (g.cfg.sweepCost === 'push') return r.made.length > 0 || pushSpot(b, g.tray.find(p => p && !p.used), d) !== null;
        if (g.cfg.sweepCost === 'merge') return r.made.length > 0;
        return r.made.length > 0 || g.tray.some(p => p && !p.used && canPlaceAnywhere(b, p));
      });
    }
    return g.sweeps > 0 && DIRS.some(d => applySweep(g.board.slice(), d, g.cfg.sweepChain).moved);
  };
  const anyMove = g =>
    !(g.cfg.pieceLimit && g.moves >= g.cfg.pieceLimit) &&
    (g.tray.some(p => p && !p.used && canPlaceAnywhere(g.board, p)) || canSweep(g));

  /** Adds a move's merges to the score. `steps` are {level} objects; each
      gets `pts`, the points it scored. With `cascade`, the k-th one is worth
      its level times cfg.chainScore[k-1] (the last entry repeats). */
  function score(g, steps, cascade) {
    const m = (cascade && g.cfg.chainScore) || [];
    steps.forEach((st, k) => {
      const lvl = st.level;
      st.pts = lvl * (m.length ? m[Math.min(k, m.length - 1)] : 1);
      g.score += st.pts;
      g.merges++;
      if (lvl > g.bestTile) g.bestTile = lvl;
    });
    if (g.bestTile >= g.cfg.goal) g.won = true;
  }

  /** Places tray piece `slot` at (ox, oy). Returns null if it doesn't fit. */
  function place(g, slot, ox, oy) {
    const p = g.tray[slot];
    if (!p || p.used || g.over || !fits(g.board, p, ox, oy)) return null;
    const res = applyPlacement(g.board, p, ox, oy);
    p.used = true;
    g.moves++;
    score(g, res.steps, true);
    res.bonus = !g.cfg.freeSweeps && !!g.cfg.chainBonus && res.steps.length >= g.cfg.chainBonus && g.sweeps < g.cfg.sweepsMax;
    if (res.bonus) g.sweeps++;
    res.refilled = false;
    if (g.tray.every(t => t.used)) {
      g.tray = dealTray(g.cfg, g.board, g.rng);
      g.sweeps = Math.max(g.sweeps, g.cfg.sweepsPerTray);
      res.refilled = true;
    }
    g.over = !anyMove(g);
    return res;
  }

  /** After a sweep, a new 1 or 2 slides in at the edge the tiles moved
      away from, on a random free cell of that edge. The value follows the
      dealer, so it is usually the low value the board is short of. */
  function spawnAfter(g, dir) {
    const far = lanes(dir).map(l => l[N - 1]).filter(i => g.board[i] === 0);
    if (!far.length) return null;
    const at = far[Math.floor(g.rng() * far.length)];
    const v = g.rng() < chanceOfOnes(g.cfg, g.board) ? 1 : 2;
    g.board[at] = v;
    return { at, value: v };
  }

  /** After a sweep, the next piece in the tray slides onto the board from
      the edge the tiles moved away from, as close to the middle of that edge
      as it fits, and merges as if placed there. The player sees it coming. */
  function pushSpot(board, p, dir) {
    if (!p) return null;
    const { w, h } = size(p);
    const spots = [];
    if (dir === 'left' || dir === 'right') {
      const ox = dir === 'left' ? N - w : 0;
      for (let oy = 0; oy <= N - h; oy++) spots.push([ox, oy, Math.abs(oy + h / 2 - N / 2)]);
    } else {
      const oy = dir === 'up' ? N - h : 0;
      for (let ox = 0; ox <= N - w; ox++) spots.push([ox, oy, Math.abs(ox + w / 2 - N / 2)]);
    }
    spots.sort((a, b) => a[2] - b[2]);
    return spots.find(([x, y]) => fits(board, p, x, y)) || null;
  }
  function pushAfter(g, dir) {
    const slot = g.tray.findIndex(p => p && !p.used);
    if (slot < 0) return null;
    const p = g.tray[slot];
    const at = pushSpot(g.board, p, dir);
    if (!at) return null;
    const res = place(g, slot, at[0], at[1]);
    return res ? { slot, piece: p, ox: at[0], oy: at[1], ...res } : null;
  }

  /** Sweeps the board. Returns null if no sweeps are left or nothing would move. */
  function sweep(g, dir) {
    if ((!g.cfg.freeSweeps && g.sweeps <= 0) || g.over) return null;
    const trial = g.board.slice();
    const res = applySweep(trial, dir, g.cfg.sweepChain, g.cfg.freeSweeps && g.cfg.sweepCost === 'tilt');
    if (!res.moved) return null;
    if (g.cfg.freeSweeps && g.cfg.sweepCost === 'merge' && !res.made.length) return null;
    g.board = trial;
    if (!g.cfg.freeSweeps) g.sweeps--;
    res.spawned = g.cfg.freeSweeps && g.cfg.sweepCost === 'spawn' ? spawnAfter(g, dir) : null;
    res.swept = g.board.slice();
    res.pushed = g.cfg.freeSweeps && g.cfg.sweepCost === 'push' ? pushAfter(g, dir) : null;
    score(g, res.made, false);
    g.over = !anyMove(g);
    return res;
  }

  /** Small seeded RNG (mulberry32) so runs can be replayed. */
  function seeded(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* The shipped balance, chosen with sim/simulate.js (numbers in
     sim/RESULTS.md). Two changes from the prototype:

     - The dealer reads the board. Every bottom merge eats one 1 and one 2,
       so whichever value is short on the board is the one dealt more often
       (never above 85%). A coin flip let a run of 2-pieces bury the board in
       2s that nothing could pair with.
     - Fewer three-cell pieces: a quarter of draws instead of three sevenths.
       A placement lays all its cells and a merge clears one, so piece size
       is what sets how fast the board drowns.

     Against the prototype, a mid-skill bot's median run goes from 52 moves
     to about 115, and its chance of making a 96 from 17% to about 65%. */
  const SHIPPED_SHAPES = [
    [S.single, 3], [S.domH, 3], [S.domV, 3],
    [S.triH, 0.5], [S.triV, 0.5], [S.l1, 0.5], [S.l2, 0.5], [S.l3, 0.5], [S.l4, 0.5],
  ];
  // A sweep folds each line all the way, the way a placement cascades.
  // Sweeps never run out, but a sweep goes only if it merges something:
  // no new tiles come in, and a swipe can no longer just shuffle the board
  // to make room. The goal goes one rung up, to 384 (sim/RESULTS.md).
  // The chain bonus stays in the config but means nothing with free sweeps.
  const DEFAULTS = {
    ...ORIGINAL, dealer: 'need', shapes: SHIPPED_SHAPES, chainBonus: 2, sweepsMax: 3, sweepChain: true,
    freeSweeps: true, sweepCost: 'push', goal: 384,
    // A cascade from a placed piece pays ×2 for its third and fourth merge
    // and ×3 from the fifth (sim/RESULTS.md). The short chains that happen on
    // their own (1+2=3, then 3+3) score plain, so the bonus marks a long
    // cascade rather than lifting every score alike.
    chainScore: [1, 1, 2, 2, 3],
  };
  // The balance before free sweeps (2026-11-01): two per tray, a chain earns
  // one more, up to three; goal 192.
  const LIMITED = { ...DEFAULTS, freeSweeps: false, sweepCost: 'none', goal: 192 };
  // Sweeps earned by cascades (2026-11-01, a mode beside the free one): each
  // tray brings one sweep, a placed piece whose cascade makes four merges or
  // more earns another, two at most in hand. A sweep is a plain slide, no
  // piece rides in. Placing well is what buys a sweep, so the swiping player
  // no longer outplays the placing one by far (sim/RESULTS.md).
  const CASCADE = { ...DEFAULTS, freeSweeps: false, sweepCost: 'none', sweepsPerTray: 1, chainBonus: 4, sweepsMax: 2 };

  // The game of the day: thirty pieces on a board that starts with six
  // tiles. Some weekdays bend one rule, the same for everyone that day
  // (keys are Date.getDay(): 0 Sunday … 6 Saturday).
  const DAILY = { pieceLimit: 30, startTiles: 6 };
  const WEEKDAY = {
    // Monday: dominoes only.
    1: { rule: 'domino', shapes: [[S.domH, 1], [S.domV, 1]] },
    // Wednesday: two stones in the middle of the board.
    3: { rule: 'stone', stones: [14, 21] },
    // Friday: no sweeps, placing only.
    5: { rule: 'still', freeSweeps: false, sweepCost: 'none', sweepsPerTray: 0, chainBonus: 0, sweepsMax: 0 },
    // Sunday: the board starts with big tiles.
    0: { rule: 'big', startTiles: 8, startPool: [12, 12, 24, 24, 48] },
  };

  return {
    N, SHAPES: S, ORIGINAL, DEFAULTS, LIMITED, CASCADE, DAILY, WEEKDAY, ORIGINAL_SHAPES, STONE,
    pairs, merged, rank, idx, neighbours, size, fits, pieceValue,
    applyPlacement, applySweep, collapse, lanes, laneRuns, chanceOfOnes, deal, dealTray,
    newGame, place, sweep, anyMove, canSweep, canPlaceAnywhere, seeded,
  };
});
