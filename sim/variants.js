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
  // Free sweeps (2026-11-01). `limited` is the balance before: two per tray,
  // a chain earns one more, goal 192.
  limited: { ...E.LIMITED },
  // Truly free: a sweep costs nothing. Kept to show why it needs a price.
  freeNone: { ...E.DEFAULTS, sweepCost: 'none' },
  // A sweep is allowed only if it merges something.
  freeMerge: { ...E.DEFAULTS, sweepCost: 'merge' },
  // A sweep never refuses: the next tray piece slides in from the far edge.
  freePush: { ...E.DEFAULTS, sweepCost: 'push' },
  freeTilt: { ...E.DEFAULTS, sweepCost: 'tilt' },
  // Every sweep slides a new 1 or 2 in, at other goals.
  spawn192: { ...E.DEFAULTS, sweepCost: 'spawn', goal: 192 },
  spawn384: { ...E.DEFAULTS, sweepCost: 'spawn', goal: 384 },
  spawn768: { ...E.DEFAULTS, sweepCost: 'spawn', goal: 768 },
  // Sweeps earned by cascades: one per tray, one more for a cascade of 4+.
  cascade: { ...E.CASCADE },
  // Before 2026-11-02 every placed merge stayed in the laid cell.
  absorbNew: { ...E.DEFAULTS, absorb: 'new' },
  cascadeAbsorbNew: { ...E.CASCADE, absorb: 'new' },
};
