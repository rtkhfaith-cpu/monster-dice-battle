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

const DEV = typeof __DEV__ !== 'undefined' && __DEV__;
const CONNECT_TIMEOUT_MS = 12000;

function isLocalhostUrl(url) {
  return /localhost|127\.0\.0\.1/i.test(String(url || ''));
}

function pageIsLocalDev() {
  if (typeof window === 'undefined') return DEV;
  const h = window.location?.hostname || '';
  return h === 'localhost' || h === '127.0.0.1';
}
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

function applyRoomPayload(payload) {
  roomState = payload;
  if (payload?.lobbyMessage?.includes('left')) {
    opponentLeftMsg = payload.lobbyMessage;
  } else if (payload?.bothJoined) {
    opponentLeftMsg = null;
  }
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

function attachSocket(sock) {
  if (socket === sock) return;
  socket = sock;

  sock.on('connect', () => {
    devLog('socket connected', sock.id, getSocketServerUrl());
    notify();
  });
  sock.on('disconnect', (reason) => {
    devLog('socket disconnected', reason);
    notify();
  });
  sock.on('connect_error', (err) => devLog('connect_error', err?.message || err));

  sock.on('roomUpdate', (payload) => {
    applyRoomPayload(payload);
    devLog('room state updated', payload?.roomCode, payload?.status, 'bothJoined', payload?.bothJoined);
    notify();
  });

  sock.on('opponentJoined', (p) => {
    devLog('opponent joined', p?.roomCode, p?.slot);
    opponentLeftMsg = null;
    notify();
  });

  sock.on('opponentDisconnected', (p) => {
    opponentLeftMsg = p?.message || 'Opponent left the room.';
    devLog('opponent disconnected', opponentLeftMsg);
    notify();
  });

  sock.on('battleStarted', (p) => {
    devLog('battle auto-started', p?.roomCode);
    applyRoomPayload({
      ...(roomState || {}),
      roomCode: p?.roomCode || roomState?.roomCode,
      status: 'battle',
      battle: p?.battle,
      bothJoined: true,
      canStart: true,
    });
    notify();
  });

  sock.on('battleUpdate', (p) => {
    devLog('battle state synced', p?.battle?.phase, 'seq', p?.battle?.seq);
    if (roomState) {
      roomState = { ...roomState, status: 'battle', battle: p.battle };
      notify();
    }
  });

  sock.on('battleEnded', (p) => {
    devLog('battle ended', p?.winner);
    if (roomState) {
      roomState = { ...roomState, status: 'finished', battle: p.battle, winner: p.winner };
      notify();
    }
  });

  sock.on('errorMessage', (msg) => devLog('server error', msg));
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

export function ensureOnlineSocket() {
  return loadSocketConfig().then((loadedUrl) => {
    const url = loadedUrl || getSocketServerUrl();
    const validationErr = validateSocketUrl(url);
    if (validationErr) {
      devLog('socket URL invalid', validationErr);
      return Promise.resolve({ socket: null, error: validationErr, url: url || '' });
    }

    return pingSocketServer(url).then((ping) => {
      if (!ping.ok) {
        devLog('health check failed', ping.error, url, getSocketConfigDebug());
        if (DEV) {
          return connectOnlineSocketFlow(url);
        }
        const hint =
          pageIsLocalDev() && isLocalhostUrl(url)
            ? 'Start the game server: npm run server'
            : ping.error || 'Server offline or unreachable';
        return { socket: null, error: hint, url };
      }
      return connectOnlineSocketFlow(url);
    });
  });
}

function connectOnlineSocketFlow(url) {
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
    /** @type {ReturnType<typeof setTimeout> | null} */
    let rejoinTimer = null;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      if (connectTimer) clearTimeout(connectTimer);
      if (rejoinTimer) clearTimeout(rejoinTimer);
      sock.off('connect', onConnect);
      sock.off('connect_error', onConnectError);
      if (!result.socket || result.error) {
        try {
          destroyOnlineSocket();
        } catch {
          /* ignore */
        }
        socket = null;
      }
      resolve(result);
    };

    const onConnectError = (err) => {
      devLog('connect_error', err?.message || err);
      finish({ socket: null, error: err?.message || 'Unable to connect', url });
    };

    const session = loadOnlineSession();

    const onConnect = () => {
      devLog('socket connected', sock.id, '→', url);

      if (session?.roomCode && session?.playerSlot) {
        devLog('rejoining room', session.roomCode);
        rejoinTimer = setTimeout(() => {
          devLog('rejoin ack timeout — clearing stale session');
          clearOnlineSession();
          finish({ socket: sock, error: null, url });
        }, REJOIN_ACK_MS);

        sock.emit(
          'rejoinRoom',
          { roomCode: session.roomCode, playerSlot: session.playerSlot },
          (res) => {
            if (rejoinTimer) clearTimeout(rejoinTimer);
            if (res?.error) {
              devLog('rejoin failed', res.error);
              clearOnlineSession();
            } else {
              if (res.room) applyRoomPayload(res.room);
              saveOnlineSession({
                roomCode: res.roomCode,
                playerSlot: res.playerSlot,
                profileId: session.profileId,
                playerName: session.playerName,
              });
              notify();
            }
            finish({ socket: sock, error: null, url });
          },
        );
        return;
      }

      finish({ socket: sock, error: null, url });
    };

    connectTimer = setTimeout(() => {
      devLog('connect timeout — is the server running? (npm run server)');
      finish({ socket: null, error: 'Connection timed out', url });
    }, CONNECT_TIMEOUT_MS);

    if (sock.connected) {
      onConnect();
    } else {
      sock.once('connect', onConnect);
      sock.once('connect_error', onConnectError);
    }
  });
}

export function createOnlineRoom() {
  return new Promise((resolve) => {
    ensureOnlineSocket().then(({ socket: sock, error, url }) => {
      if (error || !sock) {
        resolve({ error, url });
        return;
      }
      sock.emit('createRoom', {}, (res) => {
        if (res?.error) {
          resolve({ error: res.error, url });
          return;
        }
        devLog('room created', res.roomCode);
        saveOnlineSession({ roomCode: res.roomCode, playerSlot: res.playerSlot });
        if (res.room) applyRoomPayload(res.room);
        notify();
        resolve({ roomCode: res.roomCode, playerSlot: res.playerSlot, url });
      });
    });
  });
}

export function joinOnlineRoom(roomCode) {
  return new Promise((resolve) => {
    ensureOnlineSocket().then(({ socket: sock, error, url }) => {
      if (error || !sock) {
        resolve({ error, url });
        return;
      }
      const code = String(roomCode || '').trim().toUpperCase();
      sock.emit('joinRoom', { roomCode: code }, (res) => {
        if (res?.error) {
          resolve({ error: res.error, url });
          return;
        }
        devLog('room joined', res.roomCode, res.playerSlot);
        saveOnlineSession({ roomCode: res.roomCode, playerSlot: res.playerSlot });
        if (res.room) applyRoomPayload(res.room);
        notify();
        resolve({ roomCode: res.roomCode, playerSlot: res.playerSlot, url });
      });
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
  if (!socket?.connected) return;
  devLog('action submitted', action);
  socket.emit('battleAction', { action, ...payload });
}

export function disconnectOnline() {
  destroyOnlineSocket();
  socket = null;
  roomState = null;
  opponentLeftMsg = null;
  clearOnlineSession();
  notify();
}
