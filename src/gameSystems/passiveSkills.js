/**
 * Passive skill book definitions — rarity scaling and descriptions.
 */

/** @typedef {'common'|'rare'|'epic'|'legendary'|'mythic'} PassiveBookRarity */

/** @typedef {'lifesteal'|'reflect'|'regen'|'poison'|'burn'|'dodge'|'crit'|'berserk'|'antiCrit'|'barrier'} PassiveEffectType */

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   effectType: PassiveEffectType,
 *   trigger: string,
 *   random: boolean,
 *   procChance?: number,
 *   scaling: Record<PassiveBookRarity, object>,
 *   description: (rarity: PassiveBookRarity) => string,
 * }} PassiveSkillDef
 */

export const PASSIVE_BOOK_RARITIES = ['rare', 'epic', 'legendary', 'mythic'];

export const PASSIVE_SKILL_IDS = {
  BLOOD_DRAIN: 'blood_drain',
  MIRROR_SHELL: 'mirror_shell',
  REGENERATION_AURA: 'regeneration_aura',
  TOXIC_FANG: 'toxic_fang',
  INFERNO_CURSE: 'inferno_curse',
  PHANTOM_STEP: 'phantom_step',
  FATAL_INSTINCT: 'fatal_instinct',
  RAGE_CORE: 'rage_core',
  IRON_GUARD: 'iron_guard',
  MANA_BARRIER: 'mana_barrier',
};

/** @type {Record<string, PassiveSkillDef>} */
export const PASSIVE_SKILLS = {
  [PASSIVE_SKILL_IDS.BLOOD_DRAIN]: {
    id: PASSIVE_SKILL_IDS.BLOOD_DRAIN,
    name: 'Blood Drain',
    effectType: 'lifesteal',
    trigger: 'afterDamageDealt',
    random: false,
    scaling: {
      rare: { lifestealPct: 5 },
      epic: { lifestealPct: 8 },
      legendary: { lifestealPct: 10 },
      mythic: { lifestealPct: 15 },
    },
    description: (r) => `Heal ${getPassiveEffect(PASSIVE_SKILL_IDS.BLOOD_DRAIN, r).lifestealPct}% of damage dealt.`,
  },
  [PASSIVE_SKILL_IDS.MIRROR_SHELL]: {
    id: PASSIVE_SKILL_IDS.MIRROR_SHELL,
    name: 'Mirror Shell',
    effectType: 'reflect',
    trigger: 'afterDamageReceived',
    random: false,
    scaling: {
      rare: { reflectPct: 8 },
      epic: { reflectPct: 12 },
      legendary: { reflectPct: 15 },
      mythic: { reflectPct: 20 },
    },
    description: (r) => `Reflect ${getPassiveEffect(PASSIVE_SKILL_IDS.MIRROR_SHELL, r).reflectPct}% of direct damage received.`,
  },
  [PASSIVE_SKILL_IDS.REGENERATION_AURA]: {
    id: PASSIVE_SKILL_IDS.REGENERATION_AURA,
    name: 'Regeneration Aura',
    effectType: 'regen',
    trigger: 'startOfTurn',
    random: false,
    scaling: {
      rare: { healMaxHpPct: 2 },
      epic: { healMaxHpPct: 3 },
      legendary: { healMaxHpPct: 4 },
      mythic: { healMaxHpPct: 5 },
    },
    description: (r) => `Recover ${getPassiveEffect(PASSIVE_SKILL_IDS.REGENERATION_AURA, r).healMaxHpPct}% max HP at start of turn.`,
  },
  [PASSIVE_SKILL_IDS.TOXIC_FANG]: {
    id: PASSIVE_SKILL_IDS.TOXIC_FANG,
    name: 'Toxic Fang',
    effectType: 'poison',
    trigger: 'afterDamageDealt',
    random: true,
    procChance: 20,
    scaling: {
      rare: { dotMaxHpPct: 2, turns: 2 },
      epic: { dotMaxHpPct: 3, turns: 3 },
      legendary: { dotMaxHpPct: 5, turns: 3 },
      mythic: { dotMaxHpPct: 6, turns: 4 },
    },
    description: (r) => {
      const e = getPassiveEffect(PASSIVE_SKILL_IDS.TOXIC_FANG, r);
      return `20% chance to poison (${e.dotMaxHpPct}% max HP/turn, ${e.turns} turns).`;
    },
  },
  [PASSIVE_SKILL_IDS.INFERNO_CURSE]: {
    id: PASSIVE_SKILL_IDS.INFERNO_CURSE,
    name: 'Inferno Curse',
    effectType: 'burn',
    trigger: 'afterDamageDealt',
    random: true,
    procChance: 20,
    scaling: {
      rare: { dotMaxHpPct: 2, healReductionPct: 20, turns: 2 },
      epic: { dotMaxHpPct: 3, healReductionPct: 30, turns: 3 },
      legendary: { dotMaxHpPct: 4, healReductionPct: 50, turns: 3 },
      mythic: { dotMaxHpPct: 5, healReductionPct: 70, turns: 4 },
    },
    description: (r) => {
      const e = getPassiveEffect(PASSIVE_SKILL_IDS.INFERNO_CURSE, r);
      return `20% chance to burn (${e.dotMaxHpPct}% max HP/turn, −${e.healReductionPct}% healing, ${e.turns} turns).`;
    },
  },
  [PASSIVE_SKILL_IDS.PHANTOM_STEP]: {
    id: PASSIVE_SKILL_IDS.PHANTOM_STEP,
    name: 'Phantom Step',
    effectType: 'dodge',
    trigger: 'beforeDamage',
    random: true,
    scaling: {
      rare: { dodgeBonusPct: 5 },
      epic: { dodgeBonusPct: 8 },
      legendary: { dodgeBonusPct: 10 },
      mythic: { dodgeBonusPct: 12 },
    },
    description: (r) => `+${getPassiveEffect(PASSIVE_SKILL_IDS.PHANTOM_STEP, r).dodgeBonusPct}% dodge chance.`,
  },
  [PASSIVE_SKILL_IDS.FATAL_INSTINCT]: {
    id: PASSIVE_SKILL_IDS.FATAL_INSTINCT,
    name: 'Fatal Instinct',
    effectType: 'crit',
    trigger: 'duringDamageCalc',
    random: false,
    scaling: {
      rare: { critBonusPct: 5 },
      epic: { critBonusPct: 8 },
      legendary: { critBonusPct: 12 },
      mythic: { critBonusPct: 15 },
    },
    description: (r) => `+${getPassiveEffect(PASSIVE_SKILL_IDS.FATAL_INSTINCT, r).critBonusPct}% critical hit chance.`,
  },
  [PASSIVE_SKILL_IDS.RAGE_CORE]: {
    id: PASSIVE_SKILL_IDS.RAGE_CORE,
    name: 'Rage Core',
    effectType: 'berserk',
    trigger: 'duringDamageCalc',
    random: false,
    scaling: {
      rare: { atkBonusPct: 10, hpThresholdPct: 50 },
      epic: { atkBonusPct: 15, hpThresholdPct: 50 },
      legendary: { atkBonusPct: 20, hpThresholdPct: 40 },
      mythic: { atkBonusPct: 30, hpThresholdPct: 30 },
    },
    description: (r) => {
      const e = getPassiveEffect(PASSIVE_SKILL_IDS.RAGE_CORE, r);
      return `+${e.atkBonusPct}% ATK below ${e.hpThresholdPct}% HP.`;
    },
  },
  [PASSIVE_SKILL_IDS.IRON_GUARD]: {
    id: PASSIVE_SKILL_IDS.IRON_GUARD,
    name: 'Iron Guard',
    effectType: 'antiCrit',
    trigger: 'duringDamageCalc',
    random: false,
    scaling: {
      rare: { critDamageReductionPct: 15 },
      epic: { critDamageReductionPct: 25 },
      legendary: { critDamageReductionPct: 40 },
      mythic: { critDamageReductionPct: 50 },
    },
    description: (r) => `Reduce critical damage taken by ${getPassiveEffect(PASSIVE_SKILL_IDS.IRON_GUARD, r).critDamageReductionPct}%.`,
  },
  [PASSIVE_SKILL_IDS.MANA_BARRIER]: {
    id: PASSIVE_SKILL_IDS.MANA_BARRIER,
    name: 'Mana Barrier',
    effectType: 'barrier',
    trigger: 'duringDamageCalc',
    random: false,
    scaling: {
      rare: { damageReductionPct: 20 },
      epic: { damageReductionPct: 30 },
      legendary: { damageReductionPct: 50 },
      mythic: { damageReductionPct: 70 },
    },
    description: (r) => `First direct hit reduced by ${getPassiveEffect(PASSIVE_SKILL_IDS.MANA_BARRIER, r).damageReductionPct}%.`,
  },
};

export const PASSIVE_CAPS = {
  dodgePct: 35,
  critPct: 50,
  lifestealPct: 20,
  reflectPct: 25,
  healReductionPct: 80,
};

export const PASSIVE_POPUP_PRIORITY = {
  DODGED: 1,
  MISS: 1,
  CRITICAL: 2,
  BARRIER: 3,
  IRON_GUARD: 3,
  BLOOD_DRAIN: 4,
  REFLECT: 4,
  POISONED: 5,
  BURN: 5,
  REGEN: 6,
  RAGE_CORE: 6,
};

/** @param {string} skillId @param {PassiveBookRarity} rarity */
export function getPassiveSkillDef(skillId) {
  return PASSIVE_SKILLS[skillId] ?? null;
}

/** @param {string} skillId @param {PassiveBookRarity} rarity */
export function getPassiveEffect(skillId, rarity) {
  const def = getPassiveSkillDef(skillId);
  if (!def) return {};
  const r = PASSIVE_BOOK_RARITIES.includes(rarity) ? rarity : 'rare';
  return { ...(def.scaling[r] || def.scaling.rare) };
}

/** @param {string} skillId @param {PassiveBookRarity} rarity */
export function getPassiveDescription(skillId, rarity) {
  const def = getPassiveSkillDef(skillId);
  if (!def) return '';
  return def.description(rarity);
}

/** Passive slot limits by monster template rarity. */
export function passiveSlotLimitForRarity(rarity) {
  switch (rarity) {
    case 'epic':
      return 1;
    case 'legendary':
      return 2;
    case 'mythic':
      return 3;
    default:
      return 0;
  }
}

/** Shop catalog entries (skill id + which rarities appear in mart). */
export const PASSIVE_SKILL_BOOK_SHOP = [
  { skillId: PASSIVE_SKILL_IDS.BLOOD_DRAIN, emoji: '🩸' },
  { skillId: PASSIVE_SKILL_IDS.MIRROR_SHELL, emoji: '🪞' },
  { skillId: PASSIVE_SKILL_IDS.REGENERATION_AURA, emoji: '💚' },
  { skillId: PASSIVE_SKILL_IDS.TOXIC_FANG, emoji: '☠️' },
  { skillId: PASSIVE_SKILL_IDS.INFERNO_CURSE, emoji: '🔥' },
  { skillId: PASSIVE_SKILL_IDS.PHANTOM_STEP, emoji: '👻' },
  { skillId: PASSIVE_SKILL_IDS.FATAL_INSTINCT, emoji: '⚡' },
  { skillId: PASSIVE_SKILL_IDS.RAGE_CORE, emoji: '💢' },
  { skillId: PASSIVE_SKILL_IDS.IRON_GUARD, emoji: '🛡️' },
  { skillId: PASSIVE_SKILL_IDS.MANA_BARRIER, emoji: '🔷' },
];
