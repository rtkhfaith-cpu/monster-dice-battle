import { RESCUE_GAME_TIME_SEC } from './constants';

const MAX_LEVEL = 60;

/** Shots between ceiling row pushes at level 1. */
export const ROW_PUSH_MOVES_BASE = 10;
/** Hardest interval (more frequent pushes). */
export const ROW_PUSH_MOVES_MIN = 4;

/**
 * Shots before a new top row pushes the stack down (lower = harder).
 * @param {number} levelId 1–60
 */
export function rowPushEveryForLevel(levelId) {
  const id = Math.max(1, Math.min(MAX_LEVEL, Math.floor(levelId || 1)));
  const tier = Math.floor((id - 1) / 8);
  return Math.max(ROW_PUSH_MOVES_MIN, ROW_PUSH_MOVES_BASE - tier);
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
