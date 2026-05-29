/**
 * Pattern-based Monster Rush level generator with fairness validation.
 */
import {
  RUSH_PATTERN_LIBRARY,
  EASY_PATTERNS,
  MEDIUM_PATTERNS,
  HARD_PATTERNS,
} from './monsterRushPatternLibrary';
import {
  chainSpacingForTier,
  distanceTier,
  validatePattern,
} from './monsterRushLevelRules';
import { rushSpeedForDistance } from './monsterRushConfig';

/** Rhythm cycle — avoids constant jumping or long dead zones. */
const RHYTHM_CYCLE = [
  'single',
  'rest',
  'combo',
  'rest',
  'elevation',
  'rest',
  'gap',
  'rest',
];

const REST_PATTERN = {
  id: 'rest_coins',
  tier: 'easy',
  minScrollPx: 0,
  width: 180,
  recovery: 160,
  rhythm: 'rest',
  tags: ['rest'],
  items: [
    { type: 'coin_arc', x: 20, coinPattern: 'line' },
    { type: 'coin_arc', x: 90, coinPattern: 'line' },
  ],
};

function poolForPhase(tier, phase) {
  const all = RUSH_PATTERN_LIBRARY.filter((p) => p.rhythm === phase || (phase === 'rest' && p.id === 'rest_coins'));
  if (phase === 'rest') return [REST_PATTERN];

  let tierPool;
  if (tier === 'tutorial') tierPool = EASY_PATTERNS;
  else if (tier === 'easy') tierPool = [...EASY_PATTERNS, ...MEDIUM_PATTERNS.filter((p) => p.tier === 'easy' || p.minScrollPx < 1200)];
  else if (tier === 'medium') tierPool = [...EASY_PATTERNS, ...MEDIUM_PATTERNS];
  else tierPool = [...MEDIUM_PATTERNS, ...HARD_PATTERNS];

  const byRhythm = tierPool.filter((p) => p.rhythm === phase);
  return byRhythm.length ? byRhythm : tierPool;
}

function weightedPick(candidates, ctx) {
  const weights = candidates.map((p) => {
    let w = 1;
    if (p.id === ctx.lastPatternId) w *= 0.15;
    if (p.tier === 'hard') w *= 0.7;
    if (p.tier === 'easy') w *= 1.2;
    return w;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < candidates.length; i += 1) {
    roll -= weights[i];
    if (roll <= 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

/**
 * Pick next validated pattern for current run state.
 * @param {number} scrollPx
 * @param {{ lastPatternId?: string, repeatStreak?: number, rhythmIndex?: number, gameHeight?: number, distanceM?: number }} ctx
 */
export function pickValidatedPattern(scrollPx, ctx = {}) {
  const tier = distanceTier(scrollPx);
  const phase = RHYTHM_CYCLE[(ctx.rhythmIndex ?? 0) % RHYTHM_CYCLE.length];
  const speedStat = rushSpeedForDistance(ctx.distanceM ?? Math.floor(scrollPx / 10));

  let candidates = poolForPhase(tier, phase).filter((p) => p.minScrollPx <= scrollPx + 120);

  if (tier === 'tutorial') {
    candidates = candidates.filter((p) => p.tier === 'easy' && !p.tags?.includes('top_bottom'));
  }

  if (ctx.lastPatternId && (ctx.repeatStreak ?? 0) >= 2) {
    const noRepeat = candidates.filter((p) => p.id !== ctx.lastPatternId);
    if (noRepeat.length) candidates = noRepeat;
  }

  const validationCtx = {
    scrollPx,
    gameHeight: ctx.gameHeight,
    speedStat,
  };

  const shuffled = [...candidates].sort(() => Math.random() - 0.5);
  for (const pattern of shuffled) {
    const v = validatePattern(pattern, validationCtx);
    if (v.ok) {
      return {
        pattern,
        debug: {
          patternId: pattern.id,
          tier,
          phase,
          scrollPx,
          passed: true,
        },
      };
    }
  }

  for (const pattern of EASY_PATTERNS) {
    const v = validatePattern(pattern, validationCtx);
    if (v.ok) {
      return {
        pattern,
        debug: { patternId: pattern.id, tier, phase: 'fallback', scrollPx, passed: true },
      };
    }
  }

  return {
    pattern: EASY_PATTERNS[0],
    debug: { patternId: EASY_PATTERNS[0].id, tier, phase: 'emergency', scrollPx, passed: false },
  };
}

/** Spacing between pattern end and next pattern start (px). */
export function patternChainSpacing(scrollPx) {
  const tier = distanceTier(scrollPx);
  return chainSpacingForTier(tier === 'tutorial' ? 'tutorial' : tier);
}

/** @deprecated — use patternChainSpacing */
export function patternSpacingPx(tierIndex) {
  const tiers = ['tutorial', 'easy', 'medium', 'hard'];
  const t = tiers[Math.min(tierIndex, tiers.length - 1)] ?? 'medium';
  return chainSpacingForTier(t);
}

/** Legacy export for old imports */
export function pickPattern(distanceM, ctx = {}) {
  const scrollPx = distanceM * 10;
  const { pattern } = pickValidatedPattern(scrollPx, {
    ...ctx,
    distanceM,
    rhythmIndex: ctx.rhythmIndex ?? Math.floor(scrollPx / 400) % RHYTHM_CYCLE.length,
  });
  return pattern;
}

export { RUSH_PATTERN_LIBRARY as MONSTER_RUSH_PATTERNS };
