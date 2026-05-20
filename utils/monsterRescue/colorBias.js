import { rescueLevelProgress } from './difficulty';

const MAX_LEVEL = 60;

function clampLevel(levelId) {
  return Math.max(1, Math.min(MAX_LEVEL, Math.floor(levelId || 1)));
}

function lerp(t, from, to) {
  return from + (to - from) * t;
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

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * @param {number} colorCount
 * @param {number[]} onScreenColors
 * @param {number} levelId
 */
export function pickBiasedShooterColor(colorCount, onScreenColors, levelId) {
  const bias = onScreenColorBiasForLevel(levelId);
  if (onScreenColors.length && Math.random() < bias) {
    return pickRandom(onScreenColors);
  }
  return Math.floor(Math.random() * colorCount);
}

/**
 * @param {number} colorCount
 * @param {number[]} onScreenColors
 * @param {number} levelId
 * @param {number[]} usedInRow colors already placed in this push row
 */
export function pickBiasedPushColor(colorCount, onScreenColors, levelId, usedInRow = []) {
  const offBias = pushRowOffScreenBiasForLevel(levelId);
  const onBias = onScreenColorBiasForLevel(levelId);
  const offScreen = [];
  for (let c = 0; c < colorCount; c++) {
    if (!onScreenColors.includes(c)) offScreen.push(c);
  }

  if (offScreen.length && Math.random() < offBias) {
    return pickRandom(offScreen);
  }
  if (onScreenColors.length && Math.random() < onBias) {
    return pickRandom(onScreenColors);
  }
  let color = Math.floor(Math.random() * colorCount);
  if (usedInRow.length >= 2 && usedInRow.filter((x) => x === color).length >= 2) {
    const alt = onScreenColors.length ? pickRandom(onScreenColors) : color;
    color = alt;
  }
  return color;
}
