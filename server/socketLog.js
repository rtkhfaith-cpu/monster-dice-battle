/**
 * Structured logging + safe acks for Socket.io handlers (PM2 / journalctl).
 */

/** Client → server events we implement */
const KNOWN_CLIENT_EVENTS = new Set([
  'rejoinRoom',
  'requestRoomState',
  'createRoom',
  'joinRoom',
  'syncProfile',
  'battleAction',
  'leaveRoom',
]);

function extractProfileId(payload) {
  if (!payload || typeof payload !== 'object') return null;
  return (
    payload.profileId ||
    payload.profileID ||
    payload.cloudDocument?.profileID ||
    payload.cloudDocument?.profileId ||
    null
  );
}

function logSocketEvent(event, socket, extra = {}) {
  console.log(`[socket] ${event} received`, {
    socketId: socket?.id,
    ...extra,
  });
}

/**
 * @param {unknown} err
 */
function logSocketError(event, socket, err, extra = {}) {
  const e = err && typeof err === 'object' ? err : { message: String(err) };
  console.error(`[socket] ${event} error`, {
    socketId: socket?.id,
    errorName: e.name,
    errorMessage: e.message,
    awsMetadata: e.$metadata || undefined,
    stack: e.stack,
    ...extra,
  });
}

/**
 * @param {unknown} err
 * @param {string} [details]
 */
function formatAckError(err, details = '') {
  const e = err && typeof err === 'object' ? err : { message: String(err || 'Unknown error') };
  const out = {
    ok: false,
    error: e.message || String(err),
    details: details || e.details || '',
    errorName: e.name || 'Error',
  };
  if (e.$metadata) out.awsMetadata = e.$metadata;
  if (e.code) out.code = e.code;
  return out;
}

/**
 * Register socket.on with try/catch, inbound logging, and safe ack on thrown errors.
 * @param {import('socket.io').Socket} socket
 * @param {string} event
 * @param {(ctx: { socket: import('socket.io').Socket, payload: object, ack: Function, profileId: string|null }) => void|Promise<void>} handler
 */
function bindSocketHandler(socket, event, handler) {
  socket.on(event, (payload = {}, ack) => {
    const profileId = extractProfileId(payload);
    logSocketEvent(event, socket, {
      profileId,
      roomCode: payload?.roomCode || null,
    });

    const safeAck = (result) => {
      if (typeof ack !== 'function') return;
      try {
        ack(result);
      } catch (ackErr) {
        logSocketError(event, socket, ackErr, { profileId, phase: 'ack_callback' });
      }
    };

    Promise.resolve(handler({ socket, payload, ack: safeAck, profileId }))
      .catch((err) => {
        logSocketError(event, socket, err, { profileId });
        safeAck(formatAckError(err));
      });
  });
}

/**
 * Warn + ack when client emits an event this server does not implement.
 * Cloud list/login/save/delete are HTTPS only (see SOCKET_EVENTS.md).
 */
function registerUnknownEventGuard(socket) {
  socket.onAny((event, ...args) => {
    if (KNOWN_CLIENT_EVENTS.has(event)) return;

    const profileId = extractProfileId(args[0]);
    console.warn('[socket] unknown client event', {
      event,
      socketId: socket.id,
      profileId,
      hint: 'Cloud list/login/save/delete use fetch() to API Gateway, not socket.io',
    });

    const maybeAck = args[args.length - 1];
    if (typeof maybeAck === 'function') {
      maybeAck({
        ok: false,
        error: `Unknown socket event: ${event}`,
        details:
          'This server only handles room/battle events. Cloud player list, login, load, save, and delete use HTTPS (VITE_SAVE_API_URL), not Socket.io.',
        errorName: 'UNKNOWN_SOCKET_EVENT',
      });
    }
  });
}

module.exports = {
  KNOWN_CLIENT_EVENTS,
  extractProfileId,
  logSocketEvent,
  logSocketError,
  formatAckError,
  bindSocketHandler,
  registerUnknownEventGuard,
};
