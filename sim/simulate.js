#!/usr/bin/env node
/* Balance simulator: plays many seeded games per variant, with three player
   profiles, and prints one table per profile.

     node sim/simulate.js                  # every variant, 400 games each
     node sim/simulate.js 1000 original shipped

   Every variant sees the same seeds, so differences come from the rules, not
   luck. The profiles are the same greedy bot with more or less noise in its
   judgement (see bot.js); "casual" ends runs about where a first-time human
   did in testing (around 45 merges, best tile 12 to 24). */
const { play } = require('./bot.js');
const VARIANTS = require('./variants.js');

const PROFILES = { casual: { naive: true, noise: 200 }, regular: { naive: true, noise: 60 }, expert: { naive: true, noise: 10 } };

const args = process.argv.slice(2);
const games = Number(args[0]) || 400;
const names = args.slice(1).length ? args.slice(1) : Object.keys(VARIANTS);

const pct = (xs, q) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
const share = (xs, f) => Math.round((100 * xs.filter(f).length) / xs.length);

function measure(cfg, profile) {
  const runs = [];
  for (let s = 1; s <= games; s++) runs.push(play(cfg, s * 7919, profile));
  const lows = runs.reduce((a, r) => a + r.ones + r.twos, 0);
  return {
    moves: pct(runs.map(r => r.moves), 0.5),
    best: pct(runs.map(r => r.best), 0.5),
    p48: share(runs, r => r.best >= 48),
    win: share(runs, r => r.won),
    wonAt: runs.some(r => r.won) ? pct(runs.filter(r => r.won).map(r => r.wonAt), 0.5) : null,
    twos: Math.round((100 * runs.reduce((a, r) => a + r.twos, 0)) / Math.max(1, lows)),
  };
}

const results = {};
for (const name of names) {
  if (!VARIANTS[name]) { console.error(`unknown variant ${name}`); process.exit(1); }
  results[name] = {};
  for (const [p, prof] of Object.entries(PROFILES)) results[name][p] = measure(VARIANTS[name], prof);
}

console.log(`${games} games per variant and profile. Columns: median moves, median best tile, % reaching 48, % reaching 96 (win), median moves to win, 2s as % of leftover low tiles.`);
const rows = {};
for (const name of names) {
  const row = {};
  for (const p of Object.keys(PROFILES)) {
    const m = results[name][p];
    row[`${p} moves`] = m.moves;
    row[`${p} best`] = m.best;
    row[`${p} win%`] = m.win;
  }
  row['expert ≥48%'] = results[name].expert.p48;
  row['expert win@'] = results[name].expert.wonAt ?? '—';
  row['casual 2s%'] = results[name].casual.twos;
  rows[name] = row;
}
console.table(rows);
if (process.env.JSON) require('fs').writeFileSync(process.env.JSON, JSON.stringify({ games, profiles: PROFILES, results }, null, 2));
