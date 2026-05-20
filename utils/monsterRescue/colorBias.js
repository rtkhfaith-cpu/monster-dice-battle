const MAX_LEVEL = 60;

function clampLevel(levelId) {
  return Math.max(1, Math.min(MAX_LEVEL, Math.floor(levelId || 1)));
}

/** 0–1 chance that a new bubble uses a color already on the board (easier early levels). */
export function onScreenColorBiasForLevel(levelId) {
  const id = clampLevel(levelId);
  if (id <= 12) return 0.88;
  if (id <= 24) return 0.7;
  if (id <= 36) return 0.48;
  if (id <= 48) return 0.28;
  return 0.1;
}

/** Early levels: prefer colors on the board; later levels: prefer colors not on the board for push rows. */
export function pushRowOffScreenBiasForLevel(levelId) {
  const id = clampLevel(levelId);
  if (id <= 16) return 0;
  if (id <= 32) return 0.35;
  if (id <= 48) return 0.55;
  return 0.72;
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
