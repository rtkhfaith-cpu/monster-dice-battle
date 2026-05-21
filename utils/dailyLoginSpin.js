import { LADDER_DAILY_RESET_HOUR, LADDER_TIMEZONE } from './monsterLadder/ladderConstants';
import { getLadderRewardDayKey } from './monsterLadder/ladderDailyReset';
import { getLadderMonstersByRarity } from './monsterLadder/ladderMonsterCatalog';
import {
  getMonsterLadderState,
  grantLadderMonsterToProfile,
  profileOwnsMonsterTemplate,
  setMonsterLadderState,
} from './monsterLadder/ladderProfile';
import { cloneGameData, getPlayerProfile } from './gameStorage';

/** @typedef {'coins'|'shards'|'gear_chest'|'monster_chest'|'mythic_monster'} DailySpinKind */

/**
 * @typedef {object} DailySpinSegment
 * @property {string} id
 * @property {string} label
 * @property {string} sublabel
 * @property {number} weight
 * @property {string} color
 * @property {DailySpinKind} kind
 * @property {number} [amount]
 */

/** Wheel wedges — weights sum to 100. */
export const DAILY_SPIN_SEGMENTS = /** @type {DailySpinSegment[]} */ ([
  { id: 'coins_10', label: '10', sublabel: 'Coins', weight: 24, color: '#fbbf24', kind: 'coins', amount: 10 },
  { id: 'coins_25', label: '25', sublabel: 'Coins', weight: 18, color: '#fcd34d', kind: 'coins', amount: 25 },
  { id: 'coins_50', label: '50', sublabel: 'Coins', weight: 14, color: '#fde68a', kind: 'coins', amount: 50 },
  { id: 'shards_20', label: '20', sublabel: 'Shards', weight: 14, color: '#c4b5fd', kind: 'shards', amount: 20 },
  { id: 'shards_40', label: '40', sublabel: 'Shards', weight: 10, color: '#a78bfa', kind: 'shards', amount: 40 },
  { id: 'gear_chest', label: 'Gear', sublabel: 'Chest', weight: 10, color: '#60a5fa', kind: 'gear_chest' },
  { id: 'monster_chest', label: 'Monster', sublabel: 'Chest', weight: 9, color: '#f472b6', kind: 'monster_chest' },
  { id: 'mythic', label: 'Mythic', sublabel: 'Monster', weight: 1, color: '#f9a8d4', kind: 'mythic_monster' },
  { id: 'coins_150', label: '150', sublabel: 'Jackpot', weight: 1, color: '#ffe6a3', kind: 'coins', amount: 150 },
]);

function ensureChestInventory(ml) {
  if (!ml.chestInventory || typeof ml.chestInventory !== 'object') {
    ml.chestInventory = { gear: 0, monster: 0 };
  }
  ml.chestInventory.gear = Math.max(0, Math.floor(ml.chestInventory.gear || 0));
  ml.chestInventory.monster = Math.max(0, Math.floor(ml.chestInventory.monster || 0));
  return ml.chestInventory;
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
    label: segment.label,
    sublabel: segment.sublabel,
    kind: segment.kind,
    message: '',
    duplicate: false,
    chestDrop: null,
    ladderShardsTotal: null,
    coinsTotal: profile.coins ?? 0,
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

  if (segment.kind === 'gear_chest') {
    ensureChestInventory(ml).gear += 1;
    setMonsterLadderState(profile, ml);
    result.message = 'Free gear chest added';
    return result;
  }

  if (segment.kind === 'monster_chest') {
    ensureChestInventory(ml).monster += 1;
    setMonsterLadderState(profile, ml);
    result.message = 'Free monster chest added';
    return result;
  }

  if (segment.kind === 'mythic_monster') {
    const pool = getLadderMonstersByRarity('mythic');
    const pick = pool[Math.floor(Math.random() * pool.length)] ?? pool[0];
    if (!pick) {
      ml.ladderShards = (ml.ladderShards ?? 0) + 500;
      setMonsterLadderState(profile, ml);
      result.message = '+500 ladder shards (mythic fallback)';
      result.ladderShardsTotal = ml.ladderShards;
      return result;
    }
    const duplicate = profileOwnsMonsterTemplate(profile, pick.id);
    const row = grantLadderMonsterToProfile(profile, pick.id);
    if (!ml.activeMonsterId) ml.activeMonsterId = row.id;
    setMonsterLadderState(profile, ml);
    result.duplicate = duplicate;
    result.message = duplicate
      ? `${pick.name} — duplicate for merging`
      : `${pick.name} joins your roster`;
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
