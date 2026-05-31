/**
 * Monster Rush level design rules — jump metrics, spacing, fairness validation.
 * All pattern placement must respect these limits (Geometry Dash style, fair).
 */
import { MONSTER_RUSH_PHYSICS } from './monsterRushConfig';

const DT_MS = 1000 / 60;

/** Derived from MONSTER_RUSH_PHYSICS via simulation (see simulateJumpMetrics). */
export const RUSH_LEVEL_RULES = {
  playerWidth: MONSTER_RUSH_PHYSICS.playerSize,
  playerHeight: MONSTER_RUSH_PHYSICS.playerSize,

  /** Comfortable horizontal jump while running (px). */
  jumpDistanceComfortMin: 130,
  jumpDistanceComfortMax: 190,
  jumpDistanceMax: 250,

  maxJumpHeight: 125,
  minReactionPx: 180,
  minLandingAfterObstaclePx: 90,
  minAfterLandingBeforeNextDangerPx: 150,
  minHazardToHazardInsidePatternPx: 160,
  maxGapWidthPx: 230,
  minGapLandingPlatformPx: 150,
  maxDeadZonePx: 900,

  minTopClearancePx: 95,
  minPlayerVisibleLeadPx: 500,

  chainSpacing: {
    tutorial: [220, 300],
    easy: [260, 360],
    medium: [240, 340],
    hard: [200, 300],
  },

  /** Fixed px between pattern end and next start — tuned per rhythm phase (not random). */
  chainSpacingByPhase: {
    tutorial: { single: 260, combo: 250, elevation: 280, gap: 300, rest: 320 },
    easy: { single: 280, combo: 265, elevation: 300, gap: 320, rest: 340 },
    medium: { single: 250, combo: 240, elevation: 270, gap: 300, rest: 300 },
    hard: { single: 220, combo: 210, elevation: 240, gap: 260, rest: 250 },
  },

  // scrollPx tiers: tutorial 0–30m, easy 30–120m, medium 120–300m, hard 300m+
  distanceTiers: {
    tutorialEnd: 300,
    easyMediumEnd: 1200,
    mediumEnd: 3000,
  },
};

/**
 * Simulate full jump arc at 60fps tick scale (ascent + descent until landing).
 */
export function simulateJumpMetrics(physics = MONSTER_RUSH_PHYSICS) {
  const { jumpVelocity, gravity } = physics;
  let vy = jumpVelocity;
  let y = 0;
  let frames = 0;
  let peak = 0;
  while (frames < 240) {
    y += vy;
    peak = Math.min(peak, y);
    vy += gravity;
    frames += 1;
    // Landed back on ground after leaving it.
    if (frames > 4 && y >= 0 && vy > 0) break;
  }
  const airTimeMs = frames * DT_MS;
  const peakHeight = Math.abs(peak);
  return { peakHeight, airTimeMs, airFrames: frames };
}

/** Scroll speed in px/s from internal speed stat. */
export function scrollPxPerSecond(speedStat) {
  const p = MONSTER_RUSH_PHYSICS;
  return p.scrollPxPerSecBase
    + (speedStat - p.baseSpeed) * p.scrollPxPerSecPerSpeed;
}

export function scrollPxPerFrame(speedStat, dtMs) {
  return scrollPxPerSecond(speedStat) * (dtMs / 1000);
}

export function maxJumpDistancePx(speedStat, physics = MONSTER_RUSH_PHYSICS) {
  const { airTimeMs } = simulateJumpMetrics(physics);
  return scrollPxPerSecond(speedStat) * (airTimeMs / 1000);
}

export function distanceTier(scrollPx) {
  const t = RUSH_LEVEL_RULES.distanceTiers;
  if (scrollPx < t.tutorialEnd) return 'tutorial';
  if (scrollPx < t.easyMediumEnd) return 'easy';
  if (scrollPx < t.mediumEnd) return 'medium';
  return 'hard';
}

export function chainSpacingForTier(tier, rng = Math.random) {
  const [min, max] = RUSH_LEVEL_RULES.chainSpacing[tier] ?? RUSH_LEVEL_RULES.chainSpacing.medium;
  return min + rng() * (max - min);
}

/** Deterministic chain gap for a rhythm phase (Geometry Dash style — predictable spacing). */
export function chainSpacingForPhase(tier, phase) {
  const table = RUSH_LEVEL_RULES.chainSpacingByPhase[tier]
    ?? RUSH_LEVEL_RULES.chainSpacingByPhase.medium;
  return table[phase] ?? table.single ?? 380;
}

const HAZARD_TYPES = new Set([
  'spike', 'low_block', 'tall_block', 'double_block', 'rock', 'fire_trap', 'ice_block',
  'top_barrier', 'top_spike', 'bottom_pillar', 'top_pillar', 'floating_barrier', 'tall_pillar',
]);

function patternHazards(items) {
  return items.filter((it) => HAZARD_TYPES.has(it.type));
}

function patternGaps(items) {
  return items.filter((it) => it.type === 'gap');
}

function patternPlatforms(items) {
  return items.filter((it) => it.type === 'platform' || it.type === 'step_platform');
}

/**
 * Validate a pattern definition against movement rules.
 * @param {import('./monsterRushPatternLibrary').RushPattern} pattern
 * @param {{ gameHeight?: number, scrollPx?: number, speedStat?: number }} ctx
 */
export function validatePattern(pattern, ctx = {}) {
  const rules = RUSH_LEVEL_RULES;
  const gameHeight = ctx.gameHeight ?? 360;
  const groundY = gameHeight - Math.max(40, Math.round(gameHeight * 0.1));
  const playerTopOnGround = groundY - rules.playerHeight;
  const speedStat = ctx.speedStat ?? 5;
  const maxJumpDist = maxJumpDistancePx(speedStat);
  const reasons = [];

  if (pattern.minScrollPx > (ctx.scrollPx ?? 0) + 400) {
    reasons.push('not_unlocked');
  }

  for (const gap of patternGaps(pattern.items)) {
    const w = gap.width ?? 90;
    if (w > rules.maxGapWidthPx) reasons.push(`gap_too_wide:${w}`);
    // Gap must be crossable at current scroll speed (full jump arc).
    if (w > maxJumpDist - 30) reasons.push(`gap_uncrossable:${w}>${Math.round(maxJumpDist)}`);
  }

  const hazards = patternHazards(pattern.items);
  const sorted = [...hazards].sort((a, b) => a.x - b.x);
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    const prevW = prev.width ?? 44;
    const gap = cur.x - (prev.x + prevW);
    if (gap < rules.minHazardToHazardInsidePatternPx && !pattern.allowTightCombo) {
      reasons.push(`hazards_too_close:${gap}`);
    }
  }

  if (pattern.tags?.includes('top_bottom') || pattern.tags?.includes('top')) {
    const tops = pattern.items.filter((it) => it.type === 'top_barrier' || it.type === 'top_spike' || it.type === 'top_pillar');
    const grounds = pattern.items.filter((it) =>
      ['spike', 'low_block', 'tall_block', 'double_block', 'rock', 'fire_trap'].includes(it.type),
    );
    const ceilingY = 12;
    for (const top of tops) {
      const defH = top.height ?? 95;
      const barrierBottom = (top.y === 'ceiling' ? ceilingY : (top.y ?? 0)) + defH;
      const clearance = playerTopOnGround - barrierBottom;
      if (clearance < rules.minTopClearancePx) {
        reasons.push(`top_squeeze:${clearance}`);
      }
      for (const g of grounds) {
        const overlapX = Math.abs((top.x ?? 0) - (g.x ?? 0)) < 120;
        if (overlapX && clearance < rules.minTopClearancePx + 40) {
          reasons.push('top_bottom_overlap');
        }
      }
    }
  }

  if (pattern.width > maxJumpDist + 80 && pattern.tags?.includes('pillar_hop')) {
    const plats = patternPlatforms(pattern.items);
    for (let i = 1; i < plats.length; i += 1) {
      const gap = plats[i].x - (plats[i - 1].x + (plats[i - 1].width ?? 90));
      if (gap > maxJumpDist - 20) reasons.push(`pillar_gap_too_wide:${gap}`);
    }
  }

  if (pattern.tier === 'hard' && (ctx.scrollPx ?? 0) < rules.distanceTiers.easyMediumEnd) {
    reasons.push('hard_too_early');
  }

  if (pattern.tier === 'medium' && (ctx.scrollPx ?? 0) < 200) {
    reasons.push('medium_too_early');
  }

  return { ok: reasons.length === 0, reasons };
}

export function getJumpMetricsForDebug(physics = MONSTER_RUSH_PHYSICS) {
  const jump = simulateJumpMetrics(physics);
  const speedStat = physics.baseSpeed;
  return {
    ...jump,
    maxJumpDistance: maxJumpDistancePx(speedStat, physics),
    scrollPxPerSec: scrollPxPerSecond(speedStat),
  };
}
