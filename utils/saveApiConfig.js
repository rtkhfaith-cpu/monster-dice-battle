/**
 * Cloud save API base URL — build-time (VITE_SAVE_API_URL) + runtime (/save-config.json).
 */

/** @type {unknown} — replaced at build by babel-plugin-transform-define */
const SAVE_API_URL = import.meta.env.VITE_SAVE_API_URL;

const BUILD_URL =
  typeof SAVE_API_URL === 'string' ? SAVE_API_URL.trim().replace(/\/+$/, '') : '';

let runtimeUrl = '';
let loadPromise = null;

export { SAVE_API_URL, BUILD_URL };

const DEV = typeof __DEV__ !== 'undefined' && __DEV__;

function normalizeUrl(raw) {
  return String(raw || '')
    .trim()
    .replace(/\/+$/, '');
}

export function getSaveApiBaseUrl() {
  const url = normalizeUrl(BUILD_URL || runtimeUrl);
  return url.length > 5 ? url : '';
}

export function loadSaveApiConfig() {
  if (getSaveApiBaseUrl()) {
    return Promise.resolve(getSaveApiBaseUrl());
  }
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    if (typeof fetch !== 'undefined') {
      try {
        const res = await fetch('/save-config.json', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const u = normalizeUrl(data?.saveApiUrl);
          if (u.length > 5) runtimeUrl = u;
        }
      } catch (err) {
        if (DEV) console.warn('[save] failed to load /save-config.json', err);
      }
    }
    return getSaveApiBaseUrl();
  })();

  return loadPromise;
}
