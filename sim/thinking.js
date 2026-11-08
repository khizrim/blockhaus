/* Does thinking pay? Three players on the shipped rules and on cascade mode:
   "thinker" tries every placement and every sweep one move ahead and keeps
   the best-looking board, "noisy" is the same with blurred judgement, and
   "swiper" just swipes in a random direction, placing only when nothing
   slides. Prints game length, share of sweeps, how often each reaches
   96/192/384, and how much of the board is 1s and 2s (and how many of
   those are walled in, with no open side and no partner next to them).
   `node sim/thinking.js [games]`. */
const E = require('../prototype/engine.js');
const { evaluate } = require('./bot.js');
const N = 6, D = ['left','right','up','down'];
const clone = g => ({ ...g, rng: () => 0.42, board: g.board.slice(), tray: g.tray.map(p => p && { ...p }) });
function actions(g) {
  const out = [];
  g.tray.forEach((p, slot) => { if (!p || p.used) return; const { w, h } = E.size(p);
    for (let y = 0; y <= N - h; y++) for (let x = 0; x <= N - w; x++) if (E.fits(g.board, p, x, y)) out.push({ kind: 'place', slot, x, y }); });
  for (const d of D) out.push({ kind: 'sweep', d });
  return out;
}
function apply(g, a) { return a.kind === 'place' ? E.place(g, a.slot, a.x, a.y) : E.sweep(g, a.d); }
function small(board) { let s = 0, t = 0, dead = 0; board.forEach((v, i) => { if (v > 0) t++; if (v === 1 || v === 2) { s++; if (!E.neighbours(i).some(j => board[j] === 0 || board[j] === 3 - v)) dead++; } }); return { s, t, dead }; }
function play(cfg, seed, mode, max = 600) {
  const g = E.newGame(cfg, E.seeded(seed)); const r = E.seeded(seed ^ 99);
  let acts = 0, swipes = 0, close = 0, smallSum = 0, deadSum = 0, fillSum = 0;
  while (!g.over && acts < max) {
    const as = actions(g); let pick = null;
    if (mode === 'swiper') {
      const sw = as.filter(a => a.kind === 'sweep').sort(() => r() - .5);
      for (const a of sw) { if (apply(g, a)) { pick = a; break; } }
      if (!pick) { const pl = as.filter(a => a.kind === 'place'); if (!pl.length) break; pick = pl[(r() * pl.length) | 0]; apply(g, pick); }
    } else {
      let best = null, bestPl = null, bestSw = null;
      for (const a of as) { const c = clone(g); const s0 = c.score; if (!apply(c, a)) continue;
        const v = evaluate(c.board, c.score - s0) - (c.over ? 1000 : 0) + (mode === 'noisy' ? (r() - .5) * 24 : 0);
        if (!best || v > best.v) best = { a, v };
        if (a.kind === 'place' && (!bestPl || v > bestPl)) bestPl = v; if (a.kind === 'sweep' && (bestSw === null || v > bestSw)) bestSw = v; }
      if (!best) break; pick = best.a;
      if (bestPl !== null && bestSw !== null && Math.abs(bestPl - bestSw) < 3) close++;
      if (!apply(g, pick)) break;
    }
    acts++; if (pick.kind === 'sweep') swipes++;
    const k = small(g.board); smallSum += k.t ? k.s / k.t : 0; deadSum += k.dead; fillSum += k.t;
  }
  return { acts, swipes, close, best: g.bestTile, score: g.score, smallShare: smallSum / acts, dead: deadSum / acts, fill: fillSum / acts, end: small(g.board) };
}
module.exports = { play };
if (require.main === module) {
  const V = { shipped: {}, cascade: E.CASCADE };
  const n = +process.argv[2] || 40;
  for (const [name, cfg] of Object.entries(V)) for (const mode of ['thinker', 'noisy', 'swiper']) {
    const rs = []; for (let s = 1; s <= n; s++) rs.push(play({ ...cfg, goal: 1e6 }, s, mode));
    const avg = f => (rs.reduce((a, x) => a + f(x), 0) / rs.length);
    const p = v => Math.round(100 * rs.filter(x => x.best >= v).length / rs.length) + '%';
    console.log(name.padEnd(8), mode.padEnd(8), 'ходов', avg(x => x.acts).toFixed(0), 'свайпов', (100 * avg(x => x.swipes / x.acts)).toFixed(0) + '%', 'равноценно', (100 * avg(x => x.close / x.acts)).toFixed(0) + '%',
      '| 96', p(96), '192', p(192), '384', p(384), '| доля 1/2 на доске', (100 * avg(x => x.smallShare)).toFixed(0) + '%', 'мёртвых 1/2', avg(x => x.dead).toFixed(1), 'заполн', avg(x => x.fill).toFixed(1), '| в конце 1/2:', avg(x => x.end.s).toFixed(1), 'из', avg(x => x.end.t).toFixed(1));
  }
}
