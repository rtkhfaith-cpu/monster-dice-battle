/**
 * Monster Rush profile progress — Rush Points, bests, run stats.
 */
import { rushPointsFromRun } from './monsterRushConfig';

export function normalizeMonsterRush(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  return {
    totalRushPoints: Math.max(0, Math.floor(src.totalRushPoints || 0)),
    bestDistance: Math.max(0, Math.floor(src.bestDistance || 0)),
    bestCoins: Math.max(0, Math.floor(src.bestCoins || 0)),
    bestScore: Math.max(0, Math.floor(src.bestScore || 0)),
    totalRuns: Math.max(0, Math.floor(src.totalRuns || 0)),
    mode: src.mode === 'stage' ? 'stage' : 'endless',
    lastRun: src.lastRun && typeof src.lastRun === 'object' ? src.lastRun : null,
    /** Reserved for future daily bonus tracking. */
    dailyBonus: src.dailyBonus && typeof src.dailyBonus === 'object' ? src.dailyBonus : null,
  };
}

export function getMonsterRushState(profile) {
  return normalizeMonsterRush(profile?.monsterRush);
}

export function setMonsterRushState(profile, state) {
  return { ...profile, monsterRush: normalizeMonsterRush(state) };
}

/**
 * Apply end-of-run stats to profile (mutates profile).
 * @returns {{ rushPointsEarned: number, newBestDistance: boolean }}
 */
export function applyMonsterRushRunToProfile(profile, { distanceM, coinsCollected, selectedMonsterId }) {
  const rushPointsEarned = rushPointsFromRun(distanceM, coinsCollected);
  const mr = getMonsterRushState(profile);
  const newBestDistance = distanceM > mr.bestDistance;
  const newBestCoins = coinsCollected > mr.bestCoins;
  const newBestScore = rushPointsEarned > mr.bestScore;

  mr.totalRushPoints += rushPointsEarned;
  mr.bestDistance = Math.max(mr.bestDistance, distanceM);
  mr.bestCoins = Math.max(mr.bestCoins, coinsCollected);
  mr.bestScore = Math.max(mr.bestScore, rushPointsEarned);
  mr.totalRuns += 1;
  mr.lastRun = {
    distanceM,
    coinsCollected,
    rushPointsEarned,
    selectedMonsterId: selectedMonsterId ?? null,
    at: new Date().toISOString(),
  };

  profile.monsterRush = mr;
  profile.updatedAt = new Date().toISOString();

  return {
    rushPointsEarned,
    totalRushPoints: mr.totalRushPoints,
    newBestDistance,
    newBestCoins,
    newBestScore,
  };
}
