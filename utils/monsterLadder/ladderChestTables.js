import { getLadderGearByRarity } from './ladderGearCatalog';
import { getLadderMonstersByRarity } from './ladderMonsterCatalog';
import { LADDER_PITY, LADDER_RARITY_ORDER, LADDER_RARITY_WEIGHTS } from './ladderConstants';

function rollRarity(pityCounter, chestType, rateWeights = LADDER_RARITY_WEIGHTS) {
  const epicGate = pityCounter > 0 && pityCounter % LADDER_PITY.epicPlusEvery === 0;
  const legGate = pityCounter > 0 && pityCounter % LADDER_PITY.legendaryPlusEvery === 0;
  const mythGate = pityCounter > 0 && pityCounter % LADDER_PITY.mythicEvery === 0;

  if (mythGate) return 'mythic';
  if (legGate) return 'legendary';
  if (epicGate) return 'epic';

  const total = LADDER_RARITY_ORDER.reduce((s, r) => s + (rateWeights[r] ?? 0), 0);
  let roll = Math.random() * total;
  for (const r of LADDER_RARITY_ORDER) {
    roll -= rateWeights[r] ?? 0;
    if (roll <= 0) return r;
  }
  return 'common';
}

function pickFromPool(pool) {
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

function ladderMonsterPool(rarity) {
  return getLadderMonstersByRarity(rarity).map((m) => ({
    id: m.id,
    name: m.name,
    rarity: m.rarity,
  }));
}

/**
 * @param {'gear'|'monster'} chestType
 * @param {number} pityCounter — opens since last pity reset for this chest type
 * @param {Record<string, number>} [rateWeights]
 */
export function rollChestDrop(chestType, pityCounter, rateWeights) {
  const weights = rateWeights ?? LADDER_RARITY_WEIGHTS;
  const rarity = rollRarity(pityCounter + 1, chestType, weights);
  const tryRarities = [rarity, ...LADDER_RARITY_ORDER.filter((r) => r !== rarity)];
  for (const r of tryRarities) {
    const pool = chestType === 'gear' ? getLadderGearByRarity(r) : ladderMonsterPool(r);
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
