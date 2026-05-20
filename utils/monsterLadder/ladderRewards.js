import { addExperience, subtractExperience, expToAdvanceFrom, expWinForEnemyLevel, expLossPenalty } from '../expLevel';
import { ladderCoinsForEnemyLevel } from '../../src/gameBalance/rewards';
import { LADDER_CHEST_SHARD_COST, LADDER_EXP_MULTIPLIER } from './ladderConstants';
import { grantGearToProfile } from '../gearDuplicateReward';
import { rollChestDrop } from './ladderChestTables';
import {
  advanceMonsterLadderStage,
  getCurrentStage,
} from './ladderProgress';
import { getStageKind } from './stages';
import {
  generateLadderOwnedMonster,
  getMonsterLadderState,
  setMonsterLadderState,
} from './ladderProfile';
import { resolveLadderTemplateId } from './ladderMonsterMigrate';
import { cloneGameData, getPlayerProfile } from '../gameStorage';

function profileOwnsLadderTemplate(profile, ml, templateId) {
  const canonical = resolveLadderTemplateId(templateId) ?? templateId;
  const inMain = profile.ownedMonsters?.some(
    (m) => (resolveLadderTemplateId(m.templateId) ?? m.templateId) === canonical,
  );
  const inLadder = ml.ownedMonsters?.some(
    (m) => (resolveLadderTemplateId(m.templateId) ?? m.templateId) === canonical,
  );
  return inMain || inLadder;
}

function addLadderMonsterToMainInventory(profile, row) {
  if (!Array.isArray(profile.ownedMonsters)) profile.ownedMonsters = [];
  const canonical = resolveLadderTemplateId(row.templateId) ?? row.templateId;
  const inMain = profile.ownedMonsters?.some(
    (m) => (resolveLadderTemplateId(m.templateId) ?? m.templateId) === canonical,
  );
  if (inMain) return null;
  const mainRow = {
    ...row,
    id: row.id,
    equippedGear: Array.isArray(row.equippedGear) ? row.equippedGear : [],
    unlockedVisualTags: Array.isArray(row.unlockedVisualTags) ? row.unlockedVisualTags : [],
  };
  delete mainRow.equippedLadderGear;
  profile.ownedMonsters.push(mainRow);
  if (!profile.selectedMonsterId) profile.selectedMonsterId = mainRow.id;
  return mainRow;
}

function ensureChestInventory(ml) {
  if (!ml.chestInventory || typeof ml.chestInventory !== 'object') {
    ml.chestInventory = { gear: 0, monster: 0 };
  }
  ml.chestInventory.gear = Math.max(0, Math.floor(ml.chestInventory.gear || 0));
  ml.chestInventory.monster = Math.max(0, Math.floor(ml.chestInventory.monster || 0));
  return ml.chestInventory;
}

/**
 * Grant today's mini/boss chest and open it immediately on the profile.
 * @param {object} profile
 * @param {import('./ladderProgress').MonsterLadderState} ml
 * @param {'gear'|'monster'} type
 */
function awardAndOpenDailyBossChest(profile, ml, type) {
  const claimedKey = type === 'gear' ? 'gearChestClaimedToday' : 'monsterChestClaimedToday';
  if (ml[claimedKey]) {
    return { chestBlocked: true, chestAwarded: null, chestDrop: null };
  }
  ensureChestInventory(ml)[type] += 1;
  ml[claimedKey] = true;
  const opened = openLadderChestOnProfile(profile, type);
  if (opened.error) {
    return { chestBlocked: false, chestAwarded: type, chestDrop: null };
  }
  return {
    chestBlocked: false,
    chestAwarded: type,
    chestDrop: opened.drop ?? null,
    shardsGained: opened.drop?.shardsGained ?? 0,
  };
}

/**
 * @param {object} gameData
 * @param {string} profileId
 * @param {{ outcome: 1|2|'draw', enemyLevel: number, ownedMonsterId: string }} payload
 */
export function applyMonsterLadderBattleRewards(gameData, profileId, payload) {
  const gd = cloneGameData(gameData);
  const profile = getPlayerProfile(gd, profileId);
  if (!profile) return { gameData: gd, summary: null };

  const ml = getMonsterLadderState(profile);
  const stage = getCurrentStage(ml);
  const won = payload.outcome === 1;

  let expDelta = 0;
  let ladderGoldGain = 0;

  if (won) {
    const baseExp = expWinForEnemyLevel(payload.enemyLevel ?? stage.mainLevel * 3);
    expDelta = Math.floor(baseExp * LADDER_EXP_MULTIPLIER);
    ladderGoldGain = ladderCoinsForEnemyLevel(payload.enemyLevel ?? stage.mainLevel * 3, getStageKind(stage.subLevel));
  } else if (payload.outcome === 2) {
    expDelta = -Math.floor(expLossPenalty(1) * 0.5);
  }

  const om = profile.ownedMonsters?.find((m) => m.id === payload.ownedMonsterId)
    ?? ml.ownedMonsters.find((m) => m.id === payload.ownedMonsterId);
  let expPack = null;
  if (om && expDelta !== 0) {
    const prevLevel = om.level;
    const res = expDelta >= 0
      ? addExperience({ level: om.level, exp: om.exp }, expDelta)
      : subtractExperience({ level: om.level, exp: om.exp }, Math.abs(expDelta));
    om.level = res.level;
    om.exp = res.exp;
    expPack = {
      level: om.level,
      exp: om.exp,
      expToNext: expToAdvanceFrom(om.level),
      prevLevel,
      levelsGained: res.levelsGained ?? 0,
      expDelta,
    };
  }

  if (ladderGoldGain > 0) ml.ladderGold += ladderGoldGain;

  let chestDrop = null;
  let chestAwarded = null;
  let chestBlocked = false;

  if (won) {
    advanceMonsterLadderStage(ml, true);
    const kind = getStageKind(stage.subLevel);
    if (kind === 'miniBoss') {
      const chest = awardAndOpenDailyBossChest(profile, ml, 'gear');
      chestAwarded = chest.chestAwarded;
      chestBlocked = chest.chestBlocked;
      chestDrop = chest.chestDrop;
    } else if (kind === 'bigBoss') {
      const chest = awardAndOpenDailyBossChest(profile, ml, 'monster');
      chestAwarded = chest.chestAwarded;
      chestBlocked = chest.chestBlocked;
      chestDrop = chest.chestDrop;
    }
  } else if (payload.outcome === 2) {
    advanceMonsterLadderStage(ml, false);
  }

  setMonsterLadderState(profile, ml);

  return {
    gameData: gd,
    summary: {
      monsterLadder: true,
      won,
      stage,
      expPack,
      ladderGoldGain,
      ladderGoldTotal: ml.ladderGold,
      chestDrop,
      chestAwarded,
      chestBlocked,
      shardsGained: chestDrop?.shardsGained ?? 0,
      ladderShardsTotal: ml.ladderShards,
    },
  };
}

export function buyMonsterLadderChest(gameData, profileId, type) {
  if (type !== 'gear' && type !== 'monster') return { gameData, error: 'Unknown chest type.' };
  const gd = cloneGameData(gameData);
  const profile = getPlayerProfile(gd, profileId);
  if (!profile) return { gameData: gd, error: 'Profile not found.' };
  const ml = getMonsterLadderState(profile);
  const cost = LADDER_CHEST_SHARD_COST[type];
  if ((ml.ladderShards || 0) < cost) return { gameData: gd, error: `Need ${cost} shards.` };
  const inv = ensureChestInventory(ml);
  ml.ladderShards -= cost;
  inv[type] += 1;
  setMonsterLadderState(profile, ml);
  return { gameData: gd, chestType: type, cost, ladderShardsTotal: ml.ladderShards };
}

export function openMonsterLadderChest(gameData, profileId, type) {
  if (type !== 'gear' && type !== 'monster') return { gameData, error: 'Unknown chest type.' };
  const gd = cloneGameData(gameData);
  const profile = getPlayerProfile(gd, profileId);
  if (!profile) return { gameData: gd, error: 'Profile not found.' };
  const opened = openLadderChestOnProfile(profile, type);
  if (opened.error) return { gameData: gd, error: opened.error };
  return { gameData: gd, drop: opened.drop, ladderShardsTotal: opened.ladderShardsTotal };
}

/**
 * Roll and grant a ladder chest reward on a profile (consumes one chest from inventory).
 * @param {object} profile
 * @param {'gear'|'monster'} type
 */
export function openLadderChestOnProfile(profile, type) {
  if (type !== 'gear' && type !== 'monster') return { error: 'Unknown chest type.' };
  const ml = getMonsterLadderState(profile);
  const inv = ensureChestInventory(ml);
  if ((inv[type] || 0) <= 0) return { error: 'No chest available.' };
  inv[type] -= 1;
  const pityKey = type === 'gear' ? 'gearChestsOpened' : 'monsterChestsOpened';
  const drop = resolveChestOpen(profile, ml, type);
  ml.pity[pityKey] += 1;
  ml.stats[pityKey] += 1;
  setMonsterLadderState(profile, ml);
  return { drop, ladderShardsTotal: ml.ladderShards };
}

/** @param {object} profile @param {import('./ladderProgress').MonsterLadderState} ml @param {'gear'|'monster'} type */
function resolveChestOpen(profile, ml, type) {
  const pityKey = type === 'gear' ? 'gearChestsOpened' : 'monsterChestsOpened';
  const roll = rollChestDrop(type, ml.pity[pityKey]);
  if (!roll) return null;

  if (roll.kind === 'monster') {
    const templateId = resolveLadderTemplateId(roll.id) ?? roll.id;
    if (profileOwnsLadderTemplate(profile, ml, templateId)) {
      const row = generateLadderOwnedMonster(templateId);
      ml.ownedMonsters.push(row);
      addLadderMonsterToMainInventory(profile, row);
      return { ...roll, duplicate: true, ownedId: row.id, shardsGained: 0, futureCombine: true };
    }
    const row = generateLadderOwnedMonster(templateId);
    ml.ownedMonsters.push(row);
    const mainRow = addLadderMonsterToMainInventory(profile, row);
    if (!ml.activeMonsterId) ml.activeMonsterId = row.id;
    return { ...roll, duplicate: false, ownedId: row.id, mainOwnedId: mainRow?.id ?? row.id };
  }

  const gearGrant = grantGearToProfile(profile, roll.id);
  return {
    ...roll,
    duplicate: gearGrant.duplicate,
    shardsGained: gearGrant.shardsGained ?? 0,
    exchangedForShards: !!gearGrant.exchangedForShards,
    quantity: gearGrant.quantity ?? 1,
  };
}
