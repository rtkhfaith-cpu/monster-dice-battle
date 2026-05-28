/**
 * Gem inventory — own, upgrade (consume duplicates), equip to monster slots.
 *
 * Data model:
 *   profile.gemInventory: Array<{ key, rarity, stat, level, copies }>
 *     - one stack per (rarity, stat); `copies` are spare duplicates used to upgrade
 *   ownedMonster.equippedGems: { offensive: key|null, defensive: key|null, utility: key|null }
 *
 * Equipping references a gem stack by key and uses its current level for stats.
 * Owning at least one copy (or any level) is required to equip.
 */
import {
  GEM_RARITIES,
  GEM_STATS,
  GEM_MAX_LEVEL,
  gemKey,
  gemSlotForStat,
  gemBaseValue,
  gemDisplayName,
  gemStatValue,
  getRequiredGemsForUpgrade,
  makeGemDef,
} from './gemDefinitions';

function isValidGemKey(key) {
  return GEM_DEF_BY_KEY.has(key);
}

const GEM_DEF_BY_KEY = new Map();
for (const rarity of GEM_RARITIES) {
  for (const stat of GEM_STATS) {
    GEM_DEF_BY_KEY.set(gemKey(rarity, stat), { rarity, stat });
  }
}

export function parseGemKey(key) {
  return GEM_DEF_BY_KEY.get(key) ?? null;
}

export function normalizeGemStack(row) {
  if (!row || typeof row !== 'object') return null;
  const key = String(row.key || '');
  const parsed = parseGemKey(key);
  if (!parsed) return null;
  return {
    key,
    rarity: parsed.rarity,
    stat: parsed.stat,
    level: Math.max(1, Math.min(GEM_MAX_LEVEL, Math.floor(row.level || 1))),
    copies: Math.max(0, Math.floor(row.copies || 0)),
  };
}

/** @param {object} profile */
export function ensureGemInventory(profile) {
  if (!profile) return;
  if (!Array.isArray(profile.gemInventory)) profile.gemInventory = [];
  const seen = new Set();
  profile.gemInventory = profile.gemInventory
    .map(normalizeGemStack)
    .filter((g) => {
      if (!g || seen.has(g.key)) return false;
      seen.add(g.key);
      return true;
    });
  for (const om of profile.ownedMonsters || []) {
    om.equippedGems = normalizeEquippedGems(om.equippedGems, profile);
  }
}

export function normalizeEquippedGems(equippedGems, profile = null) {
  const out = { offensive: null, defensive: null, utility: null };
  if (!equippedGems || typeof equippedGems !== 'object') return out;
  for (const slot of ['offensive', 'defensive', 'utility']) {
    const key = equippedGems[slot];
    if (!key || !isValidGemKey(key)) continue;
    const parsed = parseGemKey(key);
    if (gemSlotForStat(parsed.stat) !== slot) continue;
    // Only keep if the stack is owned (avoids ghost gems after data loss).
    if (profile && !findGemStack(profile, key)) continue;
    out[slot] = key;
  }
  return out;
}

export function findGemStack(profile, key) {
  if (!profile?.gemInventory) return null;
  return profile.gemInventory.find((g) => g.key === key) ?? null;
}

/** Grant N copies of a gem (rarity+stat). Creates the stack if needed. */
export function grantGem(profile, rarity, stat, quantity = 1) {
  ensureGemInventory(profile);
  const key = gemKey(rarity, stat);
  if (!isValidGemKey(key)) return { ok: false, error: 'Unknown gem' };
  const qty = Math.max(1, Math.floor(quantity));
  let stack = findGemStack(profile, key);
  if (!stack) {
    stack = { key, rarity, stat, level: 1, copies: 0 };
    profile.gemInventory.push(stack);
  }
  stack.copies += qty;
  profile.updatedAt = new Date().toISOString();
  return { ok: true, gem: stack, granted: qty };
}

export function grantGemByKey(profile, key, quantity = 1) {
  const parsed = parseGemKey(key);
  if (!parsed) return { ok: false, error: 'Unknown gem' };
  return grantGem(profile, parsed.rarity, parsed.stat, quantity);
}

/** Upgrade a gem one level, consuming the required duplicate copies. */
export function upgradeGem(profile, key) {
  ensureGemInventory(profile);
  const stack = findGemStack(profile, key);
  if (!stack) return { ok: false, error: 'Gem not owned' };
  if (stack.level >= GEM_MAX_LEVEL) return { ok: false, error: 'Gem already at max level' };
  const need = getRequiredGemsForUpgrade(stack.level);
  if (stack.copies < need) {
    return { ok: false, error: `Need ${need} copies (have ${stack.copies}).` };
  }
  stack.copies -= need;
  stack.level += 1;
  profile.updatedAt = new Date().toISOString();
  return { ok: true, gem: stack, level: stack.level };
}

/** Equip a gem to a monster's matching slot. */
export function equipGem(profile, monsterId, key) {
  ensureGemInventory(profile);
  const om = (profile.ownedMonsters || []).find((m) => m.id === monsterId);
  if (!om) return { ok: false, error: 'Monster not found' };
  const parsed = parseGemKey(key);
  if (!parsed) return { ok: false, error: 'Unknown gem' };
  const stack = findGemStack(profile, key);
  if (!stack) return { ok: false, error: 'Gem not owned' };
  const slot = gemSlotForStat(parsed.stat);
  if (!slot) return { ok: false, error: 'Gem has no slot' };
  om.equippedGems = normalizeEquippedGems(om.equippedGems, profile);
  om.equippedGems[slot] = key;
  profile.updatedAt = new Date().toISOString();
  return { ok: true, slot, gem: stack };
}

export function unequipGem(profile, monsterId, slot) {
  ensureGemInventory(profile);
  const om = (profile.ownedMonsters || []).find((m) => m.id === monsterId);
  if (!om) return { ok: false, error: 'Monster not found' };
  om.equippedGems = normalizeEquippedGems(om.equippedGems, profile);
  if (!['offensive', 'defensive', 'utility'].includes(slot)) {
    return { ok: false, error: 'Invalid slot' };
  }
  om.equippedGems[slot] = null;
  profile.updatedAt = new Date().toISOString();
  return { ok: true };
}

/**
 * Flat gem stat bonuses for one monster, keyed by internal stat names used by
 * the battle stat pipeline: hp, attack, magicAttack, defence, magicDefence,
 * dodge, hitRate.
 */
export function sumEquippedGemStats(profile, ownedMonster) {
  const flat = {
    hp: 0,
    attack: 0,
    magicAttack: 0,
    defence: 0,
    magicDefence: 0,
    dodge: 0,
    hitRate: 0,
  };
  if (!profile || !ownedMonster) return flat;
  const equipped = normalizeEquippedGems(ownedMonster.equippedGems, profile);
  for (const slot of ['offensive', 'defensive', 'utility']) {
    const key = equipped[slot];
    if (!key) continue;
    const stack = findGemStack(profile, key);
    if (!stack) continue;
    const value = gemStatValue(stack.rarity, stack.stat, stack.level);
    if (flat[stack.stat] != null) flat[stack.stat] += value;
  }
  return flat;
}

/** UI summary rows for the gems screen. */
export function listGemStacks(profile) {
  ensureGemInventory(profile);
  return [...(profile.gemInventory || [])]
    .map((stack) => {
      const def = makeGemDef(stack.rarity, stack.stat);
      const need = getRequiredGemsForUpgrade(stack.level);
      return {
        ...def,
        level: stack.level,
        copies: stack.copies,
        upgradeCost: need,
        canUpgrade: stack.level < GEM_MAX_LEVEL && stack.copies >= need,
        atMaxLevel: stack.level >= GEM_MAX_LEVEL,
        currentValue: gemStatValue(stack.rarity, stack.stat, stack.level),
        nextValue:
          stack.level < GEM_MAX_LEVEL
            ? gemStatValue(stack.rarity, stack.stat, stack.level + 1)
            : null,
      };
    })
    .sort((a, b) => {
      const rOrder = { mythic: 0, epic: 1, rare: 2 };
      const dr = (rOrder[a.rarity] ?? 9) - (rOrder[b.rarity] ?? 9);
      if (dr !== 0) return dr;
      return a.stat.localeCompare(b.stat);
    });
}

export { gemDisplayName, gemBaseValue };
