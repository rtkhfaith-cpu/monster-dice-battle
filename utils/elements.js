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

/** Mythic roster — each has two elements; MYTHIC_BEATS is the counter ring. */
export const MYTHIC_IDS = /** @type {const} */ ([
  'sixtyseven_rex',
  'core_feed_beast',
  'goldzilla',
  'algorithm_angel',
  'bubble_tea_slime',
]);

/** @type {Record<string, [ElementId, ElementId]>} */
export const MYTHIC_ELEMENTS = {
  /** Mythic bruiser — Metal / Fire (67 meme kit) */
  sixtyseven_rex: ['metal', 'fire'],
  /** Magic nuker — Wood / Fire */
  core_feed_beast: ['wood', 'fire'],
  /** All-rounder — Metal / Earth */
  goldzilla: ['metal', 'earth'],
  /** Mage — Water / Metal */
  algorithm_angel: ['water', 'metal'],
  /** Tank — Earth / Water */
  bubble_tea_slime: ['earth', 'water'],
};

/** Mythic vs mythic: attacker id → defender id it counters */
export const MYTHIC_BEATS = {
  sixtyseven_rex: 'core_feed_beast',
  core_feed_beast: 'goldzilla',
  goldzilla: 'algorithm_angel',
  algorithm_angel: 'bubble_tea_slime',
  bubble_tea_slime: 'sixtyseven_rex',
};

/** Default element per monster template (primary element) */
export const MONSTER_ELEMENTS = {
  cockroachsaurus: 'earth',
  chickenzilla: 'fire',
  water_bottle_beast: 'water',
  crocs_goblin: 'earth',
  iphone_warrior: 'metal',
  lunchbox_dragon: 'fire',
  pencil_shark: 'wood',
  homework_troll: 'wood',
  toilet_paper_ninja: 'water',
  schoolbag_golem: 'metal',
  t_rex: 'fire',
  tablet_wizard: 'metal',
  skibidi_bot: 'earth',
  bubble_tea_slime: 'earth',
  sixtyseven_rex: 'metal',
  goldzilla: 'metal',
};

/** @param {string} templateId */
export function getTemplateElement(templateId) {
  const dual = MYTHIC_ELEMENTS[templateId];
  if (dual) return dual[0];
  return MONSTER_ELEMENTS[templateId] ?? 'earth';
}

/** @param {string} templateId @returns {ElementId[]} */
export function getTemplateElements(templateId) {
  const dual = MYTHIC_ELEMENTS[templateId];
  if (dual) return [...dual];
  const single = MONSTER_ELEMENTS[templateId];
  return single ? [single] : ['earth'];
}

/** @param {string} templateId */
export function isMythicTemplate(templateId) {
  return MYTHIC_IDS.includes(templateId);
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

/**
 * Dual-element defense: advantage if skill beats either element; disadvantage only if weak to both.
 * @param {ElementId|string} atkElement
 * @param {ElementId|string} defPrimary
 * @param {ElementId|string|null|undefined} defSecondary
 */
export function getDualElementRelation(atkElement, defPrimary, defSecondary) {
  const r1 = getElementRelation(atkElement, defPrimary);
  const r2 = defSecondary ? getElementRelation(atkElement, defSecondary) : 'neutral';
  if (r1 === 'advantage' || r2 === 'advantage') return 'advantage';
  if (r1 === 'disadvantage' && r2 === 'disadvantage') return 'disadvantage';
  if (r1 === 'disadvantage' || r2 === 'disadvantage') return 'disadvantage';
  return 'neutral';
}

/**
 * @param {string|null|undefined} attackerTemplateId
 * @param {string|null|undefined} defenderTemplateId
 */
export function getMythicRivalRelation(attackerTemplateId, defenderTemplateId) {
  if (!attackerTemplateId || !defenderTemplateId) return 'neutral';
  if (!MYTHIC_IDS.includes(attackerTemplateId) || !MYTHIC_IDS.includes(defenderTemplateId)) {
    return 'neutral';
  }
  if (MYTHIC_BEATS[attackerTemplateId] === defenderTemplateId) return 'advantage';
  if (MYTHIC_BEATS[defenderTemplateId] === attackerTemplateId) return 'disadvantage';
  return 'neutral';
}

/**
 * Magic matchup: mythic rivalry first, then dual-element cycle.
 * @param {{
 *   attackerTemplateId?: string,
 *   defenderTemplateId?: string,
 *   atkElement?: string,
 *   defPrimary?: string,
 *   defSecondary?: string,
 * }} opts
 */
export function resolveMagicElementRelation(opts) {
  const rival = getMythicRivalRelation(opts.attackerTemplateId, opts.defenderTemplateId);
  if (rival !== 'neutral') return rival;
  return getDualElementRelation(
    opts.atkElement ?? 'earth',
    opts.defPrimary ?? 'earth',
    opts.defSecondary,
  );
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
