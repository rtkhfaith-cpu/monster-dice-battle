import { decodeRescueLevel } from './stages';

const COINS_PER_BUBBLE = 3;
const EXP_PER_BUBBLE = 4;

/**
 * @param {{ comboPeak: number, bubblesCleared: number, themeId: number, subLevel: number }} params
 */
export function computeStageRewards({ comboPeak = 1, bubblesCleared = 0, themeId = 1, subLevel = 1 }) {
  const comboBonus = Math.max(0, comboPeak - 1) * 5;
  const tierBonus = (themeId - 1) * 8 + subLevel * 2;
  const coins = bubblesCleared * COINS_PER_BUBBLE + comboBonus + tierBonus;
  const exp = bubblesCleared * EXP_PER_BUBBLE + Math.floor(comboBonus * 1.2) + tierBonus;
  return {
    coins,
    exp,
    shards: 0,
    comboPeak,
    bubblesCleared,
    score: bubblesCleared * 10 + comboBonus * 5,
  };
}

export function computeStageRewardsFromLevel(levelId, runSummary = {}) {
  const { themeId, subLevel } = decodeRescueLevel(levelId);
  return computeStageRewards({
    comboPeak: runSummary?.comboPeak ?? 1,
    bubblesCleared: runSummary?.bubblesCleared ?? 0,
    themeId,
    subLevel,
  });
}
