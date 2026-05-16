/**
 * Multiplayer server URL — set in Amplify Console as VITE_SOCKET_SERVER_URL.
 * Inlined at build time via babel.config.js (import.meta.env).
 */
const SOCKET_URL = import.meta.env.VITE_SOCKET_SERVER_URL;

export { SOCKET_URL };

export function getSocketServerUrl() {
  const url = typeof SOCKET_URL === 'string' ? SOCKET_URL.trim().replace(/\/+$/, '') : '';
  return url.length > 5 ? url : '';
}
