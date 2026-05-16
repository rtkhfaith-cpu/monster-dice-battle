import Constants from 'expo-constants';
import { io } from 'socket.io-client';

/** Set at build via app.config.js (EXPO_PUBLIC_* or VITE_* env). */
export function getSocketServerUrl() {
  const fromExtra = Constants.expoConfig?.extra?.socketServerUrl;
  if (typeof fromExtra !== 'string' || fromExtra.length < 5) return '';
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
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 800,
      forceNew: false,
    });
    return { socket, error: null };
  } catch {
    return { socket: null, error: 'Online multiplayer server is not connected yet.' };
  }
}
