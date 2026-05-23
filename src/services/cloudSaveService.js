/**
 * Cloud save via API Gateway — never calls DynamoDB directly.
 */
import { getSaveApiBaseUrl, loadSaveApiConfig } from '../../utils/saveApiConfig';
import { normalizePlayerKey } from '../../utils/playerKey';
import { loadGameSave, saveGameSave } from './saveService';
import { profileBlockedForCloudSync } from '../../utils/profileIntegrity';
import { getPlayerProfile } from '../../utils/gameStorage';
import { isCloudUploadBlocked, compareLocalAndCloudSave } from './saveConflict';
import { applyCloudProfile, normalizeCloudRecord, toCloudProfile } from './cloudSaveMapper';
import { trainerRankingFromCloudRow } from '../../utils/trainerRankings';
import {
  getDeviceId,
  getProfileSession,
  isCloudSessionNewerThanLocal,
  isSessionSupersededError,
  SESSION_SUPERSEDED_CODE,
  SESSION_SUPERSEDED_MESSAGE,
} from '../../utils/playerDeviceSession';

function apiHostLabel(base) {
  if (!base) return '';
  try {
    return new URL(base).host;
  } catch {
    return base.slice(0, 48);
  }
}

function isFetchNetworkError(err) {
  const msg = String(err?.message || err || '');
  return /failed to fetch|networkerror|load failed|aborted|network request failed/i.test(msg);
}

function formatFetchError(err, base = '') {
  const msg = String(err?.message || err || 'Network error');
  if (isFetchNetworkError(err)) {
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

/**
 * @param {number} status
 * @param {string} message
 * @param {string} url
 */
function formatApiFailure(prefix, status, message, url) {
  const detail = String(message || `HTTP ${status}`).trim();
  return `${prefix}: ${status} ${detail} (${url})`;
}

/**
 * @param {Response} res
 */
async function readResponse(res) {
  const text = await res.text().catch(() => '');
  if (!text) return { text: '', body: {} };
  try {
    return { text, body: JSON.parse(text) };
  } catch {
    return { text, body: {} };
  }
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

  const key = normalizePlayerKey(profile.playerKey);
  if (key.length !== 4 && !opts.allowNoKey) {
    return { ok: false, error: 'Missing key — set a 4-digit Player Key before cloud sync' };
  }
  const payload = { ...profile, playerKey: key.length === 4 ? key : profile.playerKey };
  delete payload.playerKeyHash;
  delete payload.pinHash;
  delete payload.pin;

  try {
    const res = await apiRequest(base, '/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errText = await readApiError(res);
      if (DEV) console.warn('[cloud-save] POST /save failed', res.status, errText);
      if (isSessionSupersededError(res.status, errText)) {
        return {
          ok: false,
          sessionSuperseded: true,
          status: res.status,
          error: SESSION_SUPERSEDED_MESSAGE,
          code: SESSION_SUPERSEDED_CODE,
        };
      }
      return { ok: false, error: errText, status: res.status };
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
    const res = await apiRequest(base, `/players?_=${Date.now()}`, { method: 'GET' });
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
      .map((row) => {
        const rank = trainerRankingFromCloudRow(row);
        return {
          profileID: row.profileID,
          playerName: row.playerName || 'Player',
          selectedMonsterId: row.selectedMonsterId ?? null,
          monsterTemplateId: rank.templateId ?? row.monsterTemplateId ?? null,
          level: rank.level,
          monsterName: rank.monsterName,
          peakMonsterLevel: row.peakMonsterLevel ?? rank.level,
          peakMonsterTemplateId: row.peakMonsterTemplateId ?? rank.templateId ?? null,
          monsters: row.monsters ?? row.ownedMonsters ?? null,
          coins: row.coins ?? 0,
          updatedAt: row.updatedAt ?? null,
          requiresKey: row.requiresKey !== false,
        };
      });
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
export async function loginCloudProfile(profileID, playerKey, session = null) {
  const base = await ensureBaseUrl();
  if (!base) return { ok: false, skipped: true, error: 'Cloud save not configured' };

  const deviceId = session?.deviceId || (await getDeviceId());
  const sessionToken = session?.sessionToken || null;

  try {
    const res = await apiRequest(base, '/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profileID: String(profileID),
        playerKey: normalizePlayerKey(playerKey),
        deviceId,
        sessionToken,
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
    const serverSession = body?.sessionToken || data?.activeSession?.sessionToken;
    if (serverSession && session) {
      session.sessionToken = serverSession;
      data.activeSession = {
        deviceId: session.deviceId || deviceId,
        sessionToken: serverSession,
        issuedAt: data.activeSession?.issuedAt || session.issuedAt || new Date().toISOString(),
      };
    } else if (session) {
      data.activeSession = {
        deviceId: session.deviceId || deviceId,
        sessionToken: session.sessionToken,
        issuedAt: session.issuedAt || new Date().toISOString(),
      };
    }
    return { ok: true, data, session };
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

  const login = await loginCloudProfile(profileID, key, opts.session ?? null);
  if (login.status === 401) {
    const msg = login.error || 'Incorrect key. Please try again.';
    return { ok: false, status: 401, error: msg };
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
      if (opts.session) {
        loaded.session = opts.session;
        loaded.data.activeSession = {
          deviceId: opts.session.deviceId,
          sessionToken: opts.session.sessionToken,
          issuedAt: opts.session.issuedAt,
        };
      }
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
 * Delete cloud player — POST /save/delete only (plain profileID + playerKey).
 * @param {string} profileID
 * @param {string} playerKey
 */
export async function deleteCloudProfile(profileID, playerKey) {
  await loadSaveApiConfig();
  const base = await ensureBaseUrl();
  if (!base) {
    return { ok: false, skipped: true, error: 'Cloud save is not configured' };
  }

  const profileId = String(profileID || '').trim();
  const key = normalizePlayerKey(playerKey);
  if (!profileId) {
    return { ok: false, status: 400, error: 'Delete failed: 400 Missing profileID' };
  }
  if (key.length !== 4) {
    return {
      ok: false,
      status: 400,
      error: formatApiFailure('Delete failed', 400, 'Missing key', `${base}/save/delete`),
    };
  }

  const url = `${base}/save/delete`;
  const payload = { profileID: profileId, playerKey: key };

  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), REQUEST_MS) : null;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl?.signal,
    });

    const { text, body } = await readResponse(res);
    const apiError = body?.error || body?.message || text.trim() || `HTTP ${res.status}`;

    if (DEV) {
      console.warn('[cloud-save] POST /save/delete', res.status, { url, payload, body, text });
    }

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: formatApiFailure('Delete failed', res.status, apiError, url),
      };
    }

    if (body?.ok === false || body?.error) {
      return {
        ok: false,
        status: res.status,
        error: formatApiFailure('Delete failed', res.status, body.error || 'Delete rejected', url),
      };
    }

    return { ok: true };
  } catch (err) {
    if (DEV) console.warn('[cloud-save] POST /save/delete fetch error', url, err);
    if (isFetchNetworkError(err)) {
      return { ok: false, error: formatFetchError(err, base) };
    }
    return {
      ok: false,
      error: formatApiFailure(
        'Delete failed',
        0,
        String(err?.message || err || 'Request error'),
        url,
      ),
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * @param {string} profileID
 * @param {object} [gameData] — optional; loads from disk if omitted
 */
/**
 * Push a fresh login session to cloud (claims this device as the active session).
 * @param {string} profileID
 * @param {object} gameData
 * @param {import('../../utils/playerDeviceSession').ProfileLoginSession} session
 */
export async function pushLoginSessionToCloud(profileID, gameData, session) {
  const cloud = toCloudProfile(gameData, profileID, session);
  if (!cloud) return { ok: false, error: 'Profile not found locally' };
  return saveCloudProfile(cloud, { allowNoKey: false });
}

export async function syncProfileToCloud(profileID, gameData = null, opts = {}) {
  const gd = gameData || (await loadGameSave());
  const profile = getPlayerProfile(gd, profileID);
  if (profile && profileBlockedForCloudSync(profile)) {
    if (DEV) console.warn('[cloud-save] sync blocked — profile failed integrity checks', profileID);
    return {
      ok: false,
      error: 'Save could not sync: profile data looks invalid. Play normally or contact support.',
    };
  }
  const localSession = await getProfileSession(profileID);
  const cloud = toCloudProfile(gd, profileID, localSession || profile?.activeSession || null);
  if (!cloud) return { ok: false, error: 'Profile not found locally' };
  if (!cloud.playerKey || normalizePlayerKey(cloud.playerKey).length !== 4) {
    return { ok: false, error: 'Set a Player Key on this profile before cloud sync' };
  }

  const key = normalizePlayerKey(cloud.playerKey);
  if (!opts.force && !opts.skipSessionCheck) {
    const remote = await loadCloudProfileWithKey(profileID, key);
    if (remote.ok && remote.data) {
      if (
        localSession
        && isCloudSessionNewerThanLocal(localSession, remote.data.activeSession)
      ) {
        return {
          ok: false,
          sessionSuperseded: true,
          error: SESSION_SUPERSEDED_MESSAGE,
          code: SESSION_SUPERSEDED_CODE,
        };
      }
      if (isCloudUploadBlocked(gd, profileID, remote.data)) {
        const comparison = compareLocalAndCloudSave(getPlayerProfile(gd, profileID), remote.data);
        return {
          ok: false,
          cloudNewer: true,
          cloudBlocked: true,
          comparison,
          cloudData: remote.data,
          error:
            comparison.cloudPeak > comparison.localPeak
              ? `Cloud save is ahead (Lv ${comparison.cloudPeak} vs Lv ${comparison.localPeak}). Loading cloud progress.`
              : 'Cloud save is newer than this device. Load the cloud save before uploading.',
        };
      }
    }
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
