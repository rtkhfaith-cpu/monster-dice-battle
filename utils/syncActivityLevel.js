/**
 * Hidden player sync activity — unlimited levels, not shown in UI.
 * Used to compare saves when monster peak level is capped (e.g. Lv 120).
 */

export const SYNC_EXP_PER_LEVEL = 9999;

/** @type {Map<string, number>} */
const clickBufferByProfile = new Map();

/**
 * @param {object|null|undefined} profile
 * @returns {{ level: number, exp: number }}
 */
export function normalizeSyncActivity(profile) {
  if (!profile || typeof profile !== 'object') return { level: 0, exp: 0 };
  let sa = profile.syncActivity;
  if (!sa || typeof sa !== 'object') {
    const legacyBattles = Math.max(0, Math.floor(profile.battleProgress?.totalBattles ?? 0));
    const legacyScore = legacyBattles * 10;
    sa = {
      level: Math.floor(legacyScore / SYNC_EXP_PER_LEVEL),
      exp: legacyScore % SYNC_EXP_PER_LEVEL,
    };
    profile.syncActivity = { ...sa };
  }
  sa.level = Math.max(0, Math.floor(Number(sa.level) || 0));
  sa.exp = Math.max(0, Math.floor(Number(sa.exp) || 0));
  while (sa.exp >= SYNC_EXP_PER_LEVEL) {
    sa.level += 1;
    sa.exp -= SYNC_EXP_PER_LEVEL;
  }
  profile.syncActivity = sa;
  return sa;
}

/** @param {{ level?: number, exp?: number }|null|undefined} sa */
export function syncActivityScoreFromParts(sa) {
  const level = Math.max(0, Math.floor(Number(sa?.level) || 0));
  const exp = Math.max(0, Math.floor(Number(sa?.exp) || 0));
  return level * SYNC_EXP_PER_LEVEL + exp;
}

/** @param {object|null|undefined} profile */
export function syncActivityScore(profile) {
  if (!profile) return 0;
  return syncActivityScoreFromParts(normalizeSyncActivity(profile));
}

/** @param {object|null|undefined} cloud */
export function cloudSyncActivityScore(cloud) {
  if (!cloud || typeof cloud !== 'object') return 0;
  if (cloud.syncActivity && typeof cloud.syncActivity === 'object') {
    return syncActivityScoreFromParts(cloud.syncActivity);
  }
  const level = cloud.syncActivityLevel ?? cloud.syncActivity?.level;
  const exp = cloud.syncActivityExp ?? cloud.syncActivity?.exp;
  if (level != null || exp != null) {
    return syncActivityScoreFromParts({ level, exp });
  }
  return 0;
}

/**
 * @param {object} profile
 * @param {number} [amount]
 */
export function addSyncActivityExp(profile, amount = 1) {
  if (!profile || amount <= 0) return profile;
  const sa = normalizeSyncActivity(profile);
  sa.exp += Math.floor(amount);
  while (sa.exp >= SYNC_EXP_PER_LEVEL) {
    sa.level += 1;
    sa.exp -= SYNC_EXP_PER_LEVEL;
  }
  return profile;
}

/**
 * @param {object} gameData
 * @param {string} profileId
 * @param {number} [amount]
 */
export function addSyncActivityExpToGameData(gameData, profileId, amount = 1) {
  if (!gameData || !profileId || amount <= 0) return gameData;
  const profile = gameData.players?.find((p) => p.id === profileId);
  if (!profile) return gameData;
  addSyncActivityExp(profile, amount);
  return gameData;
}

/** @param {string|null|undefined} profileId */
export function recordSyncClick(profileId) {
  if (!profileId) return;
  clickBufferByProfile.set(profileId, (clickBufferByProfile.get(profileId) || 0) + 1);
}

/** @param {string} profileId */
export function consumeSyncClickBuffer(profileId) {
  const n = clickBufferByProfile.get(profileId) || 0;
  if (n > 0) clickBufferByProfile.set(profileId, 0);
  return n;
}

/**
 * Apply buffered clicks + save action exp before persisting.
 * @param {object} gameData
 * @param {string} profileId
 * @param {{ includeSaveAction?: boolean }} [opts]
 */
export function applySyncActivityForSave(gameData, profileId, opts = {}) {
  const clicks = consumeSyncClickBuffer(profileId);
  const saveBonus = opts.includeSaveAction !== false ? 1 : 0;
  const total = clicks + saveBonus;
  if (total <= 0) return gameData;
  return addSyncActivityExpToGameData(gameData, profileId, total);
}

/** @param {object} profile */
export function syncActivityLabel(profile) {
  const sa = normalizeSyncActivity(profile);
  return `Lv ${sa.level} (${sa.exp}/${SYNC_EXP_PER_LEVEL})`;
}
