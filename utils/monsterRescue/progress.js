export function normalizeMonsterRescue(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  return {
    highestCleared: Math.max(0, Number(src.highestCleared) || 0),
    totalRescued: Math.max(0, Number(src.totalRescued) || 0),
    totalCoinsEarned: Math.max(0, Number(src.totalCoinsEarned) || 0),
    lastStagePlayed: Math.max(1, Number(src.lastStagePlayed) || 1),
  };
}

export function getMonsterRescueState(profile) {
  return normalizeMonsterRescue(profile?.monsterRescue);
}

export function setMonsterRescueState(profile, rescueState) {
  return { ...profile, monsterRescue: normalizeMonsterRescue(rescueState) };
}

export function applyStageClear(profile, stageId, rescuedCount, coinsGained) {
  const mr = getMonsterRescueState(profile);
  mr.highestCleared = Math.max(mr.highestCleared, stageId);
  mr.totalRescued += rescuedCount;
  mr.totalCoinsEarned += coinsGained;
  mr.lastStagePlayed = stageId;
  return setMonsterRescueState(profile, mr);
}
