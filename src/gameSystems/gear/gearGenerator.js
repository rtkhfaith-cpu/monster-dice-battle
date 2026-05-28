/**
 * Generate unique gear instances from templates (fixed rarity per template).
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

function rollInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rollStatValue(statType, rarity) {
  const range = GEAR_STAT_RANGES[rarity]?.[statType];
  if (!range) return rollInt(1, 3);
  return rollInt(range[0], range[1]);
}

function rollSockets(rarity) {
  if (rarity === 'rare') return [];
  if (rarity === 'epic') {
    const count = Math.random() < 0.5 ? 0 : 1;
    return Array.from({ length: count }, (_, i) => ({
      id: `socket_${i + 1}`,
      gem: null,
    }));
  }
  const count = Math.random() < 0.5 ? 1 : 2;
  return Array.from({ length: count }, (_, i) => ({
    id: `socket_${i + 1}`,
    gem: null,
  }));
}

function rollStatsForTemplate(template, rarity) {
  const count = GEAR_STAT_LINE_COUNT[rarity] ?? 1;
  const pool = [...(template.allowedStats || [])];
  const stats = [];
  for (let i = 0; i < count && pool.length; i += 1) {
    const idx = Math.floor(Math.random() * pool.length);
    const type = pool.splice(idx, 1)[0];
    stats.push({ type, value: rollStatValue(type, rarity) });
  }
  return stats;
}

function instanceFromTemplate(template) {
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
    stats: rollStatsForTemplate(template, rarity),
    sockets: rollSockets(rarity),
    equippedToMonsterId: null,
    acquiredAt: new Date().toISOString(),
  };
}

/**
 * Create an instance from a template. Rarity comes from the template only.
 * @param {string} gearId
 */
export function generateGearInstance(gearId) {
  const template = getGearTemplate(gearId);
  if (!template) return null;
  return instanceFromTemplate(template);
}

/** Pick a random template from the rarity pool, then generate an instance. */
export function generateRandomGearInstance(rarity, opts = {}) {
  let pool = [...(GEAR_TEMPLATES_BY_RARITY[rarity] || [])];
  if (opts.slot) pool = pool.filter((t) => t.slot === opts.slot);
  if (opts.setId) pool = pool.filter((t) => t.setId === opts.setId);
  if (!pool.length) return null;
  const template = pickRandom(pool);
  return instanceFromTemplate(template);
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
  return rollInt(range.min, range.max);
}

function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Shop stock row from a specific template in the rarity pool. */
export function buildShopGearOffer(profileId, template, index = 0) {
  const rarity = template.rarity;
  const price = shopPriceForGear(rarity, `${profileId}_${template.gearId}_${index}`);
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
    maxSockets: rarity === 'epic' ? 1 : 0,
  };
}

/** Rotating shop: 12 Rare + 8 Epic offers from rarity-specific template pools. */
export function buildGearShopCatalog(profileId = '') {
  const rarePool = gearTemplatesForShopRarity('rare');
  const epicPool = gearTemplatesForShopRarity('epic');
  const daySeed = profileId ? hashSeed(`${profileId}_${new Date().toISOString().slice(0, 10)}`) : 0;

  const pickRotating = (pool, count) => {
    if (!pool.length) return [];
    const offers = [];
    for (let i = 0; i < count; i += 1) {
      const idx = (daySeed + i * 7) % pool.length;
      offers.push(buildShopGearOffer(profileId, pool[idx], i));
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
  const labels = {
    attack: 'ATK',
    defense: 'DEF',
    hp: 'HP',
    speed: 'SPD',
    crit: 'Crit',
    dodge: 'Dodge',
    hitRate: 'Hit',
    healPower: 'Heal',
    firePower: 'Fire',
    poisonPower: 'Poison',
    skillPower: 'Skill',
  };
  return stats.map((s) => `+${s.value} ${labels[s.type] ?? s.type}`);
}
