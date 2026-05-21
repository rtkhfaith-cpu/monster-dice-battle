import { decodeRescueLevel } from './stages';
import { RESCUE_BALANCE, rescueCoinCap, rescueExpCap } from '../../src/gameBalance/rescue';

/**
 * Rescue payouts scale with rescue stage id (1–60) only.
 * Player monster level does not affect coins or EXP.
 */
const COINS_PER_BUBBLE = 0.65;
const EXP_PER_BUBBLE = 0.09;
const COMBO_COIN_PER_STEP = 3;
const COMBO_EXP_PER_STEP = 0;
const CLEAR_COIN_BONUS = 18;
const CLEAR_EXP_BONUS = 3;

/**
 * Full payout — only when the stage is cleared (all bubbles popped).
 * @param {{ comboPeak: number, bubblesCleared: number, rescueStageId: number }} params
 */
export function computeStageRewards({ comboPeak = 1, bubblesCleared = 0, rescueStageId = 1 }) {
  const cleared = Math.max(0, Math.floor(bubblesCleared));
  const comboSteps = Math.max(0, comboPeak - 1);
  const stageId = Math.max(1, Math.floor(rescueStageId || 1));

  let coins = Math.floor(
    cleared * COINS_PER_BUBBLE + comboSteps * COMBO_COIN_PER_STEP + CLEAR_COIN_BONUS
  );
  let exp = Math.floor(
    cleared * EXP_PER_BUBBLE + comboSteps * COMBO_EXP_PER_STEP + CLEAR_EXP_BONUS
  );

  const coinCap = rescueCoinCap(stageId);
  const expCap = rescueExpCap(stageId);
  const coinFloor = Math.max(
    CLEAR_COIN_BONUS,
    Math.floor(coinCap * RESCUE_BALANCE.coinClearMinRatio),
  );
  coins = Math.min(coinCap, Math.max(coinFloor, coins));
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
    coins: cleared >= 12 ? 2 : cleared >= 6 ? 1 : 0,
    exp: cleared >= 15 ? 1 : 0,
    shards: 0,
    comboPeak: runSummary?.comboPeak ?? 1,
    bubblesCleared: cleared,
    score: runSummary?.score ?? cleared * 2,
  };
}

export function computeStageRewardsFromLevel(levelId, runSummary = {}, won = true) {
  if (!won) return computeLossRewards(runSummary);
  const { levelId: rescueStageId } = decodeRescueLevel(levelId);
  return computeStageRewards({
    comboPeak: runSummary?.comboPeak ?? 1,
    bubblesCleared: runSummary?.bubblesCleared ?? 0,
    rescueStageId,
  });
}
