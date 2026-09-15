const SimDelivery = require('../models/SimDelivery');
const SimMatch = require('../models/SimMatch');
const PlayerMatchStats = require('../models/PlayerMatchStats');
const Player = require('../models/Player');

/** Recomputes and stores PlayerMatchStats for every player involved in a completed SimMatch. */
const computeMatchStatistics = async (matchId) => {
  const match = await SimMatch.findById(matchId);
  if (!match) throw Object.assign(new Error('Match not found'), { status: 404 });

  const deliveries = await SimDelivery.find({ matchId });
  const statsByPlayer = {};

  const ensure = (playerId, teamId) => {
    const key = playerId.toString();
    if (!statsByPlayer[key]) {
      statsByPlayer[key] = {
        playerId,
        teamId,
        batting: { runs: 0, ballsFaced: 0, fours: 0, sixes: 0, isOut: false, dismissalType: null },
        bowling: { ballsBowled: 0, runsConceded: 0, wickets: 0, maidens: 0 }
      };
    }
    return statsByPlayer[key];
  };

  for (const d of deliveries) {
    const striker = ensure(d.strikerId, d.battingTeamId);
    striker.batting.runs += d.runsBat;
    if (!d.extraType || d.extraType === 'bye' || d.extraType === 'leg_bye') striker.batting.ballsFaced += 1;
    if (d.runsBat === 4) striker.batting.fours += 1;
    if (d.runsBat === 6) striker.batting.sixes += 1;
    if (d.isWicket && String(d.dismissedPlayerId) === String(d.strikerId)) {
      striker.batting.isOut = true;
      striker.batting.dismissalType = d.wicketType;
    }

    const bowler = ensure(d.bowlerId, d.bowlingTeamId);
    if (!['wide', 'no_ball'].includes(d.extraType)) bowler.bowling.ballsBowled += 1;
    bowler.bowling.runsConceded += d.totalRuns;
    if (d.isWicket && d.wicketType !== 'run_out') bowler.bowling.wickets += 1;
  }

  const docs = Object.values(statsByPlayer).map((s) => {
    s.batting.strikeRate = s.batting.ballsFaced > 0 ? Number(((s.batting.runs / s.batting.ballsFaced) * 100).toFixed(2)) : 0;
    s.bowling.economy = s.bowling.ballsBowled > 0 ? Number(((s.bowling.runsConceded / s.bowling.ballsBowled) * 6).toFixed(2)) : 0;
    return { ...s, matchId };
  });

  for (const doc of docs) {
    await PlayerMatchStats.findOneAndUpdate(
      { matchId, playerId: doc.playerId },
      doc,
      { upsert: true, new: true }
    );
  }

  return docs;
};

/** Aggregates a player's career figures across all recorded PlayerMatchStats documents. */
const getPlayerCareerStats = async (playerId) => {
  const rows = await PlayerMatchStats.find({ playerId });
  const player = await Player.findById(playerId);

  const totals = rows.reduce(
    (acc, r) => {
      acc.matches += 1;
      acc.runs += r.batting.runs;
      acc.ballsFaced += r.batting.ballsFaced;
      acc.fours += r.batting.fours;
      acc.sixes += r.batting.sixes;
      acc.dismissals += r.batting.isOut ? 1 : 0;
      acc.wickets += r.bowling.wickets;
      acc.ballsBowled += r.bowling.ballsBowled;
      acc.runsConceded += r.bowling.runsConceded;
      return acc;
    },
    { matches: 0, runs: 0, ballsFaced: 0, fours: 0, sixes: 0, dismissals: 0, wickets: 0, ballsBowled: 0, runsConceded: 0 }
  );

  return {
    player,
    matches: totals.matches,
    battingAverage: totals.dismissals > 0 ? Number((totals.runs / totals.dismissals).toFixed(2)) : totals.runs,
    strikeRate: totals.ballsFaced > 0 ? Number(((totals.runs / totals.ballsFaced) * 100).toFixed(2)) : 0,
    totalRuns: totals.runs,
    fours: totals.fours,
    sixes: totals.sixes,
    wickets: totals.wickets,
    economy: totals.ballsBowled > 0 ? Number(((totals.runsConceded / totals.ballsBowled) * 6).toFixed(2)) : 0
  };
};

module.exports = { computeMatchStatistics, getPlayerCareerStats };
