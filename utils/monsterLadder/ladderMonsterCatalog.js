/**
 * Ladder-exclusive monsters — NOT in MONSTER_CATALOG / shop.
 */

/** @typedef {'common'|'rare'|'epic'|'legendary'|'mythic'} LadderRarity */
/** @typedef {'speedster'|'tank'|'brawler'|'mage'|'support'|'trickster'|'balanced'|'debuffer'} LadderRole */

const GROWTH = {
  hpPerLevel: 4,
  mpPerLevel: 1.1,
  attackEveryLevels: 4,
  magicEveryLevels: 4,
  defEveryLevels: 5,
  magicDefEveryLevels: 5,
  criticalEveryLevels: 6,
  dodgeEveryLevels: 7,
};

/** @type {Record<LadderRarity, object>} */
const BASE_BY_RARITY = {
  common: {
    hp: 145, mp: 54, attackMin: 14, attackMax: 20, magicMin: 10, magicMax: 16,
    defMin: 6, defMax: 10, magicDefMin: 5, magicDefMax: 9, critical: 8, dodge: 12,
  },
  rare: {
    hp: 158, mp: 58, attackMin: 15, attackMax: 22, magicMin: 12, magicMax: 18,
    defMin: 7, defMax: 12, magicDefMin: 6, magicDefMax: 11, critical: 10, dodge: 14,
  },
  epic: {
    hp: 172, mp: 64, attackMin: 16, attackMax: 24, magicMin: 14, magicMax: 22,
    defMin: 9, defMax: 14, magicDefMin: 8, magicDefMax: 13, critical: 11, dodge: 12,
  },
  legendary: {
    hp: 188, mp: 72, attackMin: 18, attackMax: 26, magicMin: 16, magicMax: 26,
    defMin: 10, defMax: 16, magicDefMin: 9, magicDefMax: 15, critical: 12, dodge: 11,
  },
  mythic: {
    hp: 205, mp: 80, attackMin: 20, attackMax: 28, magicMin: 18, magicMax: 30,
    defMin: 12, defMax: 18, magicDefMin: 11, magicDefMax: 17, critical: 14, dodge: 10,
  },
};

/** Per-mythic tuning — overrides BASE_BY_RARITY.mythic when set on a def. */
const MYTHIC_CUSTOM_BASE = {
  algorithm_angel: {
    hp: 250,
    mp: 150,
    attackMin: 14,
    attackMax: 20,
    magicMin: 38,
    magicMax: 52,
    defMin: 16,
    defMax: 23,
    magicDefMin: 22,
    magicDefMax: 30,
    critical: 14,
    dodge: 13,
  },
  core_feed_beast: {
    // Mythic magic nuker — highest magic in the roster with enough bulk to feel mythic.
    hp: 280,
    mp: 130,
    attackMin: 24,
    attackMax: 34,
    magicMin: 48,
    magicMax: 66,
    defMin: 16,
    defMax: 23,
    magicDefMin: 18,
    magicDefMax: 25,
    critical: 20,
    dodge: 11,
  },
};

/** Optional growth overrides for ladder mythics. */
const MYTHIC_CUSTOM_GROWTH = {
  algorithm_angel: {
    ...GROWTH,
    hp: 6,
    mp: 6,
    attack: 1.5,
    magic: 5,
    defense: 3,
    speed: 2,
    criticalEveryLevels: 5,
    dodgeEveryLevels: 6,
    hitEveryLevels: 7,
  },
  core_feed_beast: {
    ...GROWTH,
    hp: 7,
    mp: 5,
    attack: 4,
    magic: 5.5,
    defense: 3,
    speed: 2,
    criticalEveryLevels: 4,
    dodgeEveryLevels: 7,
    hitEveryLevels: 7,
  },
};

/** @type {Array<{ id: string, name: string, rarity: LadderRarity, role: LadderRole, element: string, elements: string[], faction: string, colorIdx: number, species: number }>} */
const DEFS = [
  { id: 'glitchroach_prime', name: 'Glitchroach Prime', rarity: 'rare', role: 'debuffer', element: 'metal', elements: ['metal', 'earth'], faction: 'noise_tech', colorIdx: 7, species: 12 },
  { id: 'toiletron_titan', name: 'Toiletron Titan', rarity: 'epic', role: 'tank', element: 'water', elements: ['water', 'metal'], faction: 'sewer', colorIdx: 4, species: 13 },
  { id: 'nugget_dragon', name: 'Nugget Dragon', rarity: 'common', role: 'brawler', element: 'wood', elements: ['wood', 'earth'], faction: 'fast_food', colorIdx: 2, species: 14 },
  { id: 'bubble_tea_hydra', name: 'Bubble Tea Hydra', rarity: 'legendary', role: 'trickster', element: 'water', elements: ['water', 'wood'], faction: 'boba', colorIdx: 5, species: 15 },
  { id: 'lagzilla', name: 'Lagzilla', rarity: 'epic', role: 'brawler', element: 'earth', elements: ['earth', 'metal'], faction: 'noise_tech', colorIdx: 6, species: 16 },
  { id: 'durian_knight', name: 'Durian Knight', rarity: 'rare', role: 'brawler', element: 'wood', elements: ['wood', 'earth'], faction: 'tropical', colorIdx: 3, species: 17 },
  { id: 'wifi_wraith', name: 'WiFi Wraith', rarity: 'epic', role: 'mage', element: 'metal', elements: ['metal', 'metal'], faction: 'noise_tech', colorIdx: 8, species: 18 },
  { id: 'cola_kraken', name: 'Cola Kraken', rarity: 'rare', role: 'mage', element: 'water', elements: ['water', 'water'], faction: 'fast_food', colorIdx: 1, species: 19 },
  { id: 'charging_cable_serpent', name: 'Charging Cable Serpent', rarity: 'common', role: 'speedster', element: 'metal', elements: ['metal', 'metal'], faction: 'noise_tech', colorIdx: 9, species: 20 },
  {
    id: 'algorithm_angel',
    name: 'Algorithm Angel',
    rarity: 'mythic',
    role: 'support',
    element: 'water',
    elements: ['water', 'metal'],
    faction: 'core_feed',
    colorIdx: 10,
    species: 21,
    description: 'Mythic support — Water / Metal. Heals allies and revives from the brink. Counters Bubble Tea Slime.',
  },
  { id: 'trash_panda_ronin', name: 'Trash Panda Ronin', rarity: 'rare', role: 'trickster', element: 'earth', elements: ['earth', 'earth'], faction: 'urban', colorIdx: 4, species: 22 },
  { id: 'pizza_meteor', name: 'Pizza Meteor', rarity: 'common', role: 'balanced', element: 'fire', elements: ['fire', 'earth'], faction: 'fast_food', colorIdx: 2, species: 23 },
  { id: 'cloud_catfish', name: 'Cloud Catfish', rarity: 'rare', role: 'mage', element: 'wood', elements: ['wood', 'water'], faction: 'sky', colorIdx: 5, species: 24 },
  { id: 'keyboard_golem', name: 'Keyboard Golem', rarity: 'epic', role: 'tank', element: 'wood', elements: ['wood', 'metal'], faction: 'noise_tech', colorIdx: 7, species: 25 },
  { id: 'noodle_basilisk', name: 'Noodle Basilisk', rarity: 'legendary', role: 'mage', element: 'wood', elements: ['wood', 'fire'], faction: 'food', colorIdx: 3, species: 26 },
  { id: 'sneaker_shark', name: 'Sneaker Shark', rarity: 'rare', role: 'speedster', element: 'fire', elements: ['fire', 'metal'], faction: 'urban', colorIdx: 6, species: 27 },
  { id: 'battery_bat', name: 'Battery Bat', rarity: 'common', role: 'trickster', element: 'water', elements: ['water', 'metal'], faction: 'noise_tech', colorIdx: 8, species: 28 },
  { id: 'meme_monk', name: 'Meme Monk', rarity: 'epic', role: 'trickster', element: 'fire', elements: ['fire', 'earth'], faction: 'meme', colorIdx: 1, species: 29 },
  { id: 'ice_cream_yeti', name: 'Ice Cream Yeti', rarity: 'rare', role: 'tank', element: 'water', elements: ['water', 'water'], faction: 'frozen', colorIdx: 5, species: 30 },
  { id: 'microwave_mantis', name: 'Microwave Mantis', rarity: 'legendary', role: 'balanced', element: 'metal', elements: ['metal', 'fire'], faction: 'kitchen', colorIdx: 2, species: 31 },
  { id: 'traffic_cone_cyclops', name: 'Traffic Cone Cyclops', rarity: 'common', role: 'tank', element: 'earth', elements: ['earth', 'earth'], faction: 'urban', colorIdx: 4, species: 32 },
  { id: 'bubblewrap_blob', name: 'Bubblewrap Blob', rarity: 'common', role: 'brawler', element: 'water', elements: ['water', 'metal'], faction: 'plastic', colorIdx: 6, species: 33 },
  { id: 'drone_goblin', name: 'Drone Goblin', rarity: 'rare', role: 'brawler', element: 'metal', elements: ['metal', 'water'], faction: 'noise_tech', colorIdx: 9, species: 34 },
  { id: 'blackout_bunny', name: 'Blackout Bunny', rarity: 'epic', role: 'debuffer', element: 'water', elements: ['water', 'earth'], faction: 'blackout', colorIdx: 7, species: 35 },
  {
    id: 'core_feed_beast',
    name: 'Core Feed Beast',
    rarity: 'mythic',
    role: 'mage',
    element: 'wood',
    elements: ['wood', 'fire'],
    faction: 'core_feed',
    colorIdx: 10,
    species: 36,
    description: 'Mythic magic nuker — Wood / Fire. Counters Goldzilla.',
  },
];

function buildTemplate(def) {
  const custom = MYTHIC_CUSTOM_BASE[def.id];
  const baseStats = custom ? { ...custom } : { ...BASE_BY_RARITY[def.rarity] };
  return {
    id: def.id,
    name: def.name,
    rarity: def.rarity,
    role: def.role,
    element: def.element,
    elements: def.elements,
    faction: def.faction,
    description: def.description ?? `Ladder-exclusive · ${def.faction}`,
    baseStats,
    growthProfile: MYTHIC_CUSTOM_GROWTH[def.id]
      ? { ...MYTHIC_CUSTOM_GROWTH[def.id] }
      : { ...GROWTH },
    visualProfile: {
      defaultParts: {
        species: def.species,
        body: def.species % 5,
        head: (def.species + 1) % 6,
        eyes: (def.species + 2) % 6,
        mouth: (def.species + 3) % 6,
        horn: def.species % 4,
        tail: (def.species + 1) % 5,
        hands: 2,
        legs: 2,
        colorIdx: def.colorIdx,
        ladderPremium: true,
      },
      auraColor: '#a29bfe',
      idleAnim: 'ladder_pulse',
      moveFlair: 'ladderBurst',
    },
    soundProfile: { idle: 'ladder_hum', hit: 'ladder_pop' },
    obtainableFrom: 'monster_chest_only',
  };
}

/** @type {Record<string, ReturnType<typeof buildTemplate>>} */
export const LADDER_MONSTER_BY_ID = Object.fromEntries(DEFS.map((d) => [d.id, buildTemplate(d)]));

export const LADDER_MONSTER_CATALOG = DEFS.map(buildTemplate);

export function getLadderMonsterTemplate(id) {
  return LADDER_MONSTER_BY_ID[id] ?? null;
}

export function getLadderMonstersByRarity(rarity) {
  return LADDER_MONSTER_CATALOG.filter((m) => m.rarity === rarity);
}
