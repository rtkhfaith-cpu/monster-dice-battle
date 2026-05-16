import { io } from 'socket.io-client';
import { getSocketServerUrl, SOCKET_URL } from './socketConfig';

export { getSocketServerUrl, SOCKET_URL };

/** @type {import('socket.io-client').Socket | null} */
let sharedSocket = null;

/**
 * Singleton Socket.io connection — returns `{ socket: null, error }` when misconfigured.
 */
export function connectOnlineSocket() {
  const url = getSocketServerUrl();
  if (!url) return { socket: null, error: 'Online multiplayer server is not configured yet.' };
  try {
    if (!sharedSocket) {
      sharedSocket = io(url, {
        path: '/socket.io/',
        transports: ['polling', 'websocket'],
        upgrade: true,
        timeout: 12000,
        reconnection: true,
        reconnectionAttempts: 8,
        reconnectionDelay: 800,
        forceNew: true,
      });
    }
    return { socket: sharedSocket, error: null };
  } catch {
    return { socket: null, error: 'Online multiplayer server is not connected yet.' };
  }
}

export function destroyOnlineSocket() {
  try {
    sharedSocket?.disconnect?.();
  } catch {
    /* ignore */
  }
  sharedSocket = null;
}
