/**
 * Poison / burn status for passive skill system.
 * Uses multi-status dict model: fighter.statuses = { poison: {...}, burn: {...} }
 */

import { hasStatus as legacyHasStatus, normalizeStatuses } from '../../utils/statusEffects';

/** @typedef {'poison'|'burn'|'atkDown'|'defDown'} StatusType */

export function hasStatus(fighter) {
  return legacyHasStatus(fighter);
}

/** Compare poison/burn strength for override rules. */
function dotStrength(status) {
  if (!status) return 0;
  return (status.dotMaxHpPct ?? 0) * 100 + (status.healReductionPct ?? 0) + (status.turnsLeft ?? 0);
}

/**
 * Apply or refresh poison/burn from passive books — preserves other effects.
 */
export function applyDotStatus(fighter, type, { dotMaxHpPct, turns, healReductionPct = 0 }) {
  if (!fighter) return fighter;
  const dict = { ...normalizeStatuses(fighter) };
  const turnCount = Math.max(1, Math.floor(turns ?? 2));
  const next = {
    type,
    turnsLeft: turnCount,
    potency: 1,
    dotMaxHpPct,
    healReductionPct: type === 'burn' ? healReductionPct : 0,
    source: 'passive',
  };
  const cur = dict[type];
  if (cur) {
    if (dotStrength(next) >= dotStrength(cur)) {
      dict[type] = { ...next, turnsLeft: Math.max(next.turnsLeft, cur.turnsLeft ?? 0) };
    } else {
      dict[type] = { ...cur, turnsLeft: Math.max(cur.turnsLeft ?? 0, next.turnsLeft) };
    }
  } else {
    dict[type] = next;
  }
  return { ...fighter, statuses: dict, status: dict[type] };
}

/** Healing multiplier on target (burn anti-heal + gear heal power). */
export function healingMultiplier(fighter) {
  const dict = normalizeStatuses(fighter);
  const burn = dict.burn;
  let mult = 1;
  if (burn && (burn.turnsLeft ?? 0) > 0) {
    const red = Math.min(80, burn.healReductionPct ?? 0);
    mult = Math.max(0, 1 - red / 100);
  }
  const healBoost = fighter?.gearModifiers?.healPowerPct ?? 0;
  if (healBoost) mult *= 1 + healBoost / 100;
  return mult;
}

/** Tick ALL poison/burn DoTs at start of owner's turn. */
export function tickDotStatus(fighter) {
  const dict = { ...normalizeStatuses(fighter) };
  let totalDamage = 0;
  const messages = [];
  const popups = [];
  const maxHp = fighter.maxHp ?? fighter.stats?.hp ?? 100;

  for (const dotType of ['poison', 'burn']) {
    const s = dict[dotType];
    if (!s || (s.turnsLeft ?? 0) <= 0) continue;

    const pct = (s.dotMaxHpPct ?? 2) / 100;
    const dmg = Math.max(1, Math.round(maxHp * pct));
    totalDamage += dmg;
    messages.push(dotType === 'poison' ? 'Poison hurts!' : 'Burn sizzles!');
    popups.push(dotType === 'poison' ? 'POISONED' : 'BURN');

    const nextTurns = s.turnsLeft - 1;
    if (nextTurns > 0) dict[dotType] = { ...s, turnsLeft: nextTurns };
    else delete dict[dotType];
  }

  const hasAny = Object.keys(dict).length > 0;
  return {
    fighter: {
      ...fighter,
      hp: Math.max(0, fighter.hp - totalDamage),
      statuses: hasAny ? dict : {},
      status: hasAny ? Object.values(dict)[0] : null,
    },
    tickDamage: totalDamage,
    dotType: popups.length === 1 ? (popups[0] === 'POISONED' ? 'poison' : 'burn') : 'multi',
    message: messages[0] || null,
    popup: popups[0] || null,
    isDot: totalDamage > 0,
  };
}

export function isDotDamageContext(ctx = {}) {
  return !!ctx.isDot || !!ctx.fromStatusTick;
}
