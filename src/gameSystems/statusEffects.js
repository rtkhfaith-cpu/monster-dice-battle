/**
 * Poison / burn status for passive skill system.
 * Re-exports legacy helpers from utils/statusEffects for atk/def down.
 */

import { hasStatus as legacyHasStatus } from '../../utils/statusEffects';

/** @typedef {'poison'|'burn'|'atkDown'|'defDown'} StatusType */

/**
 * @typedef {{
 *   type: StatusType,
 *   turnsLeft: number,
 *   potency?: number,
 *   dotMaxHpPct?: number,
 *   healReductionPct?: number,
 *   source?: string,
 * }} BattleStatus
 */

export function hasStatus(fighter) {
  return legacyHasStatus(fighter?.status);
}

/** Compare poison/burn strength for override rules. */
function dotStrength(status) {
  if (!status) return 0;
  return (status.dotMaxHpPct ?? 0) * 100 + (status.healReductionPct ?? 0) + (status.turnsLeft ?? 0);
}

/**
 * Apply or refresh poison/burn from passive books.
 * @param {object} fighter
 * @param {'poison'|'burn'} type
 * @param {{ dotMaxHpPct: number, turns: number, healReductionPct?: number }} params
 */
export function applyDotStatus(fighter, type, { dotMaxHpPct, turns, healReductionPct = 0 }) {
  if (!fighter) return fighter;
  const next = {
    type,
    turnsLeft: Math.max(1, turns),
    potency: 1,
    dotMaxHpPct,
    healReductionPct: type === 'burn' ? healReductionPct : 0,
    source: 'passive',
  };
  const cur = fighter.status;
  if (cur?.type === type) {
    if (dotStrength(next) >= dotStrength(cur)) {
      return { ...fighter, status: { ...next, turnsLeft: Math.max(next.turnsLeft, cur.turnsLeft ?? 0) } };
    }
    return { ...fighter, status: { ...cur, turnsLeft: Math.max(cur.turnsLeft ?? 0, next.turnsLeft) } };
  }
  if (cur && hasStatus(fighter) && cur.type !== type) {
    return { ...fighter, status: next };
  }
  return { ...fighter, status: next };
}

/** Healing multiplier on target (burn anti-heal). */
export function healingMultiplier(fighter) {
  const s = fighter?.status;
  if (s?.type === 'burn' && (s.turnsLeft ?? 0) > 0) {
    const red = Math.min(80, s.healReductionPct ?? 0);
    return Math.max(0, 1 - red / 100);
  }
  return 1;
}

/** Tick poison/burn at start of owner's turn. */
export function tickDotStatus(fighter) {
  const s = fighter?.status;
  if (!s || (s.turnsLeft ?? 0) <= 0) return { fighter, tickDamage: 0, message: null, popup: null };

  if (s.type !== 'poison' && s.type !== 'burn') {
    return { fighter, tickDamage: 0, message: null, popup: null };
  }

  const maxHp = fighter.maxHp ?? fighter.stats?.hp ?? 100;
  const pct = (s.dotMaxHpPct ?? (s.type === 'poison' ? 2 : 2)) / 100;
  const tickDamage = Math.max(1, Math.round(maxHp * pct));
  const hp = Math.max(0, fighter.hp - tickDamage);
  const nextTurns = s.turnsLeft - 1;
  const nextStatus = nextTurns > 0 ? { ...s, turnsLeft: nextTurns } : null;

  return {
    fighter: { ...fighter, hp, status: nextStatus },
    tickDamage,
    message: s.type === 'poison' ? 'Poison hurts!' : 'Burn sizzles!',
    popup: s.type === 'poison' ? 'POISONED' : 'BURN',
    isDot: true,
  };
}

export function isDotDamageContext(ctx = {}) {
  return !!ctx.isDot || !!ctx.fromStatusTick;
}
