const Match = require('../models/Match');
const Innings = require('../models/Innings');
const Over = require('../models/Over');
const Delivery = require('../models/Delivery');
const Partnership = require('../models/Partnership');
const FallOfWicket = require('../models/FallOfWicket');
const { getMaxOversForBowler } = require('../utils/cricketUtils');
const { validateDeliveryInput, validateBowlerEligibility } = require('./deliveryValidator');

/**
 * Creates the next Over document for an innings, running the "no
 * consecutive overs" and "max overs per bowler" checks that were
 * previously defined in deliveryValidator.js but never invoked anywhere.
 */
const startNewOver = async (innings, match, bowlerId, bowlerName) => {
  const previousOver = innings.overs.length
    ? await Over.findById(innings.overs[innings.overs.length - 1])
    : null;

  const oversBowledByThisBowler = await Over.countDocuments({ inningsId: innings._id, bowlerId, isComplete: true });
  const maxOvers = getMaxOversForBowler(match.format, match.oversPerInnings);

  const eligibility = validateBowlerEligibility(
    bowlerId,
    previousOver ? previousOver.bowlerId : null,
    oversBowledByThisBowler,
    maxOvers
  );
  if (!eligibility.isValid) {
    const err = new Error(eligibility.errors.join('; '));
    err.status = 400;
    throw err;
  }

  const over = await Over.create({
    inningsId: innings._id,
    overNumber: Math.floor(innings.totalBalls / 6) + 1,
    bowlerId,
    bowlerName
  });

  innings.overs.push(over._id);
  innings.currentBowler = bowlerId;
  await innings.save();

  return over;
};

/** Updates (or creates) the active partnership for the current batting pair. */
const updatePartnership = async (innings, runsThisBall, isLegalBall) => {
  let partnership = await Partnership.findOne({ inningsId: innings._id, isActive: true });
  if (!partnership) {
    partnership = await Partnership.create({
      inningsId: innings._id,
      batter1Id: innings.currentStriker,
      batter2Id: innings.currentNonStriker,
      runs: 0,
      balls: 0,
      isActive: true
    });
  }
  partnership.runs += runsThisBall;
  if (isLegalBall) partnership.balls += 1;
  await partnership.save();
  return partnership;
};

const endPartnership = async (innings, wicketNumber) => {
  await Partnership.findOneAndUpdate(
    { inningsId: innings._id, isActive: true },
    { isActive: false, wicketNumber }
  );
};

/** Rotates strike between striker and non-striker. */
const rotateStrike = (innings) => {
  const temp = innings.currentStriker;
  innings.currentStriker = innings.currentNonStriker;
  innings.currentNonStriker = temp;
};

/**
 * Processes one delivery end-to-end: validates it, persists the Delivery
 * document, updates over/innings totals, handles strike rotation, wickets,
 * partnerships, fall-of-wickets, over completion and innings completion.
 */
const processDelivery = async (matchId, inningsId, payload) => {
  const validation = validateDeliveryInput(payload);
  if (!validation.isValid) {
    const err = new Error(validation.errors.join('; '));
    err.status = 400;
    throw err;
  }

  const match = await Match.findById(matchId);
  if (!match) throw Object.assign(new Error('Match not found'), { status: 404 });

  const innings = await Innings.findById(inningsId);
  if (!innings) throw Object.assign(new Error('Innings not found'), { status: 404 });
  if (innings.isComplete) throw Object.assign(new Error('This innings has already been completed'), { status: 400 });

  let currentOver = innings.overs.length ? await Over.findById(innings.overs[innings.overs.length - 1]) : null;
  if (!currentOver || currentOver.isComplete) {
    currentOver = await startNewOver(innings, match, payload.bowlerId, payload.bowlerName);
  } else if (currentOver.bowlerId !== payload.bowlerId) {
    throw Object.assign(new Error('The current over is already assigned to another bowler'), { status: 400 });
  }

  const isLegal = !['wide', 'noBall'].includes(payload.extras?.type);
  const sequenceNumber = innings.totalBalls + 1;

  const delivery = await Delivery.create({
    matchId,
    inningsId,
    overId: currentOver._id,
    overNumber: currentOver.overNumber,
    ballNumber: currentOver.legalDeliveries + (isLegal ? 1 : 0),
    sequenceNumber,
    strikerId: innings.currentStriker,
    strikerName: payload.strikerName,
    nonStrikerId: innings.currentNonStriker,
    nonStrikerName: payload.nonStrikerName,
    bowlerId: payload.bowlerId,
    bowlerName: payload.bowlerName,
    runsOffBat: payload.runsOffBat || 0,
    extras: payload.extras || { type: 'none', runs: 0 },
    isWicket: !!payload.isWicket,
    wicket: payload.wicket || undefined
  });

  // Update over totals
  currentOver.runs += delivery.totalRuns;
  if (isLegal) currentOver.legalDeliveries += 1;
  if (delivery.extras.type === 'wide') currentOver.extras.wides += delivery.extras.runs + 1;
  if (delivery.extras.type === 'noBall') currentOver.extras.noBalls += delivery.extras.runs + 1;
  if (delivery.extras.type === 'bye') currentOver.extras.byes += delivery.extras.runs;
  if (delivery.extras.type === 'legBye') currentOver.extras.legByes += delivery.extras.runs;
  if (delivery.isWicket) currentOver.wickets += 1;
  currentOver.deliveries.push(delivery._id);

  // Update innings totals
  innings.totalRuns += delivery.totalRuns;
  if (isLegal) innings.totalBalls += 1;
  if (delivery.extras.type === 'wide') innings.totalExtras.wides += delivery.extras.runs + 1;
  if (delivery.extras.type === 'noBall') innings.totalExtras.noBalls += delivery.extras.runs + 1;
  if (delivery.extras.type === 'bye') innings.totalExtras.byes += delivery.extras.runs;
  if (delivery.extras.type === 'legBye') innings.totalExtras.legByes += delivery.extras.runs;

  await updatePartnership(innings, delivery.totalRuns, isLegal);

  if (delivery.isWicket) {
    innings.totalWickets += 1;
    await endPartnership(innings, innings.totalWickets);
    await FallOfWicket.create({
      inningsId: innings._id,
      deliveryId: delivery._id,
      dismissedPlayerId: delivery.wicket.dismissedPlayerId || innings.currentStriker,
      dismissedPlayerName: delivery.wicket.dismissedPlayerName,
      score: innings.totalRuns,
      overs: `${currentOver.overNumber - 1}.${currentOver.legalDeliveries}`,
      wicketNumber: innings.totalWickets
    });

    // If the striker was dismissed, they must be replaced by the caller
    // via setBatter() before the next delivery; if the non-striker was run
    // out, the striker stays on strike (handled by whichever side calls setBatter).
    if (!delivery.wicket.dismissedPlayerId || delivery.wicket.dismissedPlayerId === innings.currentStriker) {
      innings.currentStriker = null;
    } else {
      innings.currentNonStriker = null;
    }
  } else if (delivery.runsOffBat % 2 === 1) {
    rotateStrike(innings);
  }

  // Over completion: rotate strike at the end of a legal 6-ball over.
  if (isLegal && currentOver.legalDeliveries === 6) {
    currentOver.isComplete = true;
    currentOver.isMaiden = currentOver.runs === 0;
    if (!delivery.isWicket) rotateStrike(innings);
  }
  await currentOver.save();

  // Innings completion checks: all out, overs completed, or (2nd innings) target reached.
  const maxWickets = innings.maxWickets || 10;
  const oversLimitReached = innings.maxOvers ? innings.totalBalls >= innings.maxOvers * 6 : false;
  const allOut = innings.totalWickets >= maxWickets;
  const targetReached = innings.target ? innings.totalRuns >= innings.target : false;

  if (allOut || oversLimitReached || targetReached) {
    innings.isComplete = true;
    innings.status = 'completed';
  }

  await innings.save();

  if (innings.inningsNumber >= 2 && innings.isComplete) {
    match.status = 'completed';
    const firstInnings = await Innings.findOne({ matchId: match._id, inningsNumber: 1 });
    if (firstInnings) {
      if (innings.totalRuns >= (innings.target || firstInnings.totalRuns + 1)) {
        const wicketsLeft = maxWickets - innings.totalWickets;
        match.result = {
          winner: innings.battingTeamName || (match.teamA.id === innings.battingTeamId ? match.teamA.name : match.teamB.name),
          margin: wicketsLeft,
          marginType: 'wickets',
          method: 'normal'
        };
      } else if (innings.totalRuns === firstInnings.totalRuns) {
        match.result = {
          winner: 'Tie',
          margin: 0,
          marginType: 'runs',
          method: 'normal'
        };
      } else {
        const runsMargin = firstInnings.totalRuns - innings.totalRuns;
        match.result = {
          winner: firstInnings.battingTeamName || (match.teamA.id === firstInnings.battingTeamId ? match.teamA.name : match.teamB.name),
          margin: runsMargin,
          marginType: 'runs',
          method: 'normal'
        };
      }
    }
    await match.save();
  }

  return { delivery, innings, over: currentOver, match };
};

/**
 * Reverts the most recent legal/illegal delivery in an innings - used for
 * scorer-side correction, per the "manual correction" requirement in the
 * project documentation's error-handling section.
 */
const undoLastDelivery = async (inningsId) => {
  const innings = await Innings.findById(inningsId);
  if (!innings) throw Object.assign(new Error('Innings not found'), { status: 404 });

  const lastDelivery = await Delivery.findOne({ inningsId }).sort({ sequenceNumber: -1 });
  if (!lastDelivery) throw Object.assign(new Error('No deliveries to undo'), { status: 400 });

  const over = await Over.findById(lastDelivery.overId);
  const redoDelivery = lastDelivery.toObject();

  innings.totalRuns -= lastDelivery.totalRuns;
  if (lastDelivery.isLegal) innings.totalBalls -= 1;
  if (lastDelivery.isWicket) {
    innings.totalWickets -= 1;
    await FallOfWicket.findOneAndDelete({ deliveryId: lastDelivery._id });
  }
  innings.currentStriker = lastDelivery.strikerId;
  innings.currentNonStriker = lastDelivery.nonStrikerId;
  if (lastDelivery.extras.type === 'wide') innings.totalExtras.wides = Math.max(innings.totalExtras.wides - (lastDelivery.extras.runs + 1), 0);
  if (lastDelivery.extras.type === 'noBall') innings.totalExtras.noBalls = Math.max(innings.totalExtras.noBalls - (lastDelivery.extras.runs + 1), 0);
  if (lastDelivery.extras.type === 'bye') innings.totalExtras.byes = Math.max(innings.totalExtras.byes - lastDelivery.extras.runs, 0);
  if (lastDelivery.extras.type === 'legBye') innings.totalExtras.legByes = Math.max(innings.totalExtras.legByes - lastDelivery.extras.runs, 0);
  if (innings.isComplete) {
    innings.isComplete = false;
    innings.status = 'in_progress';
  }

  if (over) {
    over.runs -= lastDelivery.totalRuns;
    if (lastDelivery.isLegal) over.legalDeliveries -= 1;
    if (lastDelivery.isWicket) over.wickets -= 1;
    if (lastDelivery.extras.type === 'wide') over.extras.wides = Math.max(over.extras.wides - (lastDelivery.extras.runs + 1), 0);
    if (lastDelivery.extras.type === 'noBall') over.extras.noBalls = Math.max(over.extras.noBalls - (lastDelivery.extras.runs + 1), 0);
    if (lastDelivery.extras.type === 'bye') over.extras.byes = Math.max(over.extras.byes - lastDelivery.extras.runs, 0);
    if (lastDelivery.extras.type === 'legBye') over.extras.legByes = Math.max(over.extras.legByes - lastDelivery.extras.runs, 0);
    over.isComplete = false;
    over.deliveries = over.deliveries.filter((d) => d.toString() !== lastDelivery._id.toString());
    await over.save();
  }

  await innings.save();
  await lastDelivery.deleteOne();

  return { innings, redoDelivery };
};

module.exports = { processDelivery, undoLastDelivery, startNewOver };
