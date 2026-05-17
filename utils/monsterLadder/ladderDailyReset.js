import { LADDER_DAILY_RESET_HOUR, LADDER_TIMEZONE } from './ladderConstants';

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
    ml.lastRewardResetAt = key;
    ml.gearChestClaimedToday = false;
    ml.monsterChestClaimedToday = false;
  }
  return ml;
}
