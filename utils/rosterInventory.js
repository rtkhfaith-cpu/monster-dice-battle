import { canonicalMonsterKey } from './monsterLadder/ladderMonsterMigrate';

/** Species key used for grouping, merge, and duplicate detection. */
export function rosterSpeciesKey(templateId) {
  return canonicalMonsterKey(templateId) ?? templateId;
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
