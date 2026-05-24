export const SHOP_PRICE_RANGES = {
  common: [50, 120],
  rare: [180, 350],
  epic: [600, 1200],
  legendary: [2000, 4000],
  mythic: [8000, 12000],
};

export const GEAR_SLOT_UNLOCK_COSTS = {
  4: 300,
  5: 800,
  6: 1800,
};

const MONSTER_PRICE_BY_RARITY = {
  common: 80,
  rare: 260,
  epic: 900,
  legendary: 2800,
  mythic: null,
};

const GEAR_PRICE_BY_CATEGORY = {
  stat: 90,
  element: 240,
  fun: 70,
};

export function monsterShopPrice(template) {
  if (!template) return null;
  const price = MONSTER_PRICE_BY_RARITY[template.rarity];
  return typeof price === 'number' ? price : null;
}

export function isMonsterNormallyPurchasable(template) {
  return typeof monsterShopPrice(template) === 'number';
}

export function gearShopPrice(gear) {
  if (!gear) return null;
  const base = GEAR_PRICE_BY_CATEGORY[gear.category] ?? 90;
  if (gear.elementMode === 'override') return Math.max(base, 260);
  if (gear.elementMode === 'enhance') return Math.max(base, 220);
  if ((gear.bonuses?.expPct ?? 0) > 0) return Math.max(base, 120);
  return base;
}

/** Passive skill book mart pricing. */
export const PASSIVE_BOOK_SHOP_RANGES = {
  rare: [500, 900],
  epic: [2000, 4000],
  legendary: [10000, 12000],
};

/**
 * @param {'rare'|'epic'|'legendary'|'mythic'} rarity
 * @param {{ eventShop?: boolean, seed?: string }} [opts]
 */
export function passiveBookShopPrice(rarity, opts = {}) {
  if (rarity === 'mythic') return null;
  if (rarity === 'legendary' && !opts.eventShop) return null;
  const range = PASSIVE_BOOK_SHOP_RANGES[rarity];
  if (!range) return null;
  const [min, max] = range;
  if (opts.seed) {
    let h = 0;
    for (let i = 0; i < opts.seed.length; i++) h = (h * 31 + opts.seed.charCodeAt(i)) | 0;
    const t = Math.abs(h) % (max - min + 1);
    return min + t;
  }
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** Shop stock: rare always; epic ~35% daily rotation; legendary event-only. */
export function passiveBookShopOffers(skillId, profileId = '') {
  const offers = [{ rarity: 'rare', price: passiveBookShopPrice('rare', { seed: `${profileId}_${skillId}_rare` }) }];
  const epicRoll = (profileId + skillId).length % 3 === 0;
  if (epicRoll) {
    offers.push({
      rarity: 'epic',
      price: passiveBookShopPrice('epic', { seed: `${profileId}_${skillId}_epic` }),
    });
  }
  return offers;
}
