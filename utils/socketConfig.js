/**
 * Multiplayer server URL — build-time (VITE_SOCKET_SERVER_URL) + runtime (/socket-config.json).
 */

/** @type {unknown} — replaced at build by babel-plugin-transform-define */
const SOCKET_URL = import.meta.env.VITE_SOCKET_SERVER_URL;

const BUILD_URL =
  typeof SOCKET_URL === 'string' ? SOCKET_URL.trim().replace(/\/+$/, '') : '';

let runtimeUrl = '';
let loadPromise = null;

export { SOCKET_URL, BUILD_URL };

const DEV = typeof __DEV__ !== 'undefined' && __DEV__;

function normalizeUrl(raw) {
  return String(raw || '')
    .trim()
    .replace(/\/+$/, '');
}

function isLocalhostUrl(url) {
  return /localhost|127\.0\.0\.1/i.test(url);
}

function pageHostname() {
  if (typeof window === 'undefined' || !window.location?.hostname) return '';
  return window.location.hostname;
}

function pageIsLocal() {
  const h = pageHostname();
  return h === 'localhost' || h === '127.0.0.1';
}

/** Dev-only: socket on same machine as Expo web (port 3000) */
function devSocketUrlGuess() {
  if (!DEV || typeof window === 'undefined') return '';
  const host = pageHostname();
  if (!host) return '';
  return `http://${host}:3000`;
}

export function getSocketServerUrl() {
  const url = normalizeUrl(BUILD_URL || runtimeUrl);
  return url.length > 5 ? url : '';
}

/**
 * Load URL from /socket-config.json (Amplify build) or dev guess.
 */
export function loadSocketConfig() {
  if (getSocketServerUrl()) {
    return Promise.resolve(getSocketServerUrl());
  }
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    if (typeof fetch !== 'undefined') {
      try {
        const res = await fetch('/socket-config.json', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const u = normalizeUrl(data?.socketUrl);
          if (u.length > 5 && !(isLocalhostUrl(u) && !pageIsLocal())) {
            runtimeUrl = u;
          } else if (u.length > 5 && isLocalhostUrl(u) && !pageIsLocal()) {
            if (DEV) {
              console.warn('[socket] ignored localhost URL in socket-config.json on remote host:', u);
            }
          }
        }
      } catch (err) {
        if (DEV) console.warn('[socket] failed to load /socket-config.json', err);
      }
    }

    if (!runtimeUrl && !BUILD_URL) {
      const guess = devSocketUrlGuess();
      if (guess) runtimeUrl = guess;
    }

    return getSocketServerUrl();
  })();

  return loadPromise;
}

/** Player-safe validation before connecting */
export function validateSocketUrl(url) {
  const u = normalizeUrl(url);
  if (!u || u.length <= 5) {
    return 'Multiplayer server is not configured. Set VITE_SOCKET_SERVER_URL on Amplify and redeploy, or run npm run server locally.';
  }
  if (u.includes('your-socket-server') || u.includes('example.com') || u.includes('YOUR_')) {
    return 'Multiplayer server URL is still a placeholder. Set VITE_SOCKET_SERVER_URL in Amplify.';
  }
  if (isLocalhostUrl(u) && !pageIsLocal()) {
    return 'Server URL is set to localhost but the game is hosted online. Update VITE_SOCKET_SERVER_URL to your public API URL.';
  }
  if (typeof window !== 'undefined' && window.location?.protocol === 'https:' && u.startsWith('http:')) {
    return 'Multiplayer server must use HTTPS (your game page is HTTPS).';
  }
  return null;
}

/** Quick health check — server must expose GET /health */
export async function pingSocketServer(url) {
  const base = normalizeUrl(url);
  if (!base) return { ok: false, error: 'No server URL' };
  try {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), 8000) : null;
    const res = await fetch(`${base}/health`, {
      method: 'GET',
      mode: 'cors',
      signal: ctrl?.signal,
    });
    if (timer) clearTimeout(timer);
    if (!res.ok) return { ok: false, error: `Server responded ${res.status}` };
    return { ok: true };
  } catch (err) {
    const msg = err?.name === 'AbortError' ? 'Connection timed out' : 'Server unreachable';
    return { ok: false, error: msg };
  }
}

/** For lobby debug (dev console only) */
export function getSocketConfigDebug() {
  return {
    buildUrl: BUILD_URL || '(empty)',
    runtimeUrl: runtimeUrl || '(empty)',
    resolved: getSocketServerUrl() || '(none)',
    pageHost: pageHostname() || '(unknown)',
  };
}
