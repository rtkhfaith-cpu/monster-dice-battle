/**
 * Run: node utils/dailySpinWheelAlign.test.js
 */
import {
  segmentCenterDeg,
  segmentIndexFromRotation,
  spinRotationForSegmentIndex,
  rotationMatchesSegmentIndex,
} from './dailySpinWheelAlign.js';

const SEGMENTS = 9;
const STEP = 360 / SEGMENTS;

let failed = 0;

for (let idx = 0; idx < SEGMENTS; idx += 1) {
  const total = spinRotationForSegmentIndex(idx, STEP, 0, 5);
  const mod = ((total % 360) + 360) % 360;
  const back = segmentIndexFromRotation(mod, STEP, SEGMENTS);
  const screen = (segmentCenterDeg(idx, STEP) + mod) % 360;
  const ok = back === idx && screen === 0 && rotationMatchesSegmentIndex(mod, idx, STEP, SEGMENTS);
  if (!ok) {
    failed += 1;
    console.error('FAIL idx', idx, { mod, back, screen });
  }
}

if (failed > 0) {
  console.error(`${failed} alignment checks failed`);
  process.exit(1);
}
console.log(`OK: all ${SEGMENTS} wedges land under 12 o'clock pointer`);
