/**
 * Pattern-based Monster Rush level generator with fairness validation.
 * Patterns are hand-authored; sequencing is deterministic per rhythm phase
 * (Geometry Dash style — learnable beats, not random obstacle soup).
 */
import {
  RUSH_PATTERN_LIBRARY,
  EASY_PATTERNS,
  MEDIUM_PATTERNS,
  HARD_PATTERNS,
} from './monsterRushPatternLibrary';
import {
  chainSpacingForPhase,
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

/** Which rhythm beat we're on for this scroll distance + beat index. */
export function rhythmPhase(scrollPx, rhythmIndex) {
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

/**
 * Deterministic pick: same rhythm slot → same pattern order (learnable).
 * Cycles through stable-sorted candidates; skips immediate repeat when possible.
 */
function deterministicPick(candidates, rhythmIndex, lastPatternId) {
  if (!candidates.length) return null;
  const sorted = [...candidates].sort((a, b) => a.id.localeCompare(b.id));
  let pool = sorted;
  if (lastPatternId && sorted.length > 1) {
    const filtered = sorted.filter((p) => p.id !== lastPatternId);
    if (filtered.length) pool = filtered;
  }
  return pool[rhythmIndex % pool.length];
}

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

  const validationCtx = {
    scrollPx,
    gameHeight: ctx.gameHeight,
    speedStat,
  };

  // Try deterministic order first, then rotate through pool for a valid pattern.
  const anchor = deterministicPick(candidates, ctx.rhythmIndex ?? 0, ctx.lastPatternId);
  const ordered = anchor
    ? [anchor, ...candidates.filter((p) => p.id !== anchor.id)]
    : candidates;

  for (const pattern of ordered) {
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

  // Safe fallback: coin rest beat (never kills).
  const restV = validatePattern(REST_PATTERN, validationCtx);
  if (restV.ok) {
    return {
      pattern: REST_PATTERN,
      debug: { patternId: REST_PATTERN.id, tier, phase: 'rest_fallback', scrollPx, passed: true },
    };
  }

  for (const pattern of EASY_PATTERNS) {
    const v = validatePattern(pattern, validationCtx);
    if (v.ok) {
      return {
        pattern,
        debug: { patternId: pattern.id, tier, phase: 'easy_fallback', scrollPx, passed: true },
      };
    }
  }

  return {
    pattern: REST_PATTERN,
    debug: { patternId: REST_PATTERN.id, tier, phase: 'emergency_rest', scrollPx, passed: true },
  };
}

/** Spacing between pattern end and next pattern start (px) — fixed per rhythm phase. */
export function patternChainSpacing(scrollPx, phase = 'single') {
  const tier = distanceTier(scrollPx);
  const tierKey = tier === 'tutorial' ? 'tutorial' : tier;
  return chainSpacingForPhase(tierKey, phase);
}

/** @deprecated — use patternChainSpacing */
export function patternSpacingPx(tierIndex) {
  const tiers = ['tutorial', 'easy', 'medium', 'hard'];
  const t = tiers[Math.min(tierIndex, tiers.length - 1)] ?? 'medium';
  return chainSpacingForPhase(t, 'single');
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
