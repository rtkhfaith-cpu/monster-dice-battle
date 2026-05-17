import { LADDER_FLOOR_COUNT } from './ladderRegions';
import { getPlayerProfile } from './gameStorage';

export function defaultLadderProgress() {
  return {
    highestFloorCleared: 0,
    attempts: 0,
    wins: 0,
    losses: 0,
    lastFloor: null,
    lastResult: null,
  };
}

export function normalizeLadderProgress(raw) {
  const base = defaultLadderProgress();
  if (!raw || typeof raw !== 'object') return base;
  if (typeof raw.highestFloorCleared === 'number') {
    base.highestFloorCleared = Math.max(0, Math.min(LADDER_FLOOR_COUNT, Math.floor(raw.highestFloorCleared)));
  }
  if (typeof raw.attempts === 'number') base.attempts = Math.max(0, raw.attempts);
  if (typeof raw.wins === 'number') base.wins = Math.max(0, raw.wins);
  if (typeof raw.losses === 'number') base.losses = Math.max(0, raw.losses);
  if (typeof raw.lastFloor === 'number') base.lastFloor = raw.lastFloor;
  if (raw.lastResult === 'win' || raw.lastResult === 'lose') base.lastResult = raw.lastResult;
  return base;
}

/** @param {import('./gameStorage').PlayerProfile|null|undefined} profile */
export function getLadderProgress(profile) {
  return normalizeLadderProgress(profile?.ladderProgress);
}

/** Next floor the Handler may challenge (1–25). */
export function nextChallengeFloor(progress) {
  const cleared = progress?.highestFloorCleared ?? 0;
  if (cleared >= LADDER_FLOOR_COUNT) return LADDER_FLOOR_COUNT;
  return cleared + 1;
}

export function isFloorUnlocked(progress, floor) {
  return floor <= nextChallengeFloor(progress);
}

export function isFloorCleared(progress, floor) {
  return floor <= (progress?.highestFloorCleared ?? 0);
}

export function ladderClearedAll(progress) {
  return (progress?.highestFloorCleared ?? 0) >= LADDER_FLOOR_COUNT;
}

/**
 * @param {object} gameData
 * @param {string} profileId
 * @param {number} floor
 * @param {'win'|'lose'} result
 */
export function applyLadderBattleResult(gameData, profileId, floor, result) {
  const profile = getPlayerProfile(gameData, profileId);
  if (!profile) return gameData;
  const lp = getLadderProgress(profile);
  lp.attempts += 1;
  lp.lastFloor = floor;
  lp.lastResult = result;
  if (result === 'win') {
    lp.wins += 1;
    if (floor > lp.highestFloorCleared) {
      lp.highestFloorCleared = Math.min(LADDER_FLOOR_COUNT, floor);
    }
  } else {
    lp.losses += 1;
  }
  profile.ladderProgress = lp;
  return gameData;
}
