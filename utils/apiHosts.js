/**
 * Canonical production hosts — API/socket must not use the Amplify frontend domain.
 */
export const CANONICAL_API_BASE = 'https://monster-dice.rtkhfaith.com';
export const CANONICAL_SOCKET_BASE = 'https://monster-dice.rtkhfaith.com';
export const FRONTEND_HOST = 'monster-dice-battle.rtkhfaith.com';

function normalizeUrl(raw) {
  return String(raw || '')
    .trim()
    .replace(/\/+$/, '');
}

/**
 * @param {string} raw
 * @param {'save'|'socket'} kind
 */
export function resolveServiceBaseUrl(raw, kind = 'save') {
  const fallback = kind === 'socket' ? CANONICAL_SOCKET_BASE : CANONICAL_API_BASE;
  let url = normalizeUrl(raw);
  if (!url || url.length <= 5) return '';

  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host === FRONTEND_HOST) {
      console.warn(
        `[api] ${kind} URL used frontend host ${FRONTEND_HOST}; switching to ${fallback}`,
      );
      return fallback;
    }
  } catch {
    return fallback;
  }
  return url;
}

export function getCanonicalApiBase() {
  return CANONICAL_API_BASE;
}

export function getCanonicalSocketBase() {
  return CANONICAL_SOCKET_BASE;
}
