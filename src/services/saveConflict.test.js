import assert from 'node:assert/strict';
import {
  compareLocalAndCloudSave,
  isCloudUploadBlocked,
  shouldApplyCloudOverLocal,
  shouldBlockStaleLocalLogin,
  cloudProgressDiverged,
} from './saveConflict.js';

const localOld = {
  updatedAt: '2026-05-19T10:00:00.000Z',
  ownedMonsters: [{ level: 50 }],
};
const cloudNew = {
  profileID: 'p1',
  updatedAt: '2026-05-20T18:00:00.000Z',
  peakMonsterLevel: 70,
  syncActivity: { level: 0, exp: 50 },
};

assert.equal(compareLocalAndCloudSave(localOld, cloudNew).resolution, 'cloud');

const localNewStale = {
  updatedAt: '2026-05-21T10:00:00.000Z',
  ownedMonsters: [{ level: 52 }],
  syncActivity: { level: 0, exp: 10 },
};
const cloudAhead = {
  profileID: 'p1',
  updatedAt: '2026-05-20T18:00:00.000Z',
  peakMonsterLevel: 70,
  syncActivity: { level: 0, exp: 100 },
};
const staleComparison = compareLocalAndCloudSave(localNewStale, cloudAhead);
assert.equal(staleComparison.resolution, 'conflict');
assert.equal(isCloudUploadBlocked({ players: [{ id: 'p1', ...localNewStale }] }, 'p1', cloudAhead), true);
assert.equal(shouldApplyCloudOverLocal(staleComparison, localNewStale, cloudAhead), true);
assert.equal(shouldBlockStaleLocalLogin(staleComparison, localNewStale), false);

const peak100Local = {
  updatedAt: '2026-05-21T10:00:00.000Z',
  ownedMonsters: [{ level: 100 }],
  syncActivity: { level: 0, exp: 20 },
};
const peak100Cloud = {
  profileID: 'p1',
  updatedAt: '2026-05-20T18:00:00.000Z',
  peakMonsterLevel: 100,
  syncActivity: { level: 0, exp: 500 },
};
const peak100Comparison = compareLocalAndCloudSave(peak100Local, peak100Cloud);
assert.equal(peak100Comparison.resolution, 'conflict');
assert.equal(isCloudUploadBlocked({ players: [{ id: 'p1', ...peak100Local }] }, 'p1', peak100Cloud), true);

const localAhead = {
  updatedAt: '2026-05-21T10:00:00.000Z',
  ownedMonsters: [{ level: 90 }],
  syncActivity: { level: 1, exp: 0 },
};
const cloudBehind = {
  profileID: 'p1',
  updatedAt: '2026-05-20T18:00:00.000Z',
  peakMonsterLevel: 70,
  syncActivity: { level: 0, exp: 10 },
};
const aheadComparison = compareLocalAndCloudSave(localAhead, cloudBehind);
assert.equal(shouldBlockStaleLocalLogin(aheadComparison, localAhead), true);
assert.equal(isCloudUploadBlocked({ players: [{ id: 'p1', ...localAhead }] }, 'p1', cloudBehind), false);

const touchedAfterBattleStart = {
  updatedAt: '2026-05-20T12:00:00.000Z',
  lastCloudSyncedAt: '2026-05-20T09:00:00.000Z',
  ownedMonsters: [{ level: 25 }],
  coins: 30058,
  syncActivity: { level: 0, exp: 30058 },
};
const laptopCloud = {
  profileID: 'p1',
  updatedAt: '2026-05-20T11:00:00.000Z',
  peakMonsterLevel: 25,
  coins: 19000,
  syncActivity: { level: 0, exp: 19000 },
};
const snapshotBeforeUpload = {
  updatedAt: '2026-05-20T10:00:00.000Z',
  lastCloudSyncedAt: '2026-05-20T09:00:00.000Z',
  ownedMonsters: [{ level: 25 }],
  coins: 30058,
  syncActivity: { level: 0, exp: 30000 },
};
assert.equal(
  isCloudUploadBlocked(
    { players: [{ id: 'p1', ...touchedAfterBattleStart }] },
    'p1',
    laptopCloud,
    { compareProfile: snapshotBeforeUpload },
  ),
  true,
);

const spinBumpedLocal = {
  updatedAt: '2026-05-20T12:30:00.000Z',
  lastCloudSyncedAt: '2026-05-20T09:00:00.000Z',
  lastKnownCloudUpdatedAt: '2026-05-20T09:00:00.000Z',
  ownedMonsters: [{ level: 25 }],
  coins: 30058,
  syncActivity: { level: 0, exp: 30058 },
};
assert.equal(cloudProgressDiverged(spinBumpedLocal, laptopCloud), true);
assert.equal(
  shouldApplyCloudOverLocal(
    compareLocalAndCloudSave(spinBumpedLocal, laptopCloud),
    spinBumpedLocal,
    laptopCloud,
  ),
  true,
);

const syncedLocal = {
  updatedAt: '2026-05-20T12:00:00.000Z',
  lastCloudSyncedAt: '2026-05-20T12:00:00.000Z',
  ownedMonsters: [{ level: 40 }],
  coins: 5000,
  syncActivity: { level: 0, exp: 5000 },
};
const syncedCloud = {
  profileID: 'p1',
  updatedAt: '2026-05-20T12:00:00.000Z',
  peakMonsterLevel: 40,
  coins: 5000,
  syncActivity: { level: 0, exp: 5000 },
};
const equalComparison = compareLocalAndCloudSave(syncedLocal, syncedCloud);
assert.equal(equalComparison.resolution, 'local');
assert.equal(equalComparison.reason, 'tie_equal');
assert.equal(shouldApplyCloudOverLocal(equalComparison, syncedLocal, syncedCloud), false);

console.log('saveConflict.test.js: ok');
