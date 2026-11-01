/* A greedy player for the balance simulator.

   One ply deep: it tries every placement of every piece in hand, plus every
   sweep it can afford, and takes whichever leaves the best-looking board. It
   is a stand-in for a careful but short-sighted human, which is enough to
   compare one balance against another; absolute numbers for a person who
   plans ahead will be higher.

   Two evaluators: `evaluate` scores the whole board (space, buried tiles,
   ready pairs), `naiveValue` just takes merges and packs pieces tight. The
   naive one turned out the stronger player, so the simulator's profiles all
   use it; `evaluate` stays for experiments. */
const E = require('../prototype/engine.js');
const { N } = E;

function evaluate(board, gained) {
  let empty = 0, buried = 0, pairsReady = 0, high = 0;
  for (let i = 0; i < N * N; i++) {
    const v = board[i];
    if (v === 0) { empty++; continue; }
    let open = false;
    for (const n of E.neighbours(i)) {
      const u = board[n];
      if (u === 0) open = true;
      else if (n > i && v >= 3 && u === v) pairsReady++;
    }
    // A tile walled in by tiles it can't pair with is dead until a sweep
    // frees it. Low tiles are cheap to lose, high ones hurt.
    if (!open) buried += v <= 2 ? 1 : 1.5;
    if (v >= 3) high += Math.log2(v / 3) + 1;
  }
  return gained * 1.0 + empty * 3 - buried * 4 + pairsReady * 2 + high * 0.5;
}

/* `noise` blurs the judgement: each candidate's score is jittered by up to
   that many points before the best is taken. 0 is the sharp player; around
   12 it plays like someone who sees merges but not the board, which is
   closer to a first-time human. */
/* The naive player is a model of someone new to the rules, playing it like a
   block puzzle: take the biggest merge on offer, and otherwise tuck the piece
   in snugly against what is already there. It never thinks about whether a
   tile can still be reached, and it doesn't sweep unless a sweep merges. */
function naiveValue(board, laid, gained) {
  let snug = 0;
  for (const i of laid) for (const n of E.neighbours(i)) if (board[n] !== 0 && !laid.includes(n)) snug++;
  const x = laid.map(i => i % N), y = laid.map(i => (i / N) | 0);
  const wall = x.filter(v => v === 0 || v === N - 1).length + y.filter(v => v === 0 || v === N - 1).length;
  return gained * 10 + snug + wall * 0.5;
}

function choose(g, noise = 0, naive = false) {
  let best = null;
  const jitter = () => (noise ? (g.rng() - 0.5) * 2 * noise : 0);
  g.tray.forEach((p, slot) => {
    if (!p || p.used) return;
    const { w, h } = E.size(p);
    for (let oy = 0; oy <= N - h; oy++) for (let ox = 0; ox <= N - w; ox++) {
      if (!E.fits(g.board, p, ox, oy)) continue;
      const b = g.board.slice();
      const { steps } = E.applyPlacement(b, p, ox, oy);
      const gained = steps.reduce((s, st) => s + st.level, 0);
      const val = (naive ? naiveValue(b, E.applyPlacement(g.board.slice(), p, ox, oy).laid, gained) : evaluate(b, gained)) + jitter();
      if (!best || val > best.val) best = { val, kind: 'place', slot, ox, oy };
    }
  });
  if (g.sweeps > 0) {
    for (const dir of ['left', 'right', 'up', 'down']) {
      const b = g.board.slice();
      const { made, moved } = E.applySweep(b, dir, g.cfg.sweepChain);
      if (!moved) continue;
      const gained = made.reduce((s, m) => s + m.level, 0);
      // A sweep has to beat the best placement outright, since it doesn't
      // spend a piece and the pieces still have to go somewhere.
      if (naive && !made.length) continue;
      const val = naive ? gained * 10 - 1 : evaluate(b, gained) - 1 + jitter();
      if (best && val > best.val) best = { val, kind: 'sweep', dir };
    }
  }
  return best;
}

/* A player for free sweeps, closer to how people play 2048: before each
   piece it may swipe once to line things up. It tries every sweep that
   moves (and none), then the best naive placement on the board that
   leaves, and takes the pair worth most. A sweep that merges counts its
   own merges too. With nothing placeable it swipes if that opens room. */
function chooseSweeper(g, noise = 0) {
  const jitter = () => (noise ? (g.rng() - 0.5) * 2 * noise : 0);
  let best = null;
  const options = [{ dir: null, board: g.board, gained: 0 }];
  for (const dir of g.cfg.freeSweeps || g.sweeps > 0 ? ['left', 'right', 'up', 'down'] : []) {
    const b = g.board.slice();
    const { made, moved } = E.applySweep(b, dir, g.cfg.sweepChain);
    // Only sweeps the engine would take: under 'merge' a sweep must merge.
    if (moved && !(g.cfg.sweepCost === 'merge' && !made.length)) options.push({ dir, board: b, gained: made.reduce((s, m) => s + m.level, 0) });
  }
  for (const o of options) {
    let placed = false;
    g.tray.forEach((p, slot) => {
      if (!p || p.used) return;
      const { w, h } = E.size(p);
      for (let oy = 0; oy <= N - h; oy++) for (let ox = 0; ox <= N - w; ox++) {
        if (!E.fits(o.board, p, ox, oy)) continue;
        placed = true;
        const b = o.board.slice();
        const { steps, laid } = E.applyPlacement(b, p, ox, oy);
        const gained = steps.reduce((s, st) => s + st.level, 0);
        // A sweep costs a little, so the player doesn't swipe for nothing.
        const val = naiveValue(b, laid, gained + o.gained) + (o.dir ? -0.5 : 0) + jitter();
        if (!best || val > best.val) best = { val, kind: o.dir ? 'sweep' : 'place', dir: o.dir, slot, ox, oy };
      }
    });
    if (!placed && o.dir && o.gained && (!best || o.gained * 10 > best.val)) best = { val: o.gained * 10, kind: 'sweep', dir: o.dir };
  }
  return best;
}

function play(config, seed, { noise = 0, naive = false, sweeper = false, maxMoves = 2000 } = {}) {
  const g = E.newGame(config, E.seeded(seed));
  // The bot's own dice are separate from the deal, so a noisy and a sharp
  // player see the same pieces for the same seed.
  const botRng = E.seeded(seed ^ 0x9e3779b9);
  let wonAt = null;
  let guard = 0;
  while (!g.over && g.moves < maxMoves && guard++ < maxMoves * 4) {
    const view = { ...g, rng: botRng, tray: g.tray, board: g.board };
    const m = sweeper ? chooseSweeper(view, noise) : choose(view, noise, naive);
    if (!m) break;
    if (m.kind === 'place') E.place(g, m.slot, m.ox, m.oy);
    else {
      // The sweeper sweeps, then lays the piece it planned on that board.
      const ok = E.sweep(g, m.dir);
      if (!ok) break;
      if (sweeper && m.slot !== undefined && !g.over) E.place(g, m.slot, m.ox, m.oy);
    }
    if (g.won && wonAt === null) wonAt = g.moves;
  }
  let ones = 0, twos = 0, filled = 0;
  for (const v of g.board) { if (v) filled++; if (v === 1) ones++; if (v === 2) twos++; }
  return { moves: g.moves, score: g.score, best: g.bestTile, won: g.won, wonAt, ones, twos, filled };
}

module.exports = { play, evaluate, choose };
