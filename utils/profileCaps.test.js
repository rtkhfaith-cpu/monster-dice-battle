/**
 * Run: node utils/profileCaps.test.js
 */
import assert from 'node:assert/strict';
import {
  PROFILE_CAPS,
  sanitizeFiniteInt,
  clampBattleStats,
} from './profileCaps.js';

assert.equal(sanitizeFiniteInt(1_000_000_000, { max: PROFILE_CAPS.coins }).value, PROFILE_CAPS.coins);
assert.equal(sanitizeFiniteInt('250000', { max: PROFILE_CAPS.coins }).value, 250000);
assert.equal(sanitizeFiniteInt(NaN, { max: PROFILE_CAPS.coins }).value, 0);
assert.equal(sanitizeFiniteInt(Infinity, { max: PROFILE_CAPS.coins }).value, 0);

const cappedStats = clampBattleStats({
  hp: 50_000_000,
  attack: { min: 2_000_000, max: 2_000_000 },
  magic: { min: 1, max: 1 },
  def: { min: 1, max: 1 },
  magicDef: { min: 1, max: 1 },
});
assert.equal(cappedStats.hp, PROFILE_CAPS.fighterHp);
assert.equal(cappedStats.attack.max, PROFILE_CAPS.fighterStat);

assert.equal(PROFILE_CAPS.coins, 999_999_999);
assert.equal(PROFILE_CAPS.ownedMonsters, 500);

console.log('profileCaps.test.js: ok');
