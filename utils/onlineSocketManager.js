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

const DEV = typeof __DEV__ !== 'undefined' && __DEV__;
const CONNECT_TIMEOUT_MS = 12000;
const ACK_TIMEOUT_MS = 10000;
const REJOIN_ACK_MS = 6000;

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
    battle: incoming.battle !== undefined ? incoming.battle : prev.battle,
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
  sock.off('battleUpdate');
  sock.off('battleEnded');
  sock.off('errorMessage');
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

  sock.on('battleStarted', (p) => {
    devLog('battleStarted event', p?.roomCode);
    if (p?.room) {
      mergeRoomPayload(p.room);
    } else {
      mergeRoomPayload({
        roomCode: p?.roomCode || roomState?.roomCode,
        status: 'battle',
        battle: p?.battle,
        bothJoined: true,
        canStart: true,
      });
    }
    logRoomPayload('battleStarted merged', roomState);
    notify();
  });

  sock.on('battleUpdate', (p) => {
    devLog('battleUpdate', p?.battle?.phase, 'seq', p?.battle?.seq);
    const patch = { battle: p?.battle };
    const ended =
      roomState?.status === 'finished' ||
      !!roomState?.battle?.winner ||
      !!p?.battle?.winner;
    if (!ended) {
      patch.status = 'battle';
    }
    mergeRoomPayload(patch);
    notify();
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

    const onReady = () => {
      devLog('socket ready', sock.id, '→', url);

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
      const res = await emitWithAck(sock, 'createRoom', {});
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
    ensureOnlineSocket().then(async ({ socket: sock, error, url }) => {
      if (error || !sock) {
        resolve({ error, url });
        return;
      }
      const code = String(roomCode || '').trim().toUpperCase();
      const res = await emitWithAck(sock, 'joinRoom', { roomCode: code });
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

export function syncOnlineProfile(profilePayload) {
  if (!socket?.connected) return;
  const session = loadOnlineSession();
  if (session) {
    saveOnlineSession({
      ...session,
      profileId: profilePayload.profileId,
      playerName: profilePayload.name,
    });
  }
  socket.emit('syncProfile', profilePayload);
  devLog('profile synced', profilePayload.name);
}

export function emitBattleAction(action, payload = {}) {
  if (!socket?.connected) {
    return Promise.resolve({ error: 'Not connected' });
  }
  const roomCode = roomState?.roomCode || loadOnlineSession()?.roomCode || '';
  devLog('action submitted', action, roomCode);
  return emitWithAck(socket, 'battleAction', { action, roomCode, ...payload });
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
