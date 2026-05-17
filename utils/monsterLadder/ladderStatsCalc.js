import { evolutionStageFromLevel, visualFormTierFromLevel } from '../evolution';
import { evolutionFormForMonster } from '../monsterEvolutionForms';
import { RARITY_FLAT } from '../statsCalc';
import { getLadderMonsterTemplate } from './ladderMonsterCatalog';

export function computeLadderBattleStats(templateId, level) {
  const t = getLadderMonsterTemplate(templateId);
  if (!t) return null;

  const lv = Math.max(1, Math.floor(level || 1));
  const g = t.growthProfile;
  const b = { ...t.baseStats };
  const L = lv - 1;

  const hpGain = Math.round((g.hpPerLevel ?? 4) * L);
  const mpGain = Math.round((g.mpPerLevel ?? 1) * L);
  const atkSteps = Math.floor(L / Math.max(1, g.attackEveryLevels ?? 4));
  const magSteps = Math.floor(L / Math.max(1, g.magicEveryLevels ?? 4));
  const defSteps = Math.floor(L / Math.max(1, g.defEveryLevels ?? 5));
  const mdSteps = Math.floor(L / Math.max(1, g.magicDefEveryLevels ?? 5));
  const critSteps = Math.floor(L / Math.max(1, g.criticalEveryLevels ?? 6));
  const dodgeSteps = Math.floor(L / Math.max(1, g.dodgeEveryLevels ?? 7));

  let hp = b.hp + hpGain;
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

  const st = evolutionStageFromLevel(lv);
  const visualTier = visualFormTierFromLevel(lv);
  const form = evolutionFormForMonster(templateId, visualTier);

  return {
    stats: {
      hp,
      mp,
      attack: { min: atkMin, max: atkMax },
      magic: { min: magMin, max: magMax },
      def: { min: defMin, max: defMax },
      magicDef: { min: mdMin, max: mdMax },
      critPct: crit,
      dodgePct: dodge,
    },
    meta: {
      superNeedThreshold: 3,
      evolutionStageKey: st.key,
      evolutionFormName: form.name,
    },
  };
}
