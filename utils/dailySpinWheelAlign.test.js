/**
 * Run: node utils/dailySpinWheelAlign.test.js
 */
import {
  segmentCenterDeg,
  segmentIndexFromRotation,
  spinAnimationTargetDeg,
  spinRestRotationForIndex,
  rotationMatchesSegmentIndex,
} from './dailySpinWheelAlign.js';

const SEGMENTS = 9;
const STEP = 360 / SEGMENTS;

let failed = 0;

for (let idx = 0; idx < SEGMENTS; idx += 1) {
  const rest = spinRestRotationForIndex(idx, STEP);
  const back = segmentIndexFromRotation(rest, STEP, SEGMENTS);
  const screen = (segmentCenterDeg(idx, STEP) + rest) % 360;
  const animEnd = spinAnimationTargetDeg(idx, STEP, 0, 5);
  const animMod = ((animEnd % 360) + 360) % 360;
  const ok =
    back === idx &&
    screen === 0 &&
    animMod === rest &&
    rotationMatchesSegmentIndex(rest, idx, STEP, SEGMENTS);
  if (!ok) {
    failed += 1;
    console.error('FAIL idx', idx, { rest, back, screen, animMod });
  }
}

if (failed > 0) {
  console.error(`${failed} alignment checks failed`);
  process.exit(1);
}
console.log(`OK: all ${SEGMENTS} prizes land under the needle`);
