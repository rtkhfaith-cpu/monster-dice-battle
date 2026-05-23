/**
 * Local-first save, then best-effort cloud sync.
 */
import { autosaveGame, saveGameSave } from './saveService';
import { syncProfileToCloud, deleteCloudProfile } from './cloudSaveService';
import { emitSaveStatus } from './saveStatusBus';

/** @type {string|null} */
let activeProfileIDForSync = null;

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
 * @param {{ reason: string, gameData: object, profileIDs?: string|string[]|null, skipCloud?: boolean }} opts
 */
/**
 * @returns {Promise<{ localOk: boolean, cloudSynced: boolean, cloudFailed: boolean, cloudNeedsKey: boolean }|undefined>}
 */
export async function commitSave(opts) {
  const { reason, gameData, profileIDs, skipCloud = false, forceCloud = false } = opts;
  if (!gameData) return undefined;

  const ids = normalizeProfileIDs(
    Array.isArray(profileIDs) ? profileIDs : profileIDs ? [profileIDs] : [],
  );
  const fallback = gameData.session?.activeProfileId;
  const targets = ids.length > 0 ? ids : fallback ? [fallback] : [];

  let gd = gameData;
  const { touchProfileUpdatedAt, markProfileCloudSynced } = await import('../../utils/gameStorage');
  for (const profileID of targets) {
    gd = touchProfileUpdatedAt(gd, profileID);
  }

  await saveGameSave(gd);
  emitSaveStatus('local_saved');

  const result = {
    localOk: true,
    gameData: gd,
    cloudSynced: false,
    cloudFailed: false,
    cloudNeedsKey: false,
    cloudBlocked: false,
    cloudBlockPayload: null,
  };

  if (skipCloud) return result;

  if (targets.length === 0) return result;

  for (const profileID of targets) {
    const res = await syncProfileToCloud(profileID, gd, { force: forceCloud });
    if (res.ok) {
      result.cloudSynced = true;
      gd = markProfileCloudSynced(gd, profileID);
    } else if (res.skipped) {
      /* API not configured — local only */
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
    } else if (
      typeof res.error === 'string' &&
      res.error.toLowerCase().includes('player key')
    ) {
      result.cloudNeedsKey = true;
    } else {
      result.cloudFailed = true;
    }
  }

  if (result.cloudSynced && gd !== gameData) {
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
 * Debounced local write + cloud attempt (for high-frequency state).
 * @param {string} reason
 * @param {object} gameData
 * @param {string|string[]|null} profileIDs
 */
export function scheduleCommitSave(reason, gameData, profileIDs) {
  autosaveGame(reason, gameData);
  void commitSave({ reason, gameData, profileIDs });
}

/**
 * Delete cloud first (key verified on server), then update local cache.
 * @param {string} profileID
 * @param {string} playerKey
 * @param {object} gameData
 */
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
        error: del.error || 'Delete failed.',
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

/**
 * Audio settings changed — sync active profile if known.
 * @param {string|null} profileID
 */
export async function commitAudioSettingsSave(profileID = activeProfileIDForSync) {
  if (!profileID) return;
  const { loadGameSave } = await import('./saveService');
  const gd = await loadGameSave();
  await commitSave({ reason: 'audio_settings', gameData: gd, profileIDs: profileID });
}
