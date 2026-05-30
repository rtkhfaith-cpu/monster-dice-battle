import { evolutionStageFromLevel, visualFormTierFromLevel } from '../evolution';
import { evolutionFormForMonster } from '../monsterEvolutionForms';
import { RARITY_FLAT } from '../statsCalc';
import { battleMpPool, highLevelHpBonus, offensiveStatSteps } from '../../src/gameBalance/combat';
import { getLadderMonsterTemplate } from './ladderMonsterCatalog';
import { baseSpeedForRole, growthForRole } from '../../src/gameBalance/monsters';

export function computeLadderBattleStats(templateId, level) {
  const t = getLadderMonsterTemplate(templateId);
  if (!t) return null;

  const lv = Math.max(1, Math.floor(level || 1));
  const g = t.growthProfile;
  const baseRoleGrowth = growthForRole(t.role);
  const roleGrowth = {
    ...baseRoleGrowth,
    hp: typeof g.hp === 'number' ? g.hp : baseRoleGrowth.hp,
    mp: typeof g.mp === 'number' ? g.mp : baseRoleGrowth.mp,
    attack: typeof g.attack === 'number' ? g.attack : baseRoleGrowth.attack,
    magic: typeof g.magic === 'number' ? g.magic : baseRoleGrowth.magic,
    defense: typeof g.defense === 'number' ? g.defense : baseRoleGrowth.defense,
    speed: typeof g.speed === 'number' ? g.speed : baseRoleGrowth.speed,
  };
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

  const st = evolutionStageFromLevel(lv);
  /** Keep ladder monsters on the same high-level tier bump as shop monsters. */
  const tierBoost = Math.min(8, st.tierIndex * 1.5);
  hp += Math.round(tierBoost * 3);
  mp += Math.round(tierBoost * 1);
  atkMin += Math.floor(tierBoost * 0.25);
  atkMax += Math.floor(tierBoost * 0.35);
  magMin += Math.floor(tierBoost * 0.25);
  magMax += Math.floor(tierBoost * 0.35);
  crit += Math.floor(st.tierIndex * 0.35);
  dodge += Math.floor(st.tierIndex * 0.25);
  speed += Math.floor(st.tierIndex * 0.5);
  hitRate += Math.floor(st.tierIndex * 0.3);

  const visualTier = visualFormTierFromLevel(lv);
  const form = evolutionFormForMonster(templateId, visualTier);

  const agility = Math.max(1, Math.round(speed));
  mp = battleMpPool(lv, t.role, t.rarity);

  const dodgeVal = Math.max(0, Math.round(dodge));
  const hitVal = Math.max(0, Math.round(hitRate));

  return {
    stats: {
      hp,
      mp,
      attack: { min: atkMin, max: atkMax },
      magic: { min: magMin, max: magMax },
      def: { min: defMin, max: defMax },
      magicDef: { min: mdMin, max: mdMax },
      hitRate: hitVal,
      agility,
      critPct: Math.min(55, Math.max(4, Math.round(crit))),
      dodge: dodgeVal,
      dodgePct: dodgeVal,
      speed: agility,
    },
    meta: {
      superNeedThreshold: 3,
      evolutionStageKey: st.key,
      evolutionFormName: form.name,
    },
  };
}
