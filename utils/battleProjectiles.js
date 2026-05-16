/**
 * Silly battle projectile presets — emoji-based, lightweight.
 */

export const PROJECTILES = {
  poop: { emoji: '💩', splat: '💥', spin: true },
  milkBottle: { emoji: '🍼', splat: '💦' },
  toiletRoll: { emoji: '🧻', splat: '✨' },
  slipper: { emoji: '🩴', splat: '💢' },
  rottenEgg: { emoji: '🥚', splat: '🍳' },
  eggBomb: { emoji: '🥚', splat: '🍳', crack: '🥚💥', spin: true },
  socks: { emoji: '🧦', splat: '💨' },
  waterSpray: { emoji: '💦', splat: '💧' },
  waterWave: { emoji: '🌊', splat: '💧', wide: true },
  cactus: { emoji: '🌵', splat: '🌵' },
  burger: { emoji: '🍔', splat: '💥' },
  pencil: { emoji: '✏️', splat: '✨', spin: true },
  tissue: { emoji: '🧻', splat: '✨' },
  feather: { emoji: '🪶', splat: '✨' },
  stinkCloud: { emoji: '💨', splat: '☁️' },
  fireball: { emoji: '🔥', splat: '💥' },
  fireBlast: { emoji: '🔥', splat: '💥', trail: true },
  bacteria: { emoji: '🦠', splat: '☁️', cloud: true },
  flyBug: { emoji: '🪰', splat: '💥' },
  phone: { emoji: '📱', splat: '⚡' },
  crocs: { emoji: '🐊', splat: '💢' },
  homework: { emoji: '📚', splat: '📄' },
  bubbleTea: { emoji: '🧋', splat: '💦' },
};

const EFFECT_TO_PROJECTILE = {
  fire: 'fireball',
  water: 'waterSpray',
  toiletPaper: 'toiletRoll',
  egg: 'rottenEgg',
  bottle: 'milkBottle',
  cactus: 'cactus',
  smellySocks: 'socks',
  whip: 'slipper',
  roar: 'tissue',
  nag: 'pencil',
  magic67: 'pencil',
};

/** Default projectile pools per monster template. */
const MONSTER_POOLS = {
  cockroachsaurus: ['poop', 'toiletRoll', 'stinkCloud'],
  chickenzilla: ['rottenEgg', 'feather', 'milkBottle'],
  water_bottle_beast: ['milkBottle', 'waterSpray'],
  toilet_paper_ninja: ['toiletRoll', 'tissue'],
  pencil_shark: ['pencil', 'waterSpray'],
  lunchbox_dragon: ['burger', 'rottenEgg'],
  homework_troll: ['homework', 'pencil'],
  iphone_warrior: ['phone', 'slipper'],
  crocs_goblin: ['crocs', 'slipper'],
  schoolbag_golem: ['homework', 'socks'],
  bubble_tea_slime: ['bubbleTea', 'waterSpray'],
  t_rex: ['burger', 'fireball'],
  skibidi_bot: ['toiletRoll', 'poop'],
};

const FALLBACK_POOL = ['poop', 'slipper', 'rottenEgg', 'socks', 'pencil'];

export function getProjectile(id) {
  return PROJECTILES[id] ?? PROJECTILES.poop;
}

/**
 * Pick a projectile style from move effect + attacker monster.
 */
export function pickProjectile({ templateId, effectType, projectileId }) {
  if (projectileId && PROJECTILES[projectileId]) return projectileId;

  const fromEffect = EFFECT_TO_PROJECTILE[effectType];
  if (fromEffect && PROJECTILES[fromEffect]) return fromEffect;

  const pool = MONSTER_POOLS[templateId] || FALLBACK_POOL;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return PROJECTILES[pick] ? pick : 'poop';
}
