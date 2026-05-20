import { getMonsterTemplate } from '../monsterTemplates';
import { getLadderMonsterTemplate } from './ladderMonsterCatalog';

/** Legacy save IDs → current ladder template IDs. */
export const LADDER_MONSTER_TEMPLATE_ALIASES = {
  toiletron: 'toiletron_titan',
};

/** Legacy main-roster IDs → current shop template IDs. */
export const MAIN_MONSTER_TEMPLATE_ALIASES = {
  toilet_paper: 'toilet_paper_ninja',
};

/**
 * One key per monster species for grouping / dedupe (main + ladder inventories).
 * @param {string|undefined|null} templateId
 */
export function canonicalMonsterKey(templateId) {
  if (!templateId || typeof templateId !== 'string') return null;
  const trimmed = templateId.trim();
  const ladder = resolveLadderTemplateId(trimmed);
  if (ladder) return ladder;
  if (getMonsterTemplate(trimmed)) return trimmed;
  const alias = MAIN_MONSTER_TEMPLATE_ALIASES[trimmed];
  if (alias && getMonsterTemplate(alias)) return alias;
  return trimmed;
}

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
    const ladderCanon = resolveLadderTemplateId(row.templateId);
    if (ladderCanon && ladderCanon !== row.templateId) {
      row.templateId = ladderCanon;
      changed = true;
      return;
    }
    const mainCanon = MAIN_MONSTER_TEMPLATE_ALIASES[row.templateId];
    if (mainCanon && getMonsterTemplate(mainCanon) && mainCanon !== row.templateId) {
      row.templateId = mainCanon;
      changed = true;
    }
  };

  for (const om of profile.ownedMonsters || []) fixRow(om);
  return changed;
}
