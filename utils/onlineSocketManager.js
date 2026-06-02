import {
  connectOnlineSocket,
  destroyOnlineSocket,
  getSocketServerUrl,
} from './socketClient';
import {
  loadSocketConfig,
  pingSocketServer,
  validateSocketUrl,
  getSocketConfigDebug,
} from './socketConfig';
import { clearOnlineSession, loadOnlineSession, saveOnlineSession } from './onlineSession';
import { countPlayersInRoom } from './onlineUserMessages';
import {
  devOnlineBattleLog,
  mapClientBattleAction,
  normalizeOnlineBattleSnapshot,
} from './onlineBattleState';

const DEV = typeof __DEV__ !== 'undefined' && __DEV__;
const CONNECT_TIMEOUT_MS = 12000;
const ACK_TIMEOUT_MS = 10000;
const REJOIN_ACK_MS = 6000;
const SERVER_READY_TIMEOUT_MS = 2500;

function devLog(...args) {
  if (DEV) console.log('[online]', ...args);
}

/** @type {import('socket.io-client').Socket | null} */
let socket = null;
/** @type {object | null} */
let roomState = null;
/** @type {string | null} */
let opponentLeftMsg = null;
const listeners = new Set();
/** @type {import('socket.io-client').Socket | null} */
let listenersAttachedTo = null;
/** @type {Promise<{ socket: import('socket.io-client').Socket | null, error: string | null, url: string }> | null} */
let connectInFlight = null;
const serverReadySockets = new WeakSet();

/**
 * Merge server room payloads — never drop players/battle accidentally.
 * @param {object|null|undefined} incoming
 */
function mergePlayerSlots(prevPlayers, incomingPlayers) {
  const prev = prevPlayers && typeof prevPlayers === 'object' ? prevPlayers : {};
  if (!incomingPlayers || typeof incomingPlayers !== 'object') return prev;
  const next = { ...prev };
  for (const slot of ['p1', 'p2']) {
    if (incomingPlayers[slot] !== undefined) {
      next[slot] = incomingPlayers[slot];
    }
  }
  return next;
}

function mergeRoomPayload(incoming) {
  if (!incoming || typeof incoming !== 'object') return;
  const prev = roomState || {};
  roomState = {
    ...prev,
    ...incoming,
    players: mergePlayerSlots(prev.players, incoming.players),
    battle:
      incoming.battle !== undefined
        ? normalizeOnlineBattleSnapshot(incoming.battle)
        : prev.battle,
    missingRequirements: Array.isArray(incoming.missingRequirements)
      ? incoming.missingRequirements
      : prev.missingRequirements,
  };
  if (typeof incoming.playerCount === 'number') {
    roomState.playerCount = incoming.playerCount;
  } else if (roomState.players) {
    roomState.playerCount = countPlayersInRoom(roomState);
  }
  if (incoming.bothJoined !== undefined) {
    roomState.bothJoined = !!incoming.bothJoined;
  } else if (typeof roomState.playerCount === 'number') {
    roomState.bothJoined = roomState.playerCount >= 2;
  }
  if (payloadSaysOpponentLeft(incoming)) {
    opponentLeftMsg = incoming.lobbyMessage;
  } else if (roomState.bothJoined) {
    opponentLeftMsg = null;
  }
}

function payloadSaysOpponentLeft(payload) {
  return typeof payload?.lobbyMessage === 'string' && payload.lobbyMessage.includes('left');
}

function logRoomPayload(label, payload) {
  const count =
    typeof payload?.playerCount === 'number'
      ? payload.playerCount
      : countPlayersInRoom(payload);
  devLog(
    label,
    payload?.roomCode,
    'status',
    payload?.status,
    'playerCount',
    count,
    '/2',
    'bothJoined',
    payload?.bothJoined,
    'p1.connected',
    payload?.players?.p1?.connected,
    'p2.connected',
    payload?.players?.p2?.connected,
  );
}

function notify() {
  listeners.forEach((fn) => {
    try {
      fn(roomState, { opponentLeft: opponentLeftMsg });
    } catch {
      /* ignore */
    }
  });
}

function detachSocketListeners(sock) {
  if (!sock) return;
  sock.off('connect');
  sock.off('disconnect');
  sock.off('connect_error');
  sock.off('roomUpdate');
  sock.off('opponentJoined');
  sock.off('opponentDisconnected');
  sock.off('battleStarted');
  sock.off('battle_started');
  sock.off('battleUpdate');
  sock.off('battle_state_updated');
  sock.off('action_result');
  sock.off('turn_changed');
  sock.off('battleEnded');
  sock.off('errorMessage');
  sock.off('serverStatus');
  if (listenersAttachedTo === sock) listenersAttachedTo = null;
}

function attachSocket(sock) {
  if (!sock) return;
  if (listenersAttachedTo === sock) return;

  if (listenersAttachedTo && listenersAttachedTo !== sock) {
    detachSocketListeners(listenersAttachedTo);
  }

  listenersAttachedTo = sock;
  socket = sock;

  sock.on('connect', () => {
    devLog('socket connected', sock.id, getSocketServerUrl());
    const session = loadOnlineSession();
    if (session?.roomCode) {
      void requestRoomState(session.roomCode);
    }
    notify();
  });
  sock.on('disconnect', (reason) => {
    devLog('socket disconnected', reason);
    notify();
  });
  sock.on('connect_error', (err) => devLog('connect_error', err?.message || err));
  sock.on('serverStatus', (payload) => {
    devLog('serverStatus', payload?.ok ? 'ready' : 'unknown');
    serverReadySockets.add(sock);
  });

  sock.on('roomUpdate', (payload) => {
    mergeRoomPayload(payload);
    logRoomPayload('roomUpdate received', payload);
    notify();
  });

  sock.on('opponentJoined', (p) => {
    devLog('opponentJoined event', p?.roomCode, p?.slot);
    opponentLeftMsg = null;
    if (p?.roomCode && sock.connected) {
      requestRoomState(p.roomCode);
    } else {
      notify();
    }
  });

  sock.on('opponentDisconnected', (p) => {
    opponentLeftMsg = p?.message || 'Opponent left the room.';
    devLog('opponentDisconnected', opponentLeftMsg);
    notify();
  });

  function onBattleSnapshot(p, label) {
    const battle = normalizeOnlineBattleSnapshot(p?.battle);
    devOnlineBattleLog(
      label,
      'phase',
      battle?.phase,
      'battleState',
      battle?.battleState,
      'activePlayerId',
      battle?.activePlayerId,
      'seq',
      battle?.seq,
    );
    const patch = { battle };
    const ended =
      roomState?.status === 'finished' ||
      !!roomState?.battle?.winner ||
      !!battle?.winner;
    if (!ended) {
      patch.status = 'battle';
    }
    if (typeof battle?.activePlayerId === 'number') {
      patch.activeTurn = battle.activePlayerId;
    }
    if (p?.room) mergeRoomPayload(p.room);
    mergeRoomPayload(patch);
    notify();
  }

  sock.on('battleStarted', (p) => {
    devLog('battleStarted event', p?.roomCode);
    if (p?.room) mergeRoomPayload(p.room);
    onBattleSnapshot(p, 'battle_started');
  });

  sock.on('battle_started', (p) => {
    devLog('battle_started alias', p?.roomCode);
    if (p?.room) mergeRoomPayload(p.room);
    onBattleSnapshot(p, 'battle_started');
  });

  sock.on('battleUpdate', (p) => onBattleSnapshot(p, 'battleUpdate'));

  sock.on('battle_state_updated', (p) => {
    if (p?.room) mergeRoomPayload(p.room);
    onBattleSnapshot(p, 'battle_state_updated');
  });

  sock.on('action_result', (p) => onBattleSnapshot(p, 'action_result'));

  sock.on('turn_changed', (p) => {
    devOnlineBattleLog('turn_changed', 'activePlayerId', p?.activePlayerId, 'round', p?.round);
    onBattleSnapshot(p, 'turn_changed');
  });

  sock.on('battleEnded', (p) => {
    devLog('battleEnded', p?.winner);
    mergeRoomPayload({
      status: 'finished',
      battle: p?.battle,
      winner: p?.winner,
    });
    notify();
  });

  sock.on('errorMessage', (msg) => devLog('server error', msg));
}

function waitForSocketConnected(sock, maxMs = 4000) {
  if (sock?.connected) return Promise.resolve(true);
  return new Promise((resolve) => {
    if (!sock) {
      resolve(false);
      return;
    }
    const timer = setTimeout(() => {
      sock.off('connect', onConnect);
      resolve(false);
    }, maxMs);
    const onConnect = () => {
      clearTimeout(timer);
      sock.off('connect', onConnect);
      resolve(true);
    };
    sock.once('connect', onConnect);
  });
}

function waitForServerReady(sock, maxMs = SERVER_READY_TIMEOUT_MS) {
  if (!sock?.connected) return Promise.resolve(false);
  if (serverReadySockets.has(sock)) return Promise.resolve(true);
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      sock.off('serverStatus', onReady);
      // Older servers may not emit serverStatus; do not block room actions forever.
      resolve(sock.connected);
    }, maxMs);
    const onReady = (payload) => {
      clearTimeout(timer);
      sock.off('serverStatus', onReady);
      if (payload?.ok !== false) serverReadySockets.add(sock);
      resolve(true);
    };
    sock.once('serverStatus', onReady);
  });
}

function emitWithAck(sock, event, payload) {
  return new Promise((resolve) => {
    if (!sock?.connected) {
      resolve({ error: 'Not connected' });
      return;
    }
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      devLog('ack timeout', event);
      resolve({ error: 'Server did not respond in time' });
    }, ACK_TIMEOUT_MS);

    sock.emit(event, payload, (res) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(res || {});
    });
  });
}

async function emitRoomAckWithRetry(sock, event, payload, retries = 1) {
  let last = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    if (attempt > 0) {
      devLog('retrying room ack', event, 'attempt', attempt + 1);
    }
    last = await emitWithAck(sock, event, payload);
    if (last?.error !== 'Server did not respond in time') return last;
  }
  return last || { error: 'Server did not respond in time' };
}

function makeRequestId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function requestRoomState(roomCode) {
  if (!socket?.connected || !roomCode) return Promise.resolve(null);
  return emitWithAck(socket, 'requestRoomState', { roomCode }).then((res) => {
    if (res?.error) {
      devLog('requestRoomState failed', res.error);
      return null;
    }
    if (res?.room) {
      mergeRoomPayload(res.room);
      logRoomPayload('requestRoomState', res.room);
      notify();
    }
    return res?.room ?? null;
  });
}

export function subscribeOnline(listener) {
  listeners.add(listener);
  if (roomState) listener(roomState, { opponentLeft: opponentLeftMsg });
  return () => listeners.delete(listener);
}

export function getOnlineRoomState() {
  return roomState;
}

export function getOpponentLeftMessage() {
  return opponentLeftMsg;
}

export function getOnlineSocket() {
  return socket;
}

export function isOnlineInRoom() {
  return !!(roomState?.roomCode && socket?.connected);
}

export function getConfiguredServerUrl() {
  return getSocketServerUrl();
}

function tryRejoinSession(sock, session) {
  return emitWithAck(sock, 'rejoinRoom', {
    roomCode: session.roomCode,
    playerSlot: session.playerSlot,
  }).then((res) => {
    if (res?.error) {
      devLog('rejoin failed', res.error);
      clearOnlineSession();
      return;
    }
    if (res?.room) {
      mergeRoomPayload(res.room);
      logRoomPayload('rejoinRoom ack', res.room);
    }
    saveOnlineSession({
      roomCode: res.roomCode || session.roomCode,
      playerSlot: res.playerSlot || session.playerSlot,
      profileId: session.profileId,
      playerName: session.playerName,
    });
    notify();
  });
}

/**
 * @param {{ skipRejoin?: boolean, forceReconnect?: boolean }} [options]
 */
export function ensureOnlineSocket(options = {}) {
  const skipRejoin = options.skipRejoin === true;
  const urlHint = getSocketServerUrl();

  if (socket?.connected && listenersAttachedTo === socket && !options.forceReconnect) {
    const session = loadOnlineSession();
    if (!skipRejoin && session?.roomCode && session?.playerSlot) {
      return tryRejoinSession(socket, session).then(() => ({
        socket,
        error: null,
        url: urlHint,
      }));
    }
    return Promise.resolve({ socket, error: null, url: urlHint });
  }

  if (connectInFlight) {
    return connectInFlight.then(async (result) => {
      if (result.error || !result.socket || skipRejoin) return result;
      const session = loadOnlineSession();
      if (session?.roomCode && session?.playerSlot) {
        await tryRejoinSession(result.socket, session);
      }
      return result;
    });
  }

  connectInFlight = loadSocketConfig().then((loadedUrl) => {
    const url = loadedUrl || getSocketServerUrl();
    const validationErr = validateSocketUrl(url);
    if (validationErr) {
      devLog('socket URL invalid', validationErr);
      return { socket: null, error: validationErr, url: url || '' };
    }

    return pingSocketServer(url).then((ping) => {
      if (!ping.ok) {
        devLog('health check failed — trying socket connect anyway', ping.error, url, getSocketConfigDebug());
      }
      return connectOnlineSocketFlow(url, { skipRejoin });
    });
  }).finally(() => {
    connectInFlight = null;
  });

  return connectInFlight;
}

function connectOnlineSocketFlow(url, options = {}) {
  const skipRejoin = options.skipRejoin === true;
  return new Promise((resolve) => {
    if (!url) {
      devLog('Online server not configured');
      resolve({
        socket: null,
        error: 'Online server unavailable',
        url: '',
      });
      return;
    }

    const { socket: sock, error } = connectOnlineSocket();
    if (error || !sock) {
      devLog('socket connect failed', error, url);
      resolve({ socket: null, error: error || 'Unable to connect', url });
      return;
    }

    attachSocket(sock);

    let settled = false;
    /** @type {ReturnType<typeof setTimeout> | null} */
    let connectTimer = null;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      if (connectTimer) clearTimeout(connectTimer);
      if (!result.socket || result.error) {
        try {
          destroyOnlineSocket();
        } catch {
          /* ignore */
        }
        detachSocketListeners(sock);
        socket = null;
      }
      resolve(result);
    };

    const session = loadOnlineSession();

    const onReady = async () => {
      devLog('socket ready', sock.id, '→', url);
      await waitForServerReady(sock);

      if (!skipRejoin && session?.roomCode && session?.playerSlot) {
        devLog('rejoining room', session.roomCode, session.playerSlot);
        tryRejoinSession(sock, session).then(() => {
          finish({ socket: sock, error: null, url });
        });
        return;
      }

      finish({ socket: sock, error: null, url });
    };

    connectTimer = setTimeout(() => {
      devLog('connect timeout — is the server running? (npm run server)');
      finish({ socket: null, error: 'Connection timed out', url });
    }, CONNECT_TIMEOUT_MS);

    if (sock.connected) {
      onReady();
    } else {
      sock.once('connect', onReady);
      sock.once('connect_error', (err) => {
        devLog('connect_error', err?.message || err);
        finish({ socket: null, error: err?.message || 'Unable to connect', url });
      });
    }
  });
}

export function createOnlineRoom() {
  return new Promise((resolve) => {
    leaveOnlineRoom();
    const requestId = makeRequestId('create');
    ensureOnlineSocket({ skipRejoin: true }).then(async ({ socket: sock, error, url }) => {
      if (error || !sock) {
        resolve({ error, url });
        return;
      }
      const ready = await waitForSocketConnected(sock);
      if (!ready) {
        resolve({ error: 'Not connected', url });
        return;
      }
      await waitForServerReady(sock);
      const res = await emitRoomAckWithRetry(sock, 'createRoom', { requestId });
      if (res?.error) {
        resolve({ error: res.error, url });
        return;
      }
      if (!res?.roomCode) {
        resolve({ error: 'Server did not return a room code', url });
        return;
      }
      devLog('room created', res.roomCode, 'slot', res.playerSlot);
      saveOnlineSession({ roomCode: res.roomCode, playerSlot: res.playerSlot });
      if (res.room) {
        mergeRoomPayload(res.room);
        logRoomPayload('createRoom ack', res.room);
      } else {
        mergeRoomPayload({
          roomCode: res.roomCode,
          status: 'lobby',
          playerCount: 1,
          bothJoined: false,
          players: res.players,
        });
      }
      notify();
      resolve({
        roomCode: res.roomCode,
        playerSlot: res.playerSlot,
        room: res.room || getOnlineRoomState(),
        url,
      });
    });
  });
}

export function joinOnlineRoom(roomCode) {
  return new Promise((resolve) => {
    leaveOnlineRoom();
    ensureOnlineSocket({ skipRejoin: true }).then(async ({ socket: sock, error, url }) => {
      if (error || !sock) {
        resolve({ error, url });
        return;
      }
      const ready = await waitForSocketConnected(sock);
      if (!ready) {
        resolve({ error: 'Not connected', url });
        return;
      }
      await waitForServerReady(sock);
      const code = String(roomCode || '').trim().toUpperCase();
      const res = await emitRoomAckWithRetry(sock, 'joinRoom', { roomCode: code });
      if (res?.error) {
        resolve({ error: res.error, url });
        return;
      }
      devLog('room joined', res.roomCode, 'slot', res.playerSlot);
      saveOnlineSession({ roomCode: res.roomCode, playerSlot: res.playerSlot });
      if (res.room) {
        mergeRoomPayload(res.room);
        logRoomPayload('joinRoom ack', res.room);
      }
      notify();
      resolve({ roomCode: res.roomCode, playerSlot: res.playerSlot, url });
    });
  });
}

export function leaveOnlineRoom() {
  const code = roomState?.roomCode || loadOnlineSession()?.roomCode;
  if (socket?.connected && code) {
    socket.emit('leaveRoom', { roomCode: code });
  }
  roomState = null;
  opponentLeftMsg = null;
  clearOnlineSession();
  devLog('left room');
  notify();
}

/**
 * Sync lobby profile to the socket server (and optional cloud save if cloudDocument + playerKey).
 * @returns {Promise<{ ok?: boolean, error?: string, details?: string, cloud?: object }>}
 */
export function syncOnlineProfile(profilePayload) {
  if (!socket?.connected) {
    return Promise.resolve({ ok: false, error: 'Not connected' });
  }
  const session = loadOnlineSession();
  if (session) {
    saveOnlineSession({
      ...session,
      profileId: profilePayload.profileId,
      playerName: profilePayload.name,
    });
  }
  const code = roomState?.roomCode || loadOnlineSession()?.roomCode || '';
  const payload = { ...profilePayload, roomCode: profilePayload.roomCode || code };
  return emitWithAck(socket, 'syncProfile', payload).then((res) => {
    if (res?.ok === false || res?.error) {
      devLog('syncProfile failed', res.error, res.details || '');
      console.warn('[online] syncProfile failed', res.error, res.details || '');
    } else if (res?.cloud && res.cloud.ok === false && !res.cloud.skipped) {
      devLog('syncProfile cloud save failed', res.cloud.error, res.cloud.details || '');
      console.warn('[online] syncProfile cloud save failed', res.cloud.error);
    } else {
      devLog('profile synced', profilePayload.name);
    }
    return res || { ok: false, error: 'Empty server response' };
  });
}

/** Resolve local slot from session or profile id match in room state. */
export function resolveMyPlayerSlot(profileId) {
  const sessionSlot = loadOnlineSession()?.playerSlot;
  if (sessionSlot === 'p1' || sessionSlot === 'p2') return sessionSlot;
  if (!profileId || !roomState?.players) return sessionSlot || 'p1';
  const p1Id = roomState.players.p1?.profile?.profileId;
  const p2Id = roomState.players.p2?.profile?.profileId;
  if (p2Id && profileId === p2Id) return 'p2';
  if (p1Id && profileId === p1Id) return 'p1';
  return sessionSlot || 'p1';
}

export function emitBattleAction(action, payload = {}) {
  if (!socket?.connected) {
    return Promise.resolve({ error: 'Not connected' });
  }
  const roomCode = roomState?.roomCode || loadOnlineSession()?.roomCode || '';
  const mapped = mapClientBattleAction(action, payload);
  devOnlineBattleLog('action submitted', mapped.action, roomCode, mapped.skillId || '');
  return emitWithAck(socket, 'battleAction', { roomCode, ...mapped });
}

export function disconnectOnline() {
  if (socket) detachSocketListeners(socket);
  destroyOnlineSocket();
  socket = null;
  roomState = null;
  opponentLeftMsg = null;
  clearOnlineSession();
  notify();
}
