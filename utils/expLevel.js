/**
 * EXP thresholds — tuned simple for offline progression.
 */

/** EXP granted defaults */
export const EXP_WINNER = 25;
export const EXP_LOSER = 10;
export const EXP_UNDERDOG_BONUS = 10;

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
  return 36 + Math.floor(L * 14 + L * L * 0.06);
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
