const KEY = 'mdb_online_session';

/** @typedef {{ roomCode: string, playerSlot: 'p1'|'p2', profileId?: string, playerName?: string }} OnlineSession */

export function loadOnlineSession() {
  try {
    if (typeof sessionStorage !== 'undefined') {
      const raw = sessionStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** @param {OnlineSession|null} data */
export function saveOnlineSession(data) {
  try {
    if (typeof sessionStorage === 'undefined') return;
    if (!data) {
      sessionStorage.removeItem(KEY);
      return;
    }
    sessionStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function clearOnlineSession() {
  saveOnlineSession(null);
}
