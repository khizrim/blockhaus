/** Tile values double from 3 onward. A first-time player aims for 24. */
function personalGoal(bestTile) {
  return Math.max(24, bestTile * 2);
}

/** A sweep can merge several lines in any order. Celebrate the largest
 * new tile once, at the first merge that actually produced it. */
function milestoneMarks(levels, previousPeak) {
  const highest = Math.max(previousPeak, ...levels);
  const index = highest >= personalGoal(previousPeak) ? levels.indexOf(highest) : -1;
  return levels.map((_, i) => i === index);
}

module.exports = { personalGoal, milestoneMarks };
