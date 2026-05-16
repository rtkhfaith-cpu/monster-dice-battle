/**
 * EXP thresholds — tuned simple for offline progression.
 */

/** EXP granted defaults (used as fallbacks; battle rewards compute per-level amounts). */
export const EXP_WINNER = 25;
export const EXP_LOSER = 10;
export const EXP_UNDERDOG_BONUS = 8;

/**
 * Total cumulative EXP needed to *reach* `targetLevel` from level 1.
 * Level 1 starts at 0 EXP toward level 2.
 */
export function cumulativeExpForLevel(targetLevel) {
  let lv = Math.max(1, Math.floor(targetLevel || 1));
  let sum = 0;
  for (let L = 1; L < lv; L++) {
    sum += expToAdvanceFrom(L);
  }
  return sum;
}

/** EXP needed to go from currentLevel → currentLevel+1 */
export function expToAdvanceFrom(currentLevel) {
  const L = Math.max(1, Math.floor(currentLevel || 1));
  const n = L - 1;
  return 50 + n * 35 + n * n * 10;
}

/** Win EXP scaled to opponent level. */
export function expWinForEnemyLevel(enemyLevel) {
  const lv = Math.max(1, Math.floor(enemyLevel || 1));
  return 15 + lv * 5;
}

/** EXP lost on defeat (no level-down). */
export function expLossPenalty(playerLevel) {
  const lv = Math.max(1, Math.floor(playerLevel || 1));
  return Math.min(15, Math.max(5, 5 + Math.floor(lv / 3)));
}

/**
 * Apply EXP gain; returns updated { level, exp, levelsGained }.
 * @param {{ level: number, exp: number }} owned
 * @param {number} addExp
 */
export function addExperience(owned, addExp) {
  let level = Math.max(1, Math.floor(owned.level || 1));
  let exp = Math.max(0, Math.floor(owned.exp || 0));
  let gained = Math.max(0, Math.floor(addExp || 0));
  exp += gained;
  let levelsGained = 0;
  let guard = 0;
  while (guard++ < 500) {
    const need = expToAdvanceFrom(level);
    if (exp < need || level >= 999) break;
    exp -= need;
    level += 1;
    levelsGained += 1;
  }
  return { level, exp, levelsGained };
}

/**
 * Apply EXP loss without reducing level.
 * @param {{ level: number, exp: number }} owned
 * @param {number} loseExp
 */
export function subtractExperience(owned, loseExp) {
  const level = Math.max(1, Math.floor(owned.level || 1));
  const exp = Math.max(0, Math.floor(owned.exp || 0) - Math.max(0, Math.floor(loseExp || 0)));
  return { level, exp, levelsLost: 0 };
}
