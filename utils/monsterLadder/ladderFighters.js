import { evolutionStageFromLevel, visualFormTierFromLevel } from '../evolution';
import { evolutionFormForMonster } from '../monsterEvolutionForms';
import { expToAdvanceFrom } from '../expLevel';
import { getLadderMonsterSkillSet } from './ladderMonsterSkills';
import { getLadderMonsterTemplate } from './ladderMonsterCatalog';
import { getLadderTheme } from './ladderLevelThemes';
import { computeLadderBattleStats } from './ladderStatsCalc';
import { mergeLadderMonsterParts } from './ladderProfile';
import { getStageKind, cpuPowerForStage, decodeStage } from './stages';
import { getLadderGear } from './ladderGearCatalog';

function sumLadderGearBonuses(gearIds) {
  const b = {
    hp: 0, mp: 0, attackMin: 0, attackMax: 0, magicMin: 0, magicMax: 0,
    defMin: 0, defMax: 0, magicDefMin: 0, magicDefMax: 0, critPct: 0, dodgePct: 0, speed: 0,
  };
  for (const id of gearIds || []) {
    const g = getLadderGear(id);
    if (!g?.bonuses) continue;
    const x = g.bonuses;
    b.hp += x.hp ?? 0;
    b.mp += x.mp ?? 0;
    b.attackMin += x.attackMin ?? 0;
    b.attackMax += x.attackMax ?? 0;
    b.magicMin += x.magicMin ?? 0;
    b.magicMax += x.magicMax ?? 0;
    b.defMin += x.defMin ?? 0;
    b.defMax += x.defMax ?? 0;
    b.magicDefMin += x.magicDefMin ?? 0;
    b.magicDefMax += x.magicDefMax ?? 0;
    b.critPct += x.critPct ?? 0;
    b.dodgePct += x.dodgePct ?? 0;
    b.speed += x.speed ?? 0;
  }
  return b;
}

function applyBonuses(stats, b) {
  return {
    hp: stats.hp + b.hp,
    mp: stats.mp + b.mp,
    attack: { min: stats.attack.min + b.attackMin, max: stats.attack.max + b.attackMax },
    magic: { min: stats.magic.min + b.magicMin, max: stats.magic.max + b.magicMax },
    def: { min: stats.def.min + b.defMin, max: stats.def.max + b.defMax },
    magicDef: { min: stats.magicDef.min + b.magicDefMin, max: stats.magicDef.max + b.magicDefMax },
    critPct: Math.min(55, stats.critPct + b.critPct),
    dodgePct: Math.min(25, stats.dodgePct + b.dodgePct),
    speed: Math.max(1, (stats.speed ?? 10) + b.speed + (b.dodgePct * 2 || 0)),
  };
}

function scaleStatsBundle(stats, ratio) {
  return {
    hp: Math.max(1, Math.round(stats.hp * ratio)),
    mp: Math.max(1, Math.round(stats.mp * ratio)),
    attack: {
      min: Math.max(1, Math.round(stats.attack.min * ratio)),
      max: Math.max(1, Math.round(stats.attack.max * ratio)),
    },
    magic: {
      min: Math.max(1, Math.round(stats.magic.min * ratio)),
      max: Math.max(1, Math.round(stats.magic.max * ratio)),
    },
    def: {
      min: Math.max(1, Math.round(stats.def.min * ratio)),
      max: Math.max(1, Math.round(stats.def.max * ratio)),
    },
    magicDef: {
      min: Math.max(1, Math.round(stats.magicDef.min * ratio)),
      max: Math.max(1, Math.round(stats.magicDef.max * ratio)),
    },
    critPct: stats.critPct,
    dodgePct: stats.dodgePct,
    speed: Math.max(1, Math.round((stats.speed ?? 10) * ratio)),
  };
}

/**
 * @param {object} owned — ladder owned monster row
 */
export function fighterFromLadderOwned(owned) {
  const tpl = getLadderMonsterTemplate(owned.templateId);
  const built = computeLadderBattleStats(owned.templateId, owned.level);
  if (!built || !tpl) return null;

  const gearIds = Array.isArray(owned.equippedLadderGear) ? owned.equippedLadderGear : [];
  const gb = sumLadderGearBonuses(gearIds);
  const stats = applyBonuses(built.stats, gb);

  const st = evolutionStageFromLevel(owned.level);
  const visualTier = visualFormTierFromLevel(owned.level);
  const form = evolutionFormForMonster(owned.templateId, visualTier);

  return {
    monsterParts: {
      ...mergeLadderMonsterParts(owned.templateId, owned.monsterParts),
      evolutionTierIndex: st.tierIndex,
      evolutionStageKey: st.key,
      visualFormTier: visualTier,
      evolutionFormName: form.name,
      ladderPremium: true,
      cosmetics: [...gearIds],
    },
    stats,
    baseStats: built.stats,
    gearBonuses: gb,
    equippedGear: gearIds,
    monsterTemplateId: owned.templateId,
    ownedMonsterId: owned.id,
    isLadderMonster: true,
    displayName: owned.nickname || tpl.name,
    rarity: tpl.rarity,
    role: tpl.role,
    level: owned.level ?? 1,
    battleExp: owned.exp ?? 0,
    battleExpToNext: expToAdvanceFrom(owned.level ?? 1),
    element: tpl.element,
    skills: getLadderMonsterSkillSet(owned.templateId),
    status: null,
  };
}

/**
 * @param {number} stageIndex
 * @param {object} [playerRef] — for level scaling reference
 */
export function buildLadderEnemyFighter(stageIndex, playerRef) {
  const { mainLevel, subLevel } = decodeStage(stageIndex);
  const theme = getLadderTheme(mainLevel);
  const kind = getStageKind(subLevel);
  const ratio = cpuPowerForStage(stageIndex);

  let templateId = theme.gruntPool[0];
  let displayName = 'Noise Grunt';
  let bossLevel = Math.max(1, (playerRef?.level ?? 1) + Math.floor(mainLevel / 2));

  if (kind === 'miniBoss') {
    displayName = theme.miniBoss;
    templateId = theme.featuredMonsterId;
    bossLevel += 2;
  } else if (kind === 'bigBoss') {
    displayName = theme.bigBoss;
    templateId = theme.featuredMonsterId;
    bossLevel += 4;
  } else {
    const pool = theme.gruntPool.length > 0 ? theme.gruntPool : [theme.featuredMonsterId];
    templateId = pool[Math.floor(Math.random() * pool.length)];
    displayName = getLadderMonsterTemplate(templateId)?.name ?? displayName;
    if (kind === 'hard') bossLevel += 1;
  }

  const built = computeLadderBattleStats(templateId, bossLevel);
  if (!built) return null;
  const tpl = getLadderMonsterTemplate(templateId);

  return {
    monsterParts: mergeLadderMonsterParts(templateId),
    stats: scaleStatsBundle(built.stats, ratio),
    baseStats: built.stats,
    monsterTemplateId: templateId,
    ownedMonsterId: null,
    isAiOpponent: true,
    isLadderEnemy: true,
    aiPowerRatio: ratio,
    displayName,
    rarity: tpl?.rarity ?? 'rare',
    role: tpl?.role ?? 'balanced',
    level: bossLevel,
    element: tpl?.element ?? 'earth',
    skills: getLadderMonsterSkillSet(templateId),
    status: null,
    ladderStageIndex: stageIndex,
    ladderMainLevel: mainLevel,
    ladderSubLevel: subLevel,
    ladderStageKind: kind,
    ladderThemeName: theme.name,
    ladderBossName: displayName,
  };
}
