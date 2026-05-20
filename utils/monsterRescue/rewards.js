import { decodeRescueLevel } from './stages';

const COINS_PER_BUBBLE = 4;
const EXP_PER_BUBBLE = 5;

/**
 * Full payout — only when the stage is cleared (all bubbles popped).
 * @param {{ comboPeak: number, bubblesCleared: number, themeId: number, subLevel: number }} params
 */
export function computeStageRewards({ comboPeak = 1, bubblesCleared = 0, themeId = 1, subLevel = 1 }) {
  const comboBonus = Math.max(0, comboPeak - 1) * 6;
  const tierBonus = (themeId - 1) * 10 + subLevel * 3;
  const clearBonus = 12;
  const coins = bubblesCleared * COINS_PER_BUBBLE + comboBonus + tierBonus + clearBonus;
  const exp = bubblesCleared * EXP_PER_BUBBLE + Math.floor(comboBonus * 1.4) + tierBonus + clearBonus;
  return {
    coins,
    exp,
    shards: 0,
    comboPeak,
    bubblesCleared,
    score: bubblesCleared * 10 + comboBonus * 5,
  };
}

/** Tiny consolation payout on loss / timeout — not a substitute for clearing. */
export function computeLossRewards(runSummary = {}) {
  const cleared = Math.max(0, Math.floor(runSummary?.bubblesCleared ?? 0));
  return {
    coins: cleared >= 8 ? 2 : cleared >= 3 ? 1 : 0,
    exp: cleared >= 10 ? 3 : cleared >= 5 ? 1 : 0,
    shards: 0,
    comboPeak: runSummary?.comboPeak ?? 1,
    bubblesCleared: cleared,
    score: runSummary?.score ?? cleared * 4,
  };
}

export function computeStageRewardsFromLevel(levelId, runSummary = {}, won = true) {
  if (!won) return computeLossRewards(runSummary);
  const { themeId, subLevel } = decodeRescueLevel(levelId);
  return computeStageRewards({
    comboPeak: runSummary?.comboPeak ?? 1,
    bubblesCleared: runSummary?.bubblesCleared ?? 0,
    themeId,
    subLevel,
  });
}
