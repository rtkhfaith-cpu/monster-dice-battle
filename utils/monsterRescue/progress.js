import { RESCUE_TOTAL_LEVELS, decodeRescueLevel, getRescueSubKind } from './stages';
import { getRescueWeekKey } from './rescueWeeklyReset';

/** @typedef {'locked'|'available'|'cleared'|'closed'} RescueStageStatus */

/**
 * @typedef {{
 *   highestCleared: number,
 *   totalCleared: number,
 *   totalRescued: number,
 *   totalCoinsEarned: number,
 *   lastStagePlayed: number,
 *   weeklyWeekKey: string|null,
 *   chestClaimedLevelIds: number[],
 * }} MonsterRescueState
 */

function clampLevelId(levelId) {
  return Math.max(1, Math.min(RESCUE_TOTAL_LEVELS, Math.floor(levelId || 1)));
}

function normalizeChestClaimedIds(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const out = [];
  for (const id of raw) {
    const n = clampLevelId(id);
    const { subLevel } = decodeRescueLevel(n);
    if (subLevel !== 5 && subLevel !== 10) continue;
    if (seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out.sort((a, b) => a - b);
}

export function normalizeMonsterRescue(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const cleared = Math.max(0, Math.min(RESCUE_TOTAL_LEVELS, Number(src.highestCleared) || 0));
  const mr = {
    highestCleared: cleared,
    totalCleared: Math.max(0, Number(src.totalCleared) || cleared),
    totalRescued: Math.max(0, Number(src.totalRescued) || 0),
    totalCoinsEarned: Math.max(0, Number(src.totalCoinsEarned) || 0),
    lastStagePlayed: clampLevelId(src.lastStagePlayed || 1),
    weeklyWeekKey: typeof src.weeklyWeekKey === 'string' ? src.weeklyWeekKey : null,
    chestClaimedLevelIds: normalizeChestClaimedIds(src.chestClaimedLevelIds),
  };
  return applyRescueWeeklyResetIfNeeded(mr);
}

/**
 * @param {MonsterRescueState} mr
 */
export function applyRescueWeeklyResetIfNeeded(mr) {
  const key = getRescueWeekKey();
  if (mr.weeklyWeekKey === key) return mr;
  return {
    ...mr,
    weeklyWeekKey: key,
    highestCleared: 0,
    chestClaimedLevelIds: [],
  };
}

export function getMonsterRescueState(profile) {
  return normalizeMonsterRescue(profile?.monsterRescue);
}

export function setMonsterRescueState(profile, rescueState) {
  return { ...profile, monsterRescue: normalizeMonsterRescue(rescueState) };
}

/** Sub-levels 5 and 10 are the only chest stages (12 per full weekly run). */
export function isRescueChestStage(levelId) {
  const kind = getRescueSubKind(decodeRescueLevel(levelId).subLevel);
  return kind === 'miniBoss' || kind === 'bigBoss';
}

/**
 * @param {MonsterRescueState} rescueState
 * @param {number} levelId
 * @returns {RescueStageStatus}
 */
export function getRescueStageStatus(rescueState, levelId) {
  const mr = normalizeMonsterRescue(rescueState);
  const id = clampLevelId(levelId);

  if (id > mr.highestCleared + 1) return 'locked';
  if (mr.chestClaimedLevelIds.includes(id)) return 'closed';
  if (id <= mr.highestCleared) {
    return isRescueChestStage(id) ? 'closed' : 'cleared';
  }
  return 'available';
}

/** @param {MonsterRescueState} rescueState @param {number} levelId */
export function isRescueStagePlayable(rescueState, levelId) {
  return getRescueStageStatus(rescueState, levelId) === 'available';
}

export function countRescueChestsClaimedThisWeek(rescueState) {
  return normalizeMonsterRescue(rescueState).chestClaimedLevelIds.length;
}

export function applyStageClear(profile, levelId, bubblesCleared, coinsGained) {
  const mr = getMonsterRescueState(profile);
  const id = clampLevelId(levelId);
  mr.highestCleared = Math.max(mr.highestCleared, id);
  mr.totalCleared = Math.max(mr.totalCleared ?? 0, mr.highestCleared);
  mr.totalRescued += bubblesCleared;
  mr.totalCoinsEarned += coinsGained;
  mr.lastStagePlayed = id;
  return setMonsterRescueState(profile, mr);
}

/** @param {object} profile @param {number} levelId */
export function markRescueChestClaimed(profile, levelId) {
  const mr = getMonsterRescueState(profile);
  const id = clampLevelId(levelId);
  if (!isRescueChestStage(id)) return setMonsterRescueState(profile, mr);
  if (mr.chestClaimedLevelIds.includes(id)) return setMonsterRescueState(profile, mr);
  mr.chestClaimedLevelIds = [...mr.chestClaimedLevelIds, id].sort((a, b) => a - b);
  return setMonsterRescueState(profile, mr);
}
