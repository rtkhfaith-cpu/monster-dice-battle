import { decodeRescueLevel } from './stages';
import { normalCoinsForEnemyLevel, normalExpForEnemyLevel } from '../../src/gameBalance/rewards';

/**
 * Rescue payouts are tuned ~one normal battle win (not multi-battle jackpots).
 * Reference at enemy level ≈ stage tier: coins ~8–13, EXP ~18–30 per fight.
 */
const COINS_PER_BUBBLE = 0.18;
const EXP_PER_BUBBLE = 0.3;
const COMBO_COIN_PER_STEP = 1;
const COMBO_EXP_PER_STEP = 1;
const CLEAR_COIN_BONUS = 4;
const CLEAR_EXP_BONUS = 5;

function tierEnemyLevel(themeId, subLevel) {
  return Math.max(1, Math.min(60, (themeId - 1) * 8 + subLevel));
}

/**
 * Full payout — only when the stage is cleared (all bubbles popped).
 * @param {{ comboPeak: number, bubblesCleared: number, themeId: number, subLevel: number }} params
 */
export function computeStageRewards({ comboPeak = 1, bubblesCleared = 0, themeId = 1, subLevel = 1 }) {
  const cleared = Math.max(0, Math.floor(bubblesCleared));
  const comboSteps = Math.max(0, comboPeak - 1);
  const refLv = tierEnemyLevel(themeId, subLevel);
  const battleCoinRef = normalCoinsForEnemyLevel(refLv);
  const battleExpRef = normalExpForEnemyLevel(refLv);

  let coins = Math.floor(
    cleared * COINS_PER_BUBBLE + comboSteps * COMBO_COIN_PER_STEP + CLEAR_COIN_BONUS
  );
  let exp = Math.floor(
    cleared * EXP_PER_BUBBLE + comboSteps * COMBO_EXP_PER_STEP + CLEAR_EXP_BONUS
  );

  const coinCap = battleCoinRef + 4;
  const expCap = battleExpRef + 6;
  coins = Math.min(coinCap, Math.max(CLEAR_COIN_BONUS, coins));
  exp = Math.min(expCap, Math.max(CLEAR_EXP_BONUS, exp));

  return {
    coins,
    exp,
    shards: 0,
    comboPeak,
    bubblesCleared: cleared,
    score: cleared * 4 + comboSteps * 2,
  };
}

/** Tiny consolation payout on loss / timeout — not a substitute for clearing. */
export function computeLossRewards(runSummary = {}) {
  const cleared = Math.max(0, Math.floor(runSummary?.bubblesCleared ?? 0));
  return {
    coins: cleared >= 12 ? 1 : 0,
    exp: cleared >= 15 ? 2 : cleared >= 8 ? 1 : 0,
    shards: 0,
    comboPeak: runSummary?.comboPeak ?? 1,
    bubblesCleared: cleared,
    score: runSummary?.score ?? cleared * 2,
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
