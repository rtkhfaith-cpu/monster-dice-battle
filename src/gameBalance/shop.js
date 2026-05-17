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
