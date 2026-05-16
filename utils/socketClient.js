import Constants from 'expo-constants';
import { io } from 'socket.io-client';

/** Expo injects extra.socketServerUrl via app.config.js from EXPO_PUBLIC_SOCKET_SERVER_URL */
export function getSocketServerUrl() {
  const fromExtra = Constants.expoConfig?.extra?.socketServerUrl;
  if (typeof fromExtra !== 'string' || fromExtra.length < 5) return '';
  // Root origin only — no path (Socket.io uses /socket.io/ automatically)
  return fromExtra.trim().replace(/\/+$/, '');
}

/**
 * Lazy Socket.io connection — returns `{ socket: null, error }` when misconfigured / unavailable.
 */
export function connectOnlineSocket() {
  const url = getSocketServerUrl();
  if (!url) return { socket: null, error: 'Online multiplayer server is not configured yet.' };
  try {
    const socket = io(url, {
      path: '/socket.io/',
      transports: ['polling', 'websocket'],
      upgrade: true,
      timeout: 12000,
      reconnection: false,
      forceNew: true,
    });
    return { socket, error: null };
  } catch {
    return { socket: null, error: 'Online multiplayer server is not connected yet.' };
  }
}
