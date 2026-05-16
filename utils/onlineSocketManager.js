import { connectOnlineSocket, destroyOnlineSocket, getSocketServerUrl } from './socketClient';
import { clearOnlineSession, loadOnlineSession, saveOnlineSession } from './onlineSession';

const DEV = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

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

  sock.on('connect', () => devLog('socket connected', sock.id, getSocketServerUrl()));
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
  return new Promise((resolve) => {
    const url = getSocketServerUrl();
    if (!url) {
      resolve({
        socket: null,
        error: 'Online server not configured. Set EXPO_PUBLIC_SOCKET_SERVER_URL and rebuild.',
        url: '',
      });
      return;
    }

    const { socket: sock, error } = connectOnlineSocket();
    if (error || !sock) {
      resolve({ socket: null, error: error || 'Could not connect', url });
      return;
    }

    attachSocket(sock);

    const session = loadOnlineSession();
    const onConnect = () => {
      sock.off('connect', onConnect);
      devLog('socket connected', sock.id, '→', url);
      if (session?.roomCode && session?.playerSlot) {
        devLog('rejoining room', session.roomCode);
        sock.emit('rejoinRoom', { roomCode: session.roomCode, playerSlot: session.playerSlot }, (res) => {
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
          resolve({ socket: sock, error: null, url });
        });
      } else {
        resolve({ socket: sock, error: null, url });
      }
    };

    if (sock.connected) onConnect();
    else sock.on('connect', onConnect);
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
