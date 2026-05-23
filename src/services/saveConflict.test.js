import assert from 'node:assert/strict';
import {
  compareLocalAndCloudSave,
  isCloudUploadBlocked,
  shouldApplyCloudOverLocal,
  shouldBlockStaleLocalLogin,
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
assert.equal(shouldApplyCloudOverLocal(staleComparison), true);
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

console.log('saveConflict.test.js: ok');
