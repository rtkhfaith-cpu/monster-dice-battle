import { sumGearBonuses } from './cosmetics';

/**
 * Apply small gear bonuses onto a battle stats bundle from computeBattleStats.
 * @param {object} baseStats
 * @param {string[]} gearIds
 */
export function applyGearBonuses(baseStats, gearIds) {
  const b = sumGearBonuses(gearIds);
  const stats = {
    hp: baseStats.hp + b.hp,
    mp: baseStats.mp + b.mp,
    attack: {
      min: baseStats.attack.min + b.attackMin,
      max: baseStats.attack.max + b.attackMax,
    },
    magic: {
      min: baseStats.magic.min + b.magicMin,
      max: baseStats.magic.max + b.magicMax,
    },
    def: {
      min: baseStats.def.min + b.defMin,
      max: baseStats.def.max + b.defMax,
    },
    magicDef: {
      min: baseStats.magicDef.min + b.magicDefMin,
      max: baseStats.magicDef.max + b.magicDefMax,
    },
    critPct: Math.min(55, Math.max(4, baseStats.critPct + b.critPct)),
    dodgePct: Math.min(45, Math.max(5, baseStats.dodgePct + b.dodgePct)),
  };
  return { stats, bonuses: b };
}

/** EXP multiplier from gear (e.g. 1.05 for +5% EXP) */
export function expMultiplierFromGear(gearIds) {
  const b = sumGearBonuses(gearIds);
  return 1 + (b.expPct || 0) / 100;
}
