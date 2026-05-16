import { connectOnlineSocket } from './socketClient';
import { clearOnlineSession, loadOnlineSession, saveOnlineSession } from './onlineSession';

const DEV = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

function devLog(...args) {
  if (DEV) console.log('[online]', ...args);
}

/** @type {import('socket.io-client').Socket | null} */
let socket = null;
/** @type {object | null} */
let roomState = null;
const listeners = new Set();

function notify() {
  listeners.forEach((fn) => {
    try {
      fn(roomState);
    } catch {
      /* ignore */
    }
  });
}

function attachSocket(sock) {
  socket = sock;

  sock.on('connect', () => devLog('connected', sock.id));
  sock.on('disconnect', (reason) => {
    devLog('disconnected', reason);
    notify();
  });
  sock.on('connect_error', (err) => devLog('connect_error', err?.message || err));

  sock.on('roomUpdate', (payload) => {
    roomState = payload;
    devLog('roomUpdate', payload?.roomCode, payload?.status);
    notify();
  });

  sock.on('opponentJoined', (p) => devLog('opponent joined', p?.roomCode));
  sock.on('opponentDisconnected', (p) => devLog('opponent disconnected', p?.roomCode));
  sock.on('battleStarted', (p) => {
    devLog('battle started', p?.roomCode);
    if (p?.battle) {
      roomState = { ...(roomState || {}), status: 'battle', battle: p.battle };
      notify();
    }
  });
  sock.on('battleUpdate', (p) => {
    devLog('battle state updated', p?.battle?.phase, 'seq', p?.battle?.seq);
    if (roomState) {
      roomState = { ...roomState, battle: p.battle };
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

  sock.on('errorMessage', (msg) => devLog('error', msg));
}

export function subscribeOnline(listener) {
  listeners.add(listener);
  if (roomState) listener(roomState);
  return () => listeners.delete(listener);
}

export function getOnlineRoomState() {
  return roomState;
}

export function getOnlineSocket() {
  return socket;
}

export function isOnlineInRoom() {
  return !!(roomState?.roomCode && socket?.connected);
}

/**
 * Ensure socket connected; rejoin persisted room if any.
 */
export function ensureOnlineSocket() {
  return new Promise((resolve) => {
    if (socket?.connected) {
      resolve({ socket, error: null });
      return;
    }

    const { socket: sock, error } = connectOnlineSocket();
    if (error || !sock) {
      resolve({ socket: null, error: error || 'Could not connect' });
      return;
    }

    attachSocket(sock);

    const session = loadOnlineSession();
    const onConnect = () => {
      sock.off('connect', onConnect);
      if (session?.roomCode && session?.playerSlot) {
        devLog('rejoining room', session.roomCode);
        sock.emit('rejoinRoom', { roomCode: session.roomCode, playerSlot: session.playerSlot }, (res) => {
          if (res?.error) {
            devLog('rejoin failed', res.error);
            clearOnlineSession();
          } else {
            saveOnlineSession({
              roomCode: res.roomCode,
              playerSlot: res.playerSlot,
              profileId: session.profileId,
              playerName: session.playerName,
            });
          }
          resolve({ socket: sock, error: null });
        });
      } else {
        resolve({ socket: sock, error: null });
      }
    };

    if (sock.connected) onConnect();
    else sock.on('connect', onConnect);
  });
}

export function createOnlineRoom() {
  return new Promise((resolve) => {
    ensureOnlineSocket().then(({ socket: sock, error }) => {
      if (error || !sock) {
        resolve({ error });
        return;
      }
      sock.emit('createRoom', {}, (res) => {
        if (res?.error) {
          resolve({ error: res.error });
          return;
        }
        saveOnlineSession({ roomCode: res.roomCode, playerSlot: res.playerSlot });
        devLog('joined room', res.roomCode, res.playerSlot);
        resolve({ roomCode: res.roomCode, playerSlot: res.playerSlot });
      });
    });
  });
}

export function joinOnlineRoom(roomCode) {
  return new Promise((resolve) => {
    ensureOnlineSocket().then(({ socket: sock, error }) => {
      if (error || !sock) {
        resolve({ error });
        return;
      }
      sock.emit('joinRoom', { roomCode }, (res) => {
        if (res?.error) {
          resolve({ error: res.error });
          return;
        }
        saveOnlineSession({ roomCode: res.roomCode, playerSlot: res.playerSlot });
        devLog('joined room', res.roomCode, res.playerSlot);
        resolve({ roomCode: res.roomCode, playerSlot: res.playerSlot });
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

export function setOnlineReady(ready) {
  if (!socket?.connected) return;
  socket.emit('setReady', { ready });
  devLog('ready', ready);
}

export function emitBattleAction(action, payload = {}) {
  if (!socket?.connected) return;
  devLog('action submitted', action);
  socket.emit('battleAction', { action, ...payload });
}

export function disconnectOnline() {
  try {
    socket?.disconnect?.();
  } catch {
    /* ignore */
  }
  socket = null;
  roomState = null;
  clearOnlineSession();
  notify();
}
