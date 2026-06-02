/**
 * Local-first save, then best-effort cloud sync (one in-flight sync per profile).
 */
import { autosaveGame, saveGameSave } from './saveService';
import { syncProfileToCloud, deleteCloudProfile } from './cloudSaveService';
import { emitSaveStatus } from './saveStatusBus';
import { recordSyncDebug } from './syncDebugBus';

/** @type {string|null} */
let activeProfileIDForSync = null;

/** @type {number} */
let commitSeq = 0;

/** profileID → chained promise */
const profileSyncChains = new Map();

/** debounce key → timer */
const scheduleTimers = new Map();

const SCHEDULE_DEBOUNCE_MS = 700;

/** @param {string|null} profileID */
export function setCloudSyncProfileID(profileID) {
  activeProfileIDForSync = profileID || null;
}

/**
 * @param {string[]} profileIDs
 * @returns {string[]}
 */
function normalizeProfileIDs(profileIDs) {
  if (!Array.isArray(profileIDs)) return [];
  return [...new Set(profileIDs.filter((id) => typeof id === 'string' && id.length > 0))];
}

/**
 * @param {string} profileID
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 */
async function withProfileSyncLock(profileID, fn) {
  const prev = profileSyncChains.get(profileID) || Promise.resolve();
  const run = prev
    .catch(() => {})
    .then(() => fn());
  profileSyncChains.set(profileID, run);
  try {
    return await run;
  } finally {
    if (profileSyncChains.get(profileID) === run) {
      profileSyncChains.delete(profileID);
    }
  }
}

/**
 * @param {{ reason: string, gameData: object, profileIDs?: string|string[]|null, skipCloud?: boolean, forceCloud?: boolean }} opts
 */
export async function commitSave(opts) {
  const seq = ++commitSeq;
  const { reason, gameData, profileIDs, skipCloud = false, forceCloud = false } = opts;
  if (!gameData) return undefined;

  const ids = normalizeProfileIDs(
    Array.isArray(profileIDs) ? profileIDs : profileIDs ? [profileIDs] : [],
  );
  const fallback = gameData.session?.activeProfileId;
  const targets = ids.length > 0 ? ids : fallback ? [fallback] : [];

  let gd = gameData;
  const { getPlayerProfile, markProfileCloudSynced, markProfileCloudObserved } = await import(
    '../../utils/gameStorage'
  );
  const { applySyncActivityForSave } = await import('../../utils/syncActivityLevel');

  for (const profileID of targets) {
    gd = applySyncActivityForSave(gd, profileID, { includeSaveAction: true });
  }

  const compareSnapshots = {};
  for (const profileID of targets) {
    const profile = getPlayerProfile(gd, profileID);
    if (profile) compareSnapshots[profileID] = profile;
  }

  await saveGameSave(gd);
  if (seq === commitSeq) {
    emitSaveStatus('local_saved');
  }

  const result = {
    localOk: true,
    gameData: gd,
    cloudSynced: false,
    cloudFailed: false,
    cloudNeedsKey: false,
    cloudBlocked: false,
    cloudBlockPayload: null,
    cloudErrors: [],
    commitSeq: seq,
  };

  if (skipCloud || targets.length === 0) return result;

  recordSyncDebug({ status: 'syncing', route: 'POST /save', profileId: targets.join(',') });

  for (const profileID of targets) {
    if (seq !== commitSeq) break;

    const res = await withProfileSyncLock(profileID, () =>
      syncProfileToCloud(profileID, gd, {
        force: forceCloud,
        compareProfile: compareSnapshots[profileID] ?? null,
      }),
    );

    if (seq !== commitSeq) {
      recordSyncDebug({ status: 'stale_ignored', profileId: profileID });
      return result;
    }

    if (res.observedCloudAt) {
      gd = markProfileCloudObserved(gd, profileID, res.observedCloudAt);
    }
    if (res.ok) {
      result.cloudSynced = true;
      gd = markProfileCloudSynced(gd, profileID, res.syncedAt);
      recordSyncDebug({
        status: 'ok',
        httpStatus: 200,
        profileId: profileID,
        kind: 'synced',
      });
    } else if (res.skipped) {
      /* API not configured */
    } else if (res.sessionSuperseded) {
      result.sessionSuperseded = true;
    } else if (res.cloudNewer) {
      result.cloudBlocked = true;
      result.cloudBlockPayload = {
        profileID,
        cloudData: res.cloudData,
        comparison: res.comparison,
        error: res.error,
      };
      result.cloudErrors.push({ profileID, error: res.error, kind: 'cloud_blocked' });
    } else if (
      typeof res.error === 'string' &&
      res.error.toLowerCase().includes('player key')
    ) {
      result.cloudNeedsKey = true;
      result.cloudErrors.push({ profileID, error: res.error, kind: 'needs_key' });
    } else {
      result.cloudFailed = true;
      result.cloudErrors.push({
        profileID,
        error: res.userMessage || res.error || 'Cloud sync failed',
        kind: res.kind || 'failed',
        status: res.status,
        issues: res.issues,
      });
      recordSyncDebug({
        status: 'error',
        httpStatus: res.status || 0,
        profileId: profileID,
        kind: res.kind || 'failed',
      });
    }
  }

  if (seq !== commitSeq) return result;

  if (result.cloudSynced && gd !== gameData) {
    await saveGameSave(gd);
    result.gameData = gd;
  } else if (gd !== gameData) {
    await saveGameSave(gd);
    result.gameData = gd;
  } else {
    result.gameData = gd;
  }

  if (reason === 'profile_created') emitSaveStatus('player_created');
  if (result.sessionSuperseded) emitSaveStatus('session_superseded', 0);
  else if (result.cloudBlocked) emitSaveStatus('cloud_blocked');
  else if (result.cloudSynced) emitSaveStatus('cloud_synced');
  else if (result.cloudFailed) emitSaveStatus('cloud_failed');

  return result;
}

/**
 * Debounced local write + cloud attempt.
 */
export function scheduleCommitSave(reason, gameData, profileIDs) {
  autosaveGame(reason, gameData);
  const key = JSON.stringify(
    normalizeProfileIDs(
      Array.isArray(profileIDs) ? profileIDs : profileIDs ? [profileIDs] : [],
    ),
  );
  const prev = scheduleTimers.get(key);
  if (prev) clearTimeout(prev);
  scheduleTimers.set(
    key,
    setTimeout(() => {
      scheduleTimers.delete(key);
      void commitSave({ reason, gameData, profileIDs });
    }, SCHEDULE_DEBOUNCE_MS),
  );
}

export async function commitProfileDeleted(profileID, playerKey, gameData, opts = {}) {
  const { getPlayerProfile } = await import('../../utils/gameStorage');
  const { verifyPlayerKeyForProfile } = await import('../../utils/playerKey');
  const { getSaveApiBaseUrl, loadSaveApiConfig } = await import('../../utils/saveApiConfig');

  await loadSaveApiConfig();
  const cloudApi = getSaveApiBaseUrl();
  const localProfile = getPlayerProfile(gameData, profileID);

  if (cloudApi) {
    const del = await deleteCloudProfile(profileID, playerKey);
    if (!del.ok) {
      return {
        ok: false,
        error: del.userMessage || del.error || 'Delete failed.',
      };
    }
  } else if (localProfile) {
    if (!verifyPlayerKeyForProfile(localProfile, playerKey)) {
      return { ok: false, error: 'Incorrect key. Player was not deleted.' };
    }
  } else {
    return {
      ok: false,
      error: 'Cloud save is not configured. Cannot delete this player without the save API.',
    };
  }

  const { deletePlayer } = await import('../../utils/gameStorage');
  const next = deletePlayer(gameData, profileID);
  await commitSave({ reason: 'player_deleted', gameData: next, profileIDs: [], skipCloud: true });
  emitSaveStatus('player_deleted');
  if (cloudApi) emitSaveStatus('cloud_synced');
  return { ok: true, gameData: next };
}

export async function commitAudioSettingsSave(profileID = activeProfileIDForSync) {
  if (!profileID) return;
  const { loadGameSave } = await import('./saveService');
  const gd = await loadGameSave();
  await commitSave({ reason: 'audio_settings', gameData: gd, profileIDs: profileID });
}
