/**
 * Merge local profile with cloud on login / resume.
 */
import {
  cloneGameData,
  enforceSingleActiveProfile,
  getPlayerProfile,
  repairPlayerProfileInventory,
  setPlayerKeyForProfile,
} from '../../utils/gameStorage';
import { normalizePlayerKey } from '../../utils/playerKey';
import { applyCloudProfile } from './cloudSaveMapper';
import { recallCloudProfile } from './cloudSaveService';
import {
  compareLocalAndCloudSave,
  getStaleLocalDeviceMessage,
  shouldBlockStaleLocalLogin,
} from './saveConflict';

/**
 * @param {object} gameData
 * @param {string} profileId
 * @param {string} playerKey
 */
export async function resolveProfileLoginWithCloud(gameData, profileId, playerKey) {
  const pin = normalizePlayerKey(playerKey);
  if (pin.length !== 4) {
    return { ok: false, error: 'Enter your 4-digit Player Key.' };
  }

  const baseGd = gameData || cloneGameData({ players: [], session: {} });
  const localProfile = getPlayerProfile(baseGd, profileId);
  const login = await recallCloudProfile(profileId, pin);

  if (!login.ok) {
    if (login.skipped && localProfile) {
      return {
        ok: true,
        gameData: baseGd,
        profileId,
        resolution: 'local_only',
        usedCloud: false,
      };
    }
    return {
      ok: false,
      error: login.error || 'Could not load cloud save.',
      status: login.status,
    };
  }

  const cloudData = login.data;
  const comparison = compareLocalAndCloudSave(localProfile, cloudData);

  if (shouldBlockStaleLocalLogin(comparison, localProfile)) {
    return {
      ok: false,
      staleLocalDevice: true,
      error: getStaleLocalDeviceMessage(),
      comparison,
      cloudData,
      profileId,
      playerKey: pin,
    };
  }

  const resolvedId = String(cloudData?.profileID || cloudData?.id || profileId).trim();
  let next = baseGd;
  let usedCloud = false;

  if (!localProfile) {
    next = applyCloudProfile(baseGd, cloudData);
    usedCloud = true;
  }

  const applied = next.players?.find((p) => p.id === resolvedId || p.id === profileId);
  if (!applied) {
    return { ok: false, error: 'Could not apply save to this device.' };
  }
  if (applied) repairPlayerProfileInventory(applied);

  const activeId = applied.id;
  next = setPlayerKeyForProfile(next, activeId, pin);
  next = enforceSingleActiveProfile(next, activeId);

  return {
    ok: true,
    gameData: next,
    profileId: activeId,
    resolution: comparison.resolution,
    comparison,
    usedCloud,
  };
}

/**
 * @param {object} gameData
 * @param {string} profileId
 * @param {object} cloudData
 */
export function applyCloudSaveChoice(gameData, profileId, cloudData, playerKey) {
  const pin = normalizePlayerKey(playerKey);
  const resolvedId = String(cloudData?.profileID || cloudData?.id || profileId).trim();
  let next = applyCloudProfile(gameData, cloudData);
  const applied = next.players?.find((p) => p.id === resolvedId || p.id === profileId);
  if (!applied) return { ok: false, error: 'Could not apply cloud save.' };
  repairPlayerProfileInventory(applied);
  const activeId = applied.id;
  if (pin.length === 4) next = setPlayerKeyForProfile(next, activeId, pin);
  next = enforceSingleActiveProfile(next, activeId);
  return { ok: true, gameData: next, profileId: activeId };
}

/**
 * @param {object} gameData
 * @param {string} profileId
 */
export function applyLocalSaveChoice(gameData, profileId, playerKey) {
  const pin = normalizePlayerKey(playerKey);
  let next = cloneGameData(gameData);
  const applied = getPlayerProfile(next, profileId);
  if (!applied) return { ok: false, error: 'Local profile not found.' };
  if (pin.length === 4) next = setPlayerKeyForProfile(next, profileId, pin);
  next = enforceSingleActiveProfile(next, profileId);
  return { ok: true, gameData: next, profileId };
}
