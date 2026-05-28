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
 * Rotating shop: 12 Rare + 8 Epic individual gear offers.
 * Each offer is one piece (e.g. Iron Guard Helm), not a full set.
 */
export function buildGearShopCatalog(profileId = '') {
  const rarePool = gearTemplatesForShopRarity('rare');
  const epicPool = gearTemplatesForShopRarity('epic');
  const dateKey = new Date().toISOString().slice(0, 10);
  const daySeed = profileId ? hashSeed(`${profileId}_${dateKey}`) : 0;

  const pickRotating = (pool, count) => {
    if (!pool.length) return [];
    const offers = [];
    for (let i = 0; i < count; i += 1) {
      const idx = (daySeed + i * 7) % pool.length;
      offers.push(buildShopGearOffer(profileId, pool[idx], i, dateKey));
    }
    return offers;
  };

  return {
    rareOffers: pickRotating(rarePool, 12),
    epicOffers: pickRotating(epicPool, 8),
  };
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
