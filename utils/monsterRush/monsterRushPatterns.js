/**
 * Pattern-based level chunks for Monster Rush (Geometry Dash style).
 * Each pattern spawns a group of obstacles/platforms/gaps at once.
 */

import { coinOffsetsForArc, COIN_PATTERNS } from './monsterRushCoinPatterns';

/** @typedef {{ type: string, x: number, y?: string, width?: number, height?: number, count?: number, coinPattern?: string }} PatternItem */
/** @typedef {{ id: string, minDistance: number, difficulty: number, width: number, recovery?: number, items: PatternItem[] }} RushPattern */

export const MONSTER_RUSH_PATTERNS = [
  {
    id: 'single_spike',
    minDistance: 0,
    difficulty: 1,
    width: 80,
    recovery: 120,
    items: [{ type: 'spike', x: 0, y: 'ground' }],
  },
  {
    id: 'low_block',
    minDistance: 0,
    difficulty: 1,
    width: 90,
    recovery: 110,
    items: [{ type: 'low_block', x: 0, y: 'ground' }],
  },
  {
    id: 'single_spike_coin',
    minDistance: 80,
    difficulty: 1,
    width: 140,
    recovery: 100,
    items: [
      { type: 'spike', x: 0, y: 'ground' },
      { type: 'coin_arc', x: 10, coinPattern: 'smallArc' },
    ],
  },
  {
    id: 'double_spike',
    minDistance: 300,
    difficulty: 2,
    width: 120,
    recovery: 130,
    items: [
      { type: 'spike', x: 0, y: 'ground' },
      { type: 'spike', x: 38, y: 'ground' },
    ],
  },
  {
    id: 'low_block_then_spike',
    minDistance: 500,
    difficulty: 2,
    width: 200,
    recovery: 140,
    items: [
      { type: 'low_block', x: 0, y: 'ground' },
      { type: 'spike', x: 100, y: 'ground' },
    ],
  },
  {
    id: 'rock_and_spike',
    minDistance: 400,
    difficulty: 2,
    width: 160,
    recovery: 120,
    items: [
      { type: 'rock', x: 0, y: 'ground' },
      { type: 'spike', x: 70, y: 'ground' },
    ],
  },
  {
    id: 'step_platform',
    minDistance: 700,
    difficulty: 3,
    width: 120,
    recovery: 100,
    items: [
      { type: 'platform', x: 0, y: 'ground_minus_36', width: 90, height: 16 },
      { type: 'coin_arc', x: 8, coinPattern: 'platformLine' },
    ],
  },
  {
    id: 'stair_steps',
    minDistance: 700,
    difficulty: 3,
    width: 300,
    recovery: 160,
    items: [
      { type: 'platform', x: 0, y: 'ground_minus_32', width: 80, height: 16 },
      { type: 'platform', x: 88, y: 'ground_minus_64', width: 80, height: 16 },
      { type: 'platform', x: 176, y: 'ground_minus_96', width: 90, height: 16 },
    ],
  },
  {
    id: 'floating_platform_spikes',
    minDistance: 900,
    difficulty: 3,
    width: 320,
    recovery: 150,
    items: [
      { type: 'spike', x: 0, y: 'ground' },
      { type: 'platform', x: 95, y: 'ground_minus_88', width: 130, height: 16 },
      { type: 'spike', x: 255, y: 'ground' },
    ],
  },
  {
    id: 'top_barrier_jump',
    minDistance: 1000,
    difficulty: 3,
    width: 240,
    recovery: 160,
    items: [
      { type: 'top_barrier', x: 70, y: 'ceiling', width: 52, height: 100 },
      { type: 'spike', x: 160, y: 'ground' },
    ],
  },
  {
    id: 'gap_jump',
    minDistance: 1100,
    difficulty: 3,
    width: 280,
    recovery: 180,
    items: [
      { type: 'gap', x: 70, width: 100 },
      { type: 'coin_arc', x: 65, coinPattern: 'gapGuide' },
    ],
  },
  {
    id: 'short_gap',
    minDistance: 800,
    difficulty: 2,
    width: 220,
    recovery: 150,
    items: [
      { type: 'gap', x: 50, width: 72 },
      { type: 'coin_arc', x: 45, coinPattern: 'gapGuide' },
    ],
  },
  {
    id: 'pillar_gate',
    minDistance: 1400,
    difficulty: 4,
    width: 260,
    recovery: 200,
    items: [
      { type: 'bottom_pillar', x: 95, y: 'ground', width: 46, height: 82 },
      { type: 'top_pillar', x: 95, y: 'ceiling', width: 46, height: 58 },
    ],
  },
  {
    id: 'top_bottom_combo',
    minDistance: 1800,
    difficulty: 4,
    width: 200,
    recovery: 190,
    items: [
      { type: 'top_barrier', x: 40, y: 'ceiling', width: 48, height: 95 },
      { type: 'low_block', x: 120, y: 'ground' },
    ],
  },
  {
    id: 'triple_spike',
    minDistance: 1600,
    difficulty: 4,
    width: 168,
    recovery: 200,
    items: [
      { type: 'spike', x: 0, y: 'ground' },
      { type: 'spike', x: 38, y: 'ground' },
      { type: 'spike', x: 76, y: 'ground' },
    ],
  },
  {
    id: 'ice_fire_mix',
    minDistance: 1200,
    difficulty: 3,
    width: 200,
    recovery: 140,
    items: [
      { type: 'ice_block', x: 0, y: 'ground' },
      { type: 'fire_trap', x: 90, y: 'ground' },
    ],
  },
  {
    id: 'tall_pillar_jump',
    minDistance: 600,
    difficulty: 2,
    width: 110,
    recovery: 130,
    items: [{ type: 'tall_pillar', x: 0, y: 'ground' }],
  },
  {
    id: 'top_spike_lane',
    minDistance: 1500,
    difficulty: 4,
    width: 180,
    recovery: 170,
    items: [
      { type: 'top_spike', x: 60, y: 'ceiling' },
      { type: 'spike', x: 120, y: 'ground' },
    ],
  },
];

export function getAvailablePatterns(distanceM) {
  return MONSTER_RUSH_PATTERNS.filter((p) => distanceM >= p.minDistance);
}

export function patternSpacingPx(tier) {
  const ranges = [
    [250, 350],
    [300, 420],
    [320, 460],
    [380, 520],
    [400, 540],
  ];
  const [min, max] = ranges[Math.min(tier, ranges.length - 1)];
  return min + Math.random() * (max - min);
}

/**
 * Pick next pattern — avoid 3× same id; ease off after hard patterns.
 * @param {number} distanceM
 * @param {{ lastPatternId?: string, repeatStreak?: number, lastDifficulty?: number }} ctx
 */
export function pickPattern(distanceM, ctx = {}) {
  let pool = getAvailablePatterns(distanceM);
  if (!pool.length) pool = [MONSTER_RUSH_PATTERNS[0]];

  if (ctx.lastPatternId && (ctx.repeatStreak ?? 0) >= 2) {
    const filtered = pool.filter((p) => p.id !== ctx.lastPatternId);
    if (filtered.length) pool = filtered;
  }

  if ((ctx.lastDifficulty ?? 0) >= 4) {
    const easier = pool.filter((p) => p.difficulty <= 2);
    if (easier.length) pool = easier;
  }

  const maxDiff = distanceM < 300 ? 1 : distanceM < 800 ? 2 : distanceM < 1500 ? 3 : distanceM < 2500 ? 4 : 5;
  const capped = pool.filter((p) => p.difficulty <= maxDiff);
  if (capped.length) pool = capped;

  const weights = pool.map((p) => 1 / Math.max(1, p.difficulty));
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < pool.length; i += 1) {
    roll -= weights[i];
    if (roll <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

export function coinOffsetsForPatternItem(item) {
  if (item.coinPattern && COIN_PATTERNS[item.coinPattern]) {
    return COIN_PATTERNS[item.coinPattern];
  }
  if (item.type === 'coin_arc') {
    return coinOffsetsForArc(item.count ?? 5);
  }
  return null;
}
