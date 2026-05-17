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
export async function commitSave(opts) {
  const { reason, gameData, profileIDs, skipCloud = false } = opts;
  if (!gameData) return;

  await saveGameSave(gameData);
  emitSaveStatus('local_saved');

  if (skipCloud) return;

  const ids = normalizeProfileIDs(
    Array.isArray(profileIDs) ? profileIDs : profileIDs ? [profileIDs] : [],
  );
  const fallback = gameData.session?.activeProfileId;
  const targets = ids.length > 0 ? ids : fallback ? [fallback] : [];

  if (targets.length === 0) return;

  let anyOk = false;
  let anyFail = false;

  for (const profileID of targets) {
    const res = await syncProfileToCloud(profileID, gameData);
    if (res.ok) anyOk = true;
    else if (!res.skipped) anyFail = true;
  }

  if (reason === 'profile_created') emitSaveStatus('player_created');
  if (anyOk) emitSaveStatus('cloud_synced');
  else if (anyFail) emitSaveStatus('cloud_failed');
}

/**
 * Debounced local write + cloud attempt (for high-frequency state).
 * @param {string} reason
 * @param {object} gameData
 * @param {string|string[]|null} profileIDs
 */
export function scheduleCommitSave(reason, gameData, profileIDs) {
  autosaveGame(reason, gameData);
  void (async () => {
    await saveGameSave(gameData);
    emitSaveStatus('local_saved');
    const ids = normalizeProfileIDs(
      Array.isArray(profileIDs) ? profileIDs : profileIDs ? [profileIDs] : [],
    );
    const fallback = gameData.session?.activeProfileId;
    const targets = ids.length > 0 ? ids : fallback ? [fallback] : [];
    if (targets.length === 0) return;

    let anyOk = false;
    let anyFail = false;
    for (const profileID of targets) {
      const res = await syncProfileToCloud(profileID, gameData);
      if (res.ok) anyOk = true;
      else if (!res.skipped) anyFail = true;
    }
    if (anyOk) emitSaveStatus('cloud_synced');
    else if (anyFail) emitSaveStatus('cloud_failed');
  })();
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
