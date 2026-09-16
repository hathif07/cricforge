const Player = require('../models/Player');
const Team = require('../models/Team');

const calculateAge = (dob) => {
  const birthDate = new Date(dob);
  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();

  const monthDifference = today.getMonth() - birthDate.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 &&
      today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
};

const validatePlayerData = (data) => {
  const {
    name,
    dob,
    role,
    jerseyNumber,
    battingRating,
    bowlingRating,
    basePrice
  } = data;

  if (!name || !dob || !role) {
    return 'Name, Date of Birth and Role are required';
  }

  if (!/^[A-Za-z ]+$/.test(name.trim())) {
    return 'Player name can contain only letters and spaces';
  }

  const birthDate = new Date(dob);

  if (Number.isNaN(birthDate.getTime())) {
    return 'Invalid Date of Birth';
  }

  if (birthDate > new Date()) {
    return 'Date of Birth cannot be in the future';
  }

  const age = calculateAge(dob);

  if (age < 10 || age > 80) {
    return 'Player age must be between 10 and 80 years';
  }

  if (
    !Number.isInteger(Number(jerseyNumber)) ||
    Number(jerseyNumber) < 1 ||
    Number(jerseyNumber) > 99
  ) {
    return 'Jersey number must be an integer between 1 and 99';
  }

  if (
    !Number.isInteger(Number(battingRating)) ||
    Number(battingRating) < 0 ||
    Number(battingRating) > 100
  ) {
    return 'Batting rating must be an integer between 0 and 100';
  }

  if (
    !Number.isInteger(Number(bowlingRating)) ||
    Number(bowlingRating) < 0 ||
    Number(bowlingRating) > 100
  ) {
    return 'Bowling rating must be an integer between 0 and 100';
  }

  if (
    !Number.isFinite(Number(basePrice)) ||
    Number(basePrice) <= 0 ||
    Number(basePrice) > 20
  ) {
    return 'Auction base price must be between 0 and 20 Cr';
  }

  return null;
};

exports.createPlayer = async (req, res, next) => {
  try {
    const error = validatePlayerData(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error
      });
    }

    const {
      playerId,
      name,
      dob,
      role,
      battingStyle,
      bowlingStyle,
      jerseyNumber,
      teamId,
      battingRating,
      bowlingRating,
      basePrice
    } = req.body;

    const existingPlayer = await Player.findOne({
      name: { $regex: `^${name.trim()}$`, $options: 'i' }
    });

    if (existingPlayer) {
      return res.status(400).json({
        success: false,
        message: 'A player with this name already exists'
      });
    }

    const age = calculateAge(dob);

    const player = await Player.create({
      playerId,
      name: name.trim(),
      dob,
      age,
      role,
      battingStyle,
      bowlingStyle,
      jerseyNumber: Number(jerseyNumber),
      teamId: teamId || null,
      battingRating: Number(battingRating),
      bowlingRating: Number(bowlingRating),
      basePrice: Number(basePrice)
    });

    if (teamId) {
      await Team.findByIdAndUpdate(teamId, {
        $addToSet: { players: player._id }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Player created successfully',
      data: { player }
    });
  } catch (error) {
    next(error);
  }
};

exports.getPlayers = async (req, res, next) => {
  try {
    const { search, role, teamId, unassigned } = req.query;

    const query = {};

    if (search) {
      query.name = {
        $regex: search,
        $options: 'i'
      };
    }

    if (role) query.role = role;

    if (teamId) query.teamId = teamId;

    if (unassigned === 'true') {
      query.teamId = null;
    }

    const players = await Player.find(query)
      .populate('teamId', 'teamName shortName')
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      data: {
        players,
        count: players.length
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getPlayerById = async (req, res, next) => {
  try {
    const player = await Player.findById(req.params.id)
      .populate('teamId', 'teamName shortName');

    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { player }
    });
  } catch (error) {
    next(error);
  }
};

exports.updatePlayer = async (req, res, next) => {
  try {
    const player = await Player.findById(req.params.id);

    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    const updatedData = {
      ...player.toObject(),
      ...req.body
    };

    const validationError = validatePlayerData(updatedData);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError
      });
    }

    const existingPlayer = await Player.findOne({
      name: { $regex: `^${updatedData.name.trim()}$`, $options: 'i' },
      _id: { $ne: player._id }
    });

    if (existingPlayer) {
      return res.status(400).json({
        success: false,
        message: 'A player with this name already exists'
      });
    }

    const previousTeamId = player.teamId
      ? player.teamId.toString()
      : null;

    const allowedFields = [
      'name',
      'dob',
      'role',
      'battingStyle',
      'bowlingStyle',
      'jerseyNumber',
      'teamId',
      'battingRating',
      'bowlingRating',
      'basePrice'
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        player[field] = req.body[field];
      }
    });

    if (req.body.dob !== undefined) {
      player.age = calculateAge(req.body.dob);
    }

    await player.save();

    const newTeamId = player.teamId
      ? player.teamId.toString()
      : null;

    if (previousTeamId !== newTeamId) {
      if (previousTeamId) {
        await Team.findByIdAndUpdate(
          previousTeamId,
          { $pull: { players: player._id } }
        );
      }

      if (newTeamId) {
        await Team.findByIdAndUpdate(
          newTeamId,
          { $addToSet: { players: player._id } }
        );
      }
    }

    res.status(200).json({
      success: true,
      message: 'Player updated successfully',
      data: { player }
    });
  } catch (error) {
    next(error);
  }
};

exports.deletePlayer = async (req, res, next) => {
  try {
    const player = await Player.findById(req.params.id);

    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    if (player.teamId) {
      await Team.findByIdAndUpdate(
        player.teamId,
        { $pull: { players: player._id } }
      );
    }

    await player.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Player deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};