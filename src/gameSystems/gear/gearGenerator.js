/**
 * Generate unique gear instances from templates.
 */
import {
  GEAR_STAT_LINE_COUNT,
  GEAR_STAT_RANGES,
  GEAR_SHOP_PRICES,
} from './gearConstants';
import { GEAR_TEMPLATE_LIST, getGearTemplate } from './gearDefinitions';

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

/**
 * @param {string} gearId
 * @param {'rare'|'epic'|'mythic'} rarity
 */
export function generateGearInstance(gearId, rarity) {
  const template = getGearTemplate(gearId);
  if (!template) return null;
  if (!GEAR_STAT_LINE_COUNT[rarity]) return null;

  return {
    instanceId: newInstanceId(),
    gearId: template.gearId,
    name: template.name,
    rarity,
    slot: template.slot,
    set: template.set,
    setName: template.setName,
    stats: rollStatsForTemplate(template, rarity),
    sockets: rollSockets(rarity),
    equippedToMonsterId: null,
    acquiredAt: new Date().toISOString(),
  };
}

/** Random template + rarity for drops. */
export function generateRandomGearInstance(rarity, opts = {}) {
  let pool = GEAR_TEMPLATE_LIST;
  if (opts.slot) pool = pool.filter((t) => t.slot === opts.slot);
  if (opts.set) pool = pool.filter((t) => t.set === opts.set);
  if (!pool.length) pool = GEAR_TEMPLATE_LIST;
  const template = pickRandom(pool);
  return generateGearInstance(template.gearId, rarity);
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

/** Shop stock row: one random template offer per refresh seed. */
export function buildShopGearOffer(profileId, rarity, index) {
  const template = GEAR_TEMPLATE_LIST[index % GEAR_TEMPLATE_LIST.length];
  const price = shopPriceForGear(rarity, `${profileId}_${template.gearId}_${rarity}`);
  return {
    gearId: template.gearId,
    name: template.name,
    slot: template.slot,
    set: template.set,
    setName: template.setName,
    rarity,
    price,
    statLineCount: GEAR_STAT_LINE_COUNT[rarity],
    maxSockets: rarity === 'epic' ? 1 : 0,
  };
}

export function buildGearShopCatalog(profileId = '') {
  const rareOffers = GEAR_TEMPLATE_LIST.slice(0, 12).map((t, i) => ({
    ...buildShopGearOffer(profileId, 'rare', i),
    templateIndex: i,
  }));
  const epicOffers = GEAR_TEMPLATE_LIST.slice(0, 8).map((t, i) => ({
    ...buildShopGearOffer(profileId, 'epic', i + 20),
    templateIndex: i,
  }));
  return { rareOffers, epicOffers };
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
