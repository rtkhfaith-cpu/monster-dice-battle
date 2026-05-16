/**
 * Lightweight battle statuses — short duration, no stacking complexity.
 */

/** @typedef {'poison'|'burn'|'atkDown'|'defDown'} StatusType */

/**
 * @typedef {{
 *   type: StatusType,
 *   turnsLeft: number,
 *   potency?: number,
 * }} BattleStatus
 */

/** @param {BattleStatus|null|undefined} s */
export function hasStatus(s) {
  return !!s?.type && (s.turnsLeft ?? 0) > 0;
}

/** @param {object} fighter */
/** @param {StatusType} type */
/** @param {number} turns */
/** @param {number} [potency] */
export function applyStatus(fighter, type, turns = 2, potency = 1) {
  if (!fighter) return fighter;
  return {
    ...fighter,
    status: { type, turnsLeft: Math.max(1, turns), potency: potency || 1 },
  };
}

/** Tick statuses at end of round — returns { fighter, tickDamage, messages } */
export function tickStatus(fighter) {
  if (!hasStatus(fighter)) {
    return { fighter, tickDamage: 0, message: null };
  }
  const s = fighter.status;
  let tickDamage = 0;
  let message = null;

  if (s.type === 'poison' || s.type === 'burn') {
    const pct = s.type === 'poison' ? 0.05 : 0.04;
    tickDamage = Math.max(2, Math.round((fighter.maxHp ?? fighter.stats?.hp ?? 100) * pct * (s.potency || 1)));
    message = s.type === 'poison' ? 'Poison hurts!' : 'Burn sizzles!';
  }

  const nextTurns = s.turnsLeft - 1;
  const nextStatus = nextTurns > 0 ? { ...s, turnsLeft: nextTurns } : null;

  return {
    fighter: {
      ...fighter,
      hp: Math.max(0, fighter.hp - tickDamage),
      status: nextStatus,
    },
    tickDamage,
    message,
  };
}

/** Stat multiplier while status active */
export function statusStatMultiplier(fighter, statKind) {
  const s = fighter?.status;
  if (!hasStatus(fighter)) return 1;
  if (statKind === 'attack' && s.type === 'atkDown') return 0.85;
  if (statKind === 'def' && s.type === 'defDown') return 0.85;
  return 1;
}

export const STATUS_LABELS = {
  poison: 'Poison',
  burn: 'Burn',
  atkDown: 'Atk Down',
  defDown: 'Def Down',
};
