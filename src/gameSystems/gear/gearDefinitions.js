/**
 * Base gear templates — instances are generated from these via gearGenerator.
 */

const SET_META = {
  guardian: {
    setId: 'guardian',
    setName: 'Guardian',
    allowedStats: ['hp', 'defense', 'dodge', 'hitRate'],
    emoji: '🛡️',
  },
  berserker: {
    setId: 'berserker',
    setName: 'Berserker',
    allowedStats: ['attack', 'crit', 'speed', 'hitRate'],
    emoji: '⚔️',
  },
  lifebloom: {
    setId: 'lifebloom',
    setName: 'Lifebloom',
    allowedStats: ['hp', 'defense', 'healPower', 'dodge'],
    emoji: '🌿',
  },
  venomfang: {
    setId: 'venomfang',
    setName: 'Venomfang',
    allowedStats: ['attack', 'poisonPower', 'speed', 'hitRate'],
    emoji: '🐍',
  },
  flameheart: {
    setId: 'flameheart',
    setName: 'Flameheart',
    allowedStats: ['attack', 'firePower', 'crit', 'skillPower'],
    emoji: '🔥',
  },
};

const SET_ITEMS = {
  guardian: [
    { gearId: 'guardian_helm', name: 'Guardian Helm', slot: 'head' },
    { gearId: 'guardian_armor', name: 'Guardian Armor', slot: 'body' },
    { gearId: 'guardian_shieldblade', name: 'Guardian Shieldblade', slot: 'weapon' },
    { gearId: 'guardian_hammer', name: 'Guardian Hammer', slot: 'weapon' },
    { gearId: 'guardian_gauntlet', name: 'Guardian Gauntlet', slot: 'hand' },
    { gearId: 'guardian_guard_claw', name: 'Guardian Guard Claw', slot: 'hand' },
    { gearId: 'guardian_greaves', name: 'Guardian Greaves', slot: 'legs' },
    { gearId: 'guardian_stone_boots', name: 'Guardian Stone Boots', slot: 'legs' },
  ],
  berserker: [
    { gearId: 'berserker_horn', name: 'Berserker Horn', slot: 'head' },
    { gearId: 'berserker_plate', name: 'Berserker Plate', slot: 'body' },
    { gearId: 'berserker_axe', name: 'Berserker Axe', slot: 'weapon' },
    { gearId: 'berserker_fangblade', name: 'Berserker Fangblade', slot: 'weapon' },
    { gearId: 'berserker_grip', name: 'Berserker Grip', slot: 'hand' },
    { gearId: 'berserker_claw', name: 'Berserker Claw', slot: 'hand' },
    { gearId: 'berserker_boots', name: 'Berserker Boots', slot: 'legs' },
    { gearId: 'berserker_striders', name: 'Berserker Striders', slot: 'legs' },
  ],
  lifebloom: [
    { gearId: 'lifebloom_crown', name: 'Lifebloom Crown', slot: 'head' },
    { gearId: 'lifebloom_robe', name: 'Lifebloom Robe', slot: 'body' },
    { gearId: 'lifebloom_staff', name: 'Lifebloom Staff', slot: 'weapon' },
    { gearId: 'lifebloom_wand', name: 'Lifebloom Wand', slot: 'weapon' },
    { gearId: 'lifebloom_gloves', name: 'Lifebloom Gloves', slot: 'hand' },
    { gearId: 'lifebloom_wraps', name: 'Lifebloom Wraps', slot: 'hand' },
    { gearId: 'lifebloom_sandals', name: 'Lifebloom Sandals', slot: 'legs' },
    { gearId: 'lifebloom_steps', name: 'Lifebloom Steps', slot: 'legs' },
  ],
  venomfang: [
    { gearId: 'venomfang_mask', name: 'Venomfang Mask', slot: 'head' },
    { gearId: 'venomfang_mail', name: 'Venomfang Mail', slot: 'body' },
    { gearId: 'venomfang_dagger', name: 'Venomfang Dagger', slot: 'weapon' },
    { gearId: 'venomfang_needle', name: 'Venomfang Needle', slot: 'weapon' },
    { gearId: 'venomfang_claw', name: 'Venomfang Claw', slot: 'hand' },
    { gearId: 'venomfang_talon', name: 'Venomfang Talon', slot: 'hand' },
    { gearId: 'venomfang_striders', name: 'Venomfang Striders', slot: 'legs' },
    { gearId: 'venomfang_boots', name: 'Venomfang Boots', slot: 'legs' },
  ],
  flameheart: [
    { gearId: 'flameheart_helm', name: 'Flameheart Helm', slot: 'head' },
    { gearId: 'flameheart_guard', name: 'Flameheart Guard', slot: 'body' },
    { gearId: 'flameheart_sword', name: 'Flameheart Sword', slot: 'weapon' },
    { gearId: 'flameheart_spear', name: 'Flameheart Spear', slot: 'weapon' },
    { gearId: 'flameheart_fist', name: 'Flameheart Fist', slot: 'hand' },
    { gearId: 'flameheart_claw', name: 'Flameheart Claw', slot: 'hand' },
    { gearId: 'flameheart_treads', name: 'Flameheart Treads', slot: 'legs' },
    { gearId: 'flameheart_boots', name: 'Flameheart Boots', slot: 'legs' },
  ],
};

/** @type {Record<string, object>} */
export const GEAR_TEMPLATES = {};

for (const [setKey, items] of Object.entries(SET_ITEMS)) {
  const meta = SET_META[setKey];
  for (const item of items) {
    GEAR_TEMPLATES[item.gearId] = {
      gearId: item.gearId,
      name: item.name,
      slot: item.slot,
      set: meta.setId,
      setName: meta.setName,
      allowedStats: [...meta.allowedStats],
      emoji: meta.emoji,
    };
  }
}

export const GEAR_TEMPLATE_LIST = Object.values(GEAR_TEMPLATES);

export function getGearTemplate(gearId) {
  return GEAR_TEMPLATES[gearId] ?? null;
}

export function gearTemplatesForSlot(slot) {
  return GEAR_TEMPLATE_LIST.filter((t) => t.slot === slot);
}

export function gearTemplatesForSet(setId) {
  return GEAR_TEMPLATE_LIST.filter((t) => t.set === setId);
}

export function gearTemplatesForShopRarity(rarity) {
  return GEAR_TEMPLATE_LIST;
}
