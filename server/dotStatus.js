/** Poison / burn status helpers (CJS) — shared by passiveResolver and petCombat. */

function getStatuses(f) {
  if (f.statuses && typeof f.statuses === 'object') return f.statuses;
  const s = f.status;
  if (s && s.type && (s.turnsLeft ?? 0) > 0) return { [s.type]: s };
  return {};
}

function dotStrength(status) {
  if (!status) return 0;
  return (status.dotMaxHpPct ?? 0) * 100 + (status.healReductionPct ?? 0) + (status.turnsLeft ?? 0);
}

/** Apply or refresh poison/burn — preserves other statuses; merges same type by strength. */
function applyDot(fighter, type, params) {
  const f = { ...fighter };
  const dict = { ...getStatuses(f) };
  const next = {
    type,
    dotMaxHpPct: params.dotMaxHpPct ?? 0,
    turnsLeft: Math.max(1, params.turns ?? 2),
    healReductionPct: type === 'burn' ? (params.healReductionPct ?? 0) : 0,
    source: params.source || 'passive',
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
  f.statuses = dict;
  f.status = dict[type];
  return f;
}

module.exports = { getStatuses, applyDot };
