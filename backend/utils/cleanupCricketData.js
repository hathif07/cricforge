const { connectDB, disconnectDB } = require('../config/db');
const Team = require('../models/Team');
const Player = require('../models/Player');
const Match = require('../models/Match');
const MatchPlayer = require('../models/MatchPlayer');
const Innings = require('../models/Innings');
const Delivery = require('../models/Delivery');
const Over = require('../models/Over');
const Partnership = require('../models/Partnership');
const FallOfWicket = require('../models/FallOfWicket');

const normalise = (value) => value.trim().toLowerCase();

const removeMatches = async (matches) => {
  if (!matches.length) return;
  const matchIds = matches.map((match) => match._id);
  const innings = await Innings.find({ matchId: { $in: matchIds } }).select('_id');
  const inningsIds = innings.map((item) => item._id);
  await MatchPlayer.deleteMany({ matchId: { $in: matchIds } });
  await Delivery.deleteMany({ matchId: { $in: matchIds } });
  await Over.deleteMany({ inningsId: { $in: inningsIds } });
  await Partnership.deleteMany({ inningsId: { $in: inningsIds } });
  await FallOfWicket.deleteMany({ inningsId: { $in: inningsIds } });
  await Innings.deleteMany({ _id: { $in: inningsIds } });
  await Match.deleteMany({ _id: { $in: matchIds } });
};

const cleanupCricketData = async () => {
  const allTeams = await Team.find({});
  const validTeams = allTeams.filter((team) => team.teamName?.trim() && team.shortName?.trim() && team.players.length > 0);
  const validTeamIds = new Set(validTeams.map((team) => team._id.toString()));
  const invalidTeams = allTeams.filter((team) => !validTeamIds.has(team._id.toString()));
  const invalidTeamIds = invalidTeams.map((team) => team._id);

  if (invalidTeamIds.length) {
    await Player.deleteMany({ teamId: { $in: invalidTeamIds } });
    await Team.deleteMany({ _id: { $in: invalidTeamIds } });
  }

  const persistedTeams = await Team.find({}).select('_id');
  const persistedTeamIds = new Set(persistedTeams.map((team) => team._id.toString()));
  const orphanedPlayers = await Player.collection.find({ teamId: { $exists: true, $ne: null } }).toArray();
  const orphanedPlayerIds = orphanedPlayers
    .filter((player) => player.teamId && !persistedTeamIds.has(player.teamId.toString()))
    .map((player) => player._id);
  if (orphanedPlayerIds.length) {
    await Player.deleteMany({ _id: { $in: orphanedPlayerIds } });
  }

  // Remove duplicate records only when the same player name belongs to the
  // same team. The same name across different teams is legitimate.
  const players = await Player.find({}).sort({ createdAt: 1 });
  const seen = new Map();
  const duplicateIds = [];
  for (const player of players) {
    const key = `${normalise(player.name)}|${player.teamId ? player.teamId.toString() : 'unassigned'}`;
    if (seen.has(key)) duplicateIds.push(player._id);
    else seen.set(key, player._id);
  }
  if (duplicateIds.length) {
    await Player.deleteMany({ _id: { $in: duplicateIds } });
    await Team.updateMany({}, { $pull: { players: { $in: duplicateIds } } });
  }

  const currentTeams = await Team.find({}).select('_id teamName shortName players');
  const currentTeamIds = new Set(currentTeams.map((team) => team._id.toString()));
  const matches = await Match.find({});
  const invalidMatches = matches.filter((match) => {
    const hasTeam = (team) => Boolean(team?.id && team?.name?.trim());
    return !hasTeam(match.teamA) || !hasTeam(match.teamB)
      || !currentTeamIds.has(String(match.teamA.id))
      || !currentTeamIds.has(String(match.teamB.id))
      || String(match.teamA.id) === String(match.teamB.id);
  });

  if (invalidMatches.length) {
    await removeMatches(invalidMatches);
  }

  const remainingMatches = await Match.find({});
  const duplicateGroups = new Map();
  for (const match of remainingMatches) {
    const key = `${match.teamA.id}|${match.teamB.id}|${match.status}`;
    if (!duplicateGroups.has(key)) duplicateGroups.set(key, []);
    duplicateGroups.get(key).push(match);
  }
  const duplicateMatches = [];
  for (const group of duplicateGroups.values()) {
    if (group.length < 2) continue;
    const inningsByMatch = await Promise.all(group.map((match) => Innings.find({ matchId: match._id }).select('_id')));
    const deliveryCounts = await Promise.all(inningsByMatch.map((items) => Delivery.countDocuments({ inningsId: { $in: items.map((item) => item._id) } })));
    const keepIndex = deliveryCounts.reduce((best, count, index) => count > deliveryCounts[best] ? index : best, 0);
    group.forEach((match, index) => { if (index !== keepIndex) duplicateMatches.push(match); });
  }
  if (duplicateMatches.length) await removeMatches(duplicateMatches);

  console.log(JSON.stringify({
    removedTeams: invalidTeams.length,
    removedDuplicatePlayers: duplicateIds.length + orphanedPlayerIds.length,
    removedInvalidMatches: invalidMatches.length + duplicateMatches.length,
    remainingTeams: currentTeams.length,
    remainingMatches: matches.length - invalidMatches.length - duplicateMatches.length
  }, null, 2));
};

if (require.main === module) {
  (async () => {
    await connectDB();
    await cleanupCricketData();
    await disconnectDB();
  })().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { cleanupCricketData };
