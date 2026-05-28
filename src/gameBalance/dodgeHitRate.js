/**
 * Flat dodge / hitRate stats — shared battle + UI helpers.
 *
 * Dodge and HitRate are numeric ratings. Final auto-dodge chance (%):
 *   clamp(defenderDodge - attackerHitRate, 0, 60)
 */
import { clamp, DODGE_HITRATE_LIMITS } from './combat';

/** Defender dodge rating (flat). */
export function getDefenderDodgeStat(stats) {
  if (!stats) return 0;
  if (typeof stats.dodge === 'number') return stats.dodge;
  if (typeof stats.dodgePct === 'number') return stats.dodgePct;
  return 0;
}

/** Attacker hit rate rating (flat) — reduces defender dodge, not a % hit chance. */
export function getAttackerHitRateStat(stats) {
  if (!stats || typeof stats.hitRate !== 'number') return 0;
  return stats.hitRate;
}

/** Final auto-dodge chance 0–60 from flat stats. */
export function finalDodgeChancePct(defenderStats, attackerStats, opts = {}) {
  const defenderDodge = getDefenderDodgeStat(defenderStats);
  const attackerHitRate = getAttackerHitRateStat(attackerStats);
  let pct = defenderDodge - attackerHitRate;
  pct = clamp(pct, DODGE_HITRATE_LIMITS.min, DODGE_HITRATE_LIMITS.max);
  if (opts.magic) pct *= 0.5;
  if (opts.bossKind === 'miniBoss') pct *= 0.75;
  if (opts.bossKind === 'bigBoss') pct *= 0.5;
  return clamp(pct, DODGE_HITRATE_LIMITS.min, DODGE_HITRATE_LIMITS.max);
}

/** UI: hit rate is a flat stat — no % suffix. */
export function formatHitRateStat(value) {
  return String(Math.round(value ?? 0));
}

/** UI: dodge rating is a flat stat — no % suffix (battle converts to % chance). */
export function formatDodgeStat(value) {
  return String(Math.round(value ?? 0));
}
