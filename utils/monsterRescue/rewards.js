import { COMBO_COIN_BASE, COMBO_EXP_BASE, RESCUE_COIN_BONUS, RESCUE_EXP_BONUS } from './constants';

/**
 * @param {{ combo: number, rescued: number, score: number, chests: number }} params
 */
export function computeStageRewards({ combo, rescued, score, chests = 0 }) {
  const comboBonus = Math.max(0, combo - 1) * COMBO_COIN_BASE;
  const coins = Math.floor(score / 10) + rescued * RESCUE_COIN_BONUS + comboBonus + chests * 40;
  const exp = Math.floor(score / 15) + rescued * RESCUE_EXP_BONUS + Math.max(0, combo - 1) * COMBO_EXP_BASE;
  const shards = rescued >= 3 ? 2 : rescued >= 1 ? 1 : 0;
  return {
    coins,
    exp,
    shards,
    rescued,
    comboPeak: combo,
    chests,
  };
}
