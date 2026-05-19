/** @typedef {'common'|'rare'|'epic'|'legendary'|'mythic'} LadderRarity */
import { LADDER_BALANCE } from '../../src/gameBalance/ladder';

export const LADDER_MAIN_LEVELS = 25;
export const LADDER_SUB_LEVELS = 10;
export const LADDER_TOTAL_STAGES = LADDER_MAIN_LEVELS * LADDER_SUB_LEVELS;

export const LADDER_RARITY_ORDER = /** @type {const} */ (['common', 'rare', 'epic', 'legendary', 'mythic']);

export const LADDER_RARITY_WEIGHTS = LADDER_BALANCE.chestRates;

export const LADDER_PITY = LADDER_BALANCE.pity;

/** Duplicate → ladder shards */
export const LADDER_SHARDS_BY_RARITY = LADDER_BALANCE.duplicateShards;

export const LADDER_EXP_MULTIPLIER = LADDER_BALANCE.expMultiplier;
export const LADDER_GOLD_MULTIPLIER = LADDER_BALANCE.coinMultiplier;

export const LADDER_CHEST_SHARD_COST = {
  gear: 24,
  monster: 72,
};

export const LADDER_TIMEZONE = LADDER_BALANCE.dailyResetTimeZone;
export const LADDER_DAILY_RESET_HOUR = LADDER_BALANCE.dailyResetHour;
