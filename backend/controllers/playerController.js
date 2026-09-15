const Player = require('../models/Player');
const Team = require('../models/Team');

exports.createPlayer = async (req, res, next) => {
  try {
    const { playerId, name, age, role, battingStyle, bowlingStyle, jerseyNumber, teamId, battingRating, bowlingRating, basePrice } = req.body;
    if (!name || !role) {
      return res.status(400).json({ success: false, message: 'Player name and role are required' });
    }

    const player = await Player.create({
      playerId,
      name: name.trim(),
      age,
      role,
      battingStyle,
      bowlingStyle,
      jerseyNumber,
      teamId: teamId || null,
      battingRating,
      bowlingRating,
      basePrice
    });

    if (teamId) {
      await Team.findByIdAndUpdate(teamId, { $addToSet: { players: player._id } });
    }

    res.status(201).json({ success: true, message: 'Player created successfully', data: { player } });
  } catch (error) {
    next(error);
  }
};

exports.getPlayers = async (req, res, next) => {
  try {
    const { search, role, teamId, unassigned } = req.query;
    const query = {};
    if (search) query.name = { $regex: search, $options: 'i' };
    if (role) query.role = role;
    if (teamId) query.teamId = teamId;
    if (unassigned === 'true') query.teamId = null;

    const players = await Player.find(query).populate('teamId', 'teamName shortName').sort({ name: 1 });
    res.status(200).json({ success: true, data: { players, count: players.length } });
  } catch (error) {
    next(error);
  }
};

exports.getPlayerById = async (req, res, next) => {
  try {
    const player = await Player.findById(req.params.id).populate('teamId', 'teamName shortName');
    if (!player) return res.status(404).json({ success: false, message: 'Player not found' });
    res.status(200).json({ success: true, data: { player } });
  } catch (error) {
    next(error);
  }
};

exports.updatePlayer = async (req, res, next) => {
  try {
    const player = await Player.findById(req.params.id);
    if (!player) return res.status(404).json({ success: false, message: 'Player not found' });

    const previousTeamId = player.teamId ? player.teamId.toString() : null;
    const allowedFields = ['name', 'age', 'role', 'battingStyle', 'bowlingStyle', 'jerseyNumber', 'teamId', 'battingRating', 'bowlingRating', 'basePrice'];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) player[field] = req.body[field];
    });
    await player.save();

    const newTeamId = player.teamId ? player.teamId.toString() : null;
    if (previousTeamId !== newTeamId) {
      if (previousTeamId) await Team.findByIdAndUpdate(previousTeamId, { $pull: { players: player._id } });
      if (newTeamId) await Team.findByIdAndUpdate(newTeamId, { $addToSet: { players: player._id } });
    }

    res.status(200).json({ success: true, message: 'Player updated successfully', data: { player } });
  } catch (error) {
    next(error);
  }
};

exports.deletePlayer = async (req, res, next) => {
  try {
    const player = await Player.findById(req.params.id);
    if (!player) return res.status(404).json({ success: false, message: 'Player not found' });

    if (player.teamId) {
      await Team.findByIdAndUpdate(player.teamId, { $pull: { players: player._id } });
    }
    await player.deleteOne();

    res.status(200).json({ success: true, message: 'Player deleted successfully' });
  } catch (error) {
    next(error);
  }
};
