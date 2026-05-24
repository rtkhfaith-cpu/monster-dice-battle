import { canonicalMonsterKey } from './monsterLadder/ladderMonsterMigrate';
import { rarityRank } from './monsterTemplates';
import { getLadderMonsterTemplate } from './monsterLadder/ladderMonsterCatalog';
import { getMonsterTemplate } from './monsterTemplates';

/** Species key used for grouping, merge, and duplicate detection. */
export function rosterSpeciesKey(templateId) {
  return canonicalMonsterKey(templateId) ?? templateId;
}

function clampMergeTier(tier) {
  return Math.max(0, Math.min(9, Math.floor(tier || 0)));
}

/** Battle / UI representative — highest level, then merge tier, then EXP. */
export function pickBattleInstance(instances) {
  if (!instances?.length) return null;
  return [...instances].sort((a, b) => {
    const levelDiff = (b.level ?? 1) - (a.level ?? 1);
    if (levelDiff !== 0) return levelDiff;
    const tierDiff = clampMergeTier(b.mergeTier) - clampMergeTier(a.mergeTier);
    if (tierDiff !== 0) return tierDiff;
    return (b.exp ?? 0) - (a.exp ?? 0);
  })[0];
}

/** One row per species for battle pickers (strongest copy). */
export function getBattleRoster(holder) {
  const roster = getOwnedRoster(holder);
  const bySpecies = new Map();
  for (const om of roster) {
    const key = rosterSpeciesKey(om.templateId);
    if (!key) continue;
    if (!bySpecies.has(key)) bySpecies.set(key, []);
    bySpecies.get(key).push(om);
  }
  const out = [];
  for (const instances of bySpecies.values()) {
    const pick = pickBattleInstance(instances);
    if (pick) out.push(pick);
  }
  return out.sort((a, b) => {
    const ra = rarityRank(
      (getMonsterTemplate(a.templateId) ?? getLadderMonsterTemplate(a.templateId))?.rarity ?? 'common',
    );
    const rb = rarityRank(
      (getMonsterTemplate(b.templateId) ?? getLadderMonsterTemplate(b.templateId))?.rarity ?? 'common',
    );
    if (rb !== ra) return rb - ra;
    const na = getMonsterTemplate(a.templateId)?.name ?? a.templateId;
    const nb = getMonsterTemplate(b.templateId)?.name ?? b.templateId;
    return na.localeCompare(nb);
  });
}

/**
 * Map any owned row id to the battle copy for that species (handles duplicate purchases).
 * @param {object[]} roster
 * @param {string|null|undefined} ownedId
 */
export function resolveBattleMonsterId(roster, ownedId) {
  if (!ownedId) return null;
  const row = roster.find((m) => m.id === ownedId);
  if (!row) return null;
  return pickBattleInstance(rosterInstancesForTemplate(roster, row.templateId))?.id ?? ownedId;
}

/** @param {{ ownedMonsters?: object[], selectedMonsterId?: string|null }|null|undefined} holder */
export function defaultBattleMonsterId(holder) {
  const roster = getOwnedRoster(holder);
  const battle = getBattleRoster(holder);
  if (!battle.length) return null;
  if (holder?.selectedMonsterId) {
    return resolveBattleMonsterId(roster, holder.selectedMonsterId) ?? battle[0].id;
  }
  return battle[0].id;
}

/** @param {{ ownedMonsters?: object[] }|null|undefined} holder Profile or guest wallet. */
export function getOwnedRoster(holder) {
  return Array.isArray(holder?.ownedMonsters) ? holder.ownedMonsters : [];
}

/** All owned rows for one species (main + ladder template aliases). */
export function rosterInstancesForTemplate(roster, templateId) {
  const key = rosterSpeciesKey(templateId);
  return roster.filter((m) => rosterSpeciesKey(m.templateId) === key);
}

/** @param {{ ownedMonsters?: object[] }|null|undefined} holder */
export function countOwnedSpecies(holder, templateId) {
  return rosterInstancesForTemplate(getOwnedRoster(holder), templateId).length;
}

/** Build { [speciesKey]: count } for shop / UI tallies. */
export function ownedSpeciesCounts(holder) {
  const counts = {};
  for (const om of getOwnedRoster(holder)) {
    const key = rosterSpeciesKey(om.templateId);
    if (!key) continue;
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}
