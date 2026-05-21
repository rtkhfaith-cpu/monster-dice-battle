import { rosterSpeciesKey } from './rosterInventory';
import { getLadderMonsterTemplate } from './monsterLadder/ladderMonsterCatalog';
import { getMonsterTemplate } from './monsterTemplates';

export const MAX_MERGE_TIER = 9;

/** Extra copies required to advance: +1←1, +2←2, +3←5, +4←10, +5←20, then steeper to +9 */
export const MERGE_COST_TO_NEXT = [1, 2, 5, 10, 20, 35, 55, 85, 130];

export function clampMergeTier(tier) {
  return Math.max(0, Math.min(MAX_MERGE_TIER, Math.floor(tier || 0)));
}

export function mergeStatMultiplier(tier) {
  return 1.1 ** clampMergeTier(tier);
}

export function mergeCostForNextTier(currentTier) {
  const t = clampMergeTier(currentTier);
  if (t >= MAX_MERGE_TIER) return null;
  return MERGE_COST_TO_NEXT[t] ?? null;
}

export function getMonsterDisplayName(templateId, fallbackNickname) {
  const t = getMonsterTemplate(templateId) ?? getLadderMonsterTemplate(templateId);
  return fallbackNickname || t?.name || templateId;
}

/** Pick the instance to represent a stack (highest merge tier, then level). */
export function pickPrimaryInstance(instances) {
  if (!instances?.length) return null;
  return [...instances].sort((a, b) => {
    const tierDiff = clampMergeTier(b.mergeTier) - clampMergeTier(a.mergeTier);
    if (tierDiff !== 0) return tierDiff;
    return (b.level ?? 1) - (a.level ?? 1);
  })[0];
}

/**
 * @param {object[]} mainMonsters
 * @param {object[]} ladderMonsters
 */
export function groupOwnedMonsters(mainMonsters = [], ladderMonsters = []) {
  const groups = new Map();

  function add(monster, source) {
    if (!monster?.templateId) return;
    const key = rosterSpeciesKey(monster.templateId);
    if (!groups.has(key)) {
      groups.set(key, { templateId: key, instances: [] });
    }
    const list = groups.get(key).instances;
    const existing = list.find((row) => row.id === monster.id);
    if (existing) {
      if (source === 'main') existing._inMain = true;
      if (source === 'ladder') existing._inLadder = true;
      return;
    }
    list.push({
      ...monster,
      _source: source,
      _inMain: source === 'main',
      _inLadder: source === 'ladder',
    });
  }

  for (const m of mainMonsters) add(m, 'main');
  for (const m of ladderMonsters) add(m, 'ladder');

  return [...groups.values()]
    .map((g) => {
      const primary = pickPrimaryInstance(g.instances);
      const mergeTier = clampMergeTier(primary?.mergeTier);
      const nextCost = mergeCostForNextTier(mergeTier);
      const extras = Math.max(0, g.instances.length - 1);
      return {
        templateId: g.templateId,
        instances: g.instances,
        count: g.instances.length,
        primary,
        primaryId: primary?.id ?? null,
        displayName: getMonsterDisplayName(g.templateId, primary?.nickname),
        mergeTier,
        nextCost,
        canMerge: nextCost != null && extras >= nextCost,
      };
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

function scaleStatRange(rng, ratio) {
  return {
    min: Math.max(1, Math.round(rng.min * ratio)),
    max: Math.max(1, Math.round(rng.max * ratio)),
  };
}

export function scaleStatsByMergeTier(stats, tier) {
  if (!stats) return stats;
  const ratio = mergeStatMultiplier(tier);
  if (ratio === 1) return stats;
  return {
    ...stats,
    hp: Math.max(1, Math.round(stats.hp * ratio)),
    mp: Math.max(1, Math.round(stats.mp * ratio)),
    attack: scaleStatRange(stats.attack, ratio),
    magic: scaleStatRange(stats.magic, ratio),
    def: scaleStatRange(stats.def, ratio),
    magicDef: scaleStatRange(stats.magicDef, ratio),
    critPct: stats.critPct,
    dodgePct: stats.dodgePct,
    hitRate: stats.hitRate,
    agility: stats.agility,
  };
}
