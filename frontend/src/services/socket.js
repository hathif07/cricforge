import { io } from 'socket.io-client';

/**
 * NOTE ON FIX: the original frontend listened for camelCase events
 * (scoreUpdated, ballScored, overCompleted...) while the backend emitted
 * snake_case events (score_updated, ball_scored, over_completed...) - the
 * event names never matched, so no live update was ever actually received.
 * Both sides are now standardized on the snake_case contract documented in
 * the project docs.
 */

let socket = null;

export const getSocket = () => {
  if (!socket) {
    socket = io('/', { path: '/socket.io', transports: ['websocket', 'polling'] });
  }
  return socket;
};

export const joinMatchRoom = (matchId) => {
  const s = getSocket();
  s.emit('join_match', matchId);
};

export const leaveMatchRoom = (matchId) => {
  const s = getSocket();
  s.emit('leave_match', matchId);
};

export const subscribeToMatchEvents = (handlers) => {
  const s = getSocket();
  const events = [
    'match_started',
    'ball_scored',
    'wicket',
    'boundary',
    'over_completed',
    'innings_completed',
    'score_updated',
    'match_completed'
  ];
  events.forEach((event) => {
    if (handlers[event]) s.on(event, handlers[event]);
  });

  return () => {
    events.forEach((event) => {
      if (handlers[event]) s.off(event, handlers[event]);
    });
  };
};
