const SimDelivery = require('../models/SimDelivery');
const { getPhase } = require('./simulationService');

/** Runs-per-over breakdown for a given innings (feeds a Manhattan/worm chart on the frontend). */
const getRunProgression = async (matchId, inningsNumber) => {
  const deliveries = await SimDelivery.find({ matchId, inningsNumber }).sort({ over: 1, ballInOver: 1 });
  const overMap = {};
  let cumulative = 0;
  const cumulativeSeries = [];

  for (const d of deliveries) {
    if (!overMap[d.over]) overMap[d.over] = { over: d.over, runs: 0, wickets: 0 };
    overMap[d.over].runs += d.totalRuns;
    if (d.isWicket) overMap[d.over].wickets += 1;
    cumulative += d.totalRuns;
    cumulativeSeries.push({ ball: cumulative ? cumulativeSeries.length + 1 : 1, runs: cumulative });
  }

  return { perOver: Object.values(overMap), cumulative: cumulativeSeries };
};

/** Powerplay / middle / death phase breakdown for an innings. */
const getPhaseAnalysis = async (matchId, inningsNumber, totalOvers = 20) => {
  const deliveries = await SimDelivery.find({ matchId, inningsNumber });
  const phases = { powerplay: { runs: 0, wickets: 0, balls: 0 }, middle: { runs: 0, wickets: 0, balls: 0 }, death: { runs: 0, wickets: 0, balls: 0 } };

  for (const d of deliveries) {
    const phase = getPhase(d.over, totalOvers);
    phases[phase].runs += d.totalRuns;
    if (d.isWicket) phases[phase].wickets += 1;
    if (!['wide', 'no_ball'].includes(d.extraType)) phases[phase].balls += 1;
  }

  Object.keys(phases).forEach((p) => {
    phases[p].runRate = phases[p].balls > 0 ? Number(((phases[p].runs / phases[p].balls) * 6).toFixed(2)) : 0;
  });

  return phases;
};

/** Runs contributed by each consecutive batting pair - a simple partnership breakdown. */
const getPartnerships = async (matchId, inningsNumber) => {
  const deliveries = await SimDelivery.find({ matchId, inningsNumber }).sort({ over: 1, ballInOver: 1 });
  const partnerships = [];
  let current = null;

  for (const d of deliveries) {
    const pairKey = [String(d.strikerId), String(d.nonStrikerId)].sort().join('-');
    if (!current || current.pairKey !== pairKey) {
      current = { pairKey, batter1: d.strikerId, batter2: d.nonStrikerId, runs: 0, balls: 0 };
      partnerships.push(current);
    }
    current.runs += d.totalRuns;
    if (!['wide', 'no_ball'].includes(d.extraType)) current.balls += 1;
  }

  return partnerships;
};

module.exports = { getRunProgression, getPhaseAnalysis, getPartnerships };
