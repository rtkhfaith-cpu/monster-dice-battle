import { evolutionStageFromLevel } from './evolution';
import { expToAdvanceFrom } from './expLevel';
import { applyGearBonuses } from './gearStats';
import { compactGearIds, resolveFighterElement } from './cosmetics';
import { mergeMonsterParts } from './gameStorage';
import { getMonsterSkillSet } from './monsterSkills';
import { getMonsterTemplate } from './monsterTemplates';
import { computeBattleStats } from './statsCalc';

/**
 * Build runtime fighter object used by BattleScreen from persisted owned monster row.
 * @param {{ id: string, templateId: string, nickname?: string, level: number, exp?: number, monsterParts: object }} owned
 */
export function fighterFromOwned(owned) {
  const tpl = getMonsterTemplate(owned.templateId);
  const built = computeBattleStats(owned.templateId, owned.level);
  if (!built || !tpl) return null;
  const st = evolutionStageFromLevel(owned.level);
  const gearIds = compactGearIds(owned.equippedGear);
  const { stats: finalStats, bonuses: gearBonuses } = applyGearBonuses(built.stats, gearIds);
  const mergedParts = mergeMonsterParts(owned.templateId, owned.monsterParts || {});
  const parts = {
    ...mergedParts,
    evolutionTierIndex: st.tierIndex,
    evolutionStageKey: st.key,
    visualFlair: tpl.visualProfile.moveFlair ?? 'none',
    cosmetics: [...gearIds],
    equippedGearSlots: owned.equippedGear,
    gearSlotCount: owned.gearSlotCount,
  };
  const element = resolveFighterElement(owned.templateId, gearIds);
  const skills = getMonsterSkillSet(owned.templateId);

  return {
    monsterParts: parts,
    stats: finalStats,
    baseStats: built.stats,
    gearBonuses,
    equippedGear: gearIds,
    monsterTemplateId: owned.templateId,
    ownedMonsterId: owned.id,
    superNeedThreshold: built.meta.superNeedThreshold,
    displayName: owned.nickname || tpl.name,
    rarity: tpl.rarity,
    role: tpl.role,
    level: owned.level ?? 1,
    battleExp: owned.exp ?? 0,
    battleExpToNext: expToAdvanceFrom(owned.level ?? 1),
    element,
    skills,
    status: null,
  };
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

/** CPU opponent ~10% weaker than the human fighter (for 1P leveling). */
export function buildAiFighter(humanFighter, _gameData = null, _profileId = null) {
  const tplId = humanFighter.monsterTemplateId;
  const tpl = tplId ? getMonsterTemplate(tplId) : null;
  const playerLevel = humanFighter.level ?? 1;
  const level = playerLevel > 1 ? Math.max(1, playerLevel - 1) : playerLevel;

  const fakeOwned = {
    id: `ai_${Date.now().toString(36)}`,
    templateId: tplId || 'cockroachsaurus',
    nickname: tpl?.name ?? 'CPU',
    level,
    exp: 0,
    monsterParts: mergeMonsterParts(tplId || 'cockroachsaurus'),
  };
  const f = fighterFromOwned(fakeOwned);
  if (!f) return null;

  const ratio = 0.9;
  const scaled = scaleStatsBundle(f.stats, ratio);

  return {
    ...f,
    stats: scaled,
    displayName: tpl?.name ?? 'CPU',
    ownedMonsterId: null,
    isAiOpponent: true,
    aiPowerRatio: ratio,
    humanPowerScoreSnapshot: null,
  };
}
