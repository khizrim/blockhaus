/* Scores of the game of the day (30 pieces, 6 start tiles) under the shipped
   rules, for setting the medal lines, and how a cascade bonus moves them.
   `node sim/daily.js [games] [cap ...]`, e.g. `node sim/daily.js 400 0 3 4`.
   Bronze is about a casual player's best quarter (casual p75), silver a
   regular player's median (regular p50), gold the top tenth of a strong one
   (swRegular p90). */
const E = require('../prototype/engine.js');
const { play } = require('./bot.js');

const DAILY = { pieceLimit: 30, startTiles: 6 };
const PROFILES = {
  casual: { naive: true, noise: 200 }, regular: { naive: true, noise: 60 }, expert: { naive: true, noise: 10 },
  swCasual: { sweeper: true, noise: 200 }, swRegular: { sweeper: true, noise: 60 }, swExpert: { sweeper: true, noise: 10 },
};
const args = process.argv.slice(2);
const games = Number(args[0]) || 400;
const caps = args.slice(1).length ? args.slice(1).map(Number) : [0, E.DEFAULTS.chainScore];
const q = (xs, f) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(f * s.length))]; };

for (const cap of caps) {
  const rows = {};
  const at = {};
  for (const [name, prof] of Object.entries(PROFILES)) {
    const scores = [];
    for (let seed = 1; seed <= games; seed++) scores.push(play({ ...E.DEFAULTS, ...DAILY, chainScore: cap }, seed, prof).score);
    at[name] = { p25: q(scores, 0.25), p50: q(scores, 0.5), p75: q(scores, 0.75), p90: q(scores, 0.9) };
    rows[name] = { ...at[name], 'p90/p25': +(at[name].p90 / at[name].p25).toFixed(2) };
  }
  console.log(`\nchainScore ${cap}, ${games} daily games per profile`);
  console.table(rows);
  console.log(`medal lines: bronze ~${at.casual.p75}, silver ~${at.regular.p50}, gold ~${at.swRegular.p90}`);
}
