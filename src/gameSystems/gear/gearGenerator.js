/**
 * Generate unique gear instances from templates (fixed rarity per template).
 *
 * Shop offers use a deterministic seed so the rolled stats / sockets the
 * player sees BEFORE purchase match the gear they receive AFTER purchase.
 */
import {
  GEAR_STAT_LINE_COUNT,
  GEAR_STAT_RANGES,
  GEAR_SHOP_PRICES,
} from './gearConstants';
import {
  GEAR_TEMPLATES_BY_RARITY,
  gearTemplatesForShopRarity,
  getGearTemplate,
} from './gearDefinitions';

function newInstanceId() {
  return `gear_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Deterministic LCG seeded from a string — used to keep shop preview === purchase. */
function makeSeededRng(seedStr) {
  let s = 0;
  for (let i = 0; i < seedStr.length; i += 1) {
    s = (s * 31 + seedStr.charCodeAt(i)) | 0;
  }
  s = (s >>> 0) || 1;
  return function rng() {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function rollInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

function pickRandom(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function rollStatValue(rng, statType, rarity) {
  const range = GEAR_STAT_RANGES[rarity]?.[statType];
  if (!range) return rollInt(rng, 1, 3);
  return rollInt(rng, range[0], range[1]);
}

function rollSockets(rng, rarity) {
  if (rarity === 'rare') return [];
  if (rarity === 'epic') {
    const count = rng() < 0.5 ? 0 : 1;
    return Array.from({ length: count }, (_, i) => ({
      id: `socket_${i + 1}`,
      gem: null,
    }));
  }
  const count = rng() < 0.5 ? 1 : 2;
  return Array.from({ length: count }, (_, i) => ({
    id: `socket_${i + 1}`,
    gem: null,
  }));
}

function rollStatsForTemplate(rng, template, rarity) {
  const count = GEAR_STAT_LINE_COUNT[rarity] ?? 1;
  const pool = [...(template.allowedStats || [])];
  const stats = [];
  for (let i = 0; i < count && pool.length; i += 1) {
    const idx = Math.floor(rng() * pool.length);
    const type = pool.splice(idx, 1)[0];
    stats.push({ type, value: rollStatValue(rng, type, rarity) });
  }
  return stats;
}

function instanceFromTemplate(template, rng) {
  const r = rng ?? Math.random;
  const rarity = template.rarity;
  return {
    instanceId: newInstanceId(),
    gearId: template.gearId,
    name: template.name,
    rarity,
    slot: template.slot,
    setId: template.setId,
    setName: template.setName,
    buildType: template.buildType,
    stats: rollStatsForTemplate(r, template, rarity),
    sockets: rollSockets(r, rarity),
    equippedToMonsterId: null,
    acquiredAt: new Date().toISOString(),
  };
}

/**
 * Create an instance from a template. Rarity comes from the template.
 * Pass `opts.seed` to make stat/socket rolls deterministic.
 * @param {string} gearId
 * @param {{ seed?: string }} [opts]
 */
export function generateGearInstance(gearId, opts = {}) {
  const template = getGearTemplate(gearId);
  if (!template) return null;
  const rng = opts.seed ? makeSeededRng(opts.seed) : null;
  return instanceFromTemplate(template, rng);
}

/** Sample rolled stats for reward codex / preview (deterministic per template). */
export function buildCodexGearPreview(gearId) {
  return generateGearInstance(gearId, { seed: `codex_preview_${gearId}` });
}

/** Pick a random template from the rarity pool, then generate an instance. */
export function generateRandomGearInstance(rarity, opts = {}) {
  let pool = [...(GEAR_TEMPLATES_BY_RARITY[rarity] || [])];
  if (opts.slot) pool = pool.filter((t) => t.slot === opts.slot);
  if (opts.setId) pool = pool.filter((t) => t.setId === opts.setId);
  if (!pool.length) return null;
  const rng = opts.seed ? makeSeededRng(opts.seed) : Math.random;
  const template = pickRandom(rng, pool);
  return instanceFromTemplate(template, opts.seed ? rng : null);
}

export function shopPriceForGear(rarity, seed = '') {
  const range = GEAR_SHOP_PRICES[rarity];
  if (!range) return null;
  if (seed) {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
    const span = range.max - range.min + 1;
    return range.min + (Math.abs(h) % span);
  }
  const rng = Math.random;
  return rollInt(rng, range.min, range.max);
}

function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Shop offer for one template — single piece (not a set).
 * Stats/sockets are pre-rolled with a deterministic seed so they match the
 * exact item the player receives on purchase.
 */
export function buildShopGearOffer(profileId, template, index = 0, dateKey = '') {
  const rarity = template.rarity;
  const seed = `${profileId}_${template.gearId}_${index}_${dateKey}`;
  const price = shopPriceForGear(rarity, seed);
  const rng = makeSeededRng(seed);
  const previewStats = rollStatsForTemplate(rng, template, rarity);
  const previewSockets = rollSockets(rng, rarity);
  return {
    gearId: template.gearId,
    name: template.name,
    slot: template.slot,
    setId: template.setId,
    setName: template.setName,
    buildType: template.buildType,
    rarity,
    price,
    statLineCount: GEAR_STAT_LINE_COUNT[rarity],
    maxSockets: rarity === 'epic' ? 1 : rarity === 'mythic' ? 2 : 0,
    previewStats,
    previewSockets,
    offerSeed: seed,
  };
}

/**
 * Canonical slot order — each shop set group is built in this order so
 * the player can always see Head → Body → Weapon → Hand → Legs at a glance.
 */
const SHOP_SLOT_ORDER = ['head', 'body', 'weapon', 'hand', 'legs'];

function uniqueSetIdsInOrder(pool) {
  const out = [];
  const seen = new Set();
  for (const t of pool) {
    if (!seen.has(t.setId)) {
      seen.add(t.setId);
      out.push(t.setId);
    }
  }
  return out;
}

/** Deterministic rotating pick of `count` set ids from a rarity pool. */
function pickFeaturedSets(pool, count, daySeed) {
  const ids = uniqueSetIdsInOrder(pool);
  if (!ids.length) return [];
  const out = [];
  const used = new Set();
  for (let i = 0; i < count && out.length < ids.length; i += 1) {
    const idx = (daySeed + i * 3) % ids.length;
    let pick = ids[idx];
    let cursor = idx;
    while (used.has(pick) && used.size < ids.length) {
      cursor = (cursor + 1) % ids.length;
      pick = ids[cursor];
    }
    used.add(pick);
    out.push(pick);
  }
  return out;
}

/** Pick one template for a slot from a set pool — deterministic per day. */
function pickSlotTemplate(setTemplates, slot, seed) {
  const variants = setTemplates.filter((t) => t.slot === slot);
  if (!variants.length) return null;
  return variants[seed % variants.length];
}

/**
 * Build the 5 shop offers for one featured set — one per slot type
 * (Head, Body, Weapon, Hand, Legs) in canonical order.
 */
function emitSetOffers(profileId, setTemplates, daySeed, dateKey, baseIndex) {
  const offers = [];
  SHOP_SLOT_ORDER.forEach((slot, s) => {
    const tpl = pickSlotTemplate(setTemplates, slot, daySeed + s * 13);
    if (!tpl) return;
    offers.push(buildShopGearOffer(profileId, tpl, baseIndex + s, dateKey));
  });
  return offers;
}

/**
 * Daily shop catalog.
 *
 * Each featured set always contributes exactly 5 offers (one per slot type:
 * Head, Body, Weapon, Hand, Legs) so the player can see complete set coverage
 * at a glance.
 *
 * Configuration:
 *   - 3 featured Rare sets per day → 15 Rare offers
 *   - 2 featured Epic sets per day → 10 Epic offers
 *   - Mythic gear is not sold in the shop (chest drops only).
 */
export function buildGearShopCatalog(profileId = '') {
  const rarePool = gearTemplatesForShopRarity('rare');
  const epicPool = gearTemplatesForShopRarity('epic');
  const dateKey = new Date().toISOString().slice(0, 10);
  const daySeed = profileId ? hashSeed(`${profileId}_${dateKey}`) : 0;

  const rareSetIds = pickFeaturedSets(rarePool, 3, daySeed);
  const epicSetIds = pickFeaturedSets(epicPool, 2, daySeed + 11);

  const rareOffers = [];
  rareSetIds.forEach((setId, i) => {
    const setTemplates = rarePool.filter((t) => t.setId === setId);
    rareOffers.push(
      ...emitSetOffers(profileId, setTemplates, daySeed + i * 17, dateKey, i * 5),
    );
  });

  const epicOffers = [];
  epicSetIds.forEach((setId, i) => {
    const setTemplates = epicPool.filter((t) => t.setId === setId);
    epicOffers.push(
      ...emitSetOffers(profileId, setTemplates, daySeed + i * 19 + 100, dateKey, i * 5 + 50),
    );
  });

  return { rareOffers, epicOffers };
}

export function formatGearStatLines(stats) {
  if (!Array.isArray(stats)) return [];
  const hiddenPlayerStats = new Set(['healPower', 'firePower', 'poisonPower', 'skillPower']);
  const labels = {
    attack: 'ATK',
    defense: 'DEF',
    hp: 'HP',
    speed: 'SPD',
    crit: 'Crit',
    dodge: 'Dodge',
    hitRate: 'Hit',
  };
  return stats
    .filter((s) => !hiddenPlayerStats.has(s.type))
    .map((s) => `+${s.value} ${labels[s.type] ?? s.type}`);
}
