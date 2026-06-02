/**
 * Shared numeric caps for profile / cloud save data.
 * Keep lambda/monster-battle-save-api/sanitizeProfileItem.js in sync.
 */
export const PROFILE_CAPS = {
  coins: 999_999_999,
  gemStackCount: 999_999_999,
  ladderGold: 999_999_999,
  ladderShards: 999_999_999,
  ladderExpDust: 999_999_999,
  petExpDust: 999_999_999,
  monsterLevel: 180,
  monsterExp: 999_999_999,
  ownedMonsters: 500,
  petLevel: 120,
  ownedPets: 300,
  itemQuantity: 9_999_999,
  winsLosses: 9_999_999,
  fighterHp: 9_999_999,
  fighterStat: 999_999,
};

/**
 * @param {unknown} value
 * @param {{ min?: number, max?: number, fallback?: number }} [opts]
 * @returns {{ value: number, capped: boolean, invalid: boolean }}
 */
export function sanitizeFiniteInt(value, opts = {}) {
  const min = opts.min ?? 0;
  const max = opts.max ?? PROFILE_CAPS.coins;
  const fallback = opts.fallback ?? min;
  let n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) {
    return { value: fallback, capped: false, invalid: true };
  }
  n = Math.floor(n);
  if (n < min) return { value: min, capped: n !== min, invalid: false };
  if (n > max) return { value: max, capped: true, invalid: false };
  return { value: n, capped: false, invalid: false };
}

/**
 * @param {object|null|undefined} stats
 * @returns {object|null|undefined}
 */
export function clampBattleStats(stats) {
  if (!stats || typeof stats !== 'object') return stats;
  const out = { ...stats };

  if (typeof out.hp === 'number') {
    out.hp = sanitizeFiniteInt(out.hp, {
      min: 1,
      max: PROFILE_CAPS.fighterHp,
      fallback: 1,
    }).value;
  }
  if (typeof out.mp === 'number') {
    out.mp = sanitizeFiniteInt(out.mp, {
      min: 0,
      max: PROFILE_CAPS.fighterHp,
      fallback: 0,
    }).value;
  }

  const clampRange = (rng) => {
    if (!rng || typeof rng !== 'object') return rng;
    const minR = sanitizeFiniteInt(rng.min, {
      min: 1,
      max: PROFILE_CAPS.fighterStat,
      fallback: 1,
    });
    const maxR = sanitizeFiniteInt(rng.max, {
      min: 1,
      max: PROFILE_CAPS.fighterStat,
      fallback: 1,
    });
    return {
      min: minR.value,
      max: Math.max(minR.value, maxR.value),
    };
  };

  if (out.attack) out.attack = clampRange(out.attack);
  if (out.magic) out.magic = clampRange(out.magic);
  if (out.def) out.def = clampRange(out.def);
  if (out.magicDef) out.magicDef = clampRange(out.magicDef);

  return out;
}

/**
 * Remove undefined keys so JSON / DynamoDB payloads stay clean.
 * @param {unknown} value
 * @returns {unknown}
 */
export function stripUndefinedDeep(value) {
  if (value === undefined) return undefined;
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map((entry) => stripUndefinedDeep(entry)).filter((entry) => entry !== undefined);
  }
  const out = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry === undefined) continue;
    const next = stripUndefinedDeep(entry);
    if (next !== undefined) out[key] = next;
  }
  return out;
}
