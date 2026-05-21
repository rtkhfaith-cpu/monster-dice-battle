import assert from 'node:assert/strict';
import { getRescueWeekKey } from './rescueWeeklyReset.js';
import {
  applyRescueWeeklyResetIfNeeded,
  getRescueStageStatus,
  isRescueStagePlayable,
  markRescueChestClaimed,
  normalizeMonsterRescue,
} from './progress.js';

function sgDate(y, m, d, h) {
  const utc = new Date(Date.UTC(y, m - 1, d, h - 8, 0, 0));
  return utc;
}

const sunAfter6 = sgDate(2026, 5, 18, 19);
assert.equal(getRescueWeekKey(sunAfter6), '2026-05-18');

const sunBefore6 = sgDate(2026, 5, 18, 12);
assert.equal(getRescueWeekKey(sunBefore6), '2026-05-11');

const wed = sgDate(2026, 5, 20, 15);
assert.equal(getRescueWeekKey(wed), '2026-05-18');

let mr = normalizeMonsterRescue({ highestCleared: 12, weeklyWeekKey: '2020-01-01' });
assert.equal(mr.highestCleared, 0);
assert.equal(mr.chestClaimedLevelIds.length, 0);

mr = applyRescueWeeklyResetIfNeeded({
  highestCleared: 9,
  weeklyWeekKey: getRescueWeekKey(),
  chestClaimedLevelIds: [5],
  totalCleared: 9,
  totalRescued: 0,
  totalCoinsEarned: 0,
  lastStagePlayed: 9,
});
assert.equal(getRescueStageStatus(mr, 10), 'available');
assert.equal(getRescueStageStatus(mr, 5), 'closed');
assert.ok(!isRescueStagePlayable(mr, 5));
assert.ok(isRescueStagePlayable(mr, 10));

let profile = { monsterRescue: mr };
profile = markRescueChestClaimed(profile, 10);
assert.equal(getRescueStageStatus(profile.monsterRescue, 10), 'closed');

console.log('rescueWeeklyReset.test.js: ok');
