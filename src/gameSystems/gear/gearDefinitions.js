/**
 * Gear templates — 15 sets × 8 pieces = 120 templates.
 * Each template has a fixed rarity; instances inherit rarity from the template.
 */

/** @typedef {'tank'|'attack'|'recovery'|'poison'|'fire'} GearBuildType */

const BUILD_ALLOWED_STATS = {
  tank: ['hp', 'defense', 'magicDefence', 'dodge', 'hitRate'],
  attack: ['attack', 'magicAttack', 'crit', 'speed', 'hitRate'],
  // Healers: sustain + magic support + evasion — no physical defense (tank identity).
  recovery: ['hp', 'magicAttack', 'dodge', 'hitRate'],
  poison: ['attack', 'magicAttack', 'speed', 'hitRate', 'crit'],
  fire: ['attack', 'magicAttack', 'crit', 'speed', 'hitRate'],
};

/** Weighted roll bias per build type. */
export const BUILD_STAT_WEIGHTS = {
  tank: { hp: 2, defense: 3, magicDefence: 3, dodge: 2, hitRate: 1 },
  recovery: { hp: 4, magicAttack: 3, dodge: 3, hitRate: 2 },
  attack: { attack: 4, magicAttack: 3, crit: 3, speed: 2, hitRate: 1 },
  fire: { attack: 3, magicAttack: 4, crit: 4, speed: 2, hitRate: 1 },
  poison: { attack: 4, magicAttack: 2, speed: 3, crit: 2, hitRate: 2 },
};

const BUILD_EMOJI = {
  tank: '🛡️',
  attack: '⚔️',
  recovery: '🌿',
  poison: '🐍',
  fire: '🔥',
};

/** @type {Array<{ rarity: 'rare'|'epic'|'mythic', setId: string, setName: string, buildType: GearBuildType, pieces: Array<{ key: string, name: string, slot: string }> }>} */
const SET_DEFINITIONS = [
  // —— Rare ——
  {
    rarity: 'rare',
    setId: 'iron_guard',
    setName: 'Iron Guard Set',
    buildType: 'tank',
    pieces: [
      { key: 'helm', name: 'Iron Guard Helm', slot: 'head' },
      { key: 'armor', name: 'Iron Guard Armor', slot: 'body' },
      { key: 'blade', name: 'Iron Guard Blade', slot: 'weapon' },
      { key: 'mace', name: 'Iron Guard Mace', slot: 'weapon' },
      { key: 'gloves', name: 'Iron Guard Gloves', slot: 'hand' },
      { key: 'claws', name: 'Iron Guard Claws', slot: 'hand' },
      { key: 'boots', name: 'Iron Guard Boots', slot: 'legs' },
      { key: 'greaves', name: 'Iron Guard Greaves', slot: 'legs' },
    ],
  },
  {
    rarity: 'rare',
    setId: 'wild_fang',
    setName: 'Wild Fang Set',
    buildType: 'attack',
    pieces: [
      { key: 'horn', name: 'Wild Fang Horn', slot: 'head' },
      { key: 'hide', name: 'Wild Fang Hide', slot: 'body' },
      { key: 'axe', name: 'Wild Fang Axe', slot: 'weapon' },
      { key: 'fang', name: 'Wild Fang Fang', slot: 'weapon' },
      { key: 'grip', name: 'Wild Fang Grip', slot: 'hand' },
      { key: 'claw', name: 'Wild Fang Claw', slot: 'hand' },
      { key: 'boots', name: 'Wild Fang Boots', slot: 'legs' },
      { key: 'striders', name: 'Wild Fang Striders', slot: 'legs' },
    ],
  },
  {
    rarity: 'rare',
    setId: 'meadow_bloom',
    setName: 'Meadow Bloom Set',
    buildType: 'recovery',
    pieces: [
      { key: 'crown', name: 'Meadow Bloom Crown', slot: 'head' },
      { key: 'robe', name: 'Meadow Bloom Robe', slot: 'body' },
      { key: 'staff', name: 'Meadow Bloom Staff', slot: 'weapon' },
      { key: 'wand', name: 'Meadow Bloom Wand', slot: 'weapon' },
      { key: 'gloves', name: 'Meadow Bloom Gloves', slot: 'hand' },
      { key: 'wraps', name: 'Meadow Bloom Wraps', slot: 'hand' },
      { key: 'sandals', name: 'Meadow Bloom Sandals', slot: 'legs' },
      { key: 'steps', name: 'Meadow Bloom Steps', slot: 'legs' },
    ],
  },
  {
    rarity: 'rare',
    setId: 'toxic_bite',
    setName: 'Toxic Bite Set',
    buildType: 'poison',
    pieces: [
      { key: 'mask', name: 'Toxic Bite Mask', slot: 'head' },
      { key: 'mail', name: 'Toxic Bite Mail', slot: 'body' },
      { key: 'dagger', name: 'Toxic Bite Dagger', slot: 'weapon' },
      { key: 'needle', name: 'Toxic Bite Needle', slot: 'weapon' },
      { key: 'claw', name: 'Toxic Bite Claw', slot: 'hand' },
      { key: 'talon', name: 'Toxic Bite Talon', slot: 'hand' },
      { key: 'boots', name: 'Toxic Bite Boots', slot: 'legs' },
      { key: 'striders', name: 'Toxic Bite Striders', slot: 'legs' },
    ],
  },
  {
    rarity: 'rare',
    setId: 'ember_paw',
    setName: 'Ember Paw Set',
    buildType: 'fire',
    pieces: [
      { key: 'helm', name: 'Ember Paw Helm', slot: 'head' },
      { key: 'guard', name: 'Ember Paw Guard', slot: 'body' },
      { key: 'sword', name: 'Ember Paw Sword', slot: 'weapon' },
      { key: 'spear', name: 'Ember Paw Spear', slot: 'weapon' },
      { key: 'fist', name: 'Ember Paw Fist', slot: 'hand' },
      { key: 'claw', name: 'Ember Paw Claw', slot: 'hand' },
      { key: 'treads', name: 'Ember Paw Treads', slot: 'legs' },
      { key: 'boots', name: 'Ember Paw Boots', slot: 'legs' },
    ],
  },
  // —— Epic ——
  {
    rarity: 'epic',
    setId: 'dragon_guard',
    setName: 'Dragon Guard Set',
    buildType: 'tank',
    pieces: [
      { key: 'helm', name: 'Dragon Guard Helm', slot: 'head' },
      { key: 'armor', name: 'Dragon Guard Armor', slot: 'body' },
      { key: 'blade', name: 'Dragon Guard Blade', slot: 'weapon' },
      { key: 'hammer', name: 'Dragon Guard Hammer', slot: 'weapon' },
      { key: 'gauntlets', name: 'Dragon Guard Gauntlets', slot: 'hand' },
      { key: 'claws', name: 'Dragon Guard Claws', slot: 'hand' },
      { key: 'boots', name: 'Dragon Guard Boots', slot: 'legs' },
      { key: 'greaves', name: 'Dragon Guard Greaves', slot: 'legs' },
    ],
  },
  {
    rarity: 'epic',
    setId: 'warborn',
    setName: 'Warborn Set',
    buildType: 'attack',
    pieces: [
      { key: 'helm', name: 'Warborn Helm', slot: 'head' },
      { key: 'plate', name: 'Warborn Plate', slot: 'body' },
      { key: 'axe', name: 'Warborn Axe', slot: 'weapon' },
      { key: 'cleaver', name: 'Warborn Cleaver', slot: 'weapon' },
      { key: 'gauntlets', name: 'Warborn Gauntlets', slot: 'hand' },
      { key: 'claws', name: 'Warborn Claws', slot: 'hand' },
      { key: 'boots', name: 'Warborn Boots', slot: 'legs' },
      { key: 'greaves', name: 'Warborn Greaves', slot: 'legs' },
    ],
  },
  {
    rarity: 'epic',
    setId: 'lifebloom',
    setName: 'Lifebloom Set',
    buildType: 'recovery',
    pieces: [
      { key: 'crown', name: 'Lifebloom Crown', slot: 'head' },
      { key: 'robe', name: 'Lifebloom Robe', slot: 'body' },
      { key: 'staff', name: 'Lifebloom Staff', slot: 'weapon' },
      { key: 'wand', name: 'Lifebloom Wand', slot: 'weapon' },
      { key: 'gloves', name: 'Lifebloom Gloves', slot: 'hand' },
      { key: 'wraps', name: 'Lifebloom Wraps', slot: 'hand' },
      { key: 'sandals', name: 'Lifebloom Sandals', slot: 'legs' },
      { key: 'steps', name: 'Lifebloom Steps', slot: 'legs' },
    ],
  },
  {
    rarity: 'epic',
    setId: 'venomfang',
    setName: 'Venomfang Set',
    buildType: 'poison',
    pieces: [
      { key: 'mask', name: 'Venomfang Mask', slot: 'head' },
      { key: 'mail', name: 'Venomfang Mail', slot: 'body' },
      { key: 'dagger', name: 'Venomfang Dagger', slot: 'weapon' },
      { key: 'fang', name: 'Venomfang Fang', slot: 'weapon' },
      { key: 'claws', name: 'Venomfang Claws', slot: 'hand' },
      { key: 'talons', name: 'Venomfang Talons', slot: 'hand' },
      { key: 'boots', name: 'Venomfang Boots', slot: 'legs' },
      { key: 'striders', name: 'Venomfang Striders', slot: 'legs' },
    ],
  },
  {
    rarity: 'epic',
    setId: 'flameheart',
    setName: 'Flameheart Set',
    buildType: 'fire',
    pieces: [
      { key: 'helm', name: 'Flameheart Helm', slot: 'head' },
      { key: 'guard', name: 'Flameheart Guard', slot: 'body' },
      { key: 'sword', name: 'Flameheart Sword', slot: 'weapon' },
      { key: 'spear', name: 'Flameheart Spear', slot: 'weapon' },
      { key: 'fists', name: 'Flameheart Fists', slot: 'hand' },
      { key: 'claws', name: 'Flameheart Claws', slot: 'hand' },
      { key: 'treads', name: 'Flameheart Treads', slot: 'legs' },
      { key: 'boots', name: 'Flameheart Boots', slot: 'legs' },
    ],
  },
  // —— Mythic ——
  {
    rarity: 'mythic',
    setId: 'celestial_guardian',
    setName: 'Celestial Guardian Set',
    buildType: 'tank',
    pieces: [
      { key: 'crown', name: 'Celestial Guardian Crown', slot: 'head' },
      { key: 'plate', name: 'Celestial Guardian Plate', slot: 'body' },
      { key: 'sword', name: 'Celestial Guardian Sword', slot: 'weapon' },
      { key: 'hammer', name: 'Celestial Guardian Hammer', slot: 'weapon' },
      { key: 'fists', name: 'Celestial Guardian Fists', slot: 'hand' },
      { key: 'claws', name: 'Celestial Guardian Claws', slot: 'hand' },
      { key: 'treads', name: 'Celestial Guardian Treads', slot: 'legs' },
      { key: 'greaves', name: 'Celestial Guardian Greaves', slot: 'legs' },
    ],
  },
  {
    rarity: 'mythic',
    setId: 'titan_berserker',
    setName: 'Titan Berserker Set',
    buildType: 'attack',
    pieces: [
      { key: 'crown', name: 'Titan Berserker Crown', slot: 'head' },
      { key: 'plate', name: 'Titan Berserker Plate', slot: 'body' },
      { key: 'axe', name: 'Titan Berserker Axe', slot: 'weapon' },
      { key: 'maul', name: 'Titan Berserker Maul', slot: 'weapon' },
      { key: 'fists', name: 'Titan Berserker Fists', slot: 'hand' },
      { key: 'claws', name: 'Titan Berserker Claws', slot: 'hand' },
      { key: 'treads', name: 'Titan Berserker Treads', slot: 'legs' },
      { key: 'greaves', name: 'Titan Berserker Greaves', slot: 'legs' },
    ],
  },
  {
    rarity: 'mythic',
    setId: 'eternal_bloom',
    setName: 'Eternal Bloom Set',
    buildType: 'recovery',
    pieces: [
      { key: 'crown', name: 'Eternal Bloom Crown', slot: 'head' },
      { key: 'vestments', name: 'Eternal Bloom Vestments', slot: 'body' },
      { key: 'staff', name: 'Eternal Bloom Staff', slot: 'weapon' },
      { key: 'scepter', name: 'Eternal Bloom Scepter', slot: 'weapon' },
      { key: 'gloves', name: 'Eternal Bloom Gloves', slot: 'hand' },
      { key: 'wraps', name: 'Eternal Bloom Wraps', slot: 'hand' },
      { key: 'sandals', name: 'Eternal Bloom Sandals', slot: 'legs' },
      { key: 'steps', name: 'Eternal Bloom Steps', slot: 'legs' },
    ],
  },
  {
    rarity: 'mythic',
    setId: 'abyss_venom',
    setName: 'Abyss Venom Set',
    buildType: 'poison',
    pieces: [
      { key: 'hood', name: 'Abyss Venom Hood', slot: 'head' },
      { key: 'carapace', name: 'Abyss Venom Carapace', slot: 'body' },
      { key: 'fang', name: 'Abyss Venom Fang', slot: 'weapon' },
      { key: 'stinger', name: 'Abyss Venom Stinger', slot: 'weapon' },
      { key: 'claws', name: 'Abyss Venom Claws', slot: 'hand' },
      { key: 'talons', name: 'Abyss Venom Talons', slot: 'hand' },
      { key: 'treads', name: 'Abyss Venom Treads', slot: 'legs' },
      { key: 'greaves', name: 'Abyss Venom Greaves', slot: 'legs' },
    ],
  },
  {
    rarity: 'mythic',
    setId: 'inferno_king',
    setName: 'Inferno King Set',
    buildType: 'fire',
    pieces: [
      { key: 'crown', name: 'Inferno King Crown', slot: 'head' },
      { key: 'mantle', name: 'Inferno King Mantle', slot: 'body' },
      { key: 'blade', name: 'Inferno King Blade', slot: 'weapon' },
      { key: 'lance', name: 'Inferno King Lance', slot: 'weapon' },
      { key: 'fists', name: 'Inferno King Fists', slot: 'hand' },
      { key: 'claws', name: 'Inferno King Claws', slot: 'hand' },
      { key: 'treads', name: 'Inferno King Treads', slot: 'legs' },
      { key: 'greaves', name: 'Inferno King Greaves', slot: 'legs' },
    ],
  },
];

function buildTemplates() {
  /** @type {Record<string, object>} */
  const templates = {};
  for (const def of SET_DEFINITIONS) {
    const allowedStats = BUILD_ALLOWED_STATS[def.buildType];
    const emoji = BUILD_EMOJI[def.buildType];
    for (const piece of def.pieces) {
      const gearId = `${def.rarity}_${def.setId}_${piece.key}`;
      templates[gearId] = {
        gearId,
        name: piece.name,
        rarity: def.rarity,
        slot: piece.slot,
        setId: def.setId,
        setName: def.setName,
        buildType: def.buildType,
        allowedStats: [...allowedStats],
        emoji,
      };
    }
  }
  return templates;
}

/** @type {Record<string, object>} */
export const GEAR_TEMPLATES = buildTemplates();

export const GEAR_TEMPLATE_LIST = Object.values(GEAR_TEMPLATES);

export const GEAR_TEMPLATES_BY_RARITY = {
  rare: GEAR_TEMPLATE_LIST.filter((t) => t.rarity === 'rare'),
  epic: GEAR_TEMPLATE_LIST.filter((t) => t.rarity === 'epic'),
  mythic: GEAR_TEMPLATE_LIST.filter((t) => t.rarity === 'mythic'),
};

export const GEAR_SET_IDS = SET_DEFINITIONS.map((d) => d.setId);

/** For ladder / UI reward codex — one row per set. */
export const GEAR_SETS_FOR_DISPLAY = SET_DEFINITIONS.map((d) => ({
  rarity: d.rarity,
  setId: d.setId,
  setName: d.setName,
  buildType: d.buildType,
  emoji: BUILD_EMOJI[d.buildType],
}));

export function getGearTemplate(gearId) {
  return GEAR_TEMPLATES[gearId] ?? null;
}

export function gearTemplatesForSlot(slot, rarity = null) {
  let list = GEAR_TEMPLATE_LIST.filter((t) => t.slot === slot);
  if (rarity) list = list.filter((t) => t.rarity === rarity);
  return list;
}

export function gearTemplatesForSet(setId) {
  return GEAR_TEMPLATE_LIST.filter((t) => t.setId === setId);
}

export function gearTemplatesForRarity(rarity) {
  return GEAR_TEMPLATES_BY_RARITY[rarity] ?? [];
}

export function gearTemplatesForShopRarity(rarity) {
  return gearTemplatesForRarity(rarity);
}
