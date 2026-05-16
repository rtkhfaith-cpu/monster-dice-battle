/**
 * Per-silhouette idle personality — twitchy, bouncy, sloshy, wobbly, etc.
 * @typedef {{ bobMs: number, swayMs: number, twistMs: number, squashMs: number, bobMul: number, swayMul: number, twistDeg: number, jitter?: boolean, jitterMs?: number, jitterAmp?: number }} IdleProfile
 */

/** @type {Record<string, IdleProfile>} */
const BY_BODY = {
  cockroach: { bobMs: 680, swayMs: 420, twistMs: 380, squashMs: 520, bobMul: 0.9, swayMul: 1.4, twistDeg: 5, jitter: true, jitterMs: 90, jitterAmp: 3.5 },
  chicken: { bobMs: 900, swayMs: 1400, twistMs: 2000, squashMs: 700, bobMul: 1.35, swayMul: 0.7, twistDeg: 2.5 },
  water_bottle: { bobMs: 1800, swayMs: 2200, twistMs: 2600, squashMs: 1100, bobMul: 1.1, swayMul: 0.5, twistDeg: 1.5 },
  crocs: { bobMs: 1000, swayMs: 800, twistMs: 900, squashMs: 750, bobMul: 1.1, swayMul: 1.2, twistDeg: 4 },
  iphone: { bobMs: 1100, swayMs: 1500, twistMs: 1700, squashMs: 850, bobMul: 0.95, swayMul: 0.6, twistDeg: 2 },
  lunchbox: { bobMs: 1300, swayMs: 1200, twistMs: 1400, squashMs: 900, bobMul: 1.2, swayMul: 0.85, twistDeg: 3.5 },
  pencil: { bobMs: 750, swayMs: 1100, twistMs: 900, squashMs: 600, bobMul: 1.05, swayMul: 1.3, twistDeg: 5 },
  homework: { bobMs: 1600, swayMs: 2000, twistMs: 2400, squashMs: 1000, bobMul: 0.85, swayMul: 0.55, twistDeg: 2 },
  toilet_paper: { bobMs: 820, swayMs: 700, twistMs: 650, squashMs: 580, bobMul: 1.15, swayMul: 1.35, twistDeg: 5.5, jitter: true, jitterMs: 100, jitterAmp: 2.5 },
  schoolbag: { bobMs: 1500, swayMs: 1100, twistMs: 1300, squashMs: 950, bobMul: 1.25, swayMul: 0.75, twistDeg: 2.5 },
  trex: { bobMs: 1200, swayMs: 1600, twistMs: 1800, squashMs: 800, bobMul: 1.15, swayMul: 0.9, twistDeg: 3 },
  tablet: { bobMs: 1400, swayMs: 1800, twistMs: 2000, squashMs: 900, bobMul: 0.9, swayMul: 0.45, twistDeg: 1.8 },
  skibidi: { bobMs: 750, swayMs: 600, twistMs: 480, squashMs: 650, bobMul: 1.2, swayMul: 1.1, twistDeg: 6, jitter: true, jitterMs: 110, jitterAmp: 2.8 },
  bubble_tea: { bobMs: 1500, swayMs: 1900, twistMs: 2100, squashMs: 950, bobMul: 1.05, swayMul: 0.6, twistDeg: 2 },
  sixtyseven: { bobMs: 700, swayMs: 900, twistMs: 800, squashMs: 550, bobMul: 1.3, swayMul: 1.25, twistDeg: 6, jitter: true, jitterMs: 85, jitterAmp: 4 },
};

const DEFAULT_PROFILE = {
  bobMs: 1400,
  swayMs: 1900,
  twistMs: 2200,
  squashMs: 900,
  bobMul: 1,
  swayMul: 1,
  twistDeg: 3.5,
};

/**
 * @param {string | null | undefined} themeBody
 * @returns {IdleProfile}
 */
export function getMonsterIdleProfile(themeBody) {
  if (!themeBody) return DEFAULT_PROFILE;
  return BY_BODY[themeBody] ?? DEFAULT_PROFILE;
}
