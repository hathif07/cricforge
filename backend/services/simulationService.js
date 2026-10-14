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
    0: 38,
    1: 27,
    2: 10,
    3: 2,
    4: 10,
    6: 5,
    wicket: 5,
    wide: 2,
    no_ball: 1
  };

  if (phase === 'powerplay') {
    weights[4] += 5;
    weights[6] += 2;
    weights.wicket += 2;
    weights[0] -= 5;
  }
  if (phase === 'death') {
    weights[4] += 7;
    weights[6] += 7;
    weights.wicket += 5;
    weights[0] -= 9;
    weights[1] -= 5;
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

  Object.keys(weights).forEach((k) => {
    weights[k] = Math.max(weights[k], 0.5);
  });
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
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
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
  const maxWickets = Math.min(10, battingPlayers.length - 1);
  let prevBowlerId = null;

  outer:
  for (let over = 0; over < totalOvers; over++) {
    // Pick bowler ensuring no consecutive overs if bowling squad has >= 2 bowlers
    let bowlerCandidate = bowlingPlayers[over % bowlingPlayers.length];
    if (prevBowlerId && bowlingPlayers.length > 1 && String(bowlerCandidate._id) === String(prevBowlerId)) {
      const alt = bowlingPlayers.find((b) => String(b._id) !== String(prevBowlerId));
      if (alt) bowlerCandidate = alt;
    }
    const bowler = bowlerCandidate;
    prevBowlerId = String(bowler._id);

    const phase = getPhase(over, totalOvers);
    let legalBalls = 0;

    while (legalBalls < 6) {
      if (wickets >= maxWickets || strikerIdx >= battingPlayers.length || nonStrikerIdx >= battingPlayers.length) {
        break outer;
      }

      const ballsRemaining = (totalOvers - over) * 6 - legalBalls;
      const pressure = target
        ? Math.max((target - score) / Math.max(ballsRemaining, 1), 0) / (6 * (totalOvers / 20))
        : 1;

      const striker = battingPlayers[strikerIdx];
      const nonStriker = battingPlayers[nonStrikerIdx];
      if (!striker || !nonStriker) break outer;

      const weights = buildOutcomeWeights({
        batterRating: striker.battingRating ?? 50,
        bowlerRating: bowler.bowlingRating ?? 50,
        phase,
        pressure
      });
      const outcome = weightedRandomPick(weights, rng);

      let runsBat = 0;
      let extraType = null;
      let extraRuns = 0;
      let isWicket = false;
      let wicketType = null;
      let dismissedPlayerId = null;

      if (outcome === 'wicket') {
        isWicket = true;
        wickets += 1;
        const wTypes = ['bowled', 'caught', 'lbw', 'run_out', 'stumped'];
        const wWeights = [25, 55, 10, 7, 3];
        const rW = rng() * 100;
        let cumulativeW = 0;
        for (let i = 0; i < wTypes.length; i++) {
          cumulativeW += wWeights[i];
          if (rW <= cumulativeW) {
            wicketType = wTypes[i];
            break;
          }
        }
        if (!wicketType) wicketType = 'caught';

        if (wicketType === 'run_out' && rng() < 0.35) {
          dismissedPlayerId = nonStriker._id;
          nonStrikerIdx = Math.max(strikerIdx, nonStrikerIdx) + 1;
        } else {
          dismissedPlayerId = striker._id;
          strikerIdx = Math.max(strikerIdx, nonStrikerIdx) + 1;
        }
      } else if (outcome === 'wide' || outcome === 'no_ball') {
        extraType = outcome;
        extraRuns = 1;
      } else {
        runsBat = Number(outcome);
      }

      const totalRuns = runsBat + extraRuns;
      score += totalRuns;

      deliveries.push({
        over: over + 1,
        ballInOver: legalBalls + 1,
        strikerId: striker._id,
        nonStrikerId: nonStriker._id,
        bowlerId: bowler._id,
        runsBat,
        extraType,
        extraRuns,
        isWicket,
        wicketType,
        dismissedPlayerId,
        totalRuns
      });

      if (!extraType) {
        legalBalls += 1;
      }

      // Check target chase immediately
      if (target && score >= target) break outer;

      // Check all out immediately
      if (wickets >= maxWickets) break outer;

      // Rotate strike on odd runs (if not out or after non-striker run-out)
      if (!isWicket && runsBat % 2 === 1) {
        [strikerIdx, nonStrikerIdx] = [nonStrikerIdx, strikerIdx];
      }
    }

    // End of over strike rotation
    [strikerIdx, nonStrikerIdx] = [nonStrikerIdx, strikerIdx];
  }

  // Calculate actual overs played
  const legalBallsTotal = deliveries.filter((d) => !['wide', 'no_ball'].includes(d.extraType)).length;
  const oversCompleted = Math.floor(legalBallsTotal / 6);
  const ballsInOver = legalBallsTotal % 6;
  const oversPlayed = ballsInOver === 0 ? oversCompleted : Number(`${oversCompleted}.${ballsInOver}`);

  return { score, wickets, deliveries, oversPlayed, legalBallsTotal };
};

/** Simulates a full two-innings match between two teams' rosters and persists the result. */
const simulateMatch = async (teamAId, teamBId, oversLimit = 20, seed = Date.now()) => {
  const teamA = await Team.findById(teamAId).populate('players');
  const teamB = await Team.findById(teamBId).populate('players');
  if (!teamA || !teamB) throw Object.assign(new Error('Both teams must exist to simulate a match'), { status: 404 });

  const playersA = (teamA.players || []).filter(Boolean);
  const playersB = (teamB.players || []).filter(Boolean);
  if (playersA.length < 2 || playersB.length < 2) {
    throw Object.assign(new Error('Both teams need at least 2 players to simulate a match'), { status: 400 });
  }

  const rng = createRng(seed);

  // Realistic toss simulation
  const tossWinner = rng() < 0.5 ? teamA : teamB;
  const tossDecision = rng() < 0.5 ? 'bat' : 'bowl';

  const firstBattingTeam =
    (tossWinner._id.toString() === teamA._id.toString() && tossDecision === 'bat') ||
    (tossWinner._id.toString() === teamB._id.toString() && tossDecision === 'bowl')
      ? teamA
      : teamB;
  const firstBowlingTeam = firstBattingTeam._id.toString() === teamA._id.toString() ? teamB : teamA;

  const simMatch = await SimMatch.create({
    teamA: teamA._id,
    teamB: teamB._id,
    oversLimit,
    status: 'in_progress',
    tossWinnerTeamId: tossWinner._id,
    tossDecision,
    source: 'simulated'
  });

  const battingPlayers1 = firstBattingTeam.players.filter(Boolean);
  const bowlingPlayers1 = firstBowlingTeam.players.filter((p) => p && p.role !== 'Batter');
  const activeBowlers1 = bowlingPlayers1.length >= 2 ? bowlingPlayers1 : firstBowlingTeam.players.filter(Boolean);

  const battingPlayers2 = firstBowlingTeam.players.filter(Boolean);
  const bowlingPlayers2 = firstBattingTeam.players.filter((p) => p && p.role !== 'Batter');
  const activeBowlers2 = bowlingPlayers2.length >= 2 ? bowlingPlayers2 : firstBattingTeam.players.filter(Boolean);

  const firstInnings = await simulateInnings({
    battingPlayers: battingPlayers1,
    bowlingPlayers: activeBowlers1,
    totalOvers: oversLimit,
    target: null,
    rng
  });

  const secondInnings = await simulateInnings({
    battingPlayers: battingPlayers2,
    bowlingPlayers: activeBowlers2,
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
        battingTeamId: idx === 0 ? firstBattingTeam._id : firstBowlingTeam._id,
        bowlingTeamId: idx === 0 ? firstBowlingTeam._id : firstBattingTeam._id
      });
    });
  });
  if (bulkDeliveries.length) await SimDelivery.insertMany(bulkDeliveries);

  simMatch.innings = [
    {
      inningsNumber: 1,
      battingTeamId: firstBattingTeam._id,
      bowlingTeamId: firstBowlingTeam._id,
      totalRuns: firstInnings.score,
      wickets: firstInnings.wickets,
      overs: firstInnings.oversPlayed,
      isCompleted: true
    },
    {
      inningsNumber: 2,
      battingTeamId: firstBowlingTeam._id,
      bowlingTeamId: firstBattingTeam._id,
      totalRuns: secondInnings.score,
      wickets: secondInnings.wickets,
      overs: secondInnings.oversPlayed,
      isCompleted: true
    }
  ];
  simMatch.status = 'completed';

  if (secondInnings.score > firstInnings.score) {
    simMatch.winnerTeamId = firstBowlingTeam._id;
    const maxWkts2 = Math.min(10, battingPlayers2.length - 1);
    const wicketsLeft = Math.max(1, maxWkts2 - secondInnings.wickets);
    simMatch.resultMargin = `${firstBowlingTeam.teamName} won by ${wicketsLeft} wicket${wicketsLeft > 1 ? 's' : ''}`;
  } else if (secondInnings.score < firstInnings.score) {
    simMatch.winnerTeamId = firstBattingTeam._id;
    const runDiff = firstInnings.score - secondInnings.score;
    simMatch.resultMargin = `${firstBattingTeam.teamName} won by ${runDiff} run${runDiff > 1 ? 's' : ''}`;
  } else {
    simMatch.winnerTeamId = null;
    simMatch.resultMargin = 'Match tied';
  }

  await simMatch.save();

  return simMatch;
};

/**
 * Calculates live simulation analysis for a real match state after every ball.
 * Computes Projected Score, Win Probability, Current Run Rate, Required Run Rate,
 * Phase, and Match Situation.
 */
const calculateLiveAnalysis = ({ match, innings, delivery }) => {
  const totalOvers = innings.maxOvers || match.oversPerInnings || (match.format === 'ODI' ? 50 : 20);
  const totalBallsLimit = totalOvers * 6;
  const legalBalls = innings.totalBalls || 0;
  const ballsRemaining = Math.max(totalBallsLimit - legalBalls, 0);
  const oversCompleted = Math.floor(legalBalls / 6);
  const ballsInOver = legalBalls % 6;
  const oversString = `${oversCompleted}.${ballsInOver}`;
  const phase = getPhase(oversCompleted, totalOvers);

  const crr = legalBalls > 0 ? Number(((innings.totalRuns / legalBalls) * 6).toFixed(2)) : 0;
  const wicketsInHand = Math.max((innings.maxWickets || 10) - innings.totalWickets, 0);

  let rrr = null;
  let runsNeeded = null;
  const isSecondInnings = innings.inningsNumber >= 2 || (innings.target != null && innings.target > 0);

  if (isSecondInnings) {
    const target = innings.target || 0;
    runsNeeded = Math.max(target - innings.totalRuns, 0);
    rrr = ballsRemaining > 0 ? Number(((runsNeeded / ballsRemaining) * 6).toFixed(2)) : (runsNeeded > 0 ? 99.99 : 0);
  }

  // Projected Score
  let projectedScore;
  const resourceMultiplier = 0.35 + (0.65 * (wicketsInHand / 10));
  const parRate = match.format === 'ODI' ? 5.5 : 8.0;
  const effectiveRate = legalBalls >= 6
    ? (crr * 0.7 + (phase === 'death' ? 9.5 : phase === 'powerplay' ? 7.5 : 6.5) * 0.3)
    : parRate;

  if (isSecondInnings) {
    if (innings.isComplete) {
      projectedScore = innings.totalRuns;
    } else {
      projectedScore = Math.round(innings.totalRuns + ((ballsRemaining / 6) * Math.max(crr, parRate) * resourceMultiplier));
      if (innings.target && projectedScore > innings.target && runsNeeded > 0) {
        projectedScore = innings.target;
      }
    }
  } else {
    projectedScore = Math.round(innings.totalRuns + ((ballsRemaining / 6) * effectiveRate * resourceMultiplier));
    if (projectedScore < innings.totalRuns) projectedScore = innings.totalRuns;
  }

  // Win Probability
  const battingTeamName =
    innings.battingTeamName ||
    (match.teamA && (match.teamA.id === innings.battingTeamId || match.teamA._id?.toString() === innings.battingTeamId)
      ? match.teamA.name
      : match.teamB?.name || 'Batting Team');
  const bowlingTeamName =
    innings.bowlingTeamName ||
    (match.teamA && (match.teamA.id === innings.bowlingTeamId || match.teamA._id?.toString() === innings.bowlingTeamId)
      ? match.teamA.name
      : match.teamB?.name || 'Bowling Team');

  let battingProb = 50;
  if (!isSecondInnings) {
    const parScore = totalOvers * parRate;
    const advantage = (projectedScore - parScore) / (parScore * 0.35 || 1);
    const wicketPenalty = (innings.totalWickets / 10) * 25;
    battingProb = 50 + advantage * 30 - wicketPenalty;
    battingProb = Math.min(Math.max(Math.round(battingProb), 5), 95);
  } else {
    if (innings.isComplete) {
      battingProb = innings.totalRuns >= (innings.target || 0) ? 100 : 0;
    } else if (wicketsInHand <= 0) {
      battingProb = 0;
    } else if (runsNeeded <= 0) {
      battingProb = 100;
    } else {
      // Issue 7 fix: dampened formula to avoid extreme probability swings
      // from a single delivery. Uses lower multipliers and a confidence
      // factor based on balls bowled so early overs don't overreact.
      const ballsBowled = Math.max(legalBalls, 1);
      const confidence = Math.min(ballsBowled / (totalBallsLimit * 0.5), 1); // ramps to 1 at halfway
      const crrDiff = crr - (rrr || 0);
      const wktEdge = (wicketsInHand - 5) * 3;
      const runsPerBall = runsNeeded / (ballsRemaining || 1);
      const rawProb = 50 + (crrDiff * 3 + wktEdge) * confidence - (runsPerBall > 2 ? 20 : runsPerBall > 1.5 ? 10 : 0);
      battingProb = Math.min(Math.max(Math.round(rawProb), 3), 97);
    }
  }
  const bowlingProb = 100 - battingProb;

  const isTeamABatting =
    match.teamA &&
    (String(match.teamA.id) === String(innings.battingTeamId) ||
      String(match.teamA._id) === String(innings.battingTeamId) ||
      match.teamA.name === innings.battingTeamName);
  const teamAWinProb = isTeamABatting ? battingProb : bowlingProb;
  const teamBWinProb = isTeamABatting ? bowlingProb : battingProb;

  // Match Situation Text
  let situation = '';
  if (match.status === 'completed') {
    situation =
      match.result?.winner === 'Tie'
        ? 'Match tied.'
        : `${match.result?.winner || 'Match winner'} won by ${match.result?.margin} ${match.result?.marginType || ''}.`;
  } else if (!isSecondInnings) {
    situation = `${battingTeamName} are ${innings.totalRuns}/${innings.totalWickets} in ${oversString} ov (CRR: ${crr.toFixed(2)}). Projected: ${projectedScore}.`;
  } else {
    situation = `${battingTeamName} need ${runsNeeded} run${runsNeeded === 1 ? '' : 's'} in ${ballsRemaining} ball${ballsRemaining === 1 ? '' : 's'} (RRR: ${rrr.toFixed(2)}, CRR: ${crr.toFixed(2)}) with ${wicketsInHand} wkts remaining.`;
  }

  return {
    matchId: match._id,
    inningsId: innings._id,
    deliveryId: delivery?._id,
    projectedScore,
    winProbability: {
      battingTeam: { name: battingTeamName, percent: battingProb },
      bowlingTeam: { name: bowlingTeamName, percent: bowlingProb },
      teamA: { id: match.teamA?.id, name: match.teamA?.name, percent: teamAWinProb },
      teamB: { id: match.teamB?.id, name: match.teamB?.name, percent: teamBWinProb }
    },
    currentRunRate: crr,
    requiredRunRate: rrr,
    situation,
    phase,
    oversString,
    totalRuns: innings.totalRuns,
    totalWickets: innings.totalWickets,
    totalBalls: innings.totalBalls
  };
};

const analyzeLiveMatch = async (matchId, inningsId, currentDelivery) => {
  const Match = require('../models/Match');
  const Innings = require('../models/Innings');

  const match = await Match.findById(matchId);
  if (!match) return null;
  const innings = await Innings.findById(inningsId);
  if (!innings) return null;

  return calculateLiveAnalysis({ match, innings, delivery: currentDelivery });
};

module.exports = { simulateMatch, getPhase, calculateLiveAnalysis, analyzeLiveMatch };
