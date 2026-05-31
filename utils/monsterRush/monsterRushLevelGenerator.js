/**
 * Pattern-based Monster Rush level generator with fairness validation.
 * Hand-authored patterns + run-seeded variety (avoids repeating the same loop).
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

/** @typedef {() => number} RunRng */

const RECENT_PATTERN_CAP = 6;

const PHASE_WEIGHTS_BY_TIER = {
  tutorial: [
    ['single', 30],
    ['combo', 22],
    ['elevation', 28],
    ['gap', 20],
  ],
  easy: [
    ['single', 22],
    ['combo', 22],
    ['elevation', 22],
    ['gap', 18],
    ['rest', 16],
  ],
  medium: [
    ['single', 18],
    ['combo', 26],
    ['elevation', 26],
    ['gap', 24],
    ['rest', 6],
  ],
  hard: [
    ['single', 16],
    ['combo', 28],
    ['elevation', 28],
    ['gap', 28],
  ],
};

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

/** Mulberry32 — repeatable per run, varied between runs. */
export function makeRunRng(seed) {
  let t = (seed >>> 0) || 1;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function poolForPhase(tier, phase) {
  if (phase === 'rest') return [REST_PATTERN];

  let tierPool;
  if (tier === 'tutorial') tierPool = EASY_PATTERNS;
  else if (tier === 'easy') {
    tierPool = [...EASY_PATTERNS, ...MEDIUM_PATTERNS.filter((p) => p.tier === 'easy' || p.minScrollPx < 900)];
  } else if (tier === 'medium') {
    tierPool = [...EASY_PATTERNS, ...MEDIUM_PATTERNS, ...HARD_PATTERNS.filter((p) => p.minScrollPx < 1800)];
  } else tierPool = [...MEDIUM_PATTERNS, ...HARD_PATTERNS];

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

function weightedPickPhase(tierKey, rng, lastPhase = '') {
  const rows = PHASE_WEIGHTS_BY_TIER[tierKey] ?? PHASE_WEIGHTS_BY_TIER.easy;
  let pool = rows;
  if (lastPhase && rows.length > 1) {
    const filtered = rows.filter(([phase]) => phase !== lastPhase);
    if (filtered.length) pool = filtered;
  }
  const total = pool.reduce((s, [, w]) => s + w, 0);
  let roll = rng() * total;
  for (const [phase, weight] of pool) {
    roll -= weight;
    if (roll <= 0) return phase;
  }
  return pool[0][0];
}

/** Weighted random rhythm phase for this scroll tier (not a fixed 8-beat loop). */
export function pickRhythmPhase(scrollPx, rng = Math.random, lastPhase = '') {
  const tier = distanceTier(scrollPx);
  const tierKey = tier === 'tutorial' ? 'tutorial' : tier;
  return weightedPickPhase(tierKey, rng, lastPhase);
}

/** @deprecated — fixed cycle kept for legacy imports/tests. */
export function rhythmPhase(scrollPx, rhythmIndex) {
  const cycles = {
    tutorial: ['single', 'combo', 'single', 'elevation', 'single', 'combo', 'gap', 'single'],
    easy: ['single', 'combo', 'elevation', 'rest', 'gap', 'combo', 'single', 'elevation'],
    medium: ['single', 'combo', 'elevation', 'gap', 'combo', 'single', 'elevation', 'combo'],
    hard: ['single', 'combo', 'elevation', 'gap', 'combo', 'elevation', 'single', 'combo'],
  };
  const t = RUSH_LEVEL_RULES.distanceTiers;
  let cycle;
  if (scrollPx < t.tutorialEnd) cycle = cycles.tutorial;
  else if (scrollPx < t.easyMediumEnd) cycle = cycles.easy;
  else if (scrollPx < t.mediumEnd) cycle = cycles.medium;
  else cycle = cycles.hard;
  return cycle[rhythmIndex % cycle.length];
}

function shuffleWithRng(list, rng) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Prefer patterns not used recently; never pick immediate repeat when alternatives exist. */
function variedPick(candidates, ctx) {
  if (!candidates.length) return null;
  const rng = ctx.rng ?? Math.random;
  const recent = ctx.recentPatternIds ?? [];
  const lastId = ctx.lastPatternId;

  let pool = candidates.filter((p) => p.id !== lastId);
  const fresh = pool.filter((p) => !recent.includes(p.id));
  if (fresh.length >= 2) pool = fresh;
  if (pool.length === 0) pool = candidates.filter((p) => p.id !== lastId);
  if (pool.length === 0) pool = candidates;

  return shuffleWithRng(pool, rng)[0] ?? null;
}

/**
 * Pick next validated pattern for current run state.
 * @param {number} scrollPx
 * @param {{ lastPatternId?: string, repeatStreak?: number, rhythmIndex?: number, gameHeight?: number, distanceM?: number, patternsSpawned?: number, phase?: string, rng?: RunRng, recentPatternIds?: string[] }} ctx
 */
export function pickValidatedPattern(scrollPx, ctx = {}) {
  const tier = distanceTier(scrollPx);
  const rng = ctx.rng ?? Math.random;
  const phase = ctx.phase
    ?? pickRhythmPhase(scrollPx, rng, ctx.lastRhythmPhase ?? '');
  const speedStat = rushSpeedForDistance(ctx.distanceM ?? Math.floor(scrollPx / 10));

  let candidates = poolForPhaseCached(tier, phase).filter((p) => p.minScrollPx <= scrollPx + 120);

  if (tier === 'tutorial') {
    candidates = candidates.filter((p) => p.tier === 'easy' && !p.tags?.includes('top_bottom'));
    if ((ctx.patternsSpawned ?? 0) < 4) {
      const jumpFriendly = new Set(['spike', 'coin_arc', 'gap', 'step_platform']);
      candidates = candidates.filter((p) => p.items.every((it) => jumpFriendly.has(it.type)));
    }
  }

  const validationCtx = {
    scrollPx,
    gameHeight: ctx.gameHeight,
    speedStat,
  };

  const anchor = variedPick(candidates, ctx);
  const ordered = anchor
    ? [anchor, ...shuffleWithRng(candidates.filter((p) => p.id !== anchor.id), rng)]
    : shuffleWithRng(candidates, rng);

  for (const pattern of ordered) {
    const v = validatePattern(pattern, validationCtx);
    if (v.ok) {
      return {
        pattern,
        phase,
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

  const restV = validatePattern(REST_PATTERN, validationCtx);
  if (restV.ok) {
    return {
      pattern: REST_PATTERN,
      phase: 'rest',
      debug: { patternId: REST_PATTERN.id, tier, phase: 'rest_fallback', scrollPx, passed: true },
    };
  }

  for (const pattern of shuffleWithRng(EASY_PATTERNS, rng)) {
    const v = validatePattern(pattern, validationCtx);
    if (v.ok) {
      return {
        pattern,
        phase: pattern.rhythm ?? 'single',
        debug: { patternId: pattern.id, tier, phase: 'easy_fallback', scrollPx, passed: true },
      };
    }
  }

  return {
    pattern: REST_PATTERN,
    phase: 'rest',
    debug: { patternId: REST_PATTERN.id, tier, phase: 'emergency_rest', scrollPx, passed: true },
  };
}

/** Spacing between patterns — slight jitter so timing doesn't feel copy-pasted. */
export function patternChainSpacing(scrollPx, phase = 'single', rng = null) {
  const tier = distanceTier(scrollPx);
  const tierKey = tier === 'tutorial' ? 'tutorial' : tier;
  const base = chainSpacingForPhase(tierKey, phase);
  if (!rng) return base;
  const jitter = 0.88 + rng() * 0.24;
  return Math.max(180, Math.floor(base * jitter));
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
  const rng = ctx.rng ?? makeRunRng((distanceM * 9973 + 41) >>> 0);
  const { pattern } = pickValidatedPattern(scrollPx, {
    ...ctx,
    distanceM,
    rng,
    rhythmIndex: ctx.rhythmIndex ?? Math.floor(scrollPx / 400),
  });
  return pattern;
}

export { RUSH_PATTERN_LIBRARY as MONSTER_RUSH_PATTERNS, RECENT_PATTERN_CAP };
