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
  RUSH_LEVEL_RULES,
} from './monsterRushLevelRules';
import { rushSpeedForDistance } from './monsterRushConfig';

/** Full rhythm cycle — includes coin-only rest beats. */
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

/** Tutorial: hazards only, no coin-only rest stretches. */
const TUTORIAL_RHYTHM = [
  'single',
  'combo',
  'single',
  'elevation',
  'single',
  'combo',
  'gap',
  'single',
];

/** Medium: only one breather per cycle — pressure ramps up. */
const MEDIUM_RHYTHM = [
  'single',
  'combo',
  'rest',
  'elevation',
  'gap',
  'combo',
  'single',
  'elevation',
];

/** Hard+: no free coin rests — continuous action so long runs stay demanding. */
const HARD_RHYTHM = [
  'single',
  'combo',
  'elevation',
  'gap',
  'combo',
  'elevation',
  'single',
  'combo',
];

const REST_PATTERN = {
  id: 'rest_coins',
  tier: 'easy',
  minScrollPx: 0,
  width: 180,
  recovery: 120,
  rhythm: 'rest',
  tags: ['rest'],
  items: [
    { type: 'coin_arc', x: 20, coinPattern: 'line' },
    { type: 'coin_arc', x: 90, coinPattern: 'line' },
  ],
};

/** Pre-built pools — avoids filtering the full library every spawn. */
const POOL_CACHE = new Map();

function poolForPhase(tier, phase) {
  if (phase === 'rest') return [REST_PATTERN];

  let tierPool;
  if (tier === 'tutorial') tierPool = EASY_PATTERNS;
  else if (tier === 'easy') {
    tierPool = [...EASY_PATTERNS, ...MEDIUM_PATTERNS.filter((p) => p.tier === 'easy' || p.minScrollPx < 1200)];
  } else if (tier === 'medium') tierPool = [...EASY_PATTERNS, ...MEDIUM_PATTERNS];
  else tierPool = [...MEDIUM_PATTERNS, ...HARD_PATTERNS];

  const byRhythm = tierPool.filter((p) => p.rhythm === phase);
  return byRhythm.length ? byRhythm : tierPool;
}

function poolForPhaseCached(tier, phase) {
  const key = `${tier}:${phase}`;
  if (!POOL_CACHE.has(key)) {
    POOL_CACHE.set(key, poolForPhase(tier, phase));
  }
  return POOL_CACHE.get(key);
}

function rhythmPhase(scrollPx, rhythmIndex) {
  const t = RUSH_LEVEL_RULES.distanceTiers;
  if (scrollPx < t.tutorialEnd) {
    return TUTORIAL_RHYTHM[rhythmIndex % TUTORIAL_RHYTHM.length];
  }
  if (scrollPx < t.easyMediumEnd) {
    return RHYTHM_CYCLE[rhythmIndex % RHYTHM_CYCLE.length];
  }
  if (scrollPx < t.mediumEnd) {
    return MEDIUM_RHYTHM[rhythmIndex % MEDIUM_RHYTHM.length];
  }
  return HARD_RHYTHM[rhythmIndex % HARD_RHYTHM.length];
}

function weightedPick(candidates, ctx) {
  const mediumEnd = RUSH_LEVEL_RULES.distanceTiers.mediumEnd;
  // 0 at the start of the hard tier → 1 once a full hard tier deeper (~1.2km).
  const deep = Math.max(0, Math.min(1, ((ctx.scrollPx ?? 0) - mediumEnd) / mediumEnd));
  const weights = candidates.map((p) => {
    let w = 1;
    if (p.id === ctx.lastPatternId) w *= 0.15;
    // Early runs favour easy patterns; deep runs flip to favour hard ones.
    if (p.tier === 'hard') w *= 0.7 + deep * 1.6;
    if (p.tier === 'easy') w *= 1.2 - deep * 0.95;
    return Math.max(0.05, w);
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < candidates.length; i += 1) {
    roll -= weights[i];
    if (roll <= 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

const MAX_VALIDATE_TRIES = 4;

/**
 * Pick next validated pattern for current run state.
 * @param {number} scrollPx
 * @param {{ lastPatternId?: string, repeatStreak?: number, rhythmIndex?: number, gameHeight?: number, distanceM?: number }} ctx
 */
export function pickValidatedPattern(scrollPx, ctx = {}) {
  const tier = distanceTier(scrollPx);
  const phase = rhythmPhase(scrollPx, ctx.rhythmIndex ?? 0);
  const speedStat = rushSpeedForDistance(ctx.distanceM ?? Math.floor(scrollPx / 10));

  let candidates = poolForPhaseCached(tier, phase).filter((p) => p.minScrollPx <= scrollPx + 120);

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

  const tried = new Set();
  const tries = Math.min(MAX_VALIDATE_TRIES, candidates.length);
  for (let t = 0; t < tries; t += 1) {
    const remaining = candidates.filter((p) => !tried.has(p.id));
    if (!remaining.length) break;
    const pattern = weightedPick(remaining, { ...ctx, scrollPx });
    tried.add(pattern.id);
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

  for (let i = 0; i < Math.min(3, EASY_PATTERNS.length); i += 1) {
    const pattern = EASY_PATTERNS[i];
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
