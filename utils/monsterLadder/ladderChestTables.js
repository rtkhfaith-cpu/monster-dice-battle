import { LADDER_PITY, LADDER_RARITY_ORDER, LADDER_RARITY_WEIGHTS } from './ladderConstants';
import { getLadderGearByRarity } from './ladderGearCatalog';
import { getLadderMonstersByRarity } from './ladderMonsterCatalog';

function rollRarity(pityCounter, chestType) {
  const epicGate = pityCounter > 0 && pityCounter % LADDER_PITY.epicPlusEvery === 0;
  const legGate = pityCounter > 0 && pityCounter % LADDER_PITY.legendaryPlusEvery === 0;
  const mythGate = pityCounter > 0 && pityCounter % LADDER_PITY.mythicEvery === 0;

  if (mythGate) return 'mythic';
  if (legGate) return 'legendary';
  if (epicGate) return 'epic';

  const total = LADDER_RARITY_ORDER.reduce((s, r) => s + LADDER_RARITY_WEIGHTS[r], 0);
  let roll = Math.random() * total;
  for (const r of LADDER_RARITY_ORDER) {
    roll -= LADDER_RARITY_WEIGHTS[r];
    if (roll <= 0) return r;
  }
  return 'common';
}

function pickFromPool(pool) {
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * @param {'gear'|'monster'} chestType
 * @param {number} pityCounter — opens since last pity reset for this chest type
 */
export function rollChestDrop(chestType, pityCounter) {
  const rarity = rollRarity(pityCounter + 1, chestType);
  const tryRarities = [rarity, ...LADDER_RARITY_ORDER.filter((r) => r !== rarity)];
  for (const r of tryRarities) {
    const pool =
      chestType === 'gear' ? getLadderGearByRarity(r) : getLadderMonstersByRarity(r);
    const item = pickFromPool(pool);
    if (item) {
      return {
        kind: chestType === 'gear' ? 'gear' : 'monster',
        id: item.id,
        rarity: item.rarity,
        name: item.name,
      };
    }
  }
  return null;
}
