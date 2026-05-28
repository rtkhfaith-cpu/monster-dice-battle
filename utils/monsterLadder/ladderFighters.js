import { evolutionStageFromLevel, visualFormTierFromLevel } from '../evolution';
import { evolutionFormForMonster } from '../monsterEvolutionForms';
import { expToAdvanceFrom } from '../expLevel';
import { getLadderMonsterSkillSet } from './ladderMonsterSkills';
import { getLadderMonsterTemplate, getLadderMonstersByRarity } from './ladderMonsterCatalog';
import { getLadderTheme } from './ladderLevelThemes';
import { computeLadderBattleStats } from './ladderStatsCalc';
import { getActiveLadderBattler, mergeLadderMonsterParts } from './ladderProfile';
import { fighterFromOwned } from '../fighterFromOwned';
import { getStageKind, cpuPowerForStage, decodeStage } from './stages';
import { getLadderGear } from './ladderGearCatalog';
import {
  BOSS_PASSIVE_BATTLE_STATE,
  buildBossEquippedPassives,
} from '../../src/gameSystems/bossPassives';

function rarityForStage(mainLevel, subLevel, kind) {
  if (kind === 'miniBoss') return 'epic';
  if (kind === 'bigBoss') return mainLevel % 5 === 0 ? 'mythic' : 'legendary';
  if (subLevel >= 6) return subLevel >= 8 ? 'epic' : 'rare';
  return subLevel >= 3 ? 'rare' : 'common';
}

function uniqueIds(ids) {
  return [...new Set((ids || []).filter((id) => typeof id === 'string' && getLadderMonsterTemplate(id)))];
}

function pickRandom(ids, avoidId = null) {
  const pool = uniqueIds(ids);
  if (pool.length === 0) return null;
  const filtered = avoidId && pool.length > 1 ? pool.filter((id) => id !== avoidId) : pool;
  return filtered[Math.floor(Math.random() * filtered.length)] ?? pool[0];
}

function rarityPool(rarity) {
  return getLadderMonstersByRarity(rarity).map((m) => m.id);
}

function encounterPoolForStage(theme, kind, encounterRarity) {
  if (kind === 'miniBoss' || kind === 'bigBoss') {
    // Boss titles stay themed, but the monster body can vary so repeated attempts feel fresh.
    return uniqueIds([theme.featuredMonsterId, ...rarityPool(encounterRarity), ...(theme.gruntPool || [])]);
  }

  const easyPool = ['common', 'rare'].flatMap(rarityPool);
  const hardPool = ['rare', 'epic'].flatMap(rarityPool);
  return uniqueIds([
    ...(theme.gruntPool || []),
    theme.featuredMonsterId,
    ...(kind === 'hard' ? hardPool : easyPool),
  ]);
}

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
  const dodgeVal = (stats.dodge ?? stats.dodgePct ?? 0) + b.dodgePct;
  return {
    hp: stats.hp + b.hp,
    mp: stats.mp + b.mp,
    attack: { min: stats.attack.min + b.attackMin, max: stats.attack.max + b.attackMax },
    magic: { min: stats.magic.min + b.magicMin, max: stats.magic.max + b.magicMax },
    def: { min: stats.def.min + b.defMin, max: stats.def.max + b.defMax },
    magicDef: { min: stats.magicDef.min + b.magicDefMin, max: stats.magicDef.max + b.magicDefMax },
    hitRate: stats.hitRate ?? 0,
    critPct: Math.min(55, stats.critPct + b.critPct),
    dodge: dodgeVal,
    dodgePct: dodgeVal,
    speed: Math.max(1, (stats.speed ?? 10) + b.speed),
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
    hitRate: stats.hitRate ?? 0,
    critPct: stats.critPct,
    dodge: stats.dodge ?? stats.dodgePct ?? 0,
    dodgePct: stats.dodge ?? stats.dodgePct ?? 0,
    speed: Math.max(1, Math.round((stats.speed ?? 10) * ratio)),
  };
}

/** Build battle fighter from a main-roster owned row. */
export function fighterForLadderBattle(owned, profile = null) {
  if (!owned) return null;
  return fighterFromOwned(owned, profile);
}

/** @param {object} profile @param {string|null} [setupP1Id] */
export function fighterFromActiveLadder(profile, setupP1Id = null) {
  const owned = getActiveLadderBattler(profile, setupP1Id);
  return owned ? fighterForLadderBattle(owned, profile) : null;
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
  const encounterRarity = rarityForStage(mainLevel, subLevel, kind);

  let templateId = pickRandom(
    encounterPoolForStage(theme, kind, encounterRarity),
    playerRef?.monsterTemplateId,
  ) || theme.featuredMonsterId || theme.gruntPool[0];
  let displayName = 'Noise Grunt';
  let bossLevel = Math.max(1, (playerRef?.level ?? 1) + Math.floor(mainLevel / 2));

  if (kind === 'miniBoss') {
    displayName = theme.miniBoss;
    bossLevel += 2;
  } else if (kind === 'bigBoss') {
    displayName = theme.bigBoss;
    bossLevel += 4;
  } else {
    displayName = getLadderMonsterTemplate(templateId)?.name ?? displayName;
    if (kind === 'hard') bossLevel += 1;
  }

  const built = computeLadderBattleStats(templateId, bossLevel);
  if (!built) return null;
  const tpl = getLadderMonsterTemplate(templateId);

  const isBossStage = kind === 'miniBoss' || kind === 'bigBoss';
  const equippedPassives = isBossStage
    ? buildBossEquippedPassives({
        stageKind: kind,
        encounterRarity,
        seedKey: `ladder_${stageIndex}_${templateId}`,
      })
    : [];

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
    rarity: encounterRarity,
    baseRarity: tpl?.rarity ?? 'rare',
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
    equippedPassives,
    passiveBattleState: { ...BOSS_PASSIVE_BATTLE_STATE },
  };
}
