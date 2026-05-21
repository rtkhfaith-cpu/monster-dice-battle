/** Weekly Monster Rescue window starts Sunday 18:00 Asia/Singapore. */
export const RESCUE_WEEKLY_RESET_HOUR = 18;
export const RESCUE_WEEKLY_RESET_TIMEZONE = 'Asia/Singapore';

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Week key = calendar date (YYYY-MM-DD) of the Sunday 6pm SG that started the current run.
 * @param {Date} [now]
 */
export function getRescueWeekKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: RESCUE_WEEKLY_RESET_TIMEZONE,
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
  if (dow === 0 && h < RESCUE_WEEKLY_RESET_HOUR) {
    daysBack = 7;
  }

  const anchor = new Date(`${y}-${m}-${d}T12:00:00Z`);
  anchor.setUTCDate(anchor.getUTCDate() - daysBack);
  return anchor.toISOString().slice(0, 10);
}

export function formatRescueWeeklyResetHint() {
  return 'New run every Sunday 6:00 PM (Singapore). Clear 1-1 → 6-10 within the week for up to 12 chests. Progress resets if you do not finish in time.';
}
