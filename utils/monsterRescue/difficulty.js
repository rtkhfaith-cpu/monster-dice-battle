const MAX_LEVEL = 60;

/** Normalized progress 0 (level 1) → 1 (level 60). */
export function rescueLevelProgress(levelId) {
  const id = Math.max(1, Math.min(MAX_LEVEL, Math.floor(levelId || 1)));
  if (MAX_LEVEL <= 1) return 0;
  return (id - 1) / (MAX_LEVEL - 1);
}

function lerp(t, from, to) {
  return from + (to - from) * t;
}

function lerpInt(t, from, to) {
  return Math.round(lerp(t, from, to));
}

/** Shots between ceiling row pushes — eases from 30 (Lv1) down to 7 (Lv60). */
export const ROW_PUSH_MOVES_BASE = 30;
export const ROW_PUSH_MOVES_MIN = 7;

/**
 * Shots before a new top row pushes the stack down (lower = harder).
 * @param {number} levelId 1–60
 */
export function rowPushEveryForLevel(levelId) {
  const t = rescueLevelProgress(levelId);
  return Math.max(ROW_PUSH_MOVES_MIN, lerpInt(t, 30, ROW_PUSH_MOVES_MIN));
}

/**
 * Stage time limit in seconds — 5:00 at Lv1, eases down to 90s by Lv60.
 * @param {number} levelId
 */
export function gameTimeSecForLevel(levelId) {
  const t = rescueLevelProgress(levelId);
  return Math.max(90, lerpInt(t, 300, 90));
}

/**
 * Seconds before auto-fire — 20s at Lv1, eases down to 10s by Lv60.
 * @param {number} levelId
 */
export function moveTimeSecForLevel(levelId) {
  const t = rescueLevelProgress(levelId);
  return Math.max(10, lerpInt(t, 20, 10));
}

/**
 * Lowest occupied row index that triggers a loss — eases from 11 (lenient) to 9 (strict).
 * @param {number} levelId
 */
export function dangerRowForLevel(levelId) {
  const t = rescueLevelProgress(levelId);
  return Math.max(9, lerpInt(t, 11, 9));
}

/** @param {number} levelId */
export function describeRescueDifficulty(levelId) {
  const push = rowPushEveryForLevel(levelId);
  const time = gameTimeSecForLevel(levelId);
  const move = moveTimeSecForLevel(levelId);
  const m = Math.floor(time / 60);
  const s = time % 60;
  const timeLabel = m > 0 ? `${m}:${s < 10 ? `0${s}` : s}` : `${s}s`;
  return { rowPushEvery: push, gameTimeSec: time, moveTimeSec: move, timeLabel };
}
