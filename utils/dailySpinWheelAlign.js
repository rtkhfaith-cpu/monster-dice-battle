/** Wedge center angle on the wheel (0° = top, clockwise). */
export function segmentCenterDeg(idx, stepDeg) {
  return idx * stepDeg + stepDeg / 2;
}

/**
 * Total clockwise rotation so wedge `idx` center sits at 12 o’clock (crown tip).
 */
export function spinRotationForSegmentIndex(idx, stepDeg, currentRotation = 0, extraFullTurns = 5) {
  const centerDeg = segmentCenterDeg(idx, stepDeg);
  const targetMod = (360 - centerDeg) % 360;
  const currentMod = ((currentRotation % 360) + 360) % 360;
  let delta = targetMod - currentMod;
  if (delta < 0) delta += 360;
  return currentMod + extraFullTurns * 360 + delta;
}

/** Which wedge index is under the crown pointer (12 o’clock) after a given rotation. */
export function segmentIndexFromRotation(rotationDeg, stepDeg, segmentCount) {
  const mod = ((rotationDeg % 360) + 360) % 360;
  const centerDeg = (360 - mod) % 360;
  const idx = Math.floor(((centerDeg - stepDeg / 2 + 360) % 360) / stepDeg) % segmentCount;
  return idx;
}

export function rotationMatchesSegmentIndex(rotationDeg, idx, stepDeg, segmentCount) {
  return segmentIndexFromRotation(rotationDeg, stepDeg, segmentCount) === idx;
}
