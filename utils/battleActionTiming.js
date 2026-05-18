/**
 * Fixed battle action durations (ms). SFX is timed to these — not WAV length.
 */

export const ACTION_TOTAL_MS = {
  normal: 1600,
  magic: 1800,
  dodge: 1300,
  defendHit: 1500,
  critical: 2200,
  super: 2000,
};

/**
 * @param {{
 *   strikeKind?: 'physical'|'magic',
 *   dodged?: boolean,
 *   defended?: boolean,
 *   critical?: boolean,
 *   superBomb?: boolean,
 * }} outcome
 */
export function getActionTiming(outcome) {
  const {
    strikeKind = 'physical',
    dodged = false,
    defended = false,
    critical = false,
    superBomb = false,
  } = outcome;

  let total = ACTION_TOTAL_MS.normal;
  if (superBomb) total = ACTION_TOTAL_MS.super;
  else if (dodged) total = ACTION_TOTAL_MS.dodge;
  else if (critical) total = ACTION_TOTAL_MS.critical;
  else if (defended) total = ACTION_TOTAL_MS.defendHit;
  else if (strikeKind === 'magic') total = ACTION_TOTAL_MS.magic;

  const attackerEnd = Math.round(total * 0.28);
  const defenderAt = Math.round(total * 0.42);
  const impactAt = Math.round(total * (dodged ? 0.62 : defended ? 0.72 : critical ? 0.64 : 0.68));
  const travelMs = Math.max(120, impactAt - attackerEnd);

  return {
    total,
    attackerEnd,
    defenderAt,
    impactAt,
    travelMs,
    superBomb: !!superBomb,
    dodged: !!dodged,
    defended: !!defended,
    critical: !!critical,
    strikeKind,
  };
}
