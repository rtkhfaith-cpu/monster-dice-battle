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

/**
 * Tick atkDown / defDown duration only.
 * Poison and burn are handled by tickDotStatus (src/gameSystems/statusEffects.js).
 */
export function tickStatus(fighter) {
  const dict = { ...normalizeStatuses(fighter) };
  const nextDict = { ...dict };

  for (const type of ['atkDown', 'defDown', 'atkUp', 'defUp']) {
    const s = nextDict[type];
    if (!s || (s.turnsLeft ?? 0) <= 0) continue;
    const next = s.turnsLeft - 1;
    if (next > 0) nextDict[type] = { ...s, turnsLeft: next };
    else delete nextDict[type];
  }

  const hasAny = Object.keys(nextDict).length > 0;
  return {
    fighter: {
      ...fighter,
      statuses: hasAny ? nextDict : {},
      status: hasAny ? Object.values(nextDict)[0] : null,
    },
    tickDamage: 0,
    message: null,
  };
}

/** Stat multiplier — checks for atkDown / defDown in the dict. */
export function statusStatMultiplier(fighter, statKind) {
  const dict = normalizeStatuses(fighter);
  if (statKind === 'attack' && (dict.atkDown?.turnsLeft ?? 0) > 0) return 0.85;
  if (statKind === 'def' && (dict.defDown?.turnsLeft ?? 0) > 0) return 0.85;
  if (statKind === 'attack' && (dict.atkUp?.turnsLeft ?? 0) > 0) return 1.15;
  if (statKind === 'def' && (dict.defUp?.turnsLeft ?? 0) > 0) return 1.15;
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
