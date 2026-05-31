/**
 * Gem system definitions — stat gems that boost monster battle stats.
 *
 * Gems are stackable per (rarity, stat, level). Duplicate copies are spent to upgrade
 * a gem's level (linear +base per level), plus a coin fee per merge.
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

// All gem stats use linear scaling: value = rarityBase × level.
// Combat: Rare +1/lv … Mythic +10/lv on ATK/DEF/MAG/MDEF/Dodge/Hit.
// HP uses larger bases: Rare 100/lv, Epic 400/lv, Mythic 1000/lv.
const GEM_BASE_VALUES = { rare: 1, epic: 4, mythic: 10 };
const HP_GEM_BASE_VALUES = { rare: 100, epic: 400, mythic: 1000 };

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

/**
 * Gem / crystal icons only — every rarity uses diamonds, gems, or crystal shapes.
 * @type {Record<GemRarity, Record<GemStat, string>>}
 */
const GEM_EMOJI_BY_RARITY = {
  rare: {
    attack: '💎',
    magicAttack: '🔹',
    defence: '💠',
    magicDefence: '🔷',
    dodge: '🔸',
    hitRate: '🔶',
    hp: '💍',
  },
  epic: {
    attack: '💠',
    magicAttack: '🔮',
    defence: '🔷',
    magicDefence: '💎',
    dodge: '🔹',
    hitRate: '🔸',
    hp: '💍',
  },
  mythic: {
    attack: '🔮',
    magicAttack: '💎',
    defence: '💠',
    magicDefence: '🔷',
    dodge: '🔶',
    hitRate: '🔹',
    hp: '💍',
  },
};

/** Default crystal per rarity when stat is unknown. */
export const GEM_RARITY_EMOJI = {
  rare: '💎',
  epic: '💠',
  mythic: '🔮',
};

/** Canonical key for a gem stack — one upgradeable stack per (rarity, stat). */
export function gemKey(rarity, stat) {
  return `${rarity}_${stat}_gem`;
}

const GEM_DEF_BY_KEY = new Map();
for (const rarity of GEM_RARITIES) {
  for (const stat of GEM_STATS) {
    GEM_DEF_BY_KEY.set(gemKey(rarity, stat), { rarity, stat });
  }
}

/** Resolve a stored gem key (supports legacy formats). */
export function parseGemKey(key) {
  const k = String(key || '').trim();
  if (GEM_DEF_BY_KEY.has(k)) return GEM_DEF_BY_KEY.get(k);
  if (k && !k.endsWith('_gem')) {
    const legacy = `${k}_gem`;
    if (GEM_DEF_BY_KEY.has(legacy)) return GEM_DEF_BY_KEY.get(legacy);
  }
  // Tolerate a stack id (type + level) being passed where a type key is expected.
  const at = k.indexOf('@');
  if (at > 0) {
    const base = k.slice(0, at);
    if (GEM_DEF_BY_KEY.has(base)) return GEM_DEF_BY_KEY.get(base);
  }
  return null;
}

/**
 * Stable id for one inventory row: a gem TYPE (rarity + stat) at a specific LEVEL.
 * Players can own the same type at several levels as independent, selectable rows.
 * Example: `rare_magicAttack_gem@5`.
 */
export function gemStackId(rarity, stat, level) {
  const lvl = Math.max(1, Math.min(GEM_MAX_LEVEL, Math.floor(level || 1)));
  return `${gemKey(rarity, stat)}@${lvl}`;
}

/** Parse a stack id (or a plain type key, treated as level 1) → { rarity, stat, level }. */
export function parseGemStackId(id) {
  const raw = String(id || '').trim();
  const at = raw.indexOf('@');
  const typePart = at > 0 ? raw.slice(0, at) : raw;
  const parsed = parseGemKey(typePart);
  if (!parsed) return null;
  let level = 1;
  if (at > 0) {
    const n = parseInt(raw.slice(at + 1), 10);
    if (Number.isFinite(n)) level = Math.max(1, Math.min(GEM_MAX_LEVEL, n));
  }
  return { rarity: parsed.rarity, stat: parsed.stat, level };
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

/** @param {GemStat} stat @param {GemRarity} [rarity] */
export function gemEmoji(stat, rarity = 'rare') {
  const tier = GEM_EMOJI_BY_RARITY[rarity] ?? GEM_EMOJI_BY_RARITY.rare;
  return tier?.[stat] ?? GEM_RARITY_EMOJI[rarity] ?? GEM_RARITY_EMOJI.rare;
}

/** Spare duplicate gems required to merge up from `currentLevel` (stack = owned gem). */
export function getRequiredGemsForUpgrade(currentLevel) {
  const lvl = Math.max(1, Math.floor(currentLevel));
  return Math.pow(2, lvl - 1);
}

/** @deprecated HP now uses linear scaling; kept for any legacy callers. */
export function getGemFinalValue(baseValue, level) {
  const lvl = Math.max(1, Math.floor(level));
  return baseValue * lvl;
}

/** @deprecated Use gemStatValue instead. */
export function getDisplayGemValue(baseValue, level) {
  return Math.round(getGemFinalValue(baseValue, level));
}

/**
 * Stat bonus from a socketed gem (rarity + stat + level).
 * Linear for every stat: rarityBase × level.
 *   Combat rare: 1, 2 … 10 · epic: 4 … 40 · mythic: 10 … 100
 *   HP rare: 100 … 1000 · epic: 400 … 4000 · mythic: 1000 … 10000
 */
export function gemStatValue(rarity, stat, level) {
  const lvl = Math.max(1, Math.min(GEM_MAX_LEVEL, Math.floor(level)));
  return gemBaseValue(rarity, stat) * lvl;
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
    emoji: gemEmoji(stat, rarity),
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
