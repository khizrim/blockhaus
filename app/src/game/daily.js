const engine = require('./engine');

// Score thresholds from sim/daily.js. Each weekday uses its calibrated rules.
const thresholds = {
  plain: [310, 390, 670],
  domino: [350, 410, 670],
  stone: [220, 320, 580],
  still: [180, 240, 350],
  big: [450, 520, 960],
};
const medalNames = {
  en: ['Bronze', 'Silver', 'Gold'],
  ru: ['Бронза', 'Серебро', 'Золото'],
};
const dayKey = (date = new Date()) =>
  [date.getFullYear(), date.getMonth() + 1, date.getDate()].map((v) => String(v).padStart(2, '0')).join('-');
const weekdayRule = (key) => engine.WEEKDAY[new Date(key + 'T12:00:00Z').getUTCDay()];
const ruleOf = (key) => weekdayRule(key)?.rule ?? 'plain';
const medalsFor = (key) => thresholds[ruleOf(key)];
const medalFor = (key, score) => medalsFor(key).filter((threshold) => score >= threshold).length;
const namesFor = (locale) => medalNames[locale.startsWith('ru') ? 'ru' : 'en'];
function dailyProgress(key, moves, score, locale) {
  const rank = medalFor(key, score);
  const progress = Math.min(moves, engine.DAILY.pieceLimit) + '/' + engine.DAILY.pieceLimit;
  return rank === 3 ? progress + ' · ' + namesFor(locale)[2]
    : progress + ' · ' + namesFor(locale)[rank] + ' ' + medalsFor(key)[rank];
}
function streamFor(key, draws = 0) {
  let seed = 2166136261;
  for (const c of 'blockhaus:' + key) seed = Math.imul(seed ^ c.charCodeAt(0), 16777619);
  // Skip to the stored position in the engine's Mulberry32 sequence in O(1).
  const random = engine.seeded((seed + Math.imul(draws, 0x6D2B79F5)) >>> 0);
  const stream = { draws, next() { stream.draws++; return random(); } };
  return stream;
}
function newDailyGame(key) {
  const stream = streamFor(key);
  const game = engine.newGame({ ...engine.DAILY, ...weekdayRule(key) }, stream.next);
  return { key, game, stream };
}
function saveDaily({ key, game, stream }) {
  const { cfg, rng, ...fields } = game;
  return { key, draws: stream.draws, game: fields };
}
function restoreDaily(saved) {
  const run = newDailyGame(saved.key);
  const stream = streamFor(saved.key, saved.draws);
  const game = { ...run.game, ...saved.game, cfg: run.game.cfg, rng: stream.next };
  if (saved.game.turns === undefined) {
    // In earlier daily saves a push could both spend a swipe and place a piece.
    const ambiguous = game.cfg.freeSweeps && game.cfg.sweepCost === 'push' && game.used > 0;
    game.turns = ambiguous ? undefined : game.moves + (game.used ?? 0);
  }
  return { key: saved.key, game, stream };
}
module.exports = { dayKey, ruleOf, medalsFor, medalFor, namesFor, dailyProgress, newDailyGame, saveDaily, restoreDaily };
