import { rescueLevelProgress } from './difficulty';

const MAX_LEVEL = 60;

function clampLevel(levelId) {
  return Math.max(1, Math.min(MAX_LEVEL, Math.floor(levelId || 1)));
}

function lerp(t, from, to) {
  return from + (to - from) * t;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Distinct color indices currently on the board (sorted unique). */
export function normalizeBoardColors(onScreenColors, colorCount) {
  const seen = new Set();
  for (const c of onScreenColors || []) {
    if (typeof c !== 'number' || c < 0 || c >= colorCount) continue;
    seen.add(c);
  }
  return [...seen];
}

/**
 * When few colors remain, strongly favor those colors for the next bubble (easier finish).
 * @param {number[]} uniqueOnBoard
 * @param {number} levelId
 */
export function chanceToPickFromBoardColors(uniqueOnBoard, levelId) {
  const n = uniqueOnBoard.length;
  if (n === 0) return 0;
  if (n === 1) return 0.93;
  if (n === 2) return 0.86;
  const levelBias = onScreenColorBiasForLevel(levelId);
  if (n === 3) return Math.max(levelBias, 0.78);
  return onScreenColorBiasForLevel(levelId);
}

/** 0–1 chance that a new bubble uses a color already on the board (eases off over 60 levels). */
export function onScreenColorBiasForLevel(levelId) {
  const t = rescueLevelProgress(clampLevel(levelId));
  return lerp(t, 0.88, 0.1);
}

/** Chance push-row colors are off-screen / harder to match (ramps up gradually). */
export function pushRowOffScreenBiasForLevel(levelId) {
  const t = rescueLevelProgress(clampLevel(levelId));
  return lerp(t, 0, 0.72);
}

function pickFromBoardOrRandom(colorCount, onScreenColors, levelId) {
  const unique = normalizeBoardColors(onScreenColors, colorCount);
  if (!unique.length) {
    return Math.floor(Math.random() * colorCount);
  }
  if (Math.random() < chanceToPickFromBoardColors(unique, levelId)) {
    return pickRandom(unique);
  }
  return Math.floor(Math.random() * colorCount);
}

/**
 * @param {number} colorCount
 * @param {number[]} onScreenColors
 * @param {number} levelId
 */
export function pickBiasedShooterColor(colorCount, onScreenColors, levelId) {
  return pickFromBoardOrRandom(colorCount, onScreenColors, levelId);
}

/**
 * @param {number} colorCount
 * @param {number[]} onScreenColors
 * @param {number} levelId
 * @param {number[]} usedInRow colors already placed in this push row
 */
export function pickBiasedPushColor(colorCount, onScreenColors, levelId, usedInRow = []) {
  const unique = normalizeBoardColors(onScreenColors, colorCount);
  const offBias = pushRowOffScreenBiasForLevel(levelId);
  const offScreen = [];
  for (let c = 0; c < colorCount; c++) {
    if (!unique.includes(c)) offScreen.push(c);
  }

  if (unique.length <= 2 && Math.random() < chanceToPickFromBoardColors(unique, levelId) * 0.85) {
    return pickRandom(unique);
  }

  if (offScreen.length && Math.random() < offBias) {
    return pickRandom(offScreen);
  }

  let color = pickFromBoardOrRandom(colorCount, onScreenColors, levelId);
  if (usedInRow.length >= 2 && usedInRow.filter((x) => x === color).length >= 2) {
    color = unique.length ? pickRandom(unique) : color;
  }
  return color;
}
