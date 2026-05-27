/** Monster Rescue — gold-focused; low EXP. Scales with rescue stage only (not monster level). */
export const RESCUE_BALANCE = {
  /** vs reference coins — main battle pays ~8–38; rescue targets ~5–9× that curve. */
  coinMultiplier: 15,
  expMultiplier: 0.28,
  coinCapBonus: 120,
  expCapBonus: 4,
  /** Full clear earns at least this fraction of the stage coin cap. */
  coinClearMinRatio: 0.88,
  coinsBase: 10,
  coinsPerStage: 1.1,
  expBase: 12,
  expPerStage: 3,
  maxStage: 60,
};

/** @param {number} rescueStageId Flat rescue level 1–60 */
export function rescueStageTier(rescueStageId) {
  return Math.max(1, Math.min(RESCUE_BALANCE.maxStage, Math.floor(rescueStageId || 1)));
}

/** @param {number} rescueStageId */
export function rescueCoinReference(rescueStageId) {
  const stage = rescueStageTier(rescueStageId);
  return Math.floor(RESCUE_BALANCE.coinsBase + stage * RESCUE_BALANCE.coinsPerStage);
}

/** @param {number} rescueStageId */
export function rescueExpReference(rescueStageId) {
  const stage = rescueStageTier(rescueStageId);
  return Math.floor(RESCUE_BALANCE.expBase + stage * RESCUE_BALANCE.expPerStage);
}

/** @param {number} rescueStageId */
export function rescueCoinCap(rescueStageId) {
  return Math.floor(rescueCoinReference(rescueStageId) * RESCUE_BALANCE.coinMultiplier) + RESCUE_BALANCE.coinCapBonus;
}

/** @param {number} rescueStageId */
export function rescueExpCap(rescueStageId) {
  return Math.floor(rescueExpReference(rescueStageId) * RESCUE_BALANCE.expMultiplier) + RESCUE_BALANCE.expCapBonus;
}
