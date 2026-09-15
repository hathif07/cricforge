const matchService = require('../services/matchService');
const { getLiveState } = require('../services/matchStateManager');
const { getIO } = require('../sockets/ioInstance');
const { emitMatchStarted, emitInningsCompleted } = require('../sockets/matchSocket');

exports.createMatch = async (req, res, next) => {
  try {
    const match = await matchService.createMatch({ ...req.body, createdBy: req.user ? req.user._id.toString() : undefined });
    res.status(201).json({ success: true, message: 'Match created', data: { match } });
  } catch (error) {
    next(error);
  }
};

exports.listMatches = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const matches = await matchService.listMatches(filter);
    res.status(200).json({ success: true, data: { matches } });
  } catch (error) {
    next(error);
  }
};

exports.getMatch = async (req, res, next) => {
  try {
    const match = await matchService.getMatchById(req.params.id);
    res.status(200).json({ success: true, data: { match } });
  } catch (error) {
    next(error);
  }
};

exports.setToss = async (req, res, next) => {
  try {
    const { winner, decision } = req.body;
    const match = await matchService.setToss(req.params.id, winner, decision);
    res.status(200).json({ success: true, message: 'Toss recorded', data: { match } });
  } catch (error) {
    next(error);
  }
};

exports.setPlayingXI = async (req, res, next) => {
  try {
    const players = await matchService.setPlayingXI(req.params.id, req.body.teamId || req.params.teamId, req.body.players);
    res.status(200).json({ success: true, message: 'Playing XI saved', data: { players } });
  } catch (error) {
    next(error);
  }
};

exports.startMatch = async (req, res, next) => {
  try {
    const { match, innings } = await matchService.startMatch(req.params.id);
    try {
      const io = getIO();
      emitMatchStarted(io, match._id.toString(), { matchId: match._id, innings });
    } catch (e) { /* socket layer optional in tests */ }
    res.status(200).json({ success: true, message: 'Match started', data: { match, innings } });
  } catch (error) {
    next(error);
  }
};

exports.startSecondInnings = async (req, res, next) => {
  try {
    const { match, innings } = await matchService.startSecondInnings(req.params.id);
    try {
      const io = getIO();
      emitInningsCompleted(io, match._id.toString(), { matchId: match._id, newInnings: innings });
    } catch (e) { /* noop */ }
    res.status(200).json({ success: true, message: 'Second innings started', data: { match, innings } });
  } catch (error) {
    next(error);
  }
};

exports.setBatter = async (req, res, next) => {
  try {
    const innings = await matchService.setBatter(req.params.inningsId, req.body);
    res.status(200).json({ success: true, message: 'Batters updated', data: { innings } });
  } catch (error) {
    next(error);
  }
};

exports.getScorecard = async (req, res, next) => {
  try {
    const scorecard = await matchService.getScorecard(req.params.id);
    res.status(200).json({ success: true, data: scorecard });
  } catch (error) {
    next(error);
  }
};

exports.getLiveState = async (req, res, next) => {
  try {
    const Innings = require('../models/Innings');
    const innings = await Innings.findById(req.params.inningsId);
    if (!innings) return res.status(404).json({ success: false, message: 'Innings not found' });
    const state = await getLiveState(innings, req.query.target ? Number(req.query.target) : innings.target);
    res.status(200).json({ success: true, data: { state } });
  } catch (error) {
    next(error);
  }
};
