import { sumGearBonuses } from './cosmetics';

function pct(n) {
  return Math.max(0, n || 0) / 100;
}

function percentFromLegacyBonuses(b) {
  const attackPct = Math.min(20, ((b.attackMin || 0) + (b.attackMax || 0)) * 2);
  const magicPct = Math.min(20, ((b.magicMin || 0) + (b.magicMax || 0)) * 2);
  const defPct = Math.min(20, ((b.defMin || 0) + (b.defMax || 0)) * 2);
  const magicDefPct = Math.min(20, ((b.magicDefMin || 0) + (b.magicDefMax || 0)) * 2);
  return {
    hpPct: Math.min(25, b.hp || 0),
    mpPct: Math.min(25, b.mp || 0),
    attackPct,
    magicPct,
    defPct,
    magicDefPct,
    speedPct: Math.min(25, (b.dodgePct || 0) * 2),
  };
}

function scaleRange(range, amountPct) {
  return {
    min: Math.max(1, Math.round(range.min * (1 + pct(amountPct)))),
    max: Math.max(1, Math.round(range.max * (1 + pct(amountPct)))),
  };
}

/**
 * Apply small gear bonuses onto a battle stats bundle from computeBattleStats.
 * @param {object} baseStats
 * @param {string[]} gearIds
 */
export function applyGearBonuses(baseStats, gearIds) {
  const b = sumGearBonuses(gearIds);
  const p = percentFromLegacyBonuses(b);
  const stats = {
    hp: Math.max(1, Math.round(baseStats.hp * (1 + pct(p.hpPct)))),
    mp: Math.max(1, Math.round(baseStats.mp * (1 + pct(p.mpPct)))),
    attack: scaleRange(baseStats.attack, p.attackPct),
    magic: scaleRange(baseStats.magic, p.magicPct),
    def: scaleRange(baseStats.def, p.defPct),
    magicDef: scaleRange(baseStats.magicDef, p.magicDefPct),
    critPct: Math.min(55, Math.max(4, baseStats.critPct + b.critPct)),
    dodgePct: Math.min(25, Math.max(3, baseStats.dodgePct + b.dodgePct)),
    speed: Math.max(1, Math.round((baseStats.speed ?? 10) * (1 + pct(p.speedPct)))),
  };
  return { stats, bonuses: { ...b, percentBonuses: p } };
}

/** EXP multiplier from gear (e.g. 1.05 for +5% EXP) */
export function expMultiplierFromGear(gearIds) {
  const b = sumGearBonuses(gearIds);
  return 1 + (b.expPct || 0) / 100;
}
