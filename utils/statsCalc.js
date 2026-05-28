import { evolutionStageFromLevel } from './evolution';
import { getMonsterTemplate, MONSTER_CATALOG } from './monsterTemplates';
import { battleMpPool, highLevelHpBonus, offensiveStatSteps } from '../src/gameBalance/combat';
import { baseSpeedForRole, growthForRole } from '../src/gameBalance/monsters';

/** Flat rarity bumps — keeps commons playable while highs feel premium */
export const RARITY_FLAT = {
  common: { hp: 0, mp: 0, atk: 0, mag: 0, def: 0, md: 0, crit: 0, dodge: 0, speed: 0, hit: 0 },
  rare: { hp: 10, mp: 6, atk: 1, mag: 1, def: 1, md: 1, crit: 1, dodge: 1, speed: 1, hit: 1 },
  epic: { hp: 22, mp: 14, atk: 2, mag: 2, def: 2, md: 2, crit: 2, dodge: 1, speed: 1, hit: 1 },
  legendary: { hp: 38, mp: 26, atk: 3, mag: 3, def: 3, md: 3, crit: 3, dodge: 2, speed: 2, hit: 2 },
  mythic: { hp: 58, mp: 42, atk: 5, mag: 5, def: 4, md: 4, crit: 4, dodge: 3, speed: 3, hit: 3 },
};

const ROLE_SUPER_NEED = {
  speedster: 2,
  trickster: 2,
  tank: 4,
  brawler: 3,
  mage: 3,
  balanced: 3,
  mythic: 3,
  tank_mage: 4,
};

function clampRange(min, max, floor = 1) {
  const lo = Math.max(floor, Math.min(min, max));
  const hi = Math.max(lo, Math.max(min, max));
  return { min: lo, max: hi };
}

/**
 * Stats bundle compatible with BattleScreen / battleLogic.
 * @param {string} templateId
 * @param {number} level
 */
export function computeBattleStats(templateId, level) {
  const t = getMonsterTemplate(templateId);
  if (!t) return null;

  const lv = Math.max(1, Math.floor(level || 1));
  const g = t.growthProfile;
  const roleGrowth = growthForRole(t.role);
  const b = { ...t.baseStats };
  const L = lv - 1;

  const hpGain = Math.round((roleGrowth.hp ?? g.hpPerLevel ?? 4) * L);
  const mpGain = Math.round((roleGrowth.mp ?? g.mpPerLevel ?? 1) * L);
  const atkSteps = offensiveStatSteps(roleGrowth.attack ?? 2, lv);
  const magSteps = offensiveStatSteps(roleGrowth.magic ?? 2, lv);
  const defSteps = Math.floor((roleGrowth.defense ?? 2) * L);
  const mdSteps = Math.floor((roleGrowth.defense ?? 2) * L);
  const speedSteps = Math.floor((roleGrowth.speed ?? 2) * L);
  const critSteps = Math.floor(L / Math.max(1, g.criticalEveryLevels ?? 6));
  const dodgeSteps = Math.floor(L / Math.max(1, g.dodgeEveryLevels ?? 7));
  const hitSteps = Math.floor(L / Math.max(1, g.hitEveryLevels ?? 8));

  let hp = b.hp + hpGain + highLevelHpBonus(lv);
  let mp = b.mp + mpGain;
  let atkMin = b.attackMin + atkSteps;
  let atkMax = b.attackMax + atkSteps;
  let magMin = b.magicMin + magSteps;
  let magMax = b.magicMax + magSteps;
  let defMin = b.defMin + defSteps;
  let defMax = b.defMax + defSteps;
  let mdMin = b.magicDefMin + mdSteps;
  let mdMax = b.magicDefMax + mdSteps;
  let crit = b.critical + critSteps;
  let dodge = b.dodge + dodgeSteps;
  let speed = (b.speed ?? baseSpeedForRole(t.role)) + speedSteps;
  let hitRate = (b.hit ?? 0) + hitSteps + Math.floor(speed * 0.1);

  const rf = RARITY_FLAT[t.rarity] ?? RARITY_FLAT.common;
  hp += rf.hp;
  mp += rf.mp;
  atkMin += rf.atk;
  atkMax += rf.atk;
  magMin += rf.mag;
  magMax += rf.mag;
  defMin += rf.def;
  defMax += rf.def;
  mdMin += rf.md;
  mdMax += rf.md;
  crit += rf.crit;
  dodge += rf.dodge;
  speed += rf.speed ?? 0;
  hitRate += rf.hit ?? 0;

  /** Tiny evolution scaling inside tier — rewards leveling without exploding numbers */
  const stage = evolutionStageFromLevel(lv);
  const tierBoost = Math.min(8, stage.tierIndex * 1.5);
  hp += Math.round(tierBoost * 3);
  mp += Math.round(tierBoost * 1);
  atkMin += Math.floor(tierBoost * 0.25);
  atkMax += Math.floor(tierBoost * 0.35);
  magMin += Math.floor(tierBoost * 0.25);
  magMax += Math.floor(tierBoost * 0.35);
  crit += Math.floor(stage.tierIndex * 0.35);
  dodge += Math.floor(stage.tierIndex * 0.25);
  speed += Math.floor(stage.tierIndex * 0.5);
  hitRate += Math.floor(stage.tierIndex * 0.3);

  const atk = clampRange(atkMin, atkMax);
  const mag = clampRange(magMin, magMax);
  const def = clampRange(defMin, defMax);
  const magicDef = clampRange(mdMin, mdMax);

  const agility = Math.max(1, Math.round(speed));
  mp = battleMpPool(lv, t.role, t.rarity);

  const dodgeVal = Math.max(0, Math.round(dodge));
  const hitVal = Math.max(0, Math.round(hitRate));

  const stats = {
    hp,
    mp,
    attack: atk,
    magic: mag,
    def,
    magicDef,
    hitRate: hitVal,
    agility,
    critPct: Math.min(55, Math.max(4, Math.round(crit))),
    dodge: dodgeVal,
    dodgePct: dodgeVal,
    speed: agility,
  };

  const superNeedThreshold = ROLE_SUPER_NEED[t.role] ?? 3;

  return {
    stats,
    meta: {
      templateId,
      level: lv,
      rarity: t.rarity,
      role: t.role,
      superNeedThreshold,
      evolutionStage: stage.key,
      evolutionTierIndex: stage.tierIndex,
      visualFlair: t.visualProfile.moveFlair ?? 'none',
    },
  };
}

/** Same formula shape used for AI scaling search */
export function powerScoreFromBundle(stats) {
  if (!stats) return 0;
  const atkAvg = (stats.attack.min + stats.attack.max) / 2;
  const magAvg = (stats.magic.min + stats.magic.max) / 2;
  const defAvg = (stats.def.min + stats.def.max) / 2;
  const mdAvg = (stats.magicDef.min + stats.magicDef.max) / 2;
  return (
    stats.hp * 1.15 +
    stats.mp * 0.85 +
    atkAvg * 14 +
    magAvg * 12 +
    defAvg * 10 +
    mdAvg * 9 +
    stats.critPct * 7 +
    stats.dodgePct * 6 +
    (stats.hitRate ?? 90) * 5 +
    (stats.agility ?? stats.speed ?? 10) * 8
  );
}

export function powerScoreForMonster(templateId, level) {
  const built = computeBattleStats(templateId, level);
  if (!built) return 0;
  return powerScoreFromBundle(built.stats);
}

/** Pick monster template id closest to target power by brute-search levels 1–cap */
export function pickAiMonsterApprox(targetPower, excludeTemplateId = null) {
  let best = { templateId: MONSTER_CATALOG[0].id, level: 5, score: Infinity };
  for (const m of MONSTER_CATALOG) {
    if (excludeTemplateId && m.id === excludeTemplateId) continue;
    for (let lv = 1; lv <= 85; lv++) {
      const sc = powerScoreForMonster(m.id, lv);
      const diff = Math.abs(sc - targetPower);
      if (diff < best.score) best = { templateId: m.id, level: lv, score: diff };
    }
  }
  return { templateId: best.templateId, level: Math.max(1, best.level) };
}
