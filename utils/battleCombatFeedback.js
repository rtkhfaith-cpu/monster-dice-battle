/** How long dodge / block callouts stay on screen. */
export const COMBAT_FEEDBACK_MS = 1000;

/** Bright yellow for dodge & block popups. */
export const COMBAT_FEEDBACK_COLOR = '#FFD700';

export function isCombatFeedbackMessage(msg) {
  const m = String(msg || '').toLowerCase();
  return /\bdodged\b/.test(m) || /\bblocked\b/.test(m);
}
