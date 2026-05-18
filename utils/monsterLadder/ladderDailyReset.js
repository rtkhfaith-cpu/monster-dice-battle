import { LADDER_DAILY_RESET_HOUR, LADDER_MAIN_LEVELS, LADDER_SUB_LEVELS, LADDER_TIMEZONE } from './ladderConstants';

/**
 * Reward day key — flips at 18:00 Asia/Singapore.
 * @param {Date} [now]
 */
export function getLadderRewardDayKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: LADDER_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const pick = (t) => parts.find((p) => p.type === t)?.value ?? '0';
  const y = pick('year');
  const m = pick('month');
  const d = pick('day');
  const h = Number(pick('hour'));

  let day = `${y}-${m}-${d}`;
  if (h < LADDER_DAILY_RESET_HOUR) {
    const dt = new Date(`${day}T12:00:00Z`);
    dt.setUTCDate(dt.getUTCDate() - 1);
    day = dt.toISOString().slice(0, 10);
  }
  return day;
}

/**
 * @param {import('./ladderProgress').MonsterLadderState} ml
 */
export function applyLadderDailyResetIfNeeded(ml) {
  if (!ml) return ml;
  const key = getLadderRewardDayKey();
  if (ml.lastRewardResetAt !== key) {
    const completedPreviousRewardDay = ml.dailyLevelCompletedAt && ml.dailyLevelCompletedAt !== key;
    const completedCurrentMainLevel =
      ml.dailyLevelCompletedMainLevel === ml.mainLevel && ml.subLevel >= LADDER_SUB_LEVELS;

    if (completedPreviousRewardDay && completedCurrentMainLevel && ml.mainLevel < LADDER_MAIN_LEVELS) {
      ml.mainLevel += 1;
      ml.subLevel = 1;
    }

    ml.lastRewardResetAt = key;
    ml.gearChestClaimedToday = false;
    ml.monsterChestClaimedToday = false;
    ml.dailyLevelCompletedAt = null;
    ml.dailyLevelCompletedMainLevel = null;
  }
  return ml;
}

/**
 * The next ladder level opens when the reward day changes at 18:00 Asia/Singapore.
 * @param {import('./ladderProgress').MonsterLadderState} ml
 * @param {Date} [now]
 */
export function isLadderLevelLockedUntilReset(ml, now = new Date()) {
  if (!ml?.dailyLevelCompletedAt) return false;
  return ml.dailyLevelCompletedAt === getLadderRewardDayKey(now);
}
