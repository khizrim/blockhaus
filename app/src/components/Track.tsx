export const INTRO_STEP = 110; // ms between the track's squares as it assembles

/** The milestones: every new best from 24 up to the goal and two rungs past
    it (for the game that goes on). Each one marks the board when reached. */
export const FIRST_MILESTONE = 24;
export function milestonesFor(goal: number): number[] {
  const out: number[] = [];
  for (let v = FIRST_MILESTONE; v <= goal; v *= 2) out.push(v);
  return out;
}
