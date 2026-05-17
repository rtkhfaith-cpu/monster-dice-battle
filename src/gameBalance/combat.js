export const COMBAT_BALANCE = {
  varianceMin: 0.9,
  varianceMax: 1.1,
  physicalDefenseScalar: 0.45,
  magicDefenseScalar: 0.35,
  baseCritChance: 8,
  critMultiplier: 1.5,
  defendReduction: 0.4,
  elementAdvantageMultiplier: 1.3,
  elementDisadvantageMultiplier: 0.7,
  dodgeBase: 3,
  dodgeSpeedScalar: 0.25,
  dodgeMin: 3,
  dodgeMax: 25,
  magicDodgeMultiplier: 0.5,
  miniBossDodgeMultiplier: 0.75,
  bigBossDodgeMultiplier: 0.5,
};

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export function randomVariance() {
  const { varianceMin, varianceMax } = COMBAT_BALANCE;
  return varianceMin + Math.random() * (varianceMax - varianceMin);
}

export function dodgeChance({ attackerSpeed = 10, defenderSpeed = 10, magic = false, bossKind = null }) {
  let pct = COMBAT_BALANCE.dodgeBase
    + (defenderSpeed - attackerSpeed) * COMBAT_BALANCE.dodgeSpeedScalar;
  pct = clamp(pct, COMBAT_BALANCE.dodgeMin, COMBAT_BALANCE.dodgeMax);
  if (magic) pct *= COMBAT_BALANCE.magicDodgeMultiplier;
  if (bossKind === 'miniBoss') pct *= COMBAT_BALANCE.miniBossDodgeMultiplier;
  if (bossKind === 'bigBoss') pct *= COMBAT_BALANCE.bigBossDodgeMultiplier;
  return clamp(pct, COMBAT_BALANCE.dodgeMin, COMBAT_BALANCE.dodgeMax);
}

export function elementalDamageMultiplier(relation) {
  if (relation === 'advantage') return COMBAT_BALANCE.elementAdvantageMultiplier;
  if (relation === 'disadvantage') return COMBAT_BALANCE.elementDisadvantageMultiplier;
  return 1;
}
