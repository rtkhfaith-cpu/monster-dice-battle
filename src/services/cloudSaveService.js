/**
 * Cloud save via API Gateway — never calls DynamoDB directly.
 */
import { getSaveApiBaseUrl, loadSaveApiConfig } from '../../utils/saveApiConfig';
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
 * @param {string} profileID
 */
export async function deleteCloudProfile(profileID) {
  const base = await ensureBaseUrl();
  if (!base) return { ok: false, skipped: true, error: 'Cloud save not configured' };
  const id = encodeURIComponent(String(profileID));

  try {
    const res = await apiRequest(base, `/save/${id}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 404) {
      if (DEV) console.warn('[cloud-save] DELETE failed', res.status);
      return { ok: false, error: `HTTP ${res.status}` };
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
