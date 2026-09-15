const scoringEngine = require('../services/scoringEngine');
const { getIO } = require('../sockets/ioInstance');
const {
  emitScoreUpdated,
  emitBallScored,
  emitWicket,
  emitBoundary,
  emitOverCompleted,
  emitInningsCompleted
} = require('../sockets/matchSocket');

// NOTE ON FIX: the original controller obtained `io` via a lazy
// `require('../server')` inside each function - a circular-dependency
// pattern that breaks as soon as the project layout changes. It now pulls
// the shared instance from sockets/ioInstance.js, set once from server.js.
exports.recordDelivery = async (req, res, next) => {
  try {
    const { matchId, inningsId } = req.params;
    const { delivery, innings, over } = await scoringEngine.processDelivery(matchId, inningsId, req.body);

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
    }

    res.status(201).json({ success: true, message: 'Delivery recorded', data: { delivery, innings, over } });
  } catch (error) {
    next(error);
  }
};

exports.undoLastDelivery = async (req, res, next) => {
  try {
    const { innings } = await scoringEngine.undoLastDelivery(req.params.inningsId);

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

    res.status(200).json({ success: true, message: 'Last delivery undone', data: { innings } });
  } catch (error) {
    next(error);
  }
};
