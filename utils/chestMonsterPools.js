/**
 * Unified monster pools for chest drops — main roster + ladder exclusives.
 * After a rarity is rolled, each monster in the pool has equal weight.
 */

import { MONSTER_CATALOG } from './monsterTemplates';
import { getLadderMonstersByRarity } from './monsterLadder/ladderMonsterCatalog';

/** @typedef {{ id: string, name: string, rarity: string }} ChestMonsterEntry */

/**
 * @param {string} rarity
 * @returns {ChestMonsterEntry[]}
 */
export function getChestMonstersByRarity(rarity) {
  const seen = new Set();
  /** @type {ChestMonsterEntry[]} */
  const out = [];
  const matchRarities = rarity === 'mythic' ? ['mythic', 'ultra_mythic'] : [rarity];

  for (const m of MONSTER_CATALOG) {
    if (m?.id && matchRarities.includes(m.rarity) && !seen.has(m.id)) {
      seen.add(m.id);
      out.push({ id: m.id, name: m.name, rarity: m.rarity });
    }
  }
  for (const m of getLadderMonstersByRarity(rarity)) {
    if (m?.id && !seen.has(m.id)) {
      seen.add(m.id);
      out.push({ id: m.id, name: m.name, rarity: m.rarity });
    }
  }
  return out;
}

/**
 * @param {string} rarity
 * @returns {ChestMonsterEntry|null}
 */
export function pickRandomChestMonsterByRarity(rarity) {
  const pool = getChestMonstersByRarity(rarity);
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
