/**
 * @deprecated Old gear stat helpers — battle uses battleStatCalculator.
 * Kept for any legacy imports; returns stats unchanged.
 */
export function applyGearBonuses(baseStats, _gearIds = []) {
  return { stats: baseStats, bonuses: {} };
}

export function expMultiplierFromGear() {
  return 1;
}
