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
};

assert.equal(compareLocalAndCloudSave(localOld, cloudNew).resolution, 'cloud');

const localNewStale = {
  updatedAt: '2026-05-21T10:00:00.000Z',
  ownedMonsters: [{ level: 52 }],
};
const cloudAhead = {
  profileID: 'p1',
  updatedAt: '2026-05-20T18:00:00.000Z',
  peakMonsterLevel: 70,
};
const staleComparison = compareLocalAndCloudSave(localNewStale, cloudAhead);
assert.equal(staleComparison.resolution, 'conflict');
assert.equal(isCloudUploadBlocked({ players: [{ id: 'p1', ...localNewStale }] }, 'p1', cloudAhead), true);
assert.equal(shouldApplyCloudOverLocal(staleComparison, localNewStale, cloudAhead), true);
assert.equal(shouldBlockStaleLocalLogin(staleComparison, localNewStale), false);

const localAhead = {
  updatedAt: '2026-05-21T10:00:00.000Z',
  ownedMonsters: [{ level: 90 }],
};
const cloudBehind = {
  profileID: 'p1',
  updatedAt: '2026-05-20T18:00:00.000Z',
  peakMonsterLevel: 70,
};
const aheadComparison = compareLocalAndCloudSave(localAhead, cloudBehind);
assert.equal(shouldBlockStaleLocalLogin(aheadComparison, localAhead), true);
assert.equal(isCloudUploadBlocked({ players: [{ id: 'p1', ...localAhead }] }, 'p1', cloudBehind), false);

const touchedAfterBattleStart = {
  updatedAt: '2026-05-20T12:00:00.000Z',
  lastCloudSyncedAt: '2026-05-20T09:00:00.000Z',
  ownedMonsters: [{ level: 25 }],
  coins: 30058,
};
const laptopCloud = {
  profileID: 'p1',
  updatedAt: '2026-05-20T11:00:00.000Z',
  peakMonsterLevel: 25,
  coins: 19000,
};
const snapshotBeforeUpload = {
  updatedAt: '2026-05-20T10:00:00.000Z',
  lastCloudSyncedAt: '2026-05-20T09:00:00.000Z',
  ownedMonsters: [{ level: 25 }],
  coins: 30058,
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
assert.equal(
  isCloudUploadBlocked(
    { players: [{ id: 'p1', ...touchedAfterBattleStart }] },
    'p1',
    laptopCloud,
  ),
  true,
);

const spinBumpedLocal = {
  updatedAt: '2026-05-20T12:30:00.000Z',
  lastCloudSyncedAt: '2026-05-20T09:00:00.000Z',
  lastKnownCloudUpdatedAt: '2026-05-20T09:00:00.000Z',
  ownedMonsters: [{ level: 25 }],
  coins: 30058,
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

console.log('saveConflict.test.js: ok');
