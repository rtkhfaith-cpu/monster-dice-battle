import { evolutionStageFromLevel } from './evolution';
import { expToAdvanceFrom } from './expLevel';
import { applyGearBonuses } from './gearStats';
import { difficultyPowerMultiplier, mergeMonsterParts, metaForProfile } from './gameStorage';
import { getMonsterTemplate } from './monsterTemplates';
import {
  computeBattleStats,
  pickAiMonsterApprox,
  powerScoreFromBundle,
} from './statsCalc';

/**
 * Build runtime fighter object used by BattleScreen from persisted owned monster row.
 * @param {{ id: string, templateId: string, nickname?: string, level: number, exp?: number, monsterParts: object }} owned
 */
export function fighterFromOwned(owned) {
  const tpl = getMonsterTemplate(owned.templateId);
  const built = computeBattleStats(owned.templateId, owned.level);
  if (!built || !tpl) return null;
  const st = evolutionStageFromLevel(owned.level);
  const gearIds = Array.isArray(owned.equippedGear) ? owned.equippedGear : [];
  const { stats: finalStats, bonuses: gearBonuses } = applyGearBonuses(built.stats, gearIds);
  const mergedParts = mergeMonsterParts(owned.templateId, owned.monsterParts || {});
  const parts = {
    ...mergedParts,
    evolutionTierIndex: st.tierIndex,
    evolutionStageKey: st.key,
    visualFlair: tpl.visualProfile.moveFlair ?? 'none',
    cosmetics: [...gearIds],
  };
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
  };
}

/** CPU roster opponent scaled vs human fighter power + difficulty bias */
export function buildAiFighter(humanFighter, gameData, profileId = null) {
  const meta = metaForProfile(gameData, profileId ?? gameData.session?.activeProfileId ?? null);
  const mult = difficultyPowerMultiplier(meta.difficultyMode) + (meta.aiBias || 0);
  const humanPower = powerScoreFromBundle(humanFighter.stats);
  const target = humanPower * mult;
  const pick = pickAiMonsterApprox(target, humanFighter.monsterTemplateId || undefined);
  const fakeOwned = {
    id: `ai_${Date.now().toString(36)}`,
    templateId: pick.templateId,
    nickname: getMonsterTemplate(pick.templateId)?.name ?? 'CPU',
    level: pick.level,
    exp: 0,
    monsterParts: mergeMonsterParts(pick.templateId),
  };
  const f = fighterFromOwned(fakeOwned);
  if (!f) return null;
  const aiPow = powerScoreFromBundle(f.stats);
  return {
    ...f,
    ownedMonsterId: null,
    isAiOpponent: true,
    aiPowerScore: aiPow,
    humanPowerScoreSnapshot: humanPower,
    aiPowerRatio: humanPower > 0 ? aiPow / humanPower : 1,
  };
}