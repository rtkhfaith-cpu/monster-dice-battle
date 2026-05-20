/**
 * Gear duplicate → ladder shard payouts and exchange reference.
 *
 * Shards are spent only on Monster Ladder chest purchases (see SHARD_EXCHANGES).
 * Duplicate payouts are tuned so ~5 common dupes ≈ one gear chest, without flooding mythics.
 */
import { LADDER_BALANCE } from './ladder';

/** @typedef {'common'|'rare'|'epic'|'legendary'|'mythic'} GearRarity */

/** Duplicate gear → ladder shards (by gear rarity). */
export const GEAR_DUPLICATE_SHARDS_BY_RARITY = {
  ...LADDER_BALANCE.duplicateShards,
};

/** Gear Mart items have no rarity — treat as common-tier shard refund. */
export const MART_GEAR_DUPLICATE_SHARDS = GEAR_DUPLICATE_SHARDS_BY_RARITY.common;

/**
 * What ladder shards can be exchanged for (do not add new sinks here without rebalance).
 * @type {ReadonlyArray<{ id: string, label: string, shardCost: number, notes?: string }>}
 */
export const SHARD_EXCHANGES = [
  {
    id: 'ladder_gear_chest',
    label: 'Monster Ladder gear chest',
    shardCost: 24,
    notes: 'Random ladder-exclusive gear',
  },
  {
    id: 'ladder_monster_chest',
    label: 'Monster Ladder monster chest',
    shardCost: 72,
    notes: 'Random ladder monster',
  },
];

/**
 * @param {GearRarity|string|undefined|null} rarity
 */
export function gearDuplicateShardsForRarity(rarity) {
  if (rarity && GEAR_DUPLICATE_SHARDS_BY_RARITY[rarity] != null) {
    return GEAR_DUPLICATE_SHARDS_BY_RARITY[rarity];
  }
  return MART_GEAR_DUPLICATE_SHARDS;
}
