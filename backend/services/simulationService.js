const Player = require('../models/Player');
const Team = require('../models/Team');
const SimMatch = require('../models/SimMatch');
const SimDelivery = require('../models/SimDelivery');

/**
 * NOTE ON MERGE: this service originally queried its own duplicate
 * Player/Team/Match/Delivery models. It now reads from the canonical
 * Player/Team collections (shared with every other module) and writes to
 * the SimMatch/SimDelivery collections - see the comment at the top of
 * SimMatch.js for why simulated matches keep their own lightweight match
 * representation rather than the full Innings/Over/Delivery engine.
 */

const PHASES = {
  POWERPLAY: { start: 0, end: 6 },
  MIDDLE: { start: 6, end: 15 },
  DEATH: { start: 15, end: 20 }
};

const getPhase = (over, totalOvers) => {
  const powerplayEnd = Math.min(6, Math.floor(totalOvers * 0.3));
  const deathStart = Math.max(totalOvers - 5, powerplayEnd + 1);
  if (over < powerplayEnd) return 'powerplay';
  if (over >= deathStart) return 'death';
  return 'middle';
};

/**
 * Builds a probability distribution for one delivery's outcome based on
 * batter/bowler ratings and match phase/pressure context, then draws from
 * it. This favours context-appropriate outcomes over uniform randomness,
 * per the documented simulation design (Section 15 of the project docs).
 */
const buildOutcomeWeights = ({ batterRating, bowlerRating, phase, pressure }) => {
  const skillEdge = (batterRating - bowlerRating) / 100; // -1..1

  const weights = {
    0: 40, 1: 28, 2: 10, 3: 2, 4: 10, 6: 5, wicket: 5
  };

  if (phase === 'powerplay') {
    weights[4] += 6; weights[6] += 3; weights.wicket += 3; weights[0] -= 6;
  }
  if (phase === 'death') {
    weights[4] += 8; weights[6] += 8; weights.wicket += 6; weights[0] -= 10; weights[1] -= 6;
  }

  weights[4] += skillEdge * 6;
  weights[6] += skillEdge * 4;
  weights.wicket -= skillEdge * 3;
  weights[0] -= skillEdge * 4;

  if (pressure > 1) {
    const boost = Math.min(pressure - 1, 1.5);
    weights[4] += boost * 5;
    weights[6] += boost * 5;
    weights.wicket += boost * 4;
    weights[0] -= boost * 6;
  }

  Object.keys(weights).forEach((k) => { weights[k] = Math.max(weights[k], 0.5); });
  return weights;
};

const weightedRandomPick = (weights, rng) => {
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let r = rng() * total;
  for (const [outcome, w] of entries) {
    r -= w;
    if (r <= 0) return outcome;
  }
  return entries[entries.length - 1][0];
};

/** Simple seedable RNG (mulberry32) so a given match can be re-simulated deterministically for testing/demo purposes. */
const createRng = (seed) => {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const simulateInnings = async ({ battingPlayers, bowlingPlayers, totalOvers, target, rng }) => {
  const deliveries = [];
  let score = 0;
  let wickets = 0;
  let strikerIdx = 0;
  let nonStrikerIdx = 1;
  const outBatters = new Set();

  outer:
  for (let over = 0; over < totalOvers; over++) {
    const bowler = bowlingPlayers[over % bowlingPlayers.length];
    const phase = getPhase(over, totalOvers);

    for (let ball = 0; ball < 6; ball++) {
      if (wickets >= 10 || strikerIdx >= battingPlayers.length) break outer;
      const ballsRemaining = (totalOvers - over) * 6 - ball;
      const pressure = target ? Math.max((target - score) / Math.max(ballsRemaining, 1), 0) / (6 * (totalOvers / 20)) : 1;

      const striker = battingPlayers[strikerIdx];
      const weights = buildOutcomeWeights({
        batterRating: striker.battingRating ?? 50,
        bowlerRating: bowler.bowlingRating ?? 50,
        phase,
        pressure
      });
      const outcome = weightedRandomPick(weights, rng);

      let runsBat = 0;
      let isWicket = false;
      if (outcome === 'wicket') {
        isWicket = true;
      } else {
        runsBat = Number(outcome);
      }

      score += runsBat;
      deliveries.push({
        over, ballInOver: ball + 1,
        strikerId: striker._id, nonStrikerId: battingPlayers[nonStrikerIdx]?._id,
        bowlerId: bowler._id,
        runsBat, extraType: null, extraRuns: 0,
        isWicket, wicketType: isWicket ? 'bowled' : null,
        dismissedPlayerId: isWicket ? striker._id : null,
        totalRuns: runsBat
      });

      if (isWicket) {
        wickets += 1;
        outBatters.add(strikerIdx);
        strikerIdx = Math.max(strikerIdx, nonStrikerIdx) + 1;
        if (strikerIdx === nonStrikerIdx) strikerIdx += 1;
      } else if (runsBat % 2 === 1) {
        [strikerIdx, nonStrikerIdx] = [nonStrikerIdx, strikerIdx];
      }

      if (target && score >= target) break outer;
    }
    [strikerIdx, nonStrikerIdx] = [nonStrikerIdx, strikerIdx];
  }

  return { score, wickets, deliveries };
};

/** Simulates a full two-innings match between two teams' rosters and persists the result. */
const simulateMatch = async (teamAId, teamBId, oversLimit = 20, seed = Date.now()) => {
  const teamA = await Team.findById(teamAId).populate('players');
  const teamB = await Team.findById(teamBId).populate('players');
  if (!teamA || !teamB) throw Object.assign(new Error('Both teams must exist to simulate a match'), { status: 404 });
  if (!teamA.players.length || !teamB.players.length) {
    throw Object.assign(new Error('Both teams need at least one player to simulate a match'), { status: 400 });
  }

  const rng = createRng(seed);
  const simMatch = await SimMatch.create({
    teamA: teamA._id,
    teamB: teamB._id,
    oversLimit,
    status: 'in_progress',
    tossWinnerTeamId: teamA._id,
    tossDecision: 'bat',
    source: 'simulated'
  });

  const bowlersA = teamA.players.filter((p) => p.role !== 'Batter');
  const bowlersB = teamB.players.filter((p) => p.role !== 'Batter');

  const firstInnings = await simulateInnings({
    battingPlayers: teamA.players,
    bowlingPlayers: bowlersB.length ? bowlersB : teamB.players,
    totalOvers: oversLimit,
    target: null,
    rng
  });

  const secondInnings = await simulateInnings({
    battingPlayers: teamB.players,
    bowlingPlayers: bowlersA.length ? bowlersA : teamA.players,
    totalOvers: oversLimit,
    target: firstInnings.score + 1,
    rng
  });

  const bulkDeliveries = [];
  [firstInnings, secondInnings].forEach((innings, idx) => {
    innings.deliveries.forEach((d) => {
      bulkDeliveries.push({
        ...d,
        matchId: simMatch._id,
        inningsNumber: idx + 1,
        battingTeamId: idx === 0 ? teamA._id : teamB._id,
        bowlingTeamId: idx === 0 ? teamB._id : teamA._id
      });
    });
  });
  if (bulkDeliveries.length) await SimDelivery.insertMany(bulkDeliveries);

  simMatch.innings = [
    { inningsNumber: 1, battingTeamId: teamA._id, bowlingTeamId: teamB._id, totalRuns: firstInnings.score, wickets: firstInnings.wickets, overs: oversLimit, isCompleted: true },
    { inningsNumber: 2, battingTeamId: teamB._id, bowlingTeamId: teamA._id, totalRuns: secondInnings.score, wickets: secondInnings.wickets, overs: oversLimit, isCompleted: true }
  ];
  simMatch.status = 'completed';
  simMatch.winnerTeamId = secondInnings.score >= firstInnings.score + 1 ? teamB._id : teamA._id;
  simMatch.resultMargin =
    secondInnings.score >= firstInnings.score + 1
      ? `${teamB.teamName} won by ${10 - secondInnings.wickets} wickets`
      : `${teamA.teamName} won by ${firstInnings.score - secondInnings.score} runs`;
  await simMatch.save();

  return simMatch;
};

module.exports = { simulateMatch, getPhase };
