/**
 * Cloud save via API Gateway — never calls DynamoDB directly.
 */
import { getSaveApiBaseUrl, loadSaveApiConfig } from '../../utils/saveApiConfig';
import { normalizePlayerKey } from '../../utils/playerKey';
import { loadGameSave, saveGameSave } from './saveService';
import { applyCloudProfile, toCloudProfile } from './cloudSaveMapper';

const DEV = typeof __DEV__ !== 'undefined' && __DEV__;
const REQUEST_MS = 12000;

async function ensureBaseUrl() {
  let base = getSaveApiBaseUrl();
  if (!base) {
    await loadSaveApiConfig();
    base = getSaveApiBaseUrl();
  }
  return base;
}

/**
 * @param {string} base
 * @param {string} path
 * @param {RequestInit} init
 */
async function apiRequest(base, path, init = {}) {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), REQUEST_MS) : null;
  try {
    const res = await fetch(`${base}${path}`, {
      ...init,
      signal: ctrl?.signal,
      headers: {
        Accept: 'application/json',
        ...(init.headers || {}),
      },
    });
    return res;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * @param {object} profile — must include profileID
 * @returns {Promise<{ ok: boolean, skipped?: boolean, error?: string }>}
 */
export async function saveCloudProfile(profile) {
  const base = await ensureBaseUrl();
  if (!base) return { ok: false, skipped: true, error: 'Cloud save not configured' };
  if (!profile?.profileID) return { ok: false, error: 'Missing profileID' };

  try {
    const res = await apiRequest(base, '/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      if (DEV) console.warn('[cloud-save] POST /save failed', res.status);
      return { ok: false, error: errText || `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    if (DEV) console.warn('[cloud-save] POST /save error', err?.message || err);
    return { ok: false, error: err?.message || 'Network error' };
  }
}

/**
 * @param {string} profileID
 * @returns {Promise<{ ok: boolean, data?: object, skipped?: boolean, error?: string }>}
 */
export async function loadCloudProfile(profileID) {
  const base = await ensureBaseUrl();
  if (!base) return { ok: false, skipped: true, error: 'Cloud save not configured' };
  const id = encodeURIComponent(String(profileID));

  try {
    const res = await apiRequest(base, `/save/${id}`, { method: 'GET' });
    if (res.status === 404) return { ok: false, error: 'Not found' };
    if (!res.ok) {
      if (DEV) console.warn('[cloud-save] GET failed', res.status);
      return { ok: false, error: `HTTP ${res.status}` };
    }
    const body = await res.json();
    const data =
      body && typeof body === 'object' && body.profileID
        ? body
        : body?.Item ?? body?.item ?? body?.data ?? body;
    return { ok: true, data };
  } catch (err) {
    if (DEV) console.warn('[cloud-save] GET error', err?.message || err);
    return { ok: false, error: err?.message || 'Network error' };
  }
}

/**
 * @returns {Promise<{ ok: boolean, players?: object[], skipped?: boolean, error?: string }>}
 */
export async function listCloudPlayers() {
  const base = await ensureBaseUrl();
  if (!base) return { ok: false, skipped: true, error: 'Cloud save not configured' };

  try {
    const res = await apiRequest(base, '/players', { method: 'GET' });
    if (!res.ok) {
      if (DEV) console.warn('[cloud-save] GET /players failed', res.status);
      return { ok: false, error: `HTTP ${res.status}` };
    }
    const body = await res.json();
    const players = Array.isArray(body?.players) ? body.players : Array.isArray(body) ? body : [];
    return { ok: true, players };
  } catch (err) {
    if (DEV) console.warn('[cloud-save] GET /players error', err?.message || err);
    return { ok: false, error: err?.message || 'Network error' };
  }
}

/**
 * @param {string} profileID
 * @param {string} playerKey
 * @returns {Promise<{ ok: boolean, data?: object, skipped?: boolean, error?: string, status?: number }>}
 */
export async function loginCloudProfile(profileID, playerKey) {
  const base = await ensureBaseUrl();
  if (!base) return { ok: false, skipped: true, error: 'Cloud save not configured' };

  try {
    const res = await apiRequest(base, '/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profileID: String(profileID),
        playerKey: normalizePlayerKey(playerKey),
      }),
    });
    if (res.status === 401) {
      return { ok: false, status: 401, error: 'Incorrect key' };
    }
    if (res.status === 404) {
      return { ok: false, status: 404, error: 'Profile not found' };
    }
    if (!res.ok) {
      if (DEV) console.warn('[cloud-save] POST /login failed', res.status);
      return { ok: false, status: res.status, error: `HTTP ${res.status}` };
    }
    const body = await res.json();
    const data =
      body?.profile ??
      (body && typeof body === 'object' && body.profileID ? body : null) ??
      body?.Item ??
      body?.item;
    if (!data?.profileID) return { ok: false, error: 'Invalid login response' };
    return { ok: true, data };
  } catch (err) {
    if (DEV) console.warn('[cloud-save] POST /login error', err?.message || err);
    return { ok: false, error: err?.message || 'Network error' };
  }
}

/**
 * @param {string} profileID
 * @param {string} playerKey
 */
export async function deleteCloudProfile(profileID, playerKey) {
  const base = await ensureBaseUrl();
  if (!base) return { ok: false, skipped: true, error: 'Cloud save not configured' };
  const id = encodeURIComponent(String(profileID));

  try {
    const res = await apiRequest(base, `/save/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerKey: normalizePlayerKey(playerKey) }),
    });
    if (res.status === 401) {
      return { ok: false, status: 401, error: 'Incorrect key' };
    }
    if (res.status === 404) {
      return { ok: true };
    }
    if (!res.ok) {
      if (DEV) console.warn('[cloud-save] DELETE failed', res.status);
      return { ok: false, status: res.status, error: `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    if (DEV) console.warn('[cloud-save] DELETE error', err?.message || err);
    return { ok: false, error: err?.message || 'Network error' };
  }
}

/**
 * @param {string} profileID
 * @param {object} [gameData] — optional; loads from disk if omitted
 */
export async function syncProfileToCloud(profileID, gameData = null) {
  const gd = gameData || (await loadGameSave());
  const cloud = toCloudProfile(gd, profileID);
  if (!cloud) return { ok: false, error: 'Profile not found locally' };
  return saveCloudProfile(cloud);
}

/**
 * @param {string} profileID
 * @returns {Promise<{ ok: boolean, gameData?: object, error?: string }>}
 */
export async function syncProfileFromCloud(profileID) {
  const loaded = await loadCloudProfile(profileID);
  if (!loaded.ok) return loaded;
  const gd = await loadGameSave();
  const next = applyCloudProfile(gd, loaded.data);
  await saveGameSave(next);
  return { ok: true, gameData: next };
}
