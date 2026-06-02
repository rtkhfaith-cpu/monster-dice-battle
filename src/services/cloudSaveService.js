/**
 * Cloud save via API Gateway — never calls DynamoDB directly.
 */
import { getSaveApiBaseUrl, loadSaveApiConfig } from '../../utils/saveApiConfig';
import { normalizePlayerKey } from '../../utils/playerKey';
import { loadGameSave, saveGameSave } from './saveService';
import { profileBlockedForCloudSync, sanitizePlayerProfile } from '../../utils/profileIntegrity';
import { cloudNotFoundDebugFromBody } from '../../utils/cloudProfileLookup';
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
import { classifyCloudHttpError } from './cloudApiErrors';
import { recordSyncDebug, refreshSyncDebugUrls } from './syncDebugBus';

function makeRequestId() {
  return `cs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * @param {number} status
 * @param {string} message
 */
function cloudErrorResult(status, message, extra = {}) {
  const classified = classifyCloudHttpError(status, message);
  return {
    ok: false,
    error: classified.raw,
    userMessage: classified.userMessage,
    kind: classified.kind,
    status: classified.status,
    ...extra,
  };
}

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
      'Check: (1) VITE_SAVE_API_URL=https://monster-dice.rtkhfaith.com (not the Amplify frontend host), ' +
      '(2) GET /players works in Network tab, (3) nginx proxies /players and /save to Lambda, ' +
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

/**
 * @param {string} phase
 * @param {object} detail — never include PIN / playerKey
 */
export function logCloudSync(phase, detail = {}) {
  const payload = { phase, ...detail };
  if (payload.playerKey) delete payload.playerKey;
  if (payload.pin) delete payload.pin;
  console.error('[cloud-sync]', payload);
}

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

async function apiRequest(base, path, init = {}, meta = {}) {
  const requestId = makeRequestId();
  const route = meta.route || path.split('?')[0];
  recordSyncDebug({
    requestId,
    route,
    status: 'requesting',
    profileId: meta.profileId || '',
    apiBase: base,
  });
  refreshSyncDebugUrls();

  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), REQUEST_MS) : null;
  try {
    const res = await fetch(`${base}${path}`, {
      ...init,
      signal: ctrl?.signal,
      headers: {
        Accept: 'application/json',
        'X-Request-Id': requestId,
        ...(init.headers || {}),
      },
    });
    recordSyncDebug({
      requestId,
      route,
      httpStatus: res.status,
      status: res.ok ? 'http_ok' : 'http_error',
      profileId: meta.profileId || '',
    });
    return res;
  } catch (err) {
    const classified = classifyCloudHttpError(0, err?.message || String(err));
    recordSyncDebug({
      requestId,
      route,
      httpStatus: 0,
      status: 'fetch_error',
      kind: classified.kind,
      profileId: meta.profileId || '',
    });
    throw err;
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
    const res = await apiRequest(
      base,
      '/save',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      { route: 'POST /save', profileId: profile.profileID },
    );
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
      return cloudErrorResult(res.status, errText);
    }
    recordSyncDebug({ status: 'saved', route: 'POST /save', httpStatus: 200 });
    return { ok: true };
  } catch (err) {
    if (DEV) console.warn('[cloud-save] POST /save error', err?.message || err);
    return cloudErrorResult(0, formatFetchError(err, base));
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
export async function loadCloudProfileWithKey(profileID, playerKey, opts = {}) {
  const base = await ensureBaseUrl();
  if (!base) return { ok: false, skipped: true, error: 'Cloud save not configured' };
  const id = encodeURIComponent(String(profileID));
  const key = normalizePlayerKey(playerKey);
  const login = String(opts.login ?? profileID);

  try {
    const res = await apiRequest(base, `/save/${id}?playerKey=${encodeURIComponent(key)}`, {
      method: 'GET',
    });
    if (res.status === 401) {
      return { ok: false, status: 401, error: 'Incorrect key' };
    }
    if (res.status === 404) {
      const { body } = await readResponse(res);
      const debug = cloudNotFoundDebugFromBody(body);
      logCloudSync('load_not_found', {
        profileID: String(profileID),
        login,
        path: `/save/${id}`,
        ...debug,
      });
      return {
        ok: false,
        status: 404,
        error: body?.error || 'Profile not found',
        debug,
      };
    }
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
    const url = `${base}/players`;
    const res = await apiRequest(
      base,
      '/players',
      { method: 'GET', cache: 'no-store' },
      { route: 'GET /players' },
    );
    if (!res.ok) {
      const errText = await readApiError(res);
      const classified = classifyCloudHttpError(res.status, errText);
      logCloudSync('list_players_failed', {
        status: res.status,
        error: errText,
        kind: classified.kind,
        url,
        transport: 'https_fetch',
        hint: 'HTTPS API at monster-dice.rtkhfaith.com — not Socket.io / PM2',
      });
      recordSyncDebug({
        status: 'list_failed',
        kind: classified.kind,
        httpStatus: res.status,
        route: 'GET /players',
      });
      return {
        ok: false,
        error: classified.userMessage,
        status: res.status,
        kind: classified.kind,
      };
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
    recordSyncDebug({ status: 'list_ok', route: 'GET /players', httpStatus: 200 });
    return { ok: true, players };
  } catch (err) {
    const error = formatFetchError(err, base);
    const classified = classifyCloudHttpError(0, error);
    logCloudSync('list_players_error', { error, kind: classified.kind, base: apiHostLabel(base) });
    return { ok: false, error: classified.userMessage, kind: classified.kind };
  }
}

/**
 * @param {string} profileID
 * @param {string} playerKey
 * @returns {Promise<{ ok: boolean, data?: object, skipped?: boolean, error?: string, status?: number }>}
 */
export async function loginCloudProfile(profileID, playerKey, session = null, opts = {}) {
  const base = await ensureBaseUrl();
  if (!base) return { ok: false, skipped: true, error: 'Cloud save not configured' };

  const deviceId = session?.deviceId || (await getDeviceId());
  const sessionToken = session?.sessionToken || null;
  const login = String(opts.login ?? profileID).trim();

  try {
    const res = await apiRequest(
      base,
      '/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileID: String(profileID),
          login,
          playerKey: normalizePlayerKey(playerKey),
          deviceId,
          sessionToken,
        }),
      },
      { route: 'POST /login', profileId: String(profileID) },
    );
    if (res.status === 401) {
      return cloudErrorResult(401, 'Incorrect key');
    }
    if (res.status === 404) {
      const { body } = await readResponse(res);
      const debug = cloudNotFoundDebugFromBody(body);
      logCloudSync('login_not_found', {
        event: 'POST /login',
        profileID: String(profileID),
        login,
        ...debug,
      });
      return {
        ...cloudErrorResult(404, body?.error || 'Player not found'),
        debug,
      };
    }
    if (!res.ok) {
      const errText = await readApiError(res);
      if (DEV) console.warn('[cloud-save] POST /login failed', res.status, errText);
      return cloudErrorResult(res.status, errText);
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
    return cloudErrorResult(0, formatFetchError(err, base));
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

  const login = await loginCloudProfile(profileID, key, opts.session ?? null, {
    login: opts.login ?? profileID,
  });
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
    const loaded = await loadCloudProfileWithKey(profileID, key, { login: opts.login ?? profileID });
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
    return {
      ok: false,
      status: 404,
      error: login.error || 'Profile not found',
      debug: login.debug,
    };
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
  if (profile) {
    const { issues } = sanitizePlayerProfile(profile);
    if (issues.length > 0) {
      logCloudSync('profile_sanitized', {
        profileID,
        issues,
        coins: profile.coins,
        coinsType: typeof profile.coins,
      });
    }
  }
  if (profile && profileBlockedForCloudSync(profile)) {
    const { issues } = sanitizePlayerProfile(profile, { forCloud: true });
    logCloudSync('sync_blocked', {
      profileID,
      issues,
      coins: profile?.coins,
      coinsType: typeof profile?.coins,
    });
    return {
      ok: false,
      error: 'Save could not sync: profile data looks invalid. Play normally or contact support.',
      issues,
    };
  }
  const localSession = await getProfileSession(profileID);
  const cloud = toCloudProfile(gd, profileID, localSession || profile?.activeSession || null);
  if (!cloud) return { ok: false, error: 'Profile not found locally' };
  if (!cloud.playerKey || normalizePlayerKey(cloud.playerKey).length !== 4) {
    return { ok: false, error: 'Set a Player Key on this profile before cloud sync' };
  }

  const key = normalizePlayerKey(cloud.playerKey);
  let observedCloudAt = null;
  if (!opts.force && !opts.skipSessionCheck) {
    const remote = await loadCloudProfileWithKey(profileID, key);
    if (remote.ok && remote.data) {
      observedCloudAt = remote.data.updatedAt ?? null;
      if (
        localSession
        && isCloudSessionNewerThanLocal(localSession, remote.data.activeSession)
      ) {
        return {
          ok: false,
          sessionSuperseded: true,
          observedCloudAt,
          error: SESSION_SUPERSEDED_MESSAGE,
          code: SESSION_SUPERSEDED_CODE,
        };
      }
      const compareProfile = opts.compareProfile ?? getPlayerProfile(gd, profileID);
      if (isCloudUploadBlocked(gd, profileID, remote.data, { compareProfile })) {
        const comparison = compareLocalAndCloudSave(compareProfile, remote.data);
        return {
          ok: false,
          cloudNewer: true,
          cloudBlocked: true,
          observedCloudAt,
          comparison,
          cloudData: remote.data,
          error:
            comparison.cloudActivity > comparison.localActivity
              ? `Cloud save is ahead (sync ${comparison.cloudActivity} vs ${comparison.localActivity}). Loading cloud progress.`
              : comparison.cloudPeak > comparison.localPeak
                ? `Cloud save is ahead (Lv ${comparison.cloudPeak} vs Lv ${comparison.localPeak}). Loading cloud progress.`
                : 'Cloud save is newer than this device. Load the cloud save before uploading.',
        };
      }
    }
  }

  const touchGd = (await import('../../utils/gameStorage')).touchProfileUpdatedAt(gd, profileID);
  const uploadCloud = toCloudProfile(
    touchGd,
    profileID,
    localSession || profile?.activeSession || null,
  );
  if (!uploadCloud) return { ok: false, error: 'Profile not found locally' };
  const saved = await saveCloudProfile(uploadCloud);
  if (!saved.ok) {
    logCloudSync('upload_failed', {
      profileID,
      status: saved.status,
      error: saved.error,
      kind: saved.kind,
      code: saved.code,
      coins: uploadCloud.coins,
      coinsType: typeof uploadCloud.coins,
    });
    return { ...saved, observedCloudAt };
  }
  recordSyncDebug({
    status: 'synced',
    route: 'POST /save',
    httpStatus: 200,
    profileId: profileID,
    kind: 'synced',
  });
  return { ok: true, syncedAt: uploadCloud.updatedAt, observedCloudAt: uploadCloud.updatedAt };
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
