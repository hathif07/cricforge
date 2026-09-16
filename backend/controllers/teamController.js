const Team = require('../models/Team');
const Player = require('../models/Player');

exports.createTeam = async (req, res, next) => {
  try {
    const {
      teamId,
      teamName,
      shortName,
      color,
      purseTotal
    } = req.body;

    if (!teamId || !teamName || !shortName) {
      return res.status(400).json({
        success: false,
        message: 'Team ID, team name and short name are required'
      });
    }

    if (!/^[A-Za-z0-9_-]+$/.test(teamId.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Team ID can contain only letters, numbers, underscore and hyphen'
      });
    }

    if (!/^[A-Za-z ]+$/.test(teamName.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Team name can contain only letters and spaces'
      });
    }

    if (!/^[A-Za-z]{2,5}$/.test(shortName.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Short name must contain 2 to 5 letters'
      });
    }

    const totalPurse = Number(purseTotal);

    if (!Number.isFinite(totalPurse) || totalPurse <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Auction purse must be greater than 0'
      });
    }

    const team = await Team.create({
      teamId: teamId.trim(),
      teamName: teamName.trim(),
      shortName: shortName.trim().toUpperCase(),
      color: color || '#000000',
      purseTotal: totalPurse,
      purseRemaining: totalPurse,
      players: [],
      captain: null,
      viceCaptain: null,
      owner: req.user ? req.user._id : null
    });

    res.status(201).json({
      success: true,
      message: 'Team created successfully',
      data: {
        team
      }
    });
  } catch (error) {
    next(error);
  }
};


exports.getTeams = async (req, res, next) => {
  try {
    const teams = await Team.find()
      .populate(
        'players',
        'name role battingRating bowlingRating isSold'
      )
      .populate('captain', 'name')
      .populate('viceCaptain', 'name')
      .sort({ teamName: 1 });

    res.status(200).json({
      success: true,
      data: {
        teams,
        count: teams.length
      }
    });
  } catch (error) {
    next(error);
  }
};


exports.getTeamById = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('players')
      .populate('captain', 'name')
      .populate('viceCaptain', 'name');

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        team
      }
    });
  } catch (error) {
    next(error);
  }
};


exports.updateTeam = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    const allowedFields = [
      'teamName',
      'shortName',
      'color',
      'purseTotal',
      'purseRemaining'
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        team[field] = req.body[field];
      }
    });

    await team.save();

    res.status(200).json({
      success: true,
      message: 'Team updated successfully',
      data: {
        team
      }
    });
  } catch (error) {
    next(error);
  }
};


exports.deleteTeam = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    await Player.updateMany(
      { teamId: team._id },
      { $set: { teamId: null } }
    );

    await team.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Team deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};


exports.addPlayerToTeam = async (req, res, next) => {
  try {
    const { playerId } = req.body;

    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    const player = await Player.findById(playerId);

    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    if (player.teamId) {
      return res.status(400).json({
        success: false,
        message: 'Player already belongs to a team'
      });
    }

    player.teamId = team._id;
    await player.save();

    await Team.findByIdAndUpdate(
      team._id,
      {
        $addToSet: {
          players: player._id
        }
      }
    );

    const updatedTeam = await Team.findById(team._id)
      .populate('players');

    res.status(200).json({
      success: true,
      message: 'Player added to team',
      data: {
        team: updatedTeam
      }
    });
  } catch (error) {
    next(error);
  }
};