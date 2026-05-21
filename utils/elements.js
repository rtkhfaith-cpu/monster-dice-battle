/**
 * Five-element cycle — applies to magic attacks only.
 * Water > Fire > Wood > Earth > Metal > Water
 */

/** @typedef {'water'|'fire'|'wood'|'earth'|'metal'} ElementId */

export const ELEMENTS = /** @type {const} */ (['water', 'fire', 'wood', 'earth', 'metal']);

/** @type {Record<ElementId, ElementId>} */
export const BEATS = {
  water: 'fire',
  fire: 'wood',
  wood: 'earth',
  earth: 'metal',
  metal: 'water',
};

export const ELEMENT_UI = {
  water: { label: 'Water', emoji: '💧', color: '#3498db' },
  fire: { label: 'Fire', emoji: '🔥', color: '#e74c3c' },
  wood: { label: 'Wood', emoji: '🌿', color: '#27ae60' },
  earth: { label: 'Earth', emoji: '🪨', color: '#a0522d' },
  metal: { label: 'Metal', emoji: '⚙️', color: '#95a5a6' },
};

/** Default element per monster template */
export const MONSTER_ELEMENTS = {
  cockroachsaurus: 'earth',
  chickenzilla: 'fire',
  water_bottle_beast: 'water',
  crocs_goblin: 'earth',
  iphone_warrior: 'metal',
  lunchbox_dragon: 'fire',
  pencil_shark: 'water',
  homework_troll: 'wood',
  toilet_paper_ninja: 'wood',
  schoolbag_golem: 'earth',
  t_rex: 'fire',
  tablet_wizard: 'metal',
  skibidi_bot: 'water',
  bubble_tea_slime: 'water',
  sixtyseven_rex: 'metal',
  goldzilla: 'metal',
};

/** @param {string} templateId */
export function getTemplateElement(templateId) {
  return MONSTER_ELEMENTS[templateId] ?? 'earth';
}

/** @param {ElementId|string|null|undefined} el */
export function normalizeElement(el) {
  if (el && ELEMENTS.includes(el)) return el;
  return 'earth';
}

/**
 * @param {ElementId|string} attackerEl
 * @param {ElementId|string} defenderEl
 * @returns {'advantage'|'disadvantage'|'neutral'}
 */
export function getElementRelation(attackerEl, defenderEl) {
  const a = normalizeElement(attackerEl);
  const d = normalizeElement(defenderEl);
  if (BEATS[a] === d) return 'advantage';
  if (BEATS[d] === a) return 'disadvantage';
  return 'neutral';
}

/** Magic damage multiplier from element matchup */
export function getElementalDamageModifier(relation) {
  if (relation === 'advantage') return 1.3;
  if (relation === 'disadvantage') return 0.7;
  return 1;
}

/** @param {'advantage'|'disadvantage'|'neutral'} relation */
export function elementBannerText(relation) {
  if (relation === 'advantage') return 'Element Advantage!';
  if (relation === 'disadvantage') return 'Weak Element!';
  return null;
}
