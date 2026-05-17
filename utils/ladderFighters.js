import { buildAiFighter, getAllowedCpuRarities } from './fighterFromOwned';
import { getMonsterTemplate, MONSTER_CATALOG } from './monsterTemplates';
import { mergeMonsterParts } from './gameStorage';
import { fighterFromOwned } from './fighterFromOwned';
import { computeBattleStats } from './statsCalc';
import { getLadderRegion } from './ladderRegions';

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

function pickBossTemplate(floor) {
  const lv = Math.max(1, Math.min(99, 8 + floor * 2));
  const allowed = new Set(getAllowedCpuRarities(lv));
  if (floor >= 20) allowed.add('mythic');
  if (floor >= 12) allowed.add('legendary');
  const pool = MONSTER_CATALOG.filter((m) => m?.id && allowed.has(m.rarity));
  const list = pool.length > 0 ? pool : MONSTER_CATALOG;
  return list[Math.floor(Math.random() * list.length)];
}

/**
 * Ladder floor boss — scaled CPU named after region boss.
 * @param {number} floor
 * @param {object} humanFighter
 */
export function buildLadderBossFighter(floor, humanFighter) {
  const region = getLadderRegion(floor);
  const base = buildAiFighter(humanFighter);
  if (!base) return null;

  const picked = pickBossTemplate(floor);
  const tplId = picked?.id || base.monsterTemplateId;
  const tpl = getMonsterTemplate(tplId);
  const bossLevel = Math.max(1, Math.min(99, (humanFighter?.level ?? 1) + Math.floor(floor / 3)));

  const built = computeBattleStats(tplId, bossLevel);
  if (!built) {
    const ratio = region.cpuPower ?? 0.9;
    return {
      ...base,
      stats: scaleStatsBundle(base.stats, ratio),
      displayName: region.boss,
      isAiOpponent: true,
      aiPowerRatio: ratio,
      ladderFloor: floor,
      ladderBossName: region.boss,
      ladderRegionName: region.name,
    };
  }

  const ratio = region.cpuPower ?? 0.9;
  const scaled = scaleStatsBundle(built.stats, ratio);
  const fakeOwned = {
    id: `ladder_${floor}_${Date.now().toString(36)}`,
    templateId: tplId,
    nickname: region.boss,
    level: bossLevel,
    exp: 0,
    monsterParts: mergeMonsterParts(tplId),
  };
  const f = fighterFromOwned(fakeOwned);
  if (!f) return null;

  return {
    ...f,
    stats: scaled,
    displayName: region.boss,
    ownedMonsterId: null,
    isAiOpponent: true,
    aiPowerRatio: ratio,
    ladderFloor: floor,
    ladderBossName: region.boss,
    ladderRegionName: region.name,
    ladderExclusive: region.exclusive,
  };
}
