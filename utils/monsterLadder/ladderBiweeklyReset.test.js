import assert from 'node:assert/strict';
import {
  applyLadderBiweeklyResetIfNeeded,
  getLadderBiweeklyPeriodKey,
  getNextLadderBiweeklyResetDate,
  LADDER_BIWEEKLY_EPOCH,
} from './ladderBiweeklyReset.js';
function sgDate(y, m, d, h) {
  return new Date(Date.UTC(y, m - 1, d, h - 8, 0, 0));
}

const beforeEpoch = sgDate(2026, 5, 19, 12);
assert.equal(getLadderBiweeklyPeriodKey(beforeEpoch), `pre-${LADDER_BIWEEKLY_EPOCH}`);

const firstReset = sgDate(2026, 5, 24, 19);
assert.equal(getLadderBiweeklyPeriodKey(firstReset), `${LADDER_BIWEEKLY_EPOCH}#0`);

const secondReset = sgDate(2026, 6, 7, 19);
assert.equal(getLadderBiweeklyPeriodKey(secondReset), `${LADDER_BIWEEKLY_EPOCH}#1`);

assert.equal(getNextLadderBiweeklyResetDate(beforeEpoch), LADDER_BIWEEKLY_EPOCH);
assert.equal(getNextLadderBiweeklyResetDate(firstReset), '2026-06-07');

let ml = { mainLevel: 5, subLevel: 3, biweeklyPeriodKey: null };
ml = applyLadderBiweeklyResetIfNeeded(ml);
assert.equal(ml.mainLevel, 5);
assert.ok(ml.biweeklyPeriodKey.startsWith('pre-'));

ml = applyLadderBiweeklyResetIfNeeded(
  {
    mainLevel: 8,
    subLevel: 10,
    gearChestClaimedToday: true,
    monsterChestClaimedToday: true,
    biweeklyPeriodKey: `pre-${LADDER_BIWEEKLY_EPOCH}`,
  },
  firstReset,
);
assert.equal(ml.mainLevel, 1);
assert.equal(ml.subLevel, 1);
assert.equal(ml.gearChestClaimedToday, false);
assert.equal(ml.monsterChestClaimedToday, false);
assert.equal(ml.biweeklyPeriodKey, `${LADDER_BIWEEKLY_EPOCH}#0`);

ml = applyLadderBiweeklyResetIfNeeded(
  { mainLevel: 12, subLevel: 7, biweeklyPeriodKey: `${LADDER_BIWEEKLY_EPOCH}#0` },
  firstReset,
);
assert.equal(ml.mainLevel, 12);

ml = applyLadderBiweeklyResetIfNeeded(
  { mainLevel: 12, subLevel: 7, biweeklyPeriodKey: `${LADDER_BIWEEKLY_EPOCH}#0` },
  secondReset,
);
assert.equal(ml.mainLevel, 1);
assert.equal(ml.biweeklyPeriodKey, `${LADDER_BIWEEKLY_EPOCH}#1`);

console.log('ladderBiweeklyReset.test.js: ok');
