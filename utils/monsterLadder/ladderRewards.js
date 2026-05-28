import { addExperience, subtractExperience, expToAdvanceFrom, expWinForEnemyLevel, expLossPenalty } from '../expLevel';
import { ladderCoinsForEnemyLevel, scaleExpGain } from '../../src/gameBalance/rewards';
import { LADDER_CHEST_GOLD_COST, LADDER_CHEST_SHARD_COST, LADDER_EXP_MULTIPLIER } from './ladderConstants';
import { grantChestMonsterToProfile } from '../chestMonsterGrant';
import { grantGearDropToProfile } from '../gearStorage';
import { rollChestDrop } from './ladderChestTables';
import {
  advanceMonsterLadderStage,
  getCurrentStage,
} from './ladderProgress';
import { getStageKind } from './stages';
import {
  getMonsterLadderState,
  setMonsterLadderState,
} from './ladderProfile';
import { cloneGameData, getPlayerProfile } from '../gameStorage';
import { applyPetChestDrop, rollPetChestDrop, rollPetExpDustDrop } from '../petChest';
import { awardPetExpToEquippedMonster } from '../../src/gameSystems/petInventory';

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
 * @param {'gear'|'monster'} type
 */
function awardAndOpenDailyBossChest(profile, type) {
  const ml = getMonsterLadderState(profile);
  const claimedKey = type === 'gear' ? 'gearChestClaimedToday' : 'monsterChestClaimedToday';
  if (ml[claimedKey]) {
    return { chestBlocked: true, chestAwarded: null, chestDrop: null };
  }

  let drop = null;
  for (let attempt = 0; attempt < 6 && !drop; attempt += 1) {
    drop = resolveChestOpen(profile, ml, type);
  }
  if (!drop) {
    return {
      chestBlocked: false,
      chestAwarded: type,
      chestDrop: null,
      openFailed: true,
    };
  }

  ml[claimedKey] = true;
  const pityKey = type === 'gear' ? 'gearChestsOpened' : 'monsterChestsOpened';
  ml.pity[pityKey] = (ml.pity[pityKey] || 0) + 1;
  ml.stats[pityKey] = (ml.stats[pityKey] || 0) + 1;
  syncLadderStateAfterChest(profile, ml);
  return {
    chestBlocked: false,
    chestAwarded: type,
    chestDrop: drop,
    shardsGained: drop?.shardsGained ?? 0,
  };
}

/** Merge chest-side ml fields onto the latest profile ladder state (grantGear may have updated shards/gear). */
function syncLadderStateAfterChest(profile, ml) {
  const latest = getMonsterLadderState(profile);
  latest.pity = { ...latest.pity, ...ml.pity };
  latest.stats = { ...latest.stats, ...ml.stats };
  latest.gearChestClaimedToday = ml.gearChestClaimedToday;
  latest.monsterChestClaimedToday = ml.monsterChestClaimedToday;
  if (ml.chestInventory) {
    latest.chestInventory = { ...ensureChestInventory(ml) };
  }
  if (ml.activeMonsterId) latest.activeMonsterId = ml.activeMonsterId;
  setMonsterLadderState(profile, latest);
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
    expDelta = scaleExpGain(Math.floor(baseExp * LADDER_EXP_MULTIPLIER));
    ladderGoldGain = ladderCoinsForEnemyLevel(payload.enemyLevel ?? stage.mainLevel * 3, getStageKind(stage.subLevel));
  } else if (payload.outcome === 2) {
    expDelta = -Math.floor(expLossPenalty(1) * 0.5);
  }

  const om = profile.ownedMonsters?.find((m) => m.id === payload.ownedMonsterId);
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

  let petExpPack = null;
  if (won && payload.ownedMonsterId && expDelta > 0) {
    const petExp = Math.max(2, Math.floor(expDelta * 0.35));
    petExpPack = awardPetExpToEquippedMonster(profile, payload.ownedMonsterId, petExp);
  }

  if (ladderGoldGain > 0) ml.ladderGold += ladderGoldGain;

  let chestDrop = null;
  let chestAwarded = null;
  let chestBlocked = false;

  if (won) {
    advanceMonsterLadderStage(ml, true);
    setMonsterLadderState(profile, ml);
    const kind = getStageKind(stage.subLevel);
    if (kind === 'miniBoss') {
      const chest = awardAndOpenDailyBossChest(profile, 'gear');
      chestAwarded = chest.chestAwarded;
      chestBlocked = chest.chestBlocked;
      chestDrop = chest.chestDrop;
    } else if (kind === 'bigBoss') {
      const chest = awardAndOpenDailyBossChest(profile, 'monster');
      chestAwarded = chest.chestAwarded;
      chestBlocked = chest.chestBlocked;
      chestDrop = chest.chestDrop;
    }
  } else if (payload.outcome === 2) {
    advanceMonsterLadderStage(ml, false);
    setMonsterLadderState(profile, ml);
  } else if (ladderGoldGain > 0) {
    setMonsterLadderState(profile, ml);
  }

  const mlFinal = getMonsterLadderState(profile);

  return {
    gameData: gd,
    summary: {
      monsterLadder: true,
      won,
      stage,
      expPack,
      ladderGoldGain,
      ladderGoldTotal: mlFinal.ladderGold,
      chestDrop,
      chestAwarded,
      chestBlocked,
      shardsGained: chestDrop?.shardsGained ?? 0,
      ladderShardsTotal: mlFinal.ladderShards,
      petExpPack,
    },
  };
}

export function buyMonsterLadderChest(gameData, profileId, type) {
  if (type !== 'gear' && type !== 'monster') return { gameData, error: 'Unknown chest type.' };
  const gd = cloneGameData(gameData);
  const profile = getPlayerProfile(gd, profileId);
  if (!profile) return { gameData: gd, error: 'Profile not found.' };
  const ml = getMonsterLadderState(profile);
  const inv = ensureChestInventory(ml);

  if (type === 'gear') {
    const cost = LADDER_CHEST_GOLD_COST.gear;
    if ((ml.ladderGold || 0) < cost) return { gameData: gd, error: `Need ${cost} ladder gold.` };
    ml.ladderGold -= cost;
    inv.gear += 1;
    setMonsterLadderState(profile, ml);
    return {
      gameData: gd,
      chestType: type,
      cost,
      currency: 'gold',
      ladderGoldTotal: ml.ladderGold,
      ladderShardsTotal: ml.ladderShards,
    };
  }

  const shardCost = LADDER_CHEST_SHARD_COST.monster;
  if ((ml.ladderShards || 0) < shardCost) return { gameData: gd, error: `Need ${shardCost} shards.` };
  ml.ladderShards -= shardCost;
  inv.monster += 1;
  setMonsterLadderState(profile, ml);
  return {
    gameData: gd,
    chestType: type,
    cost: shardCost,
    currency: 'shards',
    ladderGoldTotal: ml.ladderGold,
    ladderShardsTotal: ml.ladderShards,
  };
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
  ml.pity[pityKey] = (ml.pity[pityKey] || 0) + 1;
  ml.stats[pityKey] = (ml.stats[pityKey] || 0) + 1;
  ml.chestInventory = { ...ensureChestInventory(ml) };
  syncLadderStateAfterChest(profile, ml);
  const mlFinal = getMonsterLadderState(profile);
  return { drop, ladderShardsTotal: mlFinal.ladderShards };
}

/** @param {object} profile @param {import('./ladderProgress').MonsterLadderState} ml @param {'gear'|'monster'} type @param {Record<string, number>} [rateWeights] */
function resolveChestOpen(profile, ml, type, rateWeights) {
  const chestKind = type === 'gear' ? 'ladder' : 'boss';
  const petDrop = rollPetChestDrop(chestKind, profile);
  if (petDrop) {
    const applied = applyPetChestDrop(profile, petDrop);
    return {
      ...petDrop,
      duplicate: applied.duplicate,
      petExpDust: applied.petExpDust ?? 0,
      monsterChestShards: applied.monsterChestShards ?? 0,
      ladderShardsTotal: applied.ladderShardsTotal ?? 0,
    };
  }

  const dustDrop = rollPetExpDustDrop('ladder');
  if (dustDrop) {
    applyPetChestDrop(profile, dustDrop);
    return dustDrop;
  }

  const pityKey = type === 'gear' ? 'gearChestsOpened' : 'monsterChestsOpened';
  const roll = rollChestDrop(type, ml.pity?.[pityKey] ?? 0, rateWeights);
  if (!roll?.id) return null;

  if (roll.kind === 'monster') {
    try {
      const granted = grantChestMonsterToProfile(profile, roll);
      if (!granted) return null;
      if (!ml.activeMonsterId) ml.activeMonsterId = granted.ownedId;
      return {
        ...roll,
        duplicate: granted.duplicate,
        ownedId: granted.ownedId,
        shardsGained: 0,
        futureCombine: granted.duplicate,
      };
    } catch (err) {
      console.warn('[ladder] monster chest grant failed', roll.id, err?.message || err);
      return null;
    }
  }

  if (type === 'gear') {
    const gearGrant = grantGearDropToProfile(profile, 'ladder');
    if (!gearGrant.ok || !gearGrant.gear) return null;
    return {
      kind: 'gear_instance',
      gear: gearGrant.gear,
      name: gearGrant.gear.name,
      rarity: gearGrant.gear.rarity,
      label: `${gearGrant.gear.rarity} ${gearGrant.gear.name}`,
      statLines: (gearGrant.gear.stats || []).map((s) => `+${s.value} ${s.type}`),
      socketCount: gearGrant.gear.sockets?.length ?? 0,
    };
  }

  return null;
}
