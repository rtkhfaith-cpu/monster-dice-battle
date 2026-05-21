/**
 * Daily spin wheel geometry (must match DailySpinWheel.js drawing).
 * 0° = 12 o'clock, clockwise. Segment i is centered at i * stepDeg.
 *
 * React Native / web applies rotate() one wedge off from the pure math model,
 * so we map prize index → layout spin index before computing angles.
 */

export function segmentCenterDeg(idx, stepDeg) {
  return idx * stepDeg;
}

export function segmentBoundsDeg(idx, stepDeg) {
  const half = stepDeg / 2;
  return { start: idx * stepDeg - half, end: idx * stepDeg + half };
}

/**
 * Which wheel layout index to rotate to so prize `prizeIdx` sits under the needle.
 * @param {number} prizeIdx
 * @param {number} segmentCount
 */
export function spinLayoutIndexForPrizeIndex(prizeIdx, segmentCount) {
  if (prizeIdx >= segmentCount - 1) return 0;
  return prizeIdx + 1;
}

/** Final rotation (mod 360) for a layout index (internal). */
export function spinRestRotationForIndex(layoutIdx, stepDeg) {
  const centerDeg = segmentCenterDeg(layoutIdx, stepDeg);
  return (360 - centerDeg) % 360;
}

/** Final rotation so prize wedge sits under the needle. */
export function spinRestRotationForPrizeIndex(prizeIdx, stepDeg, segmentCount) {
  return spinRestRotationForIndex(
    spinLayoutIndexForPrizeIndex(prizeIdx, segmentCount),
    stepDeg,
  );
}

export function spinAnimationTargetDeg(layoutIdx, stepDeg, fromDeg = 0, minFullTurns = 5) {
  const from = ((fromDeg % 360) + 360) % 360;
  const rest = spinRestRotationForIndex(layoutIdx, stepDeg);
  let delta = rest - from;
  if (delta <= 0) delta += 360;
  return from + minFullTurns * 360 + delta;
}

export function spinAnimationTargetDegForPrize(
  prizeIdx,
  stepDeg,
  fromDeg = 0,
  minFullTurns = 5,
  segmentCount = 9,
) {
  return spinAnimationTargetDeg(
    spinLayoutIndexForPrizeIndex(prizeIdx, segmentCount),
    stepDeg,
    fromDeg,
    minFullTurns,
  );
}

/** Layout index under the needle from rotation (internal math). */
export function segmentIndexFromRotation(rotationDeg, stepDeg, segmentCount) {
  const mod = ((rotationDeg % 360) + 360) % 360;
  const centerDeg = (360 - mod) % 360;
  const idx = Math.round(centerDeg / stepDeg) % segmentCount;
  return idx;
}

/** Prize index under the needle after rotation (matches rolled reward). */
export function prizeIndexFromRotation(rotationDeg, stepDeg, segmentCount) {
  const layoutIdx = segmentIndexFromRotation(rotationDeg, stepDeg, segmentCount);
  if (layoutIdx === 0) return segmentCount - 1;
  return layoutIdx - 1;
}

export function rotationMatchesPrizeIndex(rotationDeg, prizeIdx, stepDeg, segmentCount) {
  return prizeIndexFromRotation(rotationDeg, stepDeg, segmentCount) === prizeIdx;
}

/** @deprecated */
export function spinRotationForSegmentIndex(idx, stepDeg, currentRotation = 0, extraFullTurns = 5) {
  return spinAnimationTargetDeg(idx, stepDeg, currentRotation, extraFullTurns);
}
