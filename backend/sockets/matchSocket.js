/**
 * NOTE ON MERGE / FIX: the frontend's services/socket.ts listened for
 * camelCase events (`scoreUpdated`, `ballScored`, `overCompleted`, ...)
 * and emitted `joinMatch`/`leaveMatch`, while this backend emitted
 * snake_case events (`score_updated`, `ball_scored`, `over_completed`, ...)
 * and listened for `join_match`/`leave_match`. Because of that mismatch,
 * the frontend would never actually receive a single live update - the
 * event names never matched. Both sides are now standardized on the
 * snake_case event names from the project's documented event contract
 * (match_started, ball_scored, wicket, boundary, over_completed,
 * innings_completed, score_updated, match_completed) and on
 * join_match / leave_match for room management.
 */

const registerMatchSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    socket.on('join_match', (matchId) => {
      socket.join(`match_${matchId}`);
    });

    socket.on('leave_match', (matchId) => {
      socket.leave(`match_${matchId}`);
    });

    socket.on('disconnect', () => {
      // Socket.IO automatically removes the socket from all rooms on disconnect.
    });
  });
};

const emitToMatch = (io, matchId, event, payload) => {
  io.to(`match_${matchId}`).emit(event, payload);
};

const emitMatchStarted = (io, matchId, payload) => emitToMatch(io, matchId, 'match_started', payload);
const emitScoreUpdated = (io, matchId, payload) => emitToMatch(io, matchId, 'score_updated', payload);
const emitBallScored = (io, matchId, payload) => emitToMatch(io, matchId, 'ball_scored', payload);
const emitWicket = (io, matchId, payload) => emitToMatch(io, matchId, 'wicket', payload);
const emitBoundary = (io, matchId, payload) => emitToMatch(io, matchId, 'boundary', payload);
const emitOverCompleted = (io, matchId, payload) => emitToMatch(io, matchId, 'over_completed', payload);
const emitInningsCompleted = (io, matchId, payload) => emitToMatch(io, matchId, 'innings_completed', payload);
const emitMatchCompleted = (io, matchId, payload) => emitToMatch(io, matchId, 'match_completed', payload);
const emitSimulationUpdated = (io, matchId, payload) => emitToMatch(io, matchId, 'simulation_updated', payload);

module.exports = {
  registerMatchSocketHandlers,
  emitMatchStarted,
  emitScoreUpdated,
  emitBallScored,
  emitWicket,
  emitBoundary,
  emitOverCompleted,
  emitInningsCompleted,
  emitMatchCompleted,
  emitSimulationUpdated
};
