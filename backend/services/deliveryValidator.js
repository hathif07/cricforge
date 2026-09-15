/**
 * NOTE ON MERGE / FIX: validateBowlerEligibility and validateBatterEligibility
 * existed in the original module but were never called from anywhere in
 * scoringEngine.js or matchService.js - the "no consecutive overs" and
 * "dismissed batter can't keep batting" rules described in the project
 * documentation were effectively unenforced. Both are now called from
 * matchService.startNewOver() and matchService.setBatter() respectively.
 */

const validateDeliveryInput = (payload) => {
  const errors = [];
  const validExtraTypes = ['wide', 'noBall', 'bye', 'legBye', 'penalty', 'none'];

  if (payload.runsOffBat === undefined || payload.runsOffBat < 0 || payload.runsOffBat > 6) {
    errors.push('runsOffBat must be between 0 and 6');
  }
  if (payload.extras && payload.extras.type && !validExtraTypes.includes(payload.extras.type)) {
    errors.push(`Invalid extras type: ${payload.extras.type}`);
  }
  if (payload.isWicket && !payload.wicket?.type) {
    errors.push('A wicket delivery must include a wicket type');
  }

  const illegalWithWide = ['bowled', 'lbw', 'caught', 'caughtAndBowled', 'hitWicket', 'stumped'];
  if (payload.isWicket && payload.extras?.type === 'wide' && illegalWithWide.includes(payload.wicket?.type)) {
    errors.push(`Dismissal type "${payload.wicket.type}" is not valid on a wide delivery`);
  }

  const illegalWithNoBall = ['bowled', 'lbw', 'caught', 'caughtAndBowled', 'hitWicket'];
  if (payload.isWicket && payload.extras?.type === 'noBall' && illegalWithNoBall.includes(payload.wicket?.type)) {
    errors.push(`Dismissal type "${payload.wicket.type}" is not valid on a no-ball (only run out / stumped permitted)`);
  }

  return { isValid: errors.length === 0, errors };
};

/** Prevents the same bowler from bowling two consecutive overs, and enforces per-format over limits. */
const validateBowlerEligibility = (bowlerId, previousOverBowlerId, oversAlreadyBowledByBowler, maxOversForBowler) => {
  const errors = [];
  if (previousOverBowlerId && bowlerId === previousOverBowlerId) {
    errors.push('The same bowler cannot bowl two consecutive overs');
  }
  if (maxOversForBowler !== null && oversAlreadyBowledByBowler >= maxOversForBowler) {
    errors.push(`Bowler has already reached the maximum allowed overs (${maxOversForBowler}) for this format`);
  }
  return { isValid: errors.length === 0, errors };
};

/** Prevents a dismissed batter from being selected again as striker/non-striker in the same innings. */
const validateBatterEligibility = (batterId, dismissedPlayerIds) => {
  const errors = [];
  if (dismissedPlayerIds.includes(batterId)) {
    errors.push('This batter has already been dismissed in this innings and cannot bat again');
  }
  return { isValid: errors.length === 0, errors };
};

module.exports = {
  validateDeliveryInput,
  validateBowlerEligibility,
  validateBatterEligibility
};
