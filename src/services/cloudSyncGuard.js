/**
 * Helpers to keep local profile aligned with cloud before gameplay mutations.
 */
import { getPlayerProfile, markProfileCloudObserved } from '../../utils/gameStorage';
import {
  repairPlayerProfileInventory,
  setPlayerKeyForProfile,
  enforceSingleActiveProfile,
} from '../../utils/gameStorage';
import { normalizePlayerKey } from '../../utils/playerKey';
import { loadCloudProfileWithKey } from './cloudSaveService';
import {
  compareLocalAndCloudSave,
  shouldApplyCloudOverLocal,
} from './saveConflict';
import { applyCloudProfile } from './cloudSaveMapper';

/**
 * Record the latest cloud revision this device has fetched (even if not applied).
 * @param {object} gameData
 * @param {string} profileId
 * @param {object|null|undefined} cloudRecord
 */
export function observeCloudRecord(gameData, profileId, cloudRecord) {
  const cloudUpdatedAt = cloudRecord?.updatedAt;
  if (!cloudUpdatedAt) return gameData;
  return markProfileCloudObserved(gameData, profileId, cloudUpdatedAt);
}

/**
 * Fetch cloud, observe its revision, and apply when this device is behind.
 * @param {object} gameData
 * @param {string} profileId
 * @param {string} playerKey
 */
export async function ensureProfileCloudFresh(gameData, profileId, playerKey) {
  const pin = normalizePlayerKey(playerKey);
  if (pin.length !== 4 || !profileId || !gameData) {
    return { ok: true, gameData, refreshed: false, skipped: true };
  }

  const remote = await loadCloudProfileWithKey(profileId, pin);
  if (!remote.ok || !remote.data) {
    return {
      ok: remote.ok !== false,
      gameData,
      refreshed: false,
      error: remote.error,
    };
  }

  let next = observeCloudRecord(gameData, profileId, remote.data);
  const comparison = compareLocalAndCloudSave(getPlayerProfile(next, profileId), remote.data);

  if (
    !shouldApplyCloudOverLocal(comparison, getPlayerProfile(next, profileId), remote.data)
  ) {
    return { ok: true, gameData: next, refreshed: false, comparison, cloudData: remote.data };
  }

  next = applyCloudProfile(next, remote.data);
  const applied = next.players?.find((p) => p.id === profileId || p.id === remote.data.profileID);
  if (!applied) return { ok: false, error: 'Could not apply cloud save.' };
  repairPlayerProfileInventory(applied);
  const activeId = applied.id;
  next = setPlayerKeyForProfile(next, activeId, pin);
  next = enforceSingleActiveProfile(next, activeId);
  return {
    ok: true,
    gameData: next,
    refreshed: true,
    profileId: activeId,
    comparison,
    cloudData: remote.data,
  };
}
