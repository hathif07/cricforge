const simulationService = require('../services/simulationService');
const statisticsService = require('../services/statisticsService');
const analyticsService = require('../services/analyticsService');
const SimMatch = require('../models/SimMatch');

exports.simulateMatch = async (req, res, next) => {
  try {
    const { teamAId, teamBId, oversLimit, seed } = req.body;
    if (!teamAId || !teamBId) {
      return res.status(400).json({ success: false, message: 'Both teamAId and teamBId are required' });
    }
    const match = await simulationService.simulateMatch(teamAId, teamBId, oversLimit || 20, seed);
    await statisticsService.computeMatchStatistics(match._id);
    const populated = await SimMatch.findById(match._id).populate('teamA teamB winnerTeamId');
    res.status(201).json({ success: true, message: 'Match simulated', data: { match: populated } });
  } catch (error) {
    next(error);
  }
};

exports.listSimMatches = async (req, res, next) => {
  try {
    const matches = await SimMatch.find().populate('teamA teamB winnerTeamId', 'teamName shortName').sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: { matches } });
  } catch (error) {
    next(error);
  }
};

exports.getSimMatch = async (req, res, next) => {
  try {
    const match = await SimMatch.findById(req.params.id).populate('teamA teamB winnerTeamId');
    if (!match) return res.status(404).json({ success: false, message: 'Simulated match not found' });
    res.status(200).json({ success: true, data: { match } });
  } catch (error) {
    next(error);
  }
};

exports.getMatchStatistics = async (req, res, next) => {
  try {
    const stats = await statisticsService.computeMatchStatistics(req.params.id);
    res.status(200).json({ success: true, data: { stats } });
  } catch (error) {
    next(error);
  }
};

exports.getPlayerCareerStats = async (req, res, next) => {
  try {
    const stats = await statisticsService.getPlayerCareerStats(req.params.playerId);
    res.status(200).json({ success: true, data: { stats } });
  } catch (error) {
    next(error);
  }
};

exports.getAnalytics = async (req, res, next) => {
  try {
    const { id } = req.params;
    const inningsNumber = Number(req.query.innings) || 1;
    const match = await SimMatch.findById(id);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });

    const [progression, phases, partnerships] = await Promise.all([
      analyticsService.getRunProgression(id, inningsNumber),
      analyticsService.getPhaseAnalysis(id, inningsNumber, match.oversLimit),
      analyticsService.getPartnerships(id, inningsNumber)
    ]);

    res.status(200).json({ success: true, data: { progression, phases, partnerships } });
  } catch (error) {
    next(error);
  }
};
