/**
 * Run: node utils/dailySpinWheelAlign.test.js
 */
import {
  prizeIndexFromRotation,
  rotationMatchesPrizeIndex,
  spinAnimationTargetDegForPrize,
  spinLayoutIndexForPrizeIndex,
  spinRestRotationForPrizeIndex,
} from './dailySpinWheelAlign.js';

const SEGMENTS = 9;
const STEP = 360 / SEGMENTS;

const NAMES = [
  '10',
  '25',
  '50',
  '20sh',
  '40sh',
  'gear',
  'mon',
  'myth',
  '150',
];

let failed = 0;

for (let prizeIdx = 0; prizeIdx < SEGMENTS; prizeIdx += 1) {
  const layoutIdx = spinLayoutIndexForPrizeIndex(prizeIdx, SEGMENTS);
  const rest = spinRestRotationForPrizeIndex(prizeIdx, STEP, SEGMENTS);
  const back = prizeIndexFromRotation(rest, STEP, SEGMENTS);
  const animEnd = spinAnimationTargetDegForPrize(prizeIdx, STEP, 0, 5, SEGMENTS);
  const animMod = ((animEnd % 360) + 360) % 360;
  const ok =
    back === prizeIdx &&
    animMod === rest &&
    rotationMatchesPrizeIndex(rest, prizeIdx, STEP, SEGMENTS);
  if (!ok) {
    failed += 1;
    console.error('FAIL prize', prizeIdx, NAMES[prizeIdx], { layoutIdx, rest, back, animMod });
  }
}

// User report: prize mon (6) must not show gear (5)
const monRest = spinRestRotationForPrizeIndex(6, STEP, SEGMENTS);
const monUnderNeedle = prizeIndexFromRotation(monRest, STEP, SEGMENTS);
if (monUnderNeedle !== 6) {
  failed += 1;
  console.error('FAIL mon chest case', { monRest, monUnderNeedle });
}

if (failed > 0) {
  console.error(`${failed} alignment checks failed`);
  process.exit(1);
}
console.log(`OK: needle matches prize for all ${SEGMENTS} wedges (incl. gear/mon)`);
