import Constants from 'expo-constants';
import { io } from 'socket.io-client';

/** Expo injects extra.socketServerUrl via app.config.js from EXPO_PUBLIC_SOCKET_SERVER_URL */
export function getSocketServerUrl() {
  const fromExtra = Constants.expoConfig?.extra?.socketServerUrl;
  if (typeof fromExtra === 'string' && fromExtra.length > 4) return fromExtra.trim();
  return '';
}

/**
 * Lazy Socket.io connection — returns `{ socket: null, error }` when misconfigured / unavailable.
 */
export function connectOnlineSocket() {
  const url = getSocketServerUrl();
  if (!url) return { socket: null, error: 'Online multiplayer server is not configured yet.' };
  try {
    const socket = io(url, {
      // Allow polling first — websocket-only often fails on LAN/firewalls/WebViews
      transports: ['polling', 'websocket'],
      timeout: 12000,
      reconnection: false,
    });
    return { socket, error: null };
  } catch {
    return { socket: null, error: 'Online multiplayer server is not connected yet.' };
  }
}
