export const COMBAT_BALANCE = {
  varianceMin: 0.9,
  varianceMax: 1.1,
  /** Tuned for longer high-level fights (was 0.45 / 0.35). */
  physicalDefenseScalar: 0.52,
  magicDefenseScalar: 0.45,
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

/**
 * High-level pacing — offense was scaling ~4× faster than HP by Lv100.
 * Linear below offenseSoftStartLevel, then sqrt so mythic duels last ~6–10 hits.
 */
export const STAT_PACING = {
  offenseSoftStartLevel: 40,
  offenseLateSqrtMultiplier: 6,
  hpBonusStartLevel: 40,
  hpBonusPerLevel: 2.5,
};

/** @param {number} perLevelGrowth @param {number} level */
export function offensiveStatSteps(perLevelGrowth, level) {
  const perLevel = Math.max(0, perLevelGrowth ?? 2);
  const L = Math.max(0, Math.floor(level ?? 1) - 1);
  const breakAt = STAT_PACING.offenseSoftStartLevel;
  if (L <= breakAt) return Math.floor(perLevel * L);
  const early = Math.floor(perLevel * breakAt);
  const lateSpan = L - breakAt;
  const late = Math.floor(perLevel * Math.sqrt(lateSpan * STAT_PACING.offenseLateSqrtMultiplier));
  return early + late;
}

/** @param {number} level */
export function highLevelHpBonus(level) {
  const lv = Math.max(1, Math.floor(level ?? 1));
  if (lv <= STAT_PACING.hpBonusStartLevel) return 0;
  return Math.floor((lv - STAT_PACING.hpBonusStartLevel) * STAT_PACING.hpBonusPerLevel);
}

/**
 * Light damage trim from Lv31+ (stacks with sublinear offense in statsCalc).
 * @param {number} level
 */
export function outgoingDamageLevelFactor(level) {
  const lv = Math.max(1, Math.floor(level ?? 1));
  if (lv <= 30) return 1;
  const t = (lv - 30) / 70;
  return 1 - t * 0.22;
}

/** MP pools — scales visibly every level; role/rarity differentiate casters vs brawlers. */
export const MP_PACING = {
  min: 30,
  max: 220,
  base: 24,
  perLevel: 2,
};

const ROLE_MP_BONUS = {
  tank: 0,
  brawler: 4,
  attacker: 4,
  mage: 16,
  balanced: 6,
  speedster: 8,
  support: 12,
  debuffer: 8,
  trickster: 8,
  mythic: 10,
  tank_mage: 8,
};

const RARITY_MP_BONUS = {
  common: 0,
  rare: 5,
  epic: 10,
  legendary: 16,
  mythic: 22,
};

/**
 * Battle MP pool — grows +2 MP per level so players see clear progression.
 * @param {number} level
 * @param {string} [role]
 * @param {string} [rarity]
 */
export function battleMpPool(level, role = 'balanced', rarity = 'common') {
  const lv = Math.max(1, Math.floor(level ?? 1));
  const roleBonus = ROLE_MP_BONUS[role] ?? ROLE_MP_BONUS.balanced;
  const rarityBonus = RARITY_MP_BONUS[rarity] ?? 0;
  const raw = MP_PACING.base + Math.floor(lv * MP_PACING.perLevel) + roleBonus + rarityBonus;
  return clamp(raw, MP_PACING.min, MP_PACING.max);
}

/**
 * Final damage — passives will hook here later.
 * @param {number} raw
 * @param {{ attacker?: object, defender?: object, strikeKind?: string, elementRelation?: string }} ctx
 */
export function applyCombatDamageModifiers(raw, ctx = {}) {
  const paceLv = Math.max(ctx.attacker?.level ?? 1, ctx.defender?.level ?? 1);
  let out = raw * outgoingDamageLevelFactor(paceLv);
  // Future: passive skills (template / gear / buffs) adjust `out` here using ctx
  return Math.max(1, Math.round(out));
}
