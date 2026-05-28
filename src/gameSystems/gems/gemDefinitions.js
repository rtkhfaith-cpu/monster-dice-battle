/**
 * Gem system definitions — stat gems that boost monster battle stats.
 *
 * Gems are stackable per (rarity, stat). Duplicate copies are spent to upgrade
 * a gem's level (each level = +10% value), plus a coin fee per merge.
 * Socket gems into epic/mythic gear that has sockets — stats apply only when socketed.
 *
 * Source rules (enforced by drop/shop code, documented here):
 *   - Rare gems: shop only.
 *   - Epic gems: normal chest, mini battle chest, dungeon bosses.
 *   - Mythic gems: ONLY the Black Dragon dungeon boss.
 */

/** @typedef {'attack'|'magicAttack'|'defence'|'magicDefence'|'dodge'|'hitRate'|'hp'} GemStat */
/** @typedef {'rare'|'epic'|'mythic'} GemRarity */
/** @typedef {'offensive'|'defensive'|'utility'} GemSlot */

export const GEM_RARITIES = /** @type {const} */ (['rare', 'epic', 'mythic']);

export const GEM_STATS = /** @type {const} */ ([
  'attack',
  'magicAttack',
  'defence',
  'magicDefence',
  'dodge',
  'hitRate',
  'hp',
]);

/** Which gem stats belong to which equip slot (prevents stacking only attack). */
export const GEM_SLOT_CATEGORIES = {
  offensive: ['attack', 'magicAttack'],
  defensive: ['hp', 'defence', 'magicDefence'],
  utility: ['dodge', 'hitRate'],
};

export const GEM_MAX_LEVEL = 10;

const GEM_BASE_VALUES = { rare: 2, epic: 4, mythic: 10 };
const HP_GEM_BASE_VALUES = { rare: 200, epic: 500, mythic: 1200 };

export const GEM_STAT_LABELS = {
  attack: 'Attack',
  magicAttack: 'Magic Attack',
  defence: 'Defence',
  magicDefence: 'Magic Defence',
  dodge: 'Dodge',
  hitRate: 'Hit Rate',
  hp: 'HP',
};

export const GEM_RARITY_UI = {
  rare: { label: 'Rare', color: '#0984e3', chipBg: '#74b9ff', chipFg: '#1e3799' },
  epic: { label: 'Epic', color: '#6c5ce7', chipBg: '#a29bfe', chipFg: '#2d1b69' },
  mythic: { label: 'Mythic', color: '#e84393', chipBg: '#fd79a8', chipFg: '#6c1339' },
};

const GEM_STAT_EMOJI = {
  attack: '⚔️',
  magicAttack: '✨',
  defence: '🛡️',
  magicDefence: '🔮',
  dodge: '💨',
  hitRate: '🎯',
  hp: '❤️',
};

/** Canonical key for a gem stack — one upgradeable stack per (rarity, stat). */
export function gemKey(rarity, stat) {
  return `${rarity}_${stat}_gem`;
}

/** @param {string} stat */
export function gemSlotForStat(stat) {
  for (const slot of Object.keys(GEM_SLOT_CATEGORIES)) {
    if (GEM_SLOT_CATEGORIES[slot].includes(stat)) return /** @type {GemSlot} */ (slot);
  }
  return null;
}

/** @param {GemRarity} rarity @param {GemStat} stat */
export function gemBaseValue(rarity, stat) {
  if (stat === 'hp') return HP_GEM_BASE_VALUES[rarity] ?? HP_GEM_BASE_VALUES.rare;
  return GEM_BASE_VALUES[rarity] ?? GEM_BASE_VALUES.rare;
}

export function gemDisplayName(rarity, stat) {
  const r = GEM_RARITY_UI[rarity]?.label ?? rarity;
  return `${r} ${GEM_STAT_LABELS[stat] ?? stat} Gem`;
}

export function gemEmoji(stat) {
  return GEM_STAT_EMOJI[stat] ?? '💎';
}

/** Duplicate copies required to go from `currentLevel` to the next level. */
export function getRequiredGemsForUpgrade(currentLevel) {
  return Math.pow(2, Math.max(1, Math.floor(currentLevel)));
}

/** Raw final value of a gem at a given level (each level = +10%). */
export function getGemFinalValue(baseValue, level) {
  return baseValue * Math.pow(1.1, Math.max(1, Math.floor(level)) - 1);
}

/** Rounded value shown to the player and applied in battle. */
export function getDisplayGemValue(baseValue, level) {
  return Math.round(getGemFinalValue(baseValue, level));
}

/** Convenience: value of a gem stack (rarity + stat + level). */
export function gemStatValue(rarity, stat, level) {
  return getDisplayGemValue(gemBaseValue(rarity, stat), level);
}

/** Build the canonical definition object for a gem stack. */
export function makeGemDef(rarity, stat) {
  return {
    id: gemKey(rarity, stat),
    name: gemDisplayName(rarity, stat),
    rarity,
    stat,
    slot: gemSlotForStat(stat),
    baseValue: gemBaseValue(rarity, stat),
    emoji: gemEmoji(stat),
  };
}

/** All gem definitions (rarity × stat). */
export const GEM_DEFINITIONS = GEM_RARITIES.flatMap((rarity) =>
  GEM_STATS.map((stat) => makeGemDef(rarity, stat)),
);

/** Rare gems available in the shop. */
export const RARE_GEM_SHOP_ITEMS = GEM_STATS.map((stat) => gemKey('rare', stat));

/** Suggested shop prices: rare normal gem = 500, rare HP gem = 800. */
export function rareGemShopPrice(stat) {
  return stat === 'hp' ? 800 : 500;
}

/** Base coin fees by gem rarity (socket / remove / merge). */
const GEM_SERVICE_COIN_BASE = { rare: 250, epic: 500, mythic: 1000 };

/** Coins to insert a gem into an empty gear socket. */
export function gemSocketInsertCoinCost(rarity) {
  return GEM_SERVICE_COIN_BASE[rarity] ?? GEM_SERVICE_COIN_BASE.rare;
}

/** Coins to remove a gem from a gear socket (gem returns to inventory). */
export function gemSocketRemoveCoinCost(rarity) {
  const base = GEM_SERVICE_COIN_BASE[rarity] ?? GEM_SERVICE_COIN_BASE.rare;
  return Math.round(base * 0.75);
}

/** Coins to merge/upgrade a gem one level (in addition to duplicate copies). */
export function gemUpgradeCoinCost(rarity, currentLevel) {
  const base = GEM_SERVICE_COIN_BASE[rarity] ?? GEM_SERVICE_COIN_BASE.rare;
  return base + Math.max(1, Math.floor(currentLevel)) * 50;
}

/** Epic gem drop chance (percent) per source. */
export const EPIC_GEM_DROP_RATES = {
  normalChest: 5,
  miniBattleChest: 10,
  dungeonBoss: 20,
};
