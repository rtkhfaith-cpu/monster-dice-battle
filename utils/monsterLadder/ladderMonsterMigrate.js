import { getLadderMonsterTemplate } from './ladderMonsterCatalog';

/** Legacy save IDs → current ladder template IDs. */
export const LADDER_MONSTER_TEMPLATE_ALIASES = {
  toiletron: 'toiletron_titan',
};

/**
 * @param {string|undefined|null} templateId
 * @returns {string|null}
 */
export function resolveLadderTemplateId(templateId) {
  if (!templateId || typeof templateId !== 'string') return null;
  const trimmed = templateId.trim();
  if (getLadderMonsterTemplate(trimmed)) return trimmed;
  const alias = LADDER_MONSTER_TEMPLATE_ALIASES[trimmed];
  if (alias && getLadderMonsterTemplate(alias)) return alias;
  return null;
}

/**
 * Fix templateId on owned rows; returns true if anything changed.
 * @param {object} profile
 */
export function migrateLadderMonsterTemplateIds(profile) {
  if (!profile) return false;
  let changed = false;

  const fixRow = (row) => {
    if (!row?.templateId) return;
    const canonical = resolveLadderTemplateId(row.templateId);
    if (!canonical || canonical === row.templateId) return;
    row.templateId = canonical;
    changed = true;
  };

  for (const om of profile.ownedMonsters || []) fixRow(om);
  const ml = profile.monsterLadder;
  if (ml?.ownedMonsters) {
    for (const om of ml.ownedMonsters) fixRow(om);
  }
  return changed;
}
