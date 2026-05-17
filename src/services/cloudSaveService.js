/**
 * Cloud save via API Gateway — never calls DynamoDB directly.
 */
import { getSaveApiBaseUrl, loadSaveApiConfig } from '../../utils/saveApiConfig';
import { normalizePlayerKey } from '../../utils/playerKey';
import { loadGameSave, saveGameSave } from './saveService';
import { applyCloudProfile, normalizeCloudRecord, toCloudProfile } from './cloudSaveMapper';

function apiHostLabel(base) {
  if (!base) return '';
  try {
    return new URL(base).host;
  } catch {
    return base.slice(0, 48);
  }
}

function formatFetchError(err, base = '') {
  const msg = String(err?.message || err || 'Network error');
  if (/failed to fetch|networkerror|load failed|aborted/i.test(msg)) {
    const host = apiHostLabel(base);
    const target = host ? ` (${host})` : '';
    return (
      `Could not reach the cloud save API${target}. ` +
      'Check: (1) VITE_SAVE_API_URL in Amplify matches API Gateway invoke URL, ' +
      '(2) GET /players works in the browser, (3) HTTP API CORS allows your Amplify domain, ' +
      '(4) redeploy Amplify after changing env vars.'
    );
  }
  return msg;
}

const DEV = typeof __DEV__ !== 'undefined' && __DEV__;
const REQUEST_MS = 12000;

/** @param {object|null|undefined} data */
function hasFullCloudPayload(data) {
  if (!data || typeof data !== 'object') return false;
  return Array.isArray(data.monsters) || Array.isArray(data.ownedMonsters);
}

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
async function readApiError(res) {
  const text = await res.text().catch(() => '');
  if (!text) return `HTTP ${res.status}`;
  try {
    const body = JSON.parse(text);
    return body?.error || body?.message || text;
  } catch {
    return text.length > 120 ? `${text.slice(0, 120)}…` : text;
  }
}

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
export async function saveCloudProfile(profile, opts = {}) {
  const base = await ensureBaseUrl();
  if (!base) return { ok: false, skipped: true, error: 'Cloud save not configured' };
  if (!profile?.profileID) return { ok: false, error: 'Missing profileID' };

  const hasHash =
    (profile.playerKeyHash && String(profile.playerKeyHash).startsWith('pk_')) ||
    (profile.pinHash && String(profile.pinHash).startsWith('pk_'));
  if (!hasHash && !opts.allowNoKey) {
    return { ok: false, error: 'Cannot sync profile without a player key hash' };
  }

  try {
    const res = await apiRequest(base, '/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
    if (!res.ok) {
      const errText = await readApiError(res);
      if (DEV) console.warn('[cloud-save] POST /save failed', res.status, errText);
      return { ok: false, error: errText };
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
function extractCloudRecord(body) {
  const raw =
    body?.profile ??
    (body && typeof body === 'object' && (body.profileID || body.id) ? body : null) ??
    body?.Item ??
    body?.item ??
    body?.data ??
    body;
  return normalizeCloudRecord(raw);
}

/**
 * @param {string} profileID
 * @param {string} playerKey
 */
export async function loadCloudProfileWithKey(profileID, playerKey) {
  const base = await ensureBaseUrl();
  if (!base) return { ok: false, skipped: true, error: 'Cloud save not configured' };
  const id = encodeURIComponent(String(profileID));
  const key = normalizePlayerKey(playerKey);

  try {
    const res = await apiRequest(base, `/save/${id}?playerKey=${encodeURIComponent(key)}`, {
      method: 'GET',
    });
    if (res.status === 401) {
      return { ok: false, status: 401, error: 'Incorrect key' };
    }
    if (res.status === 404) return { ok: false, status: 404, error: 'Profile not found' };
    if (!res.ok) {
      const errText = await readApiError(res);
      if (DEV) console.warn('[cloud-save] GET /save failed', res.status, errText);
      return { ok: false, status: res.status, error: errText };
    }
    const body = await res.json();
    const data = extractCloudRecord(body);
    if (!data?.profileID) return { ok: false, error: 'Invalid save data from cloud' };
    return { ok: true, data };
  } catch (err) {
    if (DEV) console.warn('[cloud-save] GET /save error', err?.message || err);
    return { ok: false, error: err?.message || 'Network error' };
  }
}

/** @deprecated Do not load cloud saves without a player key. */
export async function loadCloudProfile(profileID) {
  return {
    ok: false,
    error: 'Use login with player key — unauthenticated load is disabled',
    profileID,
  };
}

/**
 * @returns {Promise<{ ok: boolean, players?: object[], skipped?: boolean, error?: string }>}
 */
export async function listCloudPlayers() {
  await loadSaveApiConfig();
  const base = await ensureBaseUrl();
  if (!base) {
    return {
      ok: false,
      skipped: true,
      error: 'Cloud save is not configured. Set VITE_SAVE_API_URL and redeploy.',
    };
  }

  try {
    const res = await apiRequest(base, '/players', { method: 'GET' });
    if (!res.ok) {
      const errText = await readApiError(res);
      if (DEV) console.warn('[cloud-save] GET /players failed', res.status, errText);
      return { ok: false, error: errText };
    }
    const body = await res.json();
    const raw = Array.isArray(body?.players) ? body.players : Array.isArray(body) ? body : [];
    const players = raw
      .map((row) => normalizeCloudRecord(row))
      .filter(Boolean)
      .map((row) => ({
        profileID: row.profileID,
        playerName: row.playerName || 'Player',
        selectedMonsterId: row.selectedMonsterId ?? null,
        monsterTemplateId: row.monsterTemplateId ?? null,
        level: row.level ?? 1,
        coins: row.coins ?? 0,
        updatedAt: row.updatedAt ?? null,
        requiresKey: row.requiresKey !== false,
      }));
    return { ok: true, players };
  } catch (err) {
    if (DEV) console.warn('[cloud-save] GET /players error', base, err?.message || err);
    return { ok: false, error: formatFetchError(err, base) };
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
      const errText = await readApiError(res);
      if (DEV) console.warn('[cloud-save] POST /login failed', res.status, errText);
      return { ok: false, status: res.status, error: errText };
    }
    const body = await res.json();
    const data = extractCloudRecord(body);
    if (!data?.profileID) return { ok: false, error: 'Invalid login response' };
    return { ok: true, data };
  } catch (err) {
    if (DEV) console.warn('[cloud-save] POST /login error', err?.message || err);
    return { ok: false, error: formatFetchError(err) };
  }
}

/**
 * Load a cloud player with key — tries POST /login, then GET /save/{id}?playerKey=.
 * @param {string} profileID
 * @param {string} playerKey
 * @param {{ requiresKey?: boolean }} [opts]
 */
export async function recallCloudProfile(profileID, playerKey, opts = {}) {
  const key = normalizePlayerKey(playerKey);
  if (key.length !== 4) {
    return { ok: false, status: 400, error: 'Enter your 4-digit Player Key.' };
  }

  const login = await loginCloudProfile(profileID, key);
  if (login.status === 401) {
    return { ok: false, status: 401, error: 'Incorrect key. Please try again.' };
  }
  if (login.ok && hasFullCloudPayload(login.data)) {
    return login;
  }

  // POST /login route missing on very old API — try GET only when error is route-not-found, not profile-not-found.
  const loginRouteMissing =
    login.status === 404 &&
    /not found/i.test(String(login.error || '')) &&
    !/profile/i.test(String(login.error || ''));

  if (loginRouteMissing) {
    const loaded = await loadCloudProfileWithKey(profileID, key);
    if (loaded.status === 401) {
      return { ok: false, status: 401, error: 'Incorrect key. Please try again.' };
    }
    if (loaded.ok && hasFullCloudPayload(loaded.data)) {
      return loaded;
    }
    if (loaded.ok && !hasFullCloudPayload(loaded.data)) {
      return {
        ok: false,
        status: 401,
        error: 'Incorrect key. This save is protected.',
      };
    }
    return loaded;
  }

  if (login.status === 404) {
    return { ok: false, status: 404, error: login.error || 'Profile not found' };
  }

  if (login.ok && !hasFullCloudPayload(login.data)) {
    return {
      ok: false,
      status: 401,
      error: 'Incorrect key. Could not load a full save (update the save API).',
    };
  }

  return {
    ok: false,
    status: login.status || 401,
    error: login.error || 'Incorrect key. Please try again.',
  };
}

/**
 * @param {string} profileID
 * @param {string} playerKey
 * @param {{ requiresKey?: boolean }} [opts]
 */
export async function deleteCloudProfile(profileID, playerKey, opts = {}) {
  const base = await ensureBaseUrl();
  if (!base) return { ok: false, skipped: true, error: 'Cloud save not configured' };
  const id = encodeURIComponent(String(profileID));
  const key = normalizePlayerKey(playerKey);
  if (key.length !== 4) {
    return { ok: false, status: 400, error: 'Enter your 4-digit Player Key.' };
  }
  const keyBody = { playerKey: key };

  try {
    const res = await apiRequest(base, `/save/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(keyBody),
    });
    if (res.status === 401) {
      return { ok: false, status: 401, error: 'Incorrect key. Player was not deleted.' };
    }
    if (res.status === 404) {
      return { ok: true, notFound: true };
    }
    if (!res.ok) {
      const errText = await readApiError(res);
      if (DEV) console.warn('[cloud-save] DELETE failed', res.status, errText);
      return { ok: false, status: res.status, error: errText || `HTTP ${res.status}` };
    }
    let body = {};
    try {
      body = await res.json();
    } catch {
      body = {};
    }
    if (body.ok === false || body.error) {
      return { ok: false, status: res.status, error: body.error || 'Delete rejected' };
    }
    return { ok: true };
  } catch (err) {
    if (DEV) console.warn('[cloud-save] DELETE error', err?.message || err);
    return { ok: false, error: formatFetchError(err) };
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
  if (!cloud.playerKeyHash && !cloud.pinHash) {
    return { ok: false, error: 'Set a Player Key on this profile before cloud sync' };
  }
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
