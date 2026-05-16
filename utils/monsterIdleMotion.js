/**
 * Per-silhouette idle personality — twitchy, bouncy, sloshy, wobbly, etc.
 * @typedef {{ bobMs: number, swayMs: number, twistMs: number, squashMs: number, bobMul: number, swayMul: number, twistDeg: number, jitter?: boolean, jitterMs?: number, jitterAmp?: number }} IdleProfile
 */

/** @type {Record<string, IdleProfile>} */
const BY_BODY = {
  cockroach: { bobMs: 680, swayMs: 420, twistMs: 380, squashMs: 520, bobMul: 0.9, swayMul: 1.4, twistDeg: 5, jitter: true, jitterMs: 90, jitterAmp: 3.5 },
  chicken: { bobMs: 900, swayMs: 1400, twistMs: 2000, squashMs: 700, bobMul: 1.35, swayMul: 0.7, twistDeg: 2.5 },
  water_bottle: { bobMs: 1800, swayMs: 2200, twistMs: 2600, squashMs: 1100, bobMul: 1.1, swayMul: 0.5, twistDeg: 1.5 },
  skibidi: { bobMs: 750, swayMs: 600, twistMs: 480, squashMs: 650, bobMul: 1.2, swayMul: 1.1, twistDeg: 6, jitter: true, jitterMs: 110, jitterAmp: 2.8 },
  trex: { bobMs: 1200, swayMs: 1600, twistMs: 1800, squashMs: 800, bobMul: 1.15, swayMul: 0.9, twistDeg: 3 },
  bubble_tea: { bobMs: 1500, swayMs: 1900, twistMs: 2100, squashMs: 950, bobMul: 1.05, swayMul: 0.6, twistDeg: 2 },
  crocs: { bobMs: 1000, swayMs: 800, twistMs: 900, squashMs: 750, bobMul: 1.1, swayMul: 1.2, twistDeg: 4 },
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
