/** @typedef {'rare'|'epic'|'mythic'} GearRarity */
/** @typedef {'head'|'body'|'weapon'|'hand'|'legs'} GearSlot */
/** @typedef {'guardian'|'berserker'|'lifebloom'|'venomfang'|'flameheart'} GearSetId */

export const GEAR_RARITIES = ['rare', 'epic', 'mythic'];
export const GEAR_SHOP_RARITIES = ['rare', 'epic'];
export const GEAR_SLOTS = ['head', 'body', 'weapon', 'hand', 'legs'];
export const ARRAY_GEAR_SLOTS = ['weapon', 'hand', 'legs'];

/** @deprecated Use gearRarityColor from components/gear/gearUiTheme — kept for non-UI imports */
export const GEAR_RARITY_COLORS = {
  rare: '#0984e3',
  epic: '#6c5ce7',
  mythic: '#e84393',
};

export const GEAR_STAT_TYPES = [
  'attack',
  'defense',
  'hp',
  'speed',
  'crit',
  'dodge',
  'hitRate',
  'healPower',
  'firePower',
  'poisonPower',
  'skillPower',
];

/** Stat line count per rarity. */
export const GEAR_STAT_LINE_COUNT = { rare: 1, epic: 2, mythic: 3 };

/** Roll ranges per stat type and rarity (inclusive). */
export const GEAR_STAT_RANGES = {
  rare: {
    hp: [20, 40],
    attack: [3, 6],
    defense: [3, 6],
    speed: [1, 3],
    crit: [1, 3],
    dodge: [1, 3],
    hitRate: [1, 4],
    healPower: [3, 6],
    firePower: [3, 6],
    poisonPower: [3, 6],
    skillPower: [3, 6],
  },
  epic: {
    hp: [45, 80],
    attack: [7, 12],
    defense: [7, 12],
    speed: [3, 6],
    crit: [3, 6],
    dodge: [3, 6],
    hitRate: [4, 8],
    healPower: [7, 12],
    firePower: [7, 12],
    poisonPower: [7, 12],
    skillPower: [7, 12],
  },
  mythic: {
    hp: [90, 150],
    attack: [13, 22],
    defense: [13, 22],
    speed: [6, 10],
    crit: [6, 10],
    dodge: [6, 10],
    hitRate: [8, 14],
    healPower: [13, 22],
    firePower: [13, 22],
    poisonPower: [13, 22],
    skillPower: [13, 22],
  },
};

export const GEAR_SHOP_PRICES = {
  rare: { min: 180, max: 320 },
  epic: { min: 650, max: 1100 },
};

export const GEAR_SELL_VALUES = {
  rare: 45,
  epic: 180,
  mythic: 450,
};

/** Drop tables: chance out of 100 that a gear drop occurs at this tier when rolling gear. */
export const GEAR_DROP_TABLES = {
  miniBoss: { rare: 25, epic: 10, mythic: 3 },
  ladder: { rare: 20, epic: 8, mythic: 2 },
  quest: { rare: 20, epic: 8, mythic: 2 },
  dailySpin: { rare: 10, epic: 3, mythic: 0.5 },
};

export const DODGE_HITRATE_LIMITS = { min: 0, max: 60 };

export function defaultMonsterEquipment() {
  return {
    head: null,
    body: null,
    weapon: [null, null],
    hand: [null, null],
    legs: [null, null],
  };
}
