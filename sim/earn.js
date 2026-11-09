/* Sweeps earned by chains, and new shapes: one-move-ahead players on
   cascade rules. `node sim/earn.js rules|shapes|mix [games]`. Variant
   names and columns as in sim/RESULTS.md (2026-11-09). Baseline is the
   engine CASCADE, so rerun numbers shift once CASCADE changes. */
const E = require('../prototype/engine.js');
const { evaluate } = require('./bot.js');
const N = 6, D = ['left','right','up','down'];
const S = E.SHAPES;
const X = { // new shapes
  O: [[0,0],[1,0],[0,1],[1,1]],
  I4h: [[0,0],[1,0],[2,0],[3,0]], I4v: [[0,0],[0,1],[0,2],[0,3]],
  Th: [[0,0],[1,0],[2,0],[1,1]],
  diag1: [[0,0],[1,1]], diag2: [[1,0],[0,1]],
  gapH: [[0,0],[2,0]], gapV: [[0,0],[0,2]],
};
const clone = g => ({ ...g, rng: () => 0.42, board: g.board.slice(), tray: g.tray.map(p => p && { ...p }) });
function actions(g) {
  const out = [];
  g.tray.forEach((p, slot) => { if (!p || p.used) return; const { w, h } = E.size(p);
    for (let y = 0; y <= N - h; y++) for (let x = 0; x <= N - w; x++) if (E.fits(g.board, p, x, y)) out.push({ kind: 'place', slot, x, y }); });
  for (const d of D) out.push({ kind: 'sweep', d });
  return out;
}
let STATS;
function apply(g, a, rule, real) {
  if (a.kind === 'place') {
    const before = g.sweeps; const res = E.place(g, a.slot, a.x, a.y); if (!res) return null;
    if (rule && rule.earn) {
      const n = res.steps.length, add = rule.earn(n);
      const got = Math.max(0, Math.min(add, rule.max - g.sweeps));
      g.sweeps += got; if (real) { STATS.earned += got; if (add) STATS.earnPl++; }
      if (got) g.over = !E.anyMove(g);
    } else if (real && res.bonus) { STATS.earned++; STATS.earnPl++; }
    if (real) { STATS.pl++; }
    return res;
  }
  const res = E.sweep(g, a.d); if (!res) return null;
  if (rule && rule.sweepEarn) { const n = (res.made||[]).length; const add = n >= rule.sweepEarn ? 1 : 0; const got = Math.min(add, Math.max(0, rule.max - g.sweeps)); g.sweeps += got; if (real) STATS.earned += got; }
  return res;
}
function play(cfg, rule, seed, mode, max = 500) {
  const g = E.newGame(cfg, E.seeded(seed)); const r = E.seeded(seed ^ 99);
  let acts = 0, swipes = 0;
  while (!g.over && acts < max) {
    const as = actions(g); let pick = null;
    if (mode === 'swiper') {
      const sw = as.filter(a => a.kind === 'sweep').sort(() => r() - .5);
      for (const a of sw) { if (apply(g, a, rule, true)) { pick = a; break; } }
      if (!pick) { const pl = as.filter(a => a.kind === 'place'); if (!pl.length) break; pick = pl[(r() * pl.length) | 0]; apply(g, pick, rule, true); }
    } else {
      let best = null;
      for (const a of as) { const c = clone(g); const s0 = c.score; if (!apply(c, a, rule, false)) continue;
        const v = evaluate(c.board, c.score - s0) - (c.over ? 1000 : 0) + (mode === 'noisy' ? (r() - .5) * 24 : 0) + (c.sweeps - g.sweeps) * 4;
        if (!best || v > best.v) best = { a, v }; }
      if (!best) break; pick = best.a; if (!apply(g, pick, rule, true)) break;
    }
    acts++; if (pick.kind === 'sweep') swipes++;
  }
  return { acts, swipes, best: g.bestTile, score: g.score };
}
const C = E.CASCADE;
const off = { chainBonus: 0 };
const RULES = {
  now5: [C, null],
  at4: [{ ...C, chainBonus: 4 }, null],
  at3: [{ ...C, chainBonus: 3 }, null],
  grade: [{ ...C, ...off, sweepsMax: 3 }, { max: 3, earn: n => n >= 6 ? 3 : n >= 4 ? 2 : n >= 3 ? 1 : 0 }],
  only3: [{ ...C, ...off, sweepsPerTray: 0, sweepsMax: 3 }, { max: 3, earn: n => n >= 3 ? 1 : 0 }],
  only3s: [{ ...C, ...off, sweepsPerTray: 0, sweepsMax: 3 }, { max: 3, earn: n => n >= 3 ? 1 : 0, sweepEarn: 3 }],
  at4s: [{ ...C, chainBonus: 4 }, { max: 2, sweepEarn: 3, earn: n => n >= 4 ? 1 : 0 }],
};
const base = C.shapes;
const SH = {
  O: [...base, [X.O, 0.6]],
  OT: [...base, [X.O, 0.5], [X.Th, 0.4]],
  I4: [...base, [X.I4h, 0.3], [X.I4v, 0.3]],
  diag: [...base, [X.diag1, 0.8], [X.diag2, 0.8]],
  gap: [...base, [X.gapH, 0.8], [X.gapV, 0.8]],
};
const which = process.argv[2] || "rules", n = +process.argv[3] || 24;
if (which === "mix") { Object.assign(RULES, {}); }
const MIX = {
  now5: RULES.now5,
  at4m3: [{ ...C, chainBonus: 4, sweepsMax: 3 }, null],
  at3: RULES.at3,
  at3O: [{ ...C, chainBonus: 3, shapes: SH.O }, null],
  at3OT: [{ ...C, chainBonus: 3, shapes: SH.OT }, null],
  at3diag: [{ ...C, chainBonus: 3, shapes: SH.diag }, null],
  at3gap: [{ ...C, chainBonus: 3, shapes: SH.gap }, null],
};
const V = which === 'mix' ? MIX : which === 'rules' ? RULES : Object.fromEntries([['now5', RULES.now5], ...Object.entries(SH).map(([k, s]) => [k, [{ ...C, shapes: s }, null]])]);
for (const [name, [cfg, rule]] of Object.entries(V)) for (const mode of ['thinker', 'noisy', 'swiper']) {
  STATS = { earned: 0, earnPl: 0, pl: 0 };
  const rs = []; for (let s = 1; s <= n; s++) rs.push(play({ ...cfg, goal: 1e6 }, rule, s, mode));
  const avg = f => rs.reduce((a, x) => a + f(x), 0) / rs.length;
  const med = f => { const v = rs.map(f).sort((a,b)=>a-b); return v[v.length>>1]; };
  const p = v => Math.round(100 * rs.filter(x => x.best >= v).length / rs.length);
  console.log([name.padEnd(7), mode.padEnd(8), 'ходов', med(x=>x.acts), 'свайп%', Math.round(100*avg(x=>x.swipes/x.acts)), 'заработано/игру', (STATS.earned/n).toFixed(1), 'ход_с_бонусом%', (100*STATS.earnPl/Math.max(1,STATS.pl)).toFixed(1), '96/192/384', p(96)+'/'+p(192)+'/'+p(384), 'очки', med(x=>x.score)].join(' '));
}
