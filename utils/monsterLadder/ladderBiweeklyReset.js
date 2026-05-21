/** Same boundary as ladder daily rewards (Sunday 6pm Singapore). */
const LADDER_RESET_HOUR = 18;
const LADDER_RESET_TIMEZONE = 'Asia/Singapore';

/** First biweekly reset: Sunday 6:00 PM Singapore (2026-05-24). */
export const LADDER_BIWEEKLY_EPOCH = '2026-05-24';
export const LADDER_BIWEEKLY_PERIOD_DAYS = 14;

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Sunday 6pm SG anchor for the current ladder week (same boundary as daily rewards).
 * @param {Date} [now]
 */
export function getLadderWeekAnchorKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: LADDER_RESET_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const pick = (t) => parts.find((p) => p.type === t)?.value ?? '0';
  const y = pick('year');
  const m = pick('month');
  const d = pick('day');
  const h = Number(pick('hour'));
  const wdRaw = pick('weekday');
  let dow = WEEKDAY_SHORT.indexOf(wdRaw);
  if (dow < 0) dow = WEEKDAY_SHORT.findIndex((w) => wdRaw.startsWith(w)) ?? 0;

  let daysBack = dow;
  if (dow === 0 && h < LADDER_RESET_HOUR) {
    daysBack = 7;
  }

  const anchor = new Date(`${y}-${m}-${d}T12:00:00Z`);
  anchor.setUTCDate(anchor.getUTCDate() - daysBack);
  return anchor.toISOString().slice(0, 10);
}

/**
 * Biweekly period id — changes every 2 weeks at Sunday 6pm SG (epoch = first reset).
 * @param {Date} [now]
 */
export function getLadderBiweeklyPeriodKey(now = new Date()) {
  const anchor = getLadderWeekAnchorKey(now);
  const epochMs = new Date(`${LADDER_BIWEEKLY_EPOCH}T12:00:00Z`).getTime();
  const anchorMs = new Date(`${anchor}T12:00:00Z`).getTime();
  const diffDays = Math.floor((anchorMs - epochMs) / 86400000);
  if (diffDays < 0) {
    return `pre-${LADDER_BIWEEKLY_EPOCH}`;
  }
  const periodIndex = Math.floor(diffDays / LADDER_BIWEEKLY_PERIOD_DAYS);
  return `${LADDER_BIWEEKLY_EPOCH}#${periodIndex}`;
}

/**
 * @param {import('./ladderProgress').MonsterLadderState} ml
 * @param {Date} [now]
 */
export function applyLadderBiweeklyResetIfNeeded(ml, now = new Date()) {
  if (!ml) return ml;
  const key = getLadderBiweeklyPeriodKey(now);
  if (ml.biweeklyPeriodKey === key) return ml;

  ml.biweeklyPeriodKey = key;
  if (key.startsWith('pre-')) {
    return ml;
  }

  ml.mainLevel = 1;
  ml.subLevel = 1;
  ml.gearChestClaimedToday = false;
  ml.monsterChestClaimedToday = false;
  ml.dailyLevelCompletedAt = null;
  ml.dailyLevelCompletedMainLevel = null;
  if (ml.stats && typeof ml.stats === 'object') {
    ml.stats.highestStageReached = 1;
  }

  return ml;
}

/** @param {Date} [now] */
export function getNextLadderBiweeklyResetDate(now = new Date()) {
  const anchor = getLadderWeekAnchorKey(now);
  const epochMs = new Date(`${LADDER_BIWEEKLY_EPOCH}T12:00:00Z`).getTime();
  const anchorMs = new Date(`${anchor}T12:00:00Z`).getTime();
  const diffDays = Math.floor((anchorMs - epochMs) / 86400000);

  if (diffDays < 0) {
    return LADDER_BIWEEKLY_EPOCH;
  }

  const periodIndex = Math.floor(diffDays / LADDER_BIWEEKLY_PERIOD_DAYS);
  const nextStart = new Date(epochMs + (periodIndex + 1) * LADDER_BIWEEKLY_PERIOD_DAYS * 86400000);
  return nextStart.toISOString().slice(0, 10);
}

export function formatLadderBiweeklyResetHint(now = new Date()) {
  const key = getLadderBiweeklyPeriodKey(now);
  if (key.startsWith('pre-')) {
    return `First ladder reset Sunday 24 May 2026, 6:00 PM (Singapore). Then every 2 weeks — replay stages and earn boss chests again.`;
  }
  const next = getNextLadderBiweeklyResetDate(now);
  return `Ladder progress resets every 2 weeks (Sunday 6:00 PM Singapore). Next reset: ${next} 6:00 PM. Shards, gold, and collection are kept.`;
}
