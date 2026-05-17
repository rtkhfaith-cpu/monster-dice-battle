/** @typedef {'common'|'rare'|'epic'|'legendary'|'mythic'} LadderRarity */

export const LADDER_MAIN_LEVELS = 25;
export const LADDER_SUB_LEVELS = 10;
export const LADDER_TOTAL_STAGES = LADDER_MAIN_LEVELS * LADDER_SUB_LEVELS;

export const LADDER_RARITY_ORDER = /** @type {const} */ (['common', 'rare', 'epic', 'legendary', 'mythic']);

export const LADDER_RARITY_WEIGHTS = {
  common: 50,
  rare: 30,
  epic: 15,
  legendary: 4,
  mythic: 1,
};

export const LADDER_PITY = {
  epicPlusEvery: 30,
  legendaryPlusEvery: 80,
  mythicEvery: 200,
};

/** Duplicate → ladder shards */
export const LADDER_SHARDS_BY_RARITY = {
  common: 8,
  rare: 20,
  epic: 50,
  legendary: 120,
  mythic: 350,
};

export const LADDER_EXP_MULTIPLIER = 3;
export const LADDER_GOLD_MULTIPLIER = 0.2;

export const TUTORIAL_STARTER_IDS = [
  'nugget_dragon',
  'charging_cable_serpent',
  'bubblewrap_blob',
  'traffic_cone_cyclops',
];

export const LADDER_TIMEZONE = 'Asia/Singapore';
export const LADDER_DAILY_RESET_HOUR = 18;
