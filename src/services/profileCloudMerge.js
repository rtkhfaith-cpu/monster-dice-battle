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
import { pushLoginSessionToCloud, recallCloudProfile } from './cloudSaveService';
import {
  registerProfileLoginSession,
  setProfileSession,
} from '../../utils/playerDeviceSession';
import {
  compareLocalAndCloudSave,
  shouldApplyCloudOverLocal,
  shouldBlockStaleLocalLogin,
  buildSaveConflictMessage,
} from './saveConflict';
import { loadCloudProfileWithKey } from './cloudSaveService';

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
  const session = await registerProfileLoginSession(profileId);
  const login = await recallCloudProfile(profileId, pin, { session });

  if (!login.ok) {
    if (login.skipped && localProfile) {
      await setProfileSession(profileId, session);
      const lp = getPlayerProfile(baseGd, profileId);
      if (lp) lp.activeSession = { ...session };
      return {
        ok: true,
        gameData: baseGd,
        profileId,
        resolution: 'local_only',
        usedCloud: false,
        session,
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
      saveConflict: true,
      error: buildSaveConflictMessage(comparison, localProfile?.name || 'Player'),
      comparison,
      cloudData,
      profileId,
      playerKey: pin,
    };
  }

  const resolvedId = String(cloudData?.profileID || cloudData?.id || profileId).trim();
  let next = baseGd;
  let usedCloud = false;

  if (!localProfile || shouldApplyCloudOverLocal(comparison)) {
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
  const resolvedSession = login.session || session;
  if (resolvedSession) {
    await setProfileSession(activeId, resolvedSession);
    const appliedProfile = getPlayerProfile(next, activeId);
    if (appliedProfile) {
      appliedProfile.activeSession = { ...resolvedSession };
    }
  }
  next = enforceSingleActiveProfile(next, activeId);

  if (resolvedSession) {
    const push = await pushLoginSessionToCloud(activeId, next, resolvedSession);
    if (!push.ok && !push.skipped && !push.sessionSuperseded) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[login] session claim sync failed', push.error);
      }
    }
  }

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

/**
 * Pull cloud save when this device is behind (e.g. resumed tab with stale local data).
 * @param {object} gameData
 * @param {string} profileId
 * @param {string} playerKey
 */
export async function refreshProfileFromCloudIfBehind(gameData, profileId, playerKey) {
  const pin = normalizePlayerKey(playerKey);
  if (pin.length !== 4 || !profileId) {
    return { ok: true, gameData, refreshed: false };
  }

  const localProfile = getPlayerProfile(gameData, profileId);
  const remote = await loadCloudProfileWithKey(profileId, pin);
  if (!remote.ok || !remote.data) {
    return { ok: remote.ok !== false, gameData, refreshed: false, error: remote.error };
  }

  const comparison = compareLocalAndCloudSave(localProfile, remote.data);
  if (!shouldApplyCloudOverLocal(comparison)) {
    return { ok: true, gameData, refreshed: false, comparison };
  }

  let next = applyCloudProfile(gameData, remote.data);
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
