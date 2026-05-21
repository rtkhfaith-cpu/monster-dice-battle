/**
 * Daily spin wheel geometry (must match DailySpinWheel.js drawing).
 * 0° = 12 o'clock, clockwise. Segment i is centered at i * stepDeg.
 */

export function segmentCenterDeg(idx, stepDeg) {
  return idx * stepDeg;
}

export function segmentBoundsDeg(idx, stepDeg) {
  const half = stepDeg / 2;
  return { start: idx * stepDeg - half, end: idx * stepDeg + half };
}

/** Final rotation (mod 360) with wedge `idx` center under the top pointer. */
export function spinRestRotationForIndex(idx, stepDeg) {
  const centerDeg = segmentCenterDeg(idx, stepDeg);
  return (360 - centerDeg) % 360;
}

/**
 * Animated.Value target: spin from `fromDeg`, at least `minFullTurns` full turns, land on prize.
 */
export function spinAnimationTargetDeg(idx, stepDeg, fromDeg = 0, minFullTurns = 5) {
  const from = ((fromDeg % 360) + 360) % 360;
  const rest = spinRestRotationForIndex(idx, stepDeg);
  let delta = rest - from;
  if (delta <= 0) delta += 360;
  return from + minFullTurns * 360 + delta;
}

/** Which wedge index is under the top pointer after rotation (degrees clockwise). */
export function segmentIndexFromRotation(rotationDeg, stepDeg, segmentCount) {
  const mod = ((rotationDeg % 360) + 360) % 360;
  const centerDeg = (360 - mod) % 360;
  const idx = Math.round(centerDeg / stepDeg) % segmentCount;
  return idx;
}

export function rotationMatchesSegmentIndex(rotationDeg, idx, stepDeg, segmentCount) {
  return segmentIndexFromRotation(rotationDeg, stepDeg, segmentCount) === idx;
}

/** @deprecated use spinAnimationTargetDeg */
export function spinRotationForSegmentIndex(idx, stepDeg, currentRotation = 0, extraFullTurns = 5) {
  return spinAnimationTargetDeg(idx, stepDeg, currentRotation, extraFullTurns);
}
