import { evolutionStageFromLevel, visualFormTierFromLevel } from './evolution';
import { evolutionFormForMonster } from './monsterEvolutionForms';
import { MONSTER_LEVEL_MAX, expToAdvanceFrom } from './expLevel';
import { applyGearBonuses } from './gearStats';
import { compactGearIds, resolveFighterElement } from './cosmetics';
import { getTemplateElements } from './elements';
import { mergeMonsterParts } from './gameStorage';
import { getMonsterSkillSet } from './monsterSkills';
import { getMonsterTemplate, MONSTER_CATALOG, RARITY_ORDER } from './monsterTemplates';
import { computeBattleStats } from './statsCalc';
import { getLadderMonsterTemplate } from './monsterLadder/ladderMonsterCatalog';
import { getLadderMonsterSkillSet } from './monsterLadder/ladderMonsterSkills';
import { computeLadderBattleStats } from './monsterLadder/ladderStatsCalc';
import { mergeLadderMonsterParts } from './monsterLadder/ladderProfile';
import {
  canSpawnMainMiniBoss,
  MAIN_MINI_BOSS_CHANCE,
  MAIN_MINI_BOSS_STAT_MULT,
} from './mainBattleChest';
import { getPlayerProfile } from './gameStorage';
import { clampMergeTier, scaleStatsByMergeTier } from './mergeSystem';
import {
  BOSS_PASSIVE_BATTLE_STATE,
  buildBossEquippedPassives,
} from '../src/gameSystems/bossPassives';
import { applyPetStatBonuses, buildPetCombatModifiers } from '../src/gameSystems/petBonuses';
import { findOwnedPet, petBattleSnapshot, petEquippedToMonster } from '../src/gameSystems/petInventory';

function resolveEquippedPet(profile, owned) {
  if (!profile || !owned) return null;
  let row = owned.equippedPetInstanceId
    ? findOwnedPet(profile, owned.equippedPetInstanceId)
    : petEquippedToMonster(profile, owned.id);
  return petBattleSnapshot(row);
}

function attachPetToFighter(base, profile, owned) {
  const equippedPet = resolveEquippedPet(profile, owned);
  let stats = base.stats;
  let petBonuses = { hp: 0, atk: 0, def: 0, spd: 0 };
  if (equippedPet?.currentStats) {
    const applied = applyPetStatBonuses(stats, equippedPet.currentStats);
    stats = applied.stats;
    petBonuses = applied.petBonuses;
  }
  return {
    ...base,
    stats,
    petBonuses,
    baseStats: base.baseStats ?? base.stats,
    equippedPet,
    petCombatModifiers: buildPetCombatModifiers(equippedPet),
    petBattleState: { turnCounter: 0, shieldHp: 0, lastHealTurn: 0 },
  };
}

/**
 * Build runtime fighter object used by BattleScreen from persisted owned monster row.
 * @param {{ id: string, templateId: string, nickname?: string, level: number, exp?: number, monsterParts: object }} owned
 * @param {object|null} [profile] Player profile for equipped pet lookup
 */
export function fighterFromOwned(owned, profile = null) {
  const tpl = getMonsterTemplate(owned.templateId);
  const ladderTpl = tpl ? null : getLadderMonsterTemplate(owned.templateId);
  if (!tpl && ladderTpl) return fighterFromLadderOwnedInMainInventory(owned, ladderTpl, profile);
  const built = computeBattleStats(owned.templateId, owned.level);
  if (!built || !tpl) return null;
  const st = evolutionStageFromLevel(owned.level);
  const visualTier = visualFormTierFromLevel(owned.level);
  const form = evolutionFormForMonster(owned.templateId, visualTier);
  const gearIds = compactGearIds(owned.equippedGear);
  const mergeTier = clampMergeTier(owned.mergeTier);
  const mergedBase = scaleStatsByMergeTier(built.stats, mergeTier);
  const { stats: finalStats, bonuses: gearBonuses } = applyGearBonuses(mergedBase, gearIds);
  const mergedParts = mergeMonsterParts(owned.templateId, owned.monsterParts || {});
  const parts = {
    ...mergedParts,
    templateId: owned.templateId,
    evolutionTierIndex: st.tierIndex,
    evolutionStageKey: st.key,
    visualFormTier: visualTier,
    evolutionFormName: form.name,
    evolutionFormTagline: form.tagline,
    visualFlair: tpl.visualProfile.moveFlair ?? 'none',
    cosmetics: [...gearIds],
    equippedGearSlots: owned.equippedGear,
    gearSlotCount: owned.gearSlotCount,
  };
  const element = resolveFighterElement(owned.templateId, gearIds);
  const elements = getTemplateElements(owned.templateId);
  const skills = getMonsterSkillSet(owned.templateId);

  return attachPetToFighter(
    {
      monsterParts: parts,
      stats: finalStats,
      baseStats: mergedBase,
      gearBonuses,
      equippedGear: gearIds,
      monsterTemplateId: owned.templateId,
      ownedMonsterId: owned.id,
      mergeTier,
      superNeedThreshold: built.meta.superNeedThreshold,
      displayName: owned.nickname || tpl.name,
      rarity: tpl.rarity,
      role: tpl.role,
      level: owned.level ?? 1,
      battleExp: owned.exp ?? 0,
      battleExpToNext: expToAdvanceFrom(owned.level ?? 1),
      element,
      elements,
      skills,
      status: null,
      statuses: {},
      equippedPassives: Array.isArray(owned.equippedPassives) ? [...owned.equippedPassives] : [],
      passiveBattleState: { barrierConsumed: false, rageCoreShown: false },
    },
    profile,
    owned,
  );
}

function fighterFromLadderOwnedInMainInventory(owned, tpl, profile = null) {
  const built = computeLadderBattleStats(owned.templateId, owned.level);
  if (!built || !tpl) return null;
  const st = evolutionStageFromLevel(owned.level);
  const visualTier = visualFormTierFromLevel(owned.level);
  const form = evolutionFormForMonster(owned.templateId, visualTier);
  const gearIds = compactGearIds(owned.equippedGear);
  const mergeTier = clampMergeTier(owned.mergeTier);
  const mergedBase = scaleStatsByMergeTier(built.stats, mergeTier);
  const { stats: finalStats, bonuses: gearBonuses } = applyGearBonuses(mergedBase, gearIds);
  const parts = {
    ...mergeLadderMonsterParts(owned.templateId, owned.monsterParts || {}),
    templateId: owned.templateId,
    evolutionTierIndex: st.tierIndex,
    evolutionStageKey: st.key,
    visualFormTier: visualTier,
    evolutionFormName: form.name,
    evolutionFormTagline: form.tagline,
    visualFlair: tpl.visualProfile?.moveFlair ?? 'none',
    cosmetics: [...gearIds],
    equippedGearSlots: owned.equippedGear,
    gearSlotCount: owned.gearSlotCount,
    ladderPremium: true,
  };

  return attachPetToFighter(
    {
      monsterParts: parts,
      stats: finalStats,
      baseStats: mergedBase,
      gearBonuses,
      equippedGear: gearIds,
      monsterTemplateId: owned.templateId,
      ownedMonsterId: owned.id,
      mergeTier,
      superNeedThreshold: 3,
      displayName: owned.nickname || tpl.name,
      rarity: tpl.rarity,
      role: tpl.role,
      level: owned.level ?? 1,
      battleExp: owned.exp ?? 0,
      battleExpToNext: expToAdvanceFrom(owned.level ?? 1),
      element: tpl.element,
      elements: Array.isArray(tpl.elements) && tpl.elements.length ? [...tpl.elements] : [tpl.element],
      skills: getLadderMonsterSkillSet(owned.templateId),
      isLadderMonster: true,
      status: null,
      statuses: {},
      equippedPassives: Array.isArray(owned.equippedPassives) ? [...owned.equippedPassives] : [],
      passiveBattleState: { barrierConsumed: false, rageCoreShown: false },
    },
    profile,
    owned,
  );
}

function scaleStatRange(rng, ratio) {
  return {
    min: Math.max(1, Math.round(rng.min * ratio)),
    max: Math.max(1, Math.round(rng.max * ratio)),
  };
}

function scaleStatsBundle(stats, ratio) {
  return {
    hp: Math.max(1, Math.round(stats.hp * ratio)),
    mp: Math.max(1, Math.round(stats.mp * ratio)),
    attack: scaleStatRange(stats.attack, ratio),
    magic: scaleStatRange(stats.magic, ratio),
    def: scaleStatRange(stats.def, ratio),
    magicDef: scaleStatRange(stats.magicDef, ratio),
    critPct: stats.critPct,
    dodgePct: stats.dodgePct,
  };
}

/**
 * CPU rarity pool for 1v CPU by player monster level.
 * Lv 1–15: common · 16–25: common+rare · 26–35: +epic · 36+: all rarities
 */
export function getAllowedCpuRarities(playerLevel) {
  const lv = Math.max(1, Math.floor(playerLevel || 1));
  if (lv <= 15) return ['common'];
  if (lv <= 25) return ['common', 'rare'];
  if (lv <= 35) return ['common', 'rare', 'epic'];
  return [...RARITY_ORDER];
}

function pickRandomCpuTemplate(playerLevel, excludeTemplateId = null) {
  const allowed = new Set(getAllowedCpuRarities(playerLevel));
  let pool = MONSTER_CATALOG.filter(
    (m) => m?.id && allowed.has(m.rarity) && m.id !== excludeTemplateId,
  );
  if (pool.length === 0) {
    pool = MONSTER_CATALOG.filter((m) => m?.id && allowed.has(m.rarity));
  }
  if (pool.length === 0) {
    pool = MONSTER_CATALOG.filter((m) => m?.id && m.id !== excludeTemplateId);
  }
  const list = pool.length > 0 ? pool : MONSTER_CATALOG;
  return list[Math.floor(Math.random() * list.length)];
}

/**
 * CPU opponent — random monster from level-appropriate rarities, ~10% weaker (1v CPU).
 * @param {{ skipMiniBoss?: boolean }} [options]
 */
export function buildAiFighter(humanFighter, gameData = null, profileId = null, options = {}) {
  const excludeId = humanFighter?.monsterTemplateId || null;
  const playerLevel = humanFighter?.level ?? 1;
  const picked = pickRandomCpuTemplate(playerLevel, excludeId);
  const tplId = picked?.id || 'cockroachsaurus';
  const tpl = getMonsterTemplate(tplId);
  const levelJitter = Math.floor(Math.random() * 3) - 1;
  const level = Math.max(1, Math.min(MONSTER_LEVEL_MAX, playerLevel + levelJitter));
  const profile = profileId && gameData ? getPlayerProfile(gameData, profileId) : null;
  const allowMiniBoss =
    !options.skipMiniBoss && canSpawnMainMiniBoss(profile);
  const isMainMiniBoss = allowMiniBoss && Math.random() < MAIN_MINI_BOSS_CHANCE;

  const fakeOwned = {
    id: `ai_${Date.now().toString(36)}`,
    templateId: tplId,
    nickname: tpl?.name ?? 'CPU',
    level,
    exp: 0,
    monsterParts: mergeMonsterParts(tplId),
  };
  const f = fighterFromOwned(fakeOwned);
  if (!f) return null;

  const ratio = isMainMiniBoss ? MAIN_MINI_BOSS_STAT_MULT : 0.9;
  const scaled = scaleStatsBundle(f.stats, ratio);

  const equippedPassives = isMainMiniBoss
    ? buildBossEquippedPassives({
        stageKind: 'miniBoss',
        encounterRarity: 'epic',
        seedKey: `main_mini_${tplId}`,
      })
    : f.equippedPassives;

  return {
    ...f,
    stats: scaled,
    hp: scaled.hp,
    maxHp: scaled.hp,
    mp: scaled.mp,
    maxMp: scaled.mp,
    displayName: isMainMiniBoss ? `Mini Boss ${tpl?.name ?? 'CPU'}` : (tpl?.name ?? 'CPU'),
    ownedMonsterId: null,
    isAiOpponent: true,
    isMainMiniBoss,
    ladderStageKind: isMainMiniBoss ? 'miniBoss' : undefined,
    aiPowerRatio: ratio,
    humanPowerScoreSnapshot: null,
    equippedPassives,
    passiveBattleState: { ...BOSS_PASSIVE_BATTLE_STATE },
  };
}
