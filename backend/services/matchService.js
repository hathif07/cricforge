const Match = require('../models/Match');
const Innings = require('../models/Innings');
const MatchPlayer = require('../models/MatchPlayer');
const FallOfWicket = require('../models/FallOfWicket');
const Partnership = require('../models/Partnership');
const Delivery = require('../models/Delivery');
const { validateBatterEligibility } = require('./deliveryValidator');

const createMatch = async (payload) => {
  const match = await Match.create({
    teamA: payload.teamA,
    teamB: payload.teamB,
    format: payload.format,
    oversPerInnings: payload.oversPerInnings,
    venue: payload.venue,
    mode: payload.mode || 'manual',
    createdBy: payload.createdBy
  });
  return match;
};

const setToss = async (matchId, winnerTeamId, decision) => {
  const match = await Match.findById(matchId);
  if (!match) throw Object.assign(new Error('Match not found'), { status: 404 });

  if (![match.teamA.id, match.teamB.id].includes(winnerTeamId)) {
    throw Object.assign(new Error('Toss winner must be one of the two teams in this match'), { status: 400 });
  }

  match.toss = { winner: winnerTeamId, decision };
  match.status = 'toss';
  await match.save();
  return match;
};

/**
 * BUG FIX: matchService previously read `p.isWicketKeeper` (capital K)
 * while the MatchPlayer schema field is `isWicketkeeper` (lowercase k).
 * That mismatch meant the wicketkeeper-count check below always compared
 * against `undefined`, so a Playing XI with zero designated wicketkeepers
 * was silently accepted. Both now consistently use `isWicketkeeper`.
 */
const setPlayingXI = async (matchId, teamId, players) => {
  if (!Array.isArray(players) || players.length !== 11) {
    throw Object.assign(new Error('A Playing XI must contain exactly 11 players'), { status: 400 });
  }

  const captains = players.filter((p) => p.isCaptain);
  if (captains.length !== 1) {
    throw Object.assign(new Error('Exactly one player must be designated as captain'), { status: 400 });
  }

  const keepers = players.filter((p) => p.isWicketkeeper);
  if (keepers.length < 1) {
    throw Object.assign(new Error('At least one player must be designated as wicketkeeper'), { status: 400 });
  }

  await MatchPlayer.deleteMany({ matchId, teamId });

  const docs = players.map((p, index) => ({
    matchId,
    teamId,
    playerId: p.playerId,
    playerName: p.playerName,
    playerRole: p.playerRole || 'batter',
    isCaptain: !!p.isCaptain,
    isWicketkeeper: !!p.isWicketkeeper,
    battingOrder: p.battingOrder ?? index + 1
  }));

  const saved = await MatchPlayer.insertMany(docs);

  const match = await Match.findById(matchId);
  const bothTeamsSet =
    (await MatchPlayer.countDocuments({ matchId, teamId: match.teamA.id })) === 11 &&
    (await MatchPlayer.countDocuments({ matchId, teamId: match.teamB.id })) === 11;
  if (bothTeamsSet) {
    match.status = 'playing_xi';
    await match.save();
  }

  return saved;
};

/**
 * BUG FIX: the original implementation determined the batting/bowling
 * team by comparing `match.teamA.toString()` (an embedded {id, name}
 * object) against `match.toss.winner.toString()` (a plain team-id
 * string). Calling .toString() on a plain object yields "[object Object]",
 * so that comparison could never actually match and the batting/bowling
 * side was assigned incorrectly. This now compares the actual `.id`
 * fields, which are the values that matter.
 */
const startMatch = async (matchId) => {
  const match = await Match.findById(matchId);
  if (!match) throw Object.assign(new Error('Match not found'), { status: 404 });
  if (!match.toss || !match.toss.winner) {
    throw Object.assign(new Error('Toss must be completed before starting the match'), { status: 400 });
  }

  const winnerIsTeamA = match.toss.winner === match.teamA.id;
  const winnerTeam = winnerIsTeamA ? match.teamA : match.teamB;
  const otherTeam = winnerIsTeamA ? match.teamB : match.teamA;

  const battingTeam = match.toss.decision === 'bat' ? winnerTeam : otherTeam;
  const bowlingTeam = match.toss.decision === 'bat' ? otherTeam : winnerTeam;

  const maxOvers = match.oversPerInnings || null;

  const innings = await Innings.create({
    matchId: match._id,
    battingTeamId: battingTeam.id,
    battingTeamName: battingTeam.name,
    bowlingTeamId: bowlingTeam.id,
    bowlingTeamName: bowlingTeam.name,
    inningsNumber: 1,
    status: 'in_progress',
    maxOvers,
    maxWickets: 10
  });

  match.innings.push(innings._id);
  match.status = 'live';
  await match.save();

  return { match, innings };
};

/** Starts the second innings, setting the first innings' total as the target. */
const startSecondInnings = async (matchId) => {
  const match = await Match.findById(matchId).populate('innings');
  if (!match) throw Object.assign(new Error('Match not found'), { status: 404 });

  const firstInnings = match.innings[0];
  if (!firstInnings || !firstInnings.isComplete) {
    throw Object.assign(new Error('The first innings must be completed before starting the second'), { status: 400 });
  }

  const innings = await Innings.create({
    matchId: match._id,
    battingTeamId: firstInnings.bowlingTeamId,
    battingTeamName: firstInnings.bowlingTeamName,
    bowlingTeamId: firstInnings.battingTeamId,
    bowlingTeamName: firstInnings.battingTeamName,
    inningsNumber: 2,
    status: 'in_progress',
    maxOvers: firstInnings.maxOvers,
    maxWickets: 10,
    target: firstInnings.totalRuns + 1
  });

  match.innings.push(innings._id);
  await match.save();

  return { match, innings };
};

/**
 * Sets the striker/non-striker for an innings (e.g. at innings start, or
 * after a wicket). Now actually enforces that a previously-dismissed
 * batter cannot be selected again (deliveryValidator.validateBatterEligibility
 * was defined but never called before this fix).
 */
const setBatter = async (inningsId, { strikerId, nonStrikerId }) => {
  const innings = await Innings.findById(inningsId);
  if (!innings) throw Object.assign(new Error('Innings not found'), { status: 404 });

  const dismissedWickets = await FallOfWicket.find({ inningsId });
  const dismissedPlayerIds = dismissedWickets.map((w) => w.dismissedPlayerId);

  if (strikerId) {
    const check = validateBatterEligibility(strikerId, dismissedPlayerIds);
    if (!check.isValid) throw Object.assign(new Error(check.errors.join('; ')), { status: 400 });
    innings.currentStriker = strikerId;
  }
  if (nonStrikerId) {
    const check = validateBatterEligibility(nonStrikerId, dismissedPlayerIds);
    if (!check.isValid) throw Object.assign(new Error(check.errors.join('; ')), { status: 400 });
    innings.currentNonStriker = nonStrikerId;
  }

  await innings.save();
  return innings;
};

const getScorecard = async (matchId) => {
  const match = await Match.findById(matchId).populate({
    path: 'innings',
    populate: { path: 'overs' }
  });
  if (!match) throw Object.assign(new Error('Match not found'), { status: 404 });

  const inningsData = [];
  for (const innings of match.innings) {
    const deliveries = await Delivery.find({ inningsId: innings._id }).sort({ sequenceNumber: 1 });
    const fallOfWickets = await FallOfWicket.find({ inningsId: innings._id }).sort({ wicketNumber: 1 });
    const partnerships = await Partnership.find({ inningsId: innings._id }).sort({ createdAt: 1 });

    const battingCard = {};
    const bowlingCard = {};
    const overMap = {};
    const cumulativeRuns = [];
    const simulationProgression = [];
    const keyMoments = [];
    let cumulative = 0;

    for (const d of deliveries) {
      if (!battingCard[d.strikerId]) {
        battingCard[d.strikerId] = { playerId: d.strikerId, name: d.strikerName, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false, dismissal: null };
      }
      const batter = battingCard[d.strikerId];
      batter.runs += d.runsOffBat;
      if (d.isLegal) batter.balls += 1;
      if (d.isBoundary && !d.isSix) batter.fours += 1;
      if (d.isSix) batter.sixes += 1;
      if (d.isWicket && (d.wicket?.dismissedPlayerId === d.strikerId || !d.wicket?.dismissedPlayerId)) {
        batter.isOut = true;
        batter.dismissal = d.wicket?.type || 'out';
      }

      if (!bowlingCard[d.bowlerId]) {
        bowlingCard[d.bowlerId] = { playerId: d.bowlerId, name: d.bowlerName, balls: 0, runs: 0, wickets: 0, maidens: 0 };
      }
      const bowler = bowlingCard[d.bowlerId];
      if (d.isLegal) bowler.balls += 1;
      bowler.runs += d.totalRuns;
      if (d.isWicket && !['runOut'].includes(d.wicket?.type)) bowler.wickets += 1;

      // Over progression
      const overNum = d.overNumber || Math.floor((d.sequenceNumber - 1) / 6) + 1;
      if (!overMap[overNum]) overMap[overNum] = { over: overNum, runs: 0, wickets: 0 };
      overMap[overNum].runs += d.totalRuns;
      if (d.isWicket) overMap[overNum].wickets += 1;

      // Cumulative runs
      cumulative += d.totalRuns;
      cumulativeRuns.push({
        ball: d.sequenceNumber,
        over: `${d.overNumber || Math.floor((d.sequenceNumber - 1) / 6)}.${d.ballNumber || (d.sequenceNumber % 6)}`,
        runs: cumulative
      });

      // Simulation progression
      if (d.simulation) {
        simulationProgression.push({
          ball: d.sequenceNumber,
          over: `${d.overNumber || Math.floor((d.sequenceNumber - 1) / 6)}.${d.ballNumber || (d.sequenceNumber % 6)}`,
          projectedScore: d.simulation.projectedScore,
          winProbabilityBatting: d.simulation.winProbability?.battingTeam?.percent ?? d.simulation.winProbability?.teamA?.percent ?? 50,
          winProbabilityBowling: d.simulation.winProbability?.bowlingTeam?.percent ?? d.simulation.winProbability?.teamB?.percent ?? 50,
          teamAWinProb: d.simulation.winProbability?.teamA?.percent ?? 50,
          teamBWinProb: d.simulation.winProbability?.teamB?.percent ?? 50,
          currentRunRate: d.simulation.currentRunRate,
          requiredRunRate: d.simulation.requiredRunRate,
          situation: d.simulation.situation
        });
      }

      // Key match moments
      if (d.isWicket) {
        keyMoments.push({
          type: 'wicket',
          ball: d.sequenceNumber,
          over: `${d.overNumber}.${d.ballNumber}`,
          description: `WICKET: ${d.wicket?.dismissedPlayerName || d.strikerName} (${d.wicket?.type || 'out'}) b ${d.bowlerName} - ${innings.battingTeamName} ${cumulative}/${fallOfWickets.length + 1}`
        });
      } else if (d.isSix) {
        keyMoments.push({
          type: 'six',
          ball: d.sequenceNumber,
          over: `${d.overNumber}.${d.ballNumber}`,
          description: `SIX! ${d.strikerName} hits ${d.bowlerName} for 6 runs`
        });
      }
    }

    const topBatters = Object.values(battingCard).sort((a, b) => b.runs - a.runs).slice(0, 3);
    const topBowlers = Object.values(bowlingCard).sort((a, b) => b.wickets - a.wickets || a.runs - b.runs).slice(0, 3);

    inningsData.push({
      inningsNumber: innings.inningsNumber,
      battingTeamName: innings.battingTeamName,
      bowlingTeamName: innings.bowlingTeamName,
      totalRuns: innings.totalRuns,
      totalWickets: innings.totalWickets,
      totalBalls: innings.totalBalls,
      isComplete: innings.isComplete,
      battingCard: Object.values(battingCard),
      bowlingCard: Object.values(bowlingCard),
      fallOfWickets,
      partnerships,
      progression: {
        perOver: Object.values(overMap),
        cumulative: cumulativeRuns
      },
      simulationProgression,
      topBatters,
      topBowlers,
      keyMoments
    });
  }

  return { match, innings: inningsData };
};

const listMatches = async (filter = {}) => {
  return Match.find({
    ...filter,
    'teamA.id': { $exists: true, $nin: ['', null] },
    'teamA.name': { $exists: true, $nin: ['', null] },
    'teamB.id': { $exists: true, $nin: ['', null] },
    'teamB.name': { $exists: true, $nin: ['', null] }
  }).sort({ createdAt: -1 });
};

const getMatchById = async (matchId) => {
  const match = await Match.findById(matchId).populate('innings');
  if (!match) throw Object.assign(new Error('Match not found'), { status: 404 });
  return match;
};

module.exports = {
  createMatch,
  setToss,
  setPlayingXI,
  startMatch,
  startSecondInnings,
  setBatter,
  getScorecard,
  listMatches,
  getMatchById
};
