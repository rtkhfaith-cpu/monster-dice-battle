import assert from 'node:assert/strict';
import { compareLocalAndCloudSave } from './saveConflict.js';

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
assert.equal(compareLocalAndCloudSave(localNewStale, cloudAhead).resolution, 'conflict');

console.log('saveConflict.test.js: ok');
