/**
 * Player-facing online multiplayer copy — never expose env/build instructions in UI.
 */

const DEV = typeof __DEV__ !== 'undefined' && __DEV__;

export function devOnlineLog(...args) {
  if (DEV) console.log('[online-ui]', ...args);
}

/** @typedef {'neutral'|'ok'|'warn'|'err'|'pulse'} StatusTone */

/**
 * @param {boolean} configured
 * @param {'connecting'|'connected'|'fail'|'no_env'} status
 */
export function getConnectionBanner(configured, status) {
  if (!configured || status === 'no_env') {
    return { icon: '⚠️', label: 'Online server unavailable', sub: 'Try again later', tone: 'warn' };
  }
  if (status === 'connecting') {
    return { icon: '📡', label: 'Connecting to server...', sub: 'Hang tight!', tone: 'pulse' };
  }
  if (status === 'connected') {
    return { icon: '🟢', label: 'Connected — ready to battle!', sub: 'Pick Create or Join', tone: 'ok' };
  }
  return {
    icon: '🔴',
    label: 'Unable to connect',
    sub: 'Server offline or unreachable',
    tone: 'err',
  };
}

/**
 * Map raw errors (socket, env, server) to short player-safe text.
 * @param {string} [raw]
 */
export function toUserOnlineError(raw) {
  if (!raw) return null;
  devOnlineLog('raw error:', raw);
  const s = String(raw).toLowerCase();

  if (
    s.includes('vite_socket') ||
    s.includes('socket_server') ||
    s.includes('not configured') ||
    s.includes('rebuild')
  ) {
    return 'Online server unavailable';
  }
  if (s.includes('timeout') || s.includes('timed out')) return 'Connection timed out';
  if (s.includes('network') || s.includes('failed to fetch') || s.includes('could not connect')) {
    return 'Unable to connect';
  }
  if (s.includes('room not found') || s.includes('invalid room') || s.includes('no room')) {
    return 'Room not found — check the code';
  }
  if (s.includes('full') || s.includes('already')) return 'Room is full';
  if (s.includes('disconnect')) return 'Connection lost';

  if (s.length > 80 || s.includes('http://') || s.includes('https://')) {
    return 'Something went wrong. Please try again.';
  }
  return raw.length < 60 ? raw : 'Something went wrong. Please try again.';
}

/**
 * @param {object} opts
 */
export function getWaitingRoomStatus(opts) {
  const {
    configured,
    status,
    inRoom,
    opponentLeft,
    bothJoined,
    missing,
    roomStatus,
    battleStarting,
  } = opts;

  if (!configured) {
    return { icon: '⚠️', title: 'Server unavailable', detail: 'Online battles are down for now.' };
  }
  if (status !== 'connected') {
    return { icon: '📡', title: 'Reconnecting...', detail: 'Please wait a moment.' };
  }
  if (opponentLeft) {
    return { icon: '👋', title: 'Opponent left', detail: opponentLeft };
  }
  if (roomStatus === 'battle' || battleStarting) {
    return { icon: '⚔️', title: 'Battle starting!', detail: 'Get ready to fight!' };
  }
  if (inRoom && !bothJoined) {
    return { icon: '⏳', title: 'Waiting for opponent...', detail: 'Share your room code with a friend!' };
  }
  if (missing?.length) {
    return { icon: '🎮', title: 'Almost ready', detail: missing[0] };
  }
  if (bothJoined) {
    return { icon: '✨', title: 'Both players ready!', detail: 'Starting battle...' };
  }
  return { icon: '🌐', title: 'In the lobby', detail: 'Waiting for players...' };
}
