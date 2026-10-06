const scoringEngine = require('../services/scoringEngine');
const simulationService = require('../services/simulationService');
const { getIO } = require('../sockets/ioInstance');
const {
  emitScoreUpdated,
  emitBallScored,
  emitWicket,
  emitBoundary,
  emitOverCompleted,
  emitInningsCompleted,
  emitMatchCompleted,
  emitSimulationUpdated
} = require('../sockets/matchSocket');

// NOTE ON FIX: the original controller obtained `io` via a lazy
// `require('../server')` inside each function - a circular-dependency
// pattern that breaks as soon as the project layout changes. It now pulls
// the shared instance from sockets/ioInstance.js, set once from server.js.
exports.recordDelivery = async (req, res, next) => {
  try {
    const { matchId, inningsId } = req.params;
    const { delivery, innings, over, match } = await scoringEngine.processDelivery(matchId, inningsId, req.body);

    // Ball-by-ball simulation analysis - wrapped in try/catch so failure does not break scoring
    let simulationData = null;
    try {
      simulationData = await simulationService.analyzeLiveMatch(matchId, inningsId, delivery);
      if (simulationData) {
        delivery.simulation = simulationData;
        await delivery.save();
      }
    } catch (simError) {
      console.error('Simulation analysis error:', simError.message);
    }

    let io;
    try {
      io = getIO();
    } catch (e) {
      io = null;
    }

    if (io) {
      emitBallScored(io, matchId, { delivery, innings });
      emitScoreUpdated(io, matchId, {
        score: innings.totalRuns,
        wickets: innings.totalWickets,
        totalBalls: innings.totalBalls
      });
      if (simulationData) {
        emitSimulationUpdated(io, matchId, simulationData);
      }
      if (delivery.isWicket) {
        emitWicket(io, matchId, { delivery, innings });
      }
      if (delivery.isBoundary) {
        emitBoundary(io, matchId, { runs: delivery.runsOffBat, isSix: delivery.isSix });
      }
      if (over.isComplete) {
        emitOverCompleted(io, matchId, { over });
      }
      if (innings.isComplete) {
        emitInningsCompleted(io, matchId, { innings });
      }
      if (match && match.status === 'completed') {
        emitMatchCompleted(io, matchId, { match });
      }
    }

    res.status(201).json({
      success: true,
      message: 'Delivery recorded',
      data: { delivery, innings, over, simulation: simulationData }
    });
  } catch (error) {
    next(error);
  }
};

exports.undoLastDelivery = async (req, res, next) => {
  try {
    const { innings, redoDelivery } = await scoringEngine.undoLastDelivery(req.params.inningsId);

    let io;
    try {
      io = getIO();
    } catch (e) {
      io = null;
    }
    if (io) {
      emitScoreUpdated(io, req.params.matchId, {
        score: innings.totalRuns,
        wickets: innings.totalWickets,
        totalBalls: innings.totalBalls
      });
    }

    res.status(200).json({ success: true, message: 'Last delivery undone', data: { innings, redoDelivery } });
  } catch (error) {
    next(error);
  }
};
