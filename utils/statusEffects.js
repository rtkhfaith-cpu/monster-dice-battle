/**
 * Battle statuses — supports multiple simultaneous effects.
 * Data model: fighter.statuses = { poison: {...}, burn: {...}, atkDown: {...} }
 */

/** @typedef {'poison'|'burn'|'atkDown'|'defDown'} StatusType */

const ALL_TYPES = ['poison', 'burn', 'atkDown', 'defDown'];

/** Migrate legacy single-status to dict. */
function normalizeStatuses(fighter) {
  if (!fighter) return {};
  if (fighter.statuses && typeof fighter.statuses === 'object') return fighter.statuses;
  const s = fighter.status;
  if (s && s.type && (s.turnsLeft ?? 0) > 0) return { [s.type]: s };
  return {};
}

/** Check if fighter has any active status (or a specific type). */
export function hasStatus(fighterOrStatus, type) {
  if (!fighterOrStatus) return false;
  if (fighterOrStatus.type && typeof fighterOrStatus.turnsLeft === 'number') {
    return (fighterOrStatus.turnsLeft ?? 0) > 0 && (!type || fighterOrStatus.type === type);
  }
  const dict = normalizeStatuses(fighterOrStatus);
  if (type) return (dict[type]?.turnsLeft ?? 0) > 0;
  return ALL_TYPES.some((t) => (dict[t]?.turnsLeft ?? 0) > 0);
}

/** Apply / refresh a status effect. Existing other effects are preserved. */
export function applyStatus(fighter, type, turns = 2, potency = 1) {
  if (!fighter) return fighter;
  const dict = { ...normalizeStatuses(fighter) };
  const cur = dict[type];
  dict[type] = {
    type,
    turnsLeft: Math.max(cur?.turnsLeft ?? 0, Math.max(1, turns)),
    potency: potency || 1,
    ...(cur?.dotMaxHpPct != null ? { dotMaxHpPct: cur.dotMaxHpPct } : {}),
    ...(cur?.healReductionPct != null ? { healReductionPct: cur.healReductionPct } : {}),
  };
  return { ...fighter, statuses: dict, status: dict[type] };
}

/** Tick ALL active statuses at end of round. */
export function tickStatus(fighter) {
  const dict = normalizeStatuses(fighter);
  let totalDamage = 0;
  const messages = [];
  const nextDict = {};

  for (const type of ALL_TYPES) {
    const s = dict[type];
    if (!s || (s.turnsLeft ?? 0) <= 0) continue;

    let dmg = 0;
    if (type === 'poison' || type === 'burn') {
      const pct = type === 'poison' ? 0.05 : 0.04;
      dmg = Math.max(2, Math.round((fighter.maxHp ?? fighter.stats?.hp ?? 100) * pct * (s.potency || 1)));
      messages.push(type === 'poison' ? 'Poison hurts!' : 'Burn sizzles!');
    }
    totalDamage += dmg;

    const next = s.turnsLeft - 1;
    if (next > 0) nextDict[type] = { ...s, turnsLeft: next };
  }

  const hasAny = Object.keys(nextDict).length > 0;
  return {
    fighter: {
      ...fighter,
      hp: Math.max(0, fighter.hp - totalDamage),
      statuses: hasAny ? nextDict : {},
      status: hasAny ? Object.values(nextDict)[0] : null,
    },
    tickDamage: totalDamage,
    message: messages[0] || null,
  };
}

/** Stat multiplier — checks for atkDown / defDown in the dict. */
export function statusStatMultiplier(fighter, statKind) {
  const dict = normalizeStatuses(fighter);
  if (statKind === 'attack' && (dict.atkDown?.turnsLeft ?? 0) > 0) return 0.85;
  if (statKind === 'def' && (dict.defDown?.turnsLeft ?? 0) > 0) return 0.85;
  return 1;
}

/** Get all active status types on a fighter. */
export function activeStatusTypes(fighter) {
  const dict = normalizeStatuses(fighter);
  return ALL_TYPES.filter((t) => (dict[t]?.turnsLeft ?? 0) > 0);
}

export { normalizeStatuses };

export const STATUS_LABELS = {
  poison: 'Poison',
  burn: 'Burn',
  atkDown: 'Atk Down',
  defDown: 'Def Down',
};
