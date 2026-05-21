import { LADDER_DAILY_RESET_HOUR, LADDER_TIMEZONE } from './monsterLadder/ladderConstants';
import { getLadderRewardDayKey } from './monsterLadder/ladderDailyReset';
import { getLadderMonstersByRarity } from './monsterLadder/ladderMonsterCatalog';
import {
  getMonsterLadderState,
  grantLadderMonsterToProfile,
  profileOwnsMonsterTemplate,
  setMonsterLadderState,
} from './monsterLadder/ladderProfile';
import { openLadderChestOnProfile } from './monsterLadder/ladderRewards';
import { cloneGameData, getPlayerProfile } from './gameStorage';

/** @typedef {'coins'|'shards'|'gear_chest'|'monster_chest'|'mythic_monster'} DailySpinKind */

/**
 * @typedef {object} DailySpinSegment
 * @property {string} id
 * @property {string} wheelTitle
 * @property {string} wheelSub
 * @property {string} emoji
 * @property {number} weight
 * @property {string} color
 * @property {DailySpinKind} kind
 * @property {number} [amount]
 */

/** Wheel wedges — weights sum to 100. */
export const DAILY_SPIN_SEGMENTS = /** @type {DailySpinSegment[]} */ ([
  { id: 'coins_10', wheelTitle: '10', wheelSub: 'GOLD', emoji: '🪙', weight: 24, color: '#d97706', kind: 'coins', amount: 10 },
  { id: 'coins_25', wheelTitle: '25', wheelSub: 'GOLD', emoji: '🪙', weight: 18, color: '#f59e0b', kind: 'coins', amount: 25 },
  { id: 'coins_50', wheelTitle: '50', wheelSub: 'GOLD', emoji: '🪙', weight: 14, color: '#fbbf24', kind: 'coins', amount: 50 },
  { id: 'shards_20', wheelTitle: '+20', wheelSub: 'SHARDS', emoji: '💎', weight: 14, color: '#7c3aed', kind: 'shards', amount: 20 },
  { id: 'shards_40', wheelTitle: '+40', wheelSub: 'SHARDS', emoji: '💎', weight: 10, color: '#8b5cf6', kind: 'shards', amount: 40 },
  { id: 'gear_chest', wheelTitle: 'GEAR', wheelSub: 'CHEST', emoji: '📦', weight: 10, color: '#0284c7', kind: 'gear_chest' },
  { id: 'monster_chest', wheelTitle: 'MONSTER', wheelSub: 'CHEST', emoji: '🎁', weight: 9, color: '#db2777', kind: 'monster_chest' },
  { id: 'mythic', wheelTitle: 'MYTHIC', wheelSub: '1%', emoji: '👑', weight: 1, color: '#a21caf', kind: 'mythic_monster' },
  { id: 'coins_150', wheelTitle: '150', wheelSub: 'JACKPOT', emoji: '✨', weight: 1, color: '#eab308', kind: 'coins', amount: 150 },
]);

function ensureChestInventory(ml) {
  if (!ml.chestInventory || typeof ml.chestInventory !== 'object') {
    ml.chestInventory = { gear: 0, monster: 0 };
  }
  ml.chestInventory.gear = Math.max(0, Math.floor(ml.chestInventory.gear || 0));
  ml.chestInventory.monster = Math.max(0, Math.floor(ml.chestInventory.monster || 0));
  return ml.chestInventory;
}

/** Grant one chest token and open it immediately; returns openLadderChestOnProfile result. */
function grantAndOpenChest(profile, chestType) {
  const ml = getMonsterLadderState(profile);
  ensureChestInventory(ml)[chestType] += 1;
  setMonsterLadderState(profile, ml);
  return openLadderChestOnProfile(profile, chestType);
}

/** @param {object} drop @param {'gear'|'monster'} chestType */
function formatChestDropMessage(drop, chestType) {
  if (!drop) {
    return chestType === 'gear' ? 'Gear chest opened' : 'Monster chest opened';
  }
  if (drop.kind === 'gear') {
    if (drop.exchangedForShards) {
      return `${drop.name ?? 'Gear'} → +${drop.shardsGained ?? 0} shards`;
    }
    return drop.duplicate
      ? `${drop.name ?? 'Ladder gear'} (duplicate)`
      : `${drop.name ?? 'Ladder gear'} unlocked`;
  }
  return drop.duplicate
    ? `${drop.name ?? 'Monster'} — extra copy for merge`
    : `${drop.name ?? 'Monster'} joined your team`;
}

/** @param {Date} [now] */
export function getSingaporeHour(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: LADDER_TIMEZONE,
    hour: '2-digit',
    hour12: false,
  }).formatToParts(now);
  return Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
}

/** @param {Date} [now] */
export function isAfterDailySpinHour(now = new Date()) {
  return getSingaporeHour(now) >= LADDER_DAILY_RESET_HOUR;
}

/** @param {object} profile */
export function normalizeDailyLoginSpin(profile) {
  if (!profile) return;
  const raw = profile.dailyLoginSpin;
  if (!raw || typeof raw !== 'object') {
    profile.dailyLoginSpin = { rewardDayKey: null, claimedAt: null };
    return;
  }
  profile.dailyLoginSpin = {
    rewardDayKey: typeof raw.rewardDayKey === 'string' ? raw.rewardDayKey : null,
    claimedAt: typeof raw.claimedAt === 'string' ? raw.claimedAt : null,
  };
}

/** @param {object} profile @param {Date} [now] */
export function hasClaimedDailySpin(profile, now = new Date()) {
  normalizeDailyLoginSpin(profile);
  const key = getLadderRewardDayKey(now);
  return profile.dailyLoginSpin.rewardDayKey === key && !!profile.dailyLoginSpin.claimedAt;
}

/**
 * Eligible for today's spin: after 6PM SGT and not yet claimed for this reward day.
 * @param {object|null|undefined} profile
 * @param {Date} [now]
 */
export function isDailySpinEligible(profile, now = new Date()) {
  if (!profile) return false;
  normalizeDailyLoginSpin(profile);
  if (!isAfterDailySpinHour(now)) return false;
  if (hasClaimedDailySpin(profile, now)) return false;
  return true;
}

/** @returns {DailySpinSegment} */
export function rollDailySpinSegment() {
  const total = DAILY_SPIN_SEGMENTS.reduce((s, seg) => s + seg.weight, 0);
  let roll = Math.random() * total;
  for (const seg of DAILY_SPIN_SEGMENTS) {
    roll -= seg.weight;
    if (roll <= 0) return seg;
  }
  return DAILY_SPIN_SEGMENTS[0];
}

export function getDailySpinSegmentById(id) {
  return DAILY_SPIN_SEGMENTS.find((s) => s.id === id) ?? null;
}

export function dailySpinSegmentIndex(segmentId) {
  return Math.max(0, DAILY_SPIN_SEGMENTS.findIndex((s) => s.id === segmentId));
}

/** @param {object} profile @param {DailySpinSegment} segment */
export function applyDailySpinPrizeToProfile(profile, segment) {
  const result = {
    segmentId: segment.id,
    wheelTitle: segment.wheelTitle,
    wheelSub: segment.wheelSub,
    kind: segment.kind,
    message: '',
    duplicate: false,
    chestDrop: null,
    ladderShardsTotal: null,
    coinsTotal: profile.coins ?? 0,
    opensChest: false,
  };

  if (segment.kind === 'coins') {
    const amt = segment.amount ?? 0;
    profile.coins = (profile.coins ?? 0) + amt;
    result.coinsTotal = profile.coins;
    result.message = `+${amt} coins`;
    return result;
  }

  const ml = getMonsterLadderState(profile);

  if (segment.kind === 'shards') {
    const amt = segment.amount ?? 0;
    ml.ladderShards = (ml.ladderShards ?? 0) + amt;
    setMonsterLadderState(profile, ml);
    result.ladderShardsTotal = ml.ladderShards;
    result.message = `+${amt} ladder shards`;
    return result;
  }

  if (segment.kind === 'gear_chest' || segment.kind === 'monster_chest') {
    const chestType = segment.kind === 'gear_chest' ? 'gear' : 'monster';
    const opened = grantAndOpenChest(profile, chestType);
    const mlAfter = getMonsterLadderState(profile);
    result.opensChest = true;
    result.ladderShardsTotal = opened.ladderShardsTotal ?? mlAfter.ladderShards;
    result.chestDrop = opened.drop ?? null;
    result.duplicate = !!opened.drop?.duplicate;
    result.message = formatChestDropMessage(opened.drop, chestType);
    if (opened.error) {
      result.message = `${chestType === 'gear' ? 'Gear' : 'Monster'} chest could not open — try Monster Ladder`;
    }
    return result;
  }

  if (segment.kind === 'mythic_monster') {
    const pool = getLadderMonstersByRarity('mythic');
    const pick = pool[Math.floor(Math.random() * pool.length)] ?? pool[0];
    if (!pick) {
      const opened = grantAndOpenChest(profile, 'monster');
      result.opensChest = true;
      result.chestDrop = opened.drop;
      result.ladderShardsTotal = getMonsterLadderState(profile).ladderShards;
      result.message = opened.drop
        ? formatChestDropMessage(opened.drop, 'monster')
        : 'Mythic chest opened';
      return result;
    }
    const duplicate = profileOwnsMonsterTemplate(profile, pick.id);
    const row = grantLadderMonsterToProfile(profile, pick.id);
    const mlAfter = getMonsterLadderState(profile);
    if (!mlAfter.activeMonsterId) mlAfter.activeMonsterId = row.id;
    setMonsterLadderState(profile, mlAfter);
    result.opensChest = true;
    result.duplicate = duplicate;
    result.message = duplicate
      ? `${pick.name} — mythic duplicate for merge`
      : `${pick.name} — mythic jackpot`;
    result.chestDrop = {
      kind: 'monster',
      id: pick.id,
      name: pick.name,
      rarity: 'mythic',
      duplicate,
    };
    return result;
  }

  return result;
}

/**
 * Mark spin claimed and apply prize on a cloned game state.
 * @param {object} gameData
 * @param {string} profileId
 * @param {string} segmentId
 */
export function claimDailySpinPrize(gameData, profileId, segmentId) {
  const gd = cloneGameData(gameData);
  const profile = getPlayerProfile(gd, profileId);
  if (!profile) return { gameData: gd, error: 'Profile not found.' };

  if (!isDailySpinEligible(profile)) {
    return { gameData: gd, error: 'Daily spin not available right now.' };
  }

  const segment = getDailySpinSegmentById(segmentId) ?? rollDailySpinSegment();
  const grant = applyDailySpinPrizeToProfile(profile, segment);

  normalizeDailyLoginSpin(profile);
  profile.dailyLoginSpin.rewardDayKey = getLadderRewardDayKey();
  profile.dailyLoginSpin.claimedAt = new Date().toISOString();
  profile.updatedAt = profile.dailyLoginSpin.claimedAt;

  return {
    gameData: gd,
    segment,
    grant,
  };
}
