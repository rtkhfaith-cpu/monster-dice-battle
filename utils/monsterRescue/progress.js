import { RESCUE_TOTAL_LEVELS } from './stages';

export function normalizeMonsterRescue(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const cleared = Math.max(0, Math.min(RESCUE_TOTAL_LEVELS, Number(src.highestCleared) || 0));
  return {
    highestCleared: cleared,
    totalCleared: Math.max(0, Number(src.totalCleared) || cleared),
    totalRescued: Math.max(0, Number(src.totalRescued) || 0),
    totalCoinsEarned: Math.max(0, Number(src.totalCoinsEarned) || 0),
    lastStagePlayed: Math.max(1, Math.min(RESCUE_TOTAL_LEVELS, Number(src.lastStagePlayed) || 1)),
  };
}

export function getMonsterRescueState(profile) {
  return normalizeMonsterRescue(profile?.monsterRescue);
}

export function setMonsterRescueState(profile, rescueState) {
  return { ...profile, monsterRescue: normalizeMonsterRescue(rescueState) };
}

export function applyStageClear(profile, levelId, bubblesCleared, coinsGained) {
  const mr = getMonsterRescueState(profile);
  mr.highestCleared = Math.max(mr.highestCleared, levelId);
  mr.totalCleared = Math.max(mr.totalCleared ?? 0, mr.highestCleared);
  mr.totalRescued += bubblesCleared;
  mr.totalCoinsEarned += coinsGained;
  mr.lastStagePlayed = levelId;
  return setMonsterRescueState(profile, mr);
}
