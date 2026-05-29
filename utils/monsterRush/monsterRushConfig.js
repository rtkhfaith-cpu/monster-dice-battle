/** Monster Rush — endless runner config (expandable to stage themes later). */

export const RUSH_MODE = {
  ENDLESS: 'endless',
  STAGE: 'stage',
};

export const MONSTER_RUSH_PHYSICS = {
  playerSize: 56,
  collisionSize: 44,
  playerX: 80,
  gravity: 0.8,
  jumpVelocity: -14,
  baseSpeed: 5,
  maxSpeed: 13,
  speedIncreaseEveryDistance: 500,
  speedIncreaseAmount: 0.5,
};

export const MONSTER_RUSH_OBSTACLES = [
  { id: 'spike', name: 'Spike', width: 36, height: 42, emoji: '▲', color: '#94a3b8' },
  { id: 'double_spike', name: 'Double Spike', width: 72, height: 42, emoji: '▲▲', color: '#64748b' },
  { id: 'rock', name: 'Rock', width: 44, height: 44, emoji: '🪨', color: '#78716c' },
  { id: 'fire_trap', name: 'Fire Trap', width: 56, height: 36, emoji: '🔥', color: '#f97316' },
  { id: 'ice_block', name: 'Ice Block', width: 48, height: 48, emoji: '🧊', color: '#38bdf8' },
];

/** Future stage themes — structure only for now. */
export const MONSTER_RUSH_THEMES = {
  grass: {
    id: 'grass',
    name: 'Grass Rush',
    background: 'green_hills',
    obstaclePool: ['spike', 'rock'],
    speedMultiplier: 1,
  },
  ice: {
    id: 'ice',
    name: 'Ice Rush',
    background: 'ice_cavern',
    obstaclePool: ['ice_block', 'spike'],
    speedMultiplier: 1.1,
  },
  fire: {
    id: 'fire',
    name: 'Fire Rush',
    background: 'lava_path',
    obstaclePool: ['fire_trap', 'spike', 'rock'],
    speedMultiplier: 1.2,
  },
};

export const DEFAULT_RUSH_THEME = MONSTER_RUSH_THEMES.grass;

export function rushSpeedForDistance(distanceM) {
  const { baseSpeed, maxSpeed, speedIncreaseEveryDistance, speedIncreaseAmount } = MONSTER_RUSH_PHYSICS;
  const bonus = Math.floor(distanceM / speedIncreaseEveryDistance) * speedIncreaseAmount;
  return Math.min(baseSpeed + bonus, maxSpeed);
}

export function rushPointsFromRun(distanceM, coinsCollected) {
  return Math.floor(distanceM / 10) + Math.max(0, coinsCollected);
}

export function obstacleDefById(id) {
  return MONSTER_RUSH_OBSTACLES.find((o) => o.id === id) ?? MONSTER_RUSH_OBSTACLES[0];
}

/** Difficulty tier from distance (meters). */
export function rushDifficultyTier(distanceM) {
  if (distanceM < 300) return 0;
  if (distanceM < 800) return 1;
  if (distanceM < 1500) return 2;
  return 3;
}

export function obstaclePoolForTier(tier) {
  if (tier <= 0) return ['spike'];
  if (tier === 1) return ['spike', 'rock'];
  if (tier === 2) return ['spike', 'rock', 'double_spike', 'fire_trap'];
  return ['spike', 'rock', 'double_spike', 'fire_trap', 'ice_block'];
}

export function spawnIntervalMsForTier(tier) {
  if (tier <= 0) return { min: 1800, max: 2500 };
  if (tier === 1) return { min: 1500, max: 2200 };
  if (tier === 2) return { min: 1200, max: 1900 };
  return { min: 1000, max: 1600 };
}
