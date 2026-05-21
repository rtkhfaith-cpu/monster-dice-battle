import { LADDER_MAIN_LEVELS, LADDER_SUB_LEVELS, LADDER_TOTAL_STAGES } from './ladderConstants';
import { applyLadderBiweeklyResetIfNeeded } from './ladderBiweeklyReset';
import { applyLadderDailyResetIfNeeded, getLadderRewardDayKey } from './ladderDailyReset';
import { decodeStage, encodeStage, getStageKind } from './stages';

/**
 * @typedef {object} MonsterLadderState
 * @property {number} mainLevel
 * @property {number} subLevel
 * @property {boolean} introSeen
 * @property {boolean} tutorialChestGranted
 * @property {string|null} biweeklyPeriodKey
 * @property {string|null} lastRewardResetAt
 * @property {boolean} gearChestClaimedToday
 * @property {boolean} monsterChestClaimedToday
 * @property {string|null} dailyLevelCompletedAt
 * @property {number|null} dailyLevelCompletedMainLevel
 * @property {{ gearChestsOpened: number, monsterChestsOpened: number }} pity
 * @property {number} ladderGold
 * @property {number} ladderShards
 * @property {{ gear: number, monster: number }} chestInventory
 * @property {number} expDust
 * @property {import('./ladderProfile').LadderOwnedMonster[]} ownedMonsters
 * @property {string[]} ownedGear repeated ids are intentional for future forge/material systems
 * @property {string|null} activeMonsterId
 * @property {boolean} activeBattlerPinned set via Collection — overrides home pick
 * @property {object} stats
 * @property {object} assist
 */

export function defaultMonsterLadderState() {
  return {
    mainLevel: 1,
    subLevel: 1,
    introSeen: false,
    tutorialChestGranted: false,
    biweeklyPeriodKey: null,
    lastRewardResetAt: null,
    gearChestClaimedToday: false,
    monsterChestClaimedToday: false,
    dailyLevelCompletedAt: null,
    dailyLevelCompletedMainLevel: null,
    pity: { gearChestsOpened: 0, monsterChestsOpened: 0 },
    ladderGold: 0,
    ladderShards: 0,
    chestInventory: { gear: 0, monster: 0 },
    expDust: 0,
    ownedMonsters: [],
    ownedGear: [],
    activeMonsterId: null,
    activeBattlerPinned: false,
    stats: {
      totalBattles: 0,
      wins: 0,
      losses: 0,
      highestStageReached: 1,
      gearChestsOpened: 0,
      monsterChestsOpened: 0,
    },
    assist: {
      enabled: false,
      borrowedFriendMonsterId: null,
      mercenaryId: null,
      helperFame: 0,
    },
  };
}

/** @param {unknown} raw @param {unknown} legacyLadderProgress */
export function normalizeMonsterLadder(raw, legacyLadderProgress) {
  const base = defaultMonsterLadderState();
  if (!raw || typeof raw !== 'object') {
    if (legacyLadderProgress?.highestFloorCleared > 0) {
      const cleared = Math.min(LADDER_MAIN_LEVELS, legacyLadderProgress.highestFloorCleared);
      base.mainLevel = Math.min(LADDER_MAIN_LEVELS, cleared + 1);
      base.subLevel = 1;
      base.introSeen = true;
      base.tutorialChestGranted = true;
    }
    return applyLadderDailyResetIfNeeded(applyLadderBiweeklyResetIfNeeded(base));
  }

  const r = /** @type {Record<string, unknown>} */ (raw);
  base.mainLevel = clampInt(r.mainLevel, 1, LADDER_MAIN_LEVELS, 1);
  base.subLevel = clampInt(r.subLevel, 1, LADDER_SUB_LEVELS, 1);
  base.introSeen = !!r.introSeen;
  base.tutorialChestGranted = !!r.tutorialChestGranted;
  base.biweeklyPeriodKey = typeof r.biweeklyPeriodKey === 'string' ? r.biweeklyPeriodKey : null;
  base.lastRewardResetAt = typeof r.lastRewardResetAt === 'string' ? r.lastRewardResetAt : null;
  base.gearChestClaimedToday = !!r.gearChestClaimedToday;
  base.monsterChestClaimedToday = !!r.monsterChestClaimedToday;
  base.dailyLevelCompletedAt = typeof r.dailyLevelCompletedAt === 'string' ? r.dailyLevelCompletedAt : null;
  base.dailyLevelCompletedMainLevel = clampInt(r.dailyLevelCompletedMainLevel, 1, LADDER_MAIN_LEVELS, null);

  const pity = r.pity && typeof r.pity === 'object' ? r.pity : {};
  base.pity = {
    gearChestsOpened: clampInt(/** @type {any} */ (pity).gearChestsOpened, 0, 999999, 0),
    monsterChestsOpened: clampInt(/** @type {any} */ (pity).monsterChestsOpened, 0, 999999, 0),
  };

  base.ladderGold = clampInt(r.ladderGold, 0, 999999999, 0);
  base.ladderShards = clampInt(r.ladderShards, 0, 999999999, 0);
  const inv = r.chestInventory && typeof r.chestInventory === 'object' ? r.chestInventory : {};
  base.chestInventory = {
    gear: clampInt(/** @type {any} */ (inv).gear, 0, 999999, 0),
    monster: clampInt(/** @type {any} */ (inv).monster, 0, 999999, 0),
  };
  base.expDust = clampInt(r.expDust, 0, 999999999, 0);
  base.ownedMonsters = Array.isArray(r.ownedMonsters) ? r.ownedMonsters.map(normalizeOwnedRow).filter(Boolean) : [];
  base.ownedGear = Array.isArray(r.ownedGear) ? r.ownedGear.filter((x) => typeof x === 'string') : [];
  base.activeMonsterId = typeof r.activeMonsterId === 'string' ? r.activeMonsterId : null;
  base.activeBattlerPinned = !!r.activeBattlerPinned;

  const st = r.stats && typeof r.stats === 'object' ? r.stats : {};
  base.stats = {
    totalBattles: clampInt(/** @type {any} */ (st).totalBattles, 0, 9999999, 0),
    wins: clampInt(/** @type {any} */ (st).wins, 0, 9999999, 0),
    losses: clampInt(/** @type {any} */ (st).losses, 0, 9999999, 0),
    highestStageReached: clampInt(/** @type {any} */ (st).highestStageReached, 1, LADDER_TOTAL_STAGES, 1),
    gearChestsOpened: clampInt(/** @type {any} */ (st).gearChestsOpened, 0, 9999999, 0),
    monsterChestsOpened: clampInt(/** @type {any} */ (st).monsterChestsOpened, 0, 9999999, 0),
  };

  const as = r.assist && typeof r.assist === 'object' ? r.assist : {};
  base.assist = {
    enabled: !!/** @type {any} */ (as).enabled,
    borrowedFriendMonsterId: /** @type {any} */ (as).borrowedFriendMonsterId ?? null,
    mercenaryId: /** @type {any} */ (as).mercenaryId ?? null,
    helperFame: clampInt(/** @type {any} */ (as).helperFame, 0, 9999999, 0),
  };

  return applyLadderDailyResetIfNeeded(applyLadderBiweeklyResetIfNeeded(base));
}

function clampInt(v, min, max, fallback) {
  const n = typeof v === 'number' ? Math.floor(v) : fallback;
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function normalizeOwnedRow(om) {
  if (!om || typeof om !== 'object') return null;
  const o = /** @type {Record<string, unknown>} */ (om);
  if (typeof o.templateId !== 'string' || typeof o.id !== 'string') return null;
  return {
    id: o.id,
    templateId: o.templateId,
    nickname: typeof o.nickname === 'string' ? o.nickname : '',
    level: clampInt(o.level, 1, 99, 1),
    exp: clampInt(o.exp, 0, 99999999, 0),
    monsterParts: o.monsterParts && typeof o.monsterParts === 'object' ? o.monsterParts : {},
    equippedLadderGear: Array.isArray(o.equippedLadderGear)
      ? o.equippedLadderGear.filter((x) => typeof x === 'string')
      : [],
    gearSlotCount: clampInt(o.gearSlotCount, 2, 6, 4),
  };
}

/** @param {MonsterLadderState} ml */
export function getCurrentStage(ml) {
  return {
    mainLevel: ml.mainLevel,
    subLevel: ml.subLevel,
    stageIndex: encodeStage(ml.mainLevel, ml.subLevel),
    kind: getStageKind(ml.subLevel),
  };
}

/**
 * Win → advance sub-level; loss → same stage.
 * @param {MonsterLadderState} ml
 * @param {boolean} won
 */
export function advanceMonsterLadderStage(ml, won) {
  ml.stats.totalBattles += 1;
  if (!won) {
    ml.stats.losses += 1;
    return ml;
  }
  ml.stats.wins += 1;
  const idx = encodeStage(ml.mainLevel, ml.subLevel);
  if (idx > ml.stats.highestStageReached) ml.stats.highestStageReached = idx;

  if (ml.mainLevel >= LADDER_MAIN_LEVELS && ml.subLevel >= LADDER_SUB_LEVELS) {
    ml.dailyLevelCompletedAt = getLadderRewardDayKey();
    ml.dailyLevelCompletedMainLevel = ml.mainLevel;
    return ml;
  }

  if (ml.subLevel >= LADDER_SUB_LEVELS) {
    ml.dailyLevelCompletedAt = getLadderRewardDayKey();
    ml.dailyLevelCompletedMainLevel = ml.mainLevel;
  } else {
    ml.subLevel += 1;
  }
  return ml;
}

/** @param {MonsterLadderState} ml */
export function nextRewardHints(ml) {
  const { subLevel } = ml;
  let subsToMini = 0;
  let subsToBig = 0;
  if (subLevel < 5) subsToMini = 5 - subLevel;
  else if (subLevel < 10) subsToMini = 0;
  if (subLevel < 10) subsToBig = 10 - subLevel;
  return { subsToMini, subsToBig };
}

export function isLadderComplete(ml) {
  return ml.mainLevel >= LADDER_MAIN_LEVELS && ml.subLevel > LADDER_SUB_LEVELS;
}
