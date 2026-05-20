import { RESCUE_GAME_TIME_SEC } from './constants';

const MAX_LEVEL = 60;

/** Shots between ceiling row pushes at level 1. */
export const ROW_PUSH_MOVES_BASE = 20;
/** Hardest interval (more frequent pushes) — still gentler than old min of 4. */
export const ROW_PUSH_MOVES_MIN = 7;
/** Levels per step when row-push interval tightens. */
const ROW_PUSH_TIER_SPAN = 8;
/** Shots removed from the interval each tier (20 → 18 → … → 7). */
const ROW_PUSH_TIER_STEP = 2;

/**
 * Shots before a new top row pushes the stack down (lower = harder).
 * Level 1–8: 20 shots · … · level 57–60: 7 shots.
 * @param {number} levelId 1–60
 */
export function rowPushEveryForLevel(levelId) {
  const id = Math.max(1, Math.min(MAX_LEVEL, Math.floor(levelId || 1)));
  const tier = Math.floor((id - 1) / ROW_PUSH_TIER_SPAN);
  return Math.max(ROW_PUSH_MOVES_MIN, ROW_PUSH_MOVES_BASE - tier * ROW_PUSH_TIER_STEP);
}

/**
 * Stage time limit in seconds (slightly shorter on higher levels).
 * @param {number} levelId
 */
export function gameTimeSecForLevel(levelId) {
  const id = Math.max(1, Math.min(MAX_LEVEL, Math.floor(levelId || 1)));
  return Math.max(90, RESCUE_GAME_TIME_SEC - Math.floor((id - 1) / 5));
}

/**
 * Lowest occupied row index that triggers a loss (bubbles too close to shooter).
 * @param {number} levelId
 */
export function dangerRowForLevel(levelId) {
  const id = Math.max(1, Math.min(MAX_LEVEL, Math.floor(levelId || 1)));
  if (id >= 45) return 9;
  if (id >= 25) return 10;
  return 11;
}

/** @param {number} levelId */
export function describeRescueDifficulty(levelId) {
  const push = rowPushEveryForLevel(levelId);
  const time = gameTimeSecForLevel(levelId);
  const m = Math.floor(time / 60);
  const s = time % 60;
  const timeLabel = m > 0 ? `${m}:${s < 10 ? `0${s}` : s}` : `${s}s`;
  return { rowPushEvery: push, gameTimeSec: time, timeLabel };
}
