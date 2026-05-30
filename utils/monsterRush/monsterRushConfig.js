/** Monster Rush — endless runner config (expandable to stage themes later). */

export const RUSH_MODE = {
  ENDLESS: 'endless',
  STAGE: 'stage',
};

export const MONSTER_RUSH_PHYSICS = {
  /** Visual runner box — smaller; monster PNG may crop (cover). */
  playerSize: 32,
  collisionSize: 26,
  playerX: 64,
  /** Tuned for ~120px peak height, ~0.7s air time at 60fps ticks. */
  gravity: 0.78,
  jumpVelocity: -14.2,
  /** Internal speed stat (drives scrollPxPerSec below). */
  baseSpeed: 3,
  /** Long ramp: speed keeps climbing to maxSpeed at ~8km so long runs never plateau. */
  maxSpeed: 12,
  speedIncreaseEveryDistance: 400,
  speedIncreaseAmount: 0.45,
  /** Target run speed ≈ 320–380 px/s at base; scales with speed stat. */
  scrollPxPerSecBase: 340,
  scrollPxPerSecPerSpeed: 26,
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
  if (distanceM < 2500) return 3;
  return 4;
}
