/* Balance variants to compare. Each is a full config: `original` is the
   prototype as it was, `shipped` is the engine's DEFAULTS, and the rest each
   change one or two things so their effect can be read on its own. */
const E = require('../prototype/engine.js');
const O = E.ORIGINAL;
const LIGHT = E.DEFAULTS.shapes; // a quarter of draws are trominoes, not three sevenths

module.exports = {
  original: { ...O },
  shipped: { ...E.DEFAULTS },
  // One change at a time, from the original.
  need: { ...O, dealer: 'need' },
  light: { ...O, shapes: LIGHT },
  cellTray: { ...O, balancedTray: 1 },
  sweeps3: { ...O, sweepsPerTray: 3 },
  threes: { ...O, threeChance: 0.3 },
  mixed: { ...O, mixedPieces: 0.3 },
  // Further from the shipped balance, if it turns out too hard.
  shippedCellTray: { ...E.DEFAULTS, balancedTray: 1 },
  shippedMixed: { ...E.DEFAULTS, mixedPieces: 0.3 },
  shippedMixedCellTray: { ...E.DEFAULTS, mixedPieces: 0.3, balancedTray: 1 },
  // A sweep folds each line all the way: a merged tile merges again (3 3 6 -> 12).
  shippedChain: { ...E.DEFAULTS, sweepChain: true },
};
