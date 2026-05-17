import { addExperience, subtractExperience, expToAdvanceFrom, expWinForEnemyLevel, expLossPenalty } from '../expLevel';
import {
  LADDER_EXP_MULTIPLIER,
  LADDER_GOLD_MULTIPLIER,
  LADDER_SHARDS_BY_RARITY,
  TUTORIAL_STARTER_IDS,
} from './ladderConstants';
import { rollChestDrop } from './ladderChestTables';
import {
  advanceMonsterLadderStage,
  getCurrentStage,
} from './ladderProgress';
import { getStageKind } from './stages';
import {
  generateLadderOwnedMonster,
  getMonsterLadderState,
  profileOwnsLadderTemplate,
  setMonsterLadderState,
} from './ladderProfile';
import { cloneGameData, getPlayerProfile } from '../gameStorage';

function coinWinForEnemyLevel(enemyLevel) {
  const lv = Math.max(1, Math.floor(enemyLevel || 1));
  return 14 + Math.floor(Math.random() * 9) + Math.floor(lv * 0.8);
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
    const baseCoins = coinWinForEnemyLevel(payload.enemyLevel ?? stage.mainLevel * 3);
    ladderGoldGain = Math.max(1, Math.floor(baseCoins * LADDER_GOLD_MULTIPLIER));
  } else if (payload.outcome === 2) {
    expDelta = -Math.floor(expLossPenalty(1) * 0.5);
  }

  const om = ml.ownedMonsters.find((m) => m.id === payload.ownedMonsterId);
  let expPack = null;
  if (om && expDelta !== 0) {
    const res = expDelta >= 0
      ? addExperience({ level: om.level, exp: om.exp }, expDelta)
      : subtractExperience({ level: om.level, exp: om.exp }, Math.abs(expDelta));
    om.level = res.level;
    om.exp = res.exp;
    expPack = {
      level: om.level,
      exp: om.exp,
      expToNext: expToAdvanceFrom(om.level),
      levelsGained: res.levelsGained ?? 0,
      expDelta,
    };
  }

  if (ladderGoldGain > 0) ml.ladderGold += ladderGoldGain;

  let chestDrop = null;
  let chestBlocked = false;

  if (won) {
    advanceMonsterLadderStage(ml, true);
    const kind = getStageKind(stage.subLevel);
    if (kind === 'miniBoss') {
      if (!ml.gearChestClaimedToday) {
        chestDrop = resolveChestOpen(ml, 'gear');
        ml.gearChestClaimedToday = true;
        ml.pity.gearChestsOpened += 1;
        ml.stats.gearChestsOpened += 1;
      } else {
        chestBlocked = true;
      }
    } else if (kind === 'bigBoss') {
      if (!ml.monsterChestClaimedToday) {
        chestDrop = resolveChestOpen(ml, 'monster');
        ml.monsterChestClaimedToday = true;
        ml.pity.monsterChestsOpened += 1;
        ml.stats.monsterChestsOpened += 1;
      } else {
        chestBlocked = true;
      }
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
      chestBlocked,
      shardsGained: chestDrop?.shardsGained ?? 0,
      ladderShardsTotal: ml.ladderShards,
    },
  };
}

/** @param {import('./ladderProgress').MonsterLadderState} ml @param {'gear'|'monster'} type */
function resolveChestOpen(ml, type) {
  const pityKey = type === 'gear' ? 'gearChestsOpened' : 'monsterChestsOpened';
  const roll = rollChestDrop(type, ml.pity[pityKey]);
  if (!roll) return null;

  if (roll.kind === 'monster') {
    if (ml.ownedMonsters.some((m) => m.templateId === roll.id)) {
      const shards = LADDER_SHARDS_BY_RARITY[roll.rarity] ?? 8;
      ml.ladderShards += shards;
      return { ...roll, duplicate: true, shardsGained: shards };
    }
    const row = generateLadderOwnedMonster(roll.id);
    ml.ownedMonsters.push(row);
    if (!ml.activeMonsterId) ml.activeMonsterId = row.id;
    return { ...roll, duplicate: false, ownedId: row.id };
  }

  if (ml.ownedGear.includes(roll.id)) {
    const shards = LADDER_SHARDS_BY_RARITY[roll.rarity] ?? 8;
    ml.ladderShards += shards;
    return { ...roll, duplicate: true, shardsGained: shards };
  }
  ml.ownedGear.push(roll.id);
  return { ...roll, duplicate: false };
}

/**
 * First-visit tutorial monster chest — common from starter pool.
 * @param {object} gameData
 * @param {string} profileId
 */
export function grantTutorialLadderChest(gameData, profileId) {
  const gd = cloneGameData(gameData);
  const profile = getPlayerProfile(gd, profileId);
  if (!profile) return { gameData: gd, drop: null };

  const ml = getMonsterLadderState(profile);
  if (ml.tutorialChestGranted) return { gameData: gd, drop: null };

  const pool = TUTORIAL_STARTER_IDS;
  const templateId = pool[Math.floor(Math.random() * pool.length)];
  let drop;

  if (profileOwnsLadderTemplate(profile, templateId)) {
    const shards = LADDER_SHARDS_BY_RARITY.common;
    ml.ladderShards += shards;
    drop = { kind: 'monster', id: templateId, duplicate: true, shardsGained: shards };
  } else {
    const row = generateLadderOwnedMonster(templateId);
    ml.ownedMonsters.push(row);
    ml.activeMonsterId = row.id;
    drop = { kind: 'monster', id: templateId, duplicate: false, ownedId: row.id, rarity: 'common' };
  }

  ml.tutorialChestGranted = true;
  ml.introSeen = true;
  setMonsterLadderState(profile, ml);
  return { gameData: gd, drop };
}
