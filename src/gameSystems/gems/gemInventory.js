/**
 * Gem inventory — own, upgrade (consume same-type gems + coins), socket into gear.
 *
 * Data model (per-level instances):
 *   profile.gemInventory: Array<{ key, rarity, stat, level, count }>
 *     - one row per (rarity, stat, LEVEL); `count` = how many gems owned at that level
 *     - so a player can own the same type at several levels as independent rows
 *       (e.g. Rare Magic Lv1 ×12 AND Rare Magic Lv5 ×1) and forge whichever they want
 *   gear.sockets[].gem: { key, rarity, stat, level } | null
 *
 * Upgrading one gem consumes `getRequiredGemsForUpgrade(level)` OTHER same-type gems
 * as fuel, drawn from the lowest level first so high-level gems are never burned.
 *
 * Gems only apply battle stats when socketed into epic/mythic gear with sockets.
 */
import {
  GEM_RARITIES,
  GEM_STATS,
  GEM_MAX_LEVEL,
  gemKey,
  gemStackId,
  parseGemStackId,
  gemBaseValue,
  gemDisplayName,
  gemStatValue,
  getRequiredGemsForUpgrade,
  gemUpgradeCoinCost,
  gemSocketInsertCoinCost,
  gemSocketRemoveCoinCost,
  makeGemDef,
  parseGemKey,
} from './gemDefinitions';
import { ensureGearInventory, getGearInstance } from '../gear/inventoryGearUtils';

function isValidGemKey(key) {
  return !!parseGemKey(key);
}

function clampGemLevel(level) {
  return Math.max(1, Math.min(GEM_MAX_LEVEL, Math.floor(level || 1)));
}

/** Normalize a gem stored inside a gear socket → { key, rarity, stat, level }. */
export function normalizeSocketedGem(gem) {
  if (!gem || typeof gem !== 'object') return null;
  let key = String(gem.key || '').trim();
  let parsed = parseGemKey(key);
  if (!parsed && gem.rarity && gem.stat) {
    key = gemKey(gem.rarity, gem.stat);
    parsed = parseGemKey(key);
  }
  if (!parsed) return null;
  return { key, rarity: parsed.rarity, stat: parsed.stat, level: clampGemLevel(gem.level) };
}

/**
 * Convert one stored inventory row to new-format group(s), migrating legacy rows.
 * Legacy `{ level, copies }` = 1 gem at `level` + `copies` spare Lv1 gems.
 * New `{ level, count }` = `count` gems at `level`.
 */
function inventoryRowToGroups(row) {
  if (!row || typeof row !== 'object') return [];
  let key = String(row.key || '').trim();
  let parsed = parseGemKey(key);
  if (!parsed && row.rarity && row.stat) {
    key = gemKey(row.rarity, row.stat);
    parsed = parseGemKey(key);
  }
  if (!parsed) return [];
  const level = clampGemLevel(row.level);
  const out = [];
  if (Object.prototype.hasOwnProperty.call(row, 'count')) {
    const count = Math.max(0, Math.floor(row.count || 0));
    if (count > 0) out.push({ key, rarity: parsed.rarity, stat: parsed.stat, level, count });
  } else {
    out.push({ key, rarity: parsed.rarity, stat: parsed.stat, level, count: 1 });
    const copies = Math.max(0, Math.floor(row.copies || 0));
    if (copies > 0) {
      out.push({ key: gemKey(parsed.rarity, parsed.stat), rarity: parsed.rarity, stat: parsed.stat, level: 1, count: copies });
    }
  }
  return out;
}

/** Group rows by (rarity, stat, level), summing counts and dropping empties. */
function groupGemInventory(rows) {
  const byKey = new Map();
  for (const row of rows || []) {
    for (const g of inventoryRowToGroups(row)) {
      const k = `${g.rarity}_${g.stat}_L${g.level}`;
      const prev = byKey.get(k);
      if (prev) prev.count += g.count;
      else byKey.set(k, { ...g, key: gemKey(g.rarity, g.stat) });
    }
  }
  return [...byKey.values()].filter((g) => g.count > 0);
}

/** @param {object} profile */
export function ensureGemInventory(profile) {
  if (!profile) return;
  if (!Array.isArray(profile.gemInventory)) profile.gemInventory = [];
  profile.gemInventory = groupGemInventory(profile.gemInventory);
  ensureGearInventory(profile);
  for (const gear of profile.gearInventory || []) {
    for (let i = 0; i < (gear.sockets?.length ?? 0); i++) {
      const socket = gear.sockets[i];
      if (!socket) continue;
      socket.gem = normalizeSocketedGem(socket.gem);
    }
  }
  // Legacy monster gem slots are no longer used — gems live in gear sockets only.
  for (const om of profile.ownedMonsters || []) {
    om.equippedGems = { offensive: null, defensive: null, utility: null };
  }
}

/** Find the row for one (rarity, stat, level), or null. */
function findGemGroup(profile, rarity, stat, level) {
  return (profile.gemInventory || []).find(
    (g) => g.rarity === rarity && g.stat === stat && g.level === level,
  ) ?? null;
}

/** Total gems of a type across every level. */
function totalOfType(profile, rarity, stat) {
  return (profile.gemInventory || [])
    .filter((g) => g.rarity === rarity && g.stat === stat)
    .reduce((sum, g) => sum + (g.count || 0), 0);
}

function addGems(profile, rarity, stat, level, n) {
  if (n <= 0) return;
  const lvl = clampGemLevel(level);
  const g = findGemGroup(profile, rarity, stat, lvl);
  if (g) g.count += n;
  else profile.gemInventory.push({ key: gemKey(rarity, stat), rarity, stat, level: lvl, count: n });
}

/** Back-compat: locate a row by stack id (type + level) or plain type key (level 1). */
export function findGemStack(profile, idOrKey) {
  if (!profile?.gemInventory) return null;
  const parsed = parseGemStackId(idOrKey);
  if (!parsed) return null;
  return findGemGroup(profile, parsed.rarity, parsed.stat, parsed.level);
}

/** All gems currently socketed in gear. */
export function listSocketedGems(profile) {
  ensureGemInventory(profile);
  const out = [];
  for (const gear of profile.gearInventory || []) {
    for (let i = 0; i < (gear.sockets?.length ?? 0); i++) {
      const gem = normalizeSocketedGem(gear.sockets[i]?.gem);
      if (!gem) continue;
      out.push({
        gearInstanceId: gear.instanceId,
        gearName: gear.name,
        socketIndex: i,
        gem,
      });
    }
  }
  return out;
}

export function isGemKeySocketed(profile, key) {
  return listSocketedGems(profile).some((row) => row.gem.key === key);
}

/** Grant gem(s) (rarity+stat). New gems always enter inventory at level 1. */
export function grantGem(profile, rarity, stat, quantity = 1) {
  ensureGemInventory(profile);
  const key = gemKey(rarity, stat);
  if (!isValidGemKey(key)) return { ok: false, error: 'Unknown gem' };
  const qty = Math.max(1, Math.floor(quantity));
  addGems(profile, rarity, stat, 1, qty);
  profile.updatedAt = new Date().toISOString();
  return { ok: true, gem: { key, rarity, stat, level: 1 }, granted: qty };
}

export function grantGemByKey(profile, key, quantity = 1) {
  const parsed = parseGemKey(key);
  if (!parsed) return { ok: false, error: 'Unknown gem' };
  return grantGem(profile, parsed.rarity, parsed.stat, quantity);
}

/**
 * Upgrade ONE specific gem (identified by type + level) up a level.
 *
 * The chosen gem is the "base"; the merge consumes `getRequiredGemsForUpgrade(level)`
 * OTHER same-type gems as fuel, drawn from the LOWEST level first so the player never
 * accidentally burns a high-level gem. Coins are handled by the caller. Socketed gems
 * are stored separately and are never touched.
 */
export function upgradeGem(profile, gemId) {
  ensureGemInventory(profile);
  const parsed = parseGemStackId(gemId);
  if (!parsed) return { ok: false, error: 'Unknown gem' };
  const { rarity, stat, level } = parsed;
  const base = findGemGroup(profile, rarity, stat, level);
  if (!base || base.count < 1) return { ok: false, error: 'Gem not owned' };
  if (level >= GEM_MAX_LEVEL) return { ok: false, error: 'Gem already at max level' };

  const need = getRequiredGemsForUpgrade(level);
  const fuelAvailable = totalOfType(profile, rarity, stat) - 1; // exclude the base gem
  if (fuelAvailable < need) {
    return {
      ok: false,
      error: `Need ${need} more ${gemDisplayName(rarity, stat)} as fuel (have ${fuelAvailable}).`,
    };
  }

  // Remove the base gem, then draw `need` fuel from the lowest levels first.
  base.count -= 1;
  let remaining = need;
  const sameType = (profile.gemInventory || [])
    .filter((g) => g.rarity === rarity && g.stat === stat && g.count > 0)
    .sort((a, b) => a.level - b.level);
  for (const g of sameType) {
    if (remaining <= 0) break;
    const take = Math.min(g.count, remaining);
    g.count -= take;
    remaining -= take;
  }
  profile.gemInventory = profile.gemInventory.filter((g) => g.count > 0);
  addGems(profile, rarity, stat, level + 1, 1);

  profile.updatedAt = new Date().toISOString();
  return { ok: true, gem: { key: gemKey(rarity, stat), rarity, stat, level: level + 1 }, level: level + 1 };
}

/** Insert ONE specific gem (type + level) from inventory into a gear socket. */
export function socketGemInGear(profile, gearInstanceId, socketIndex, gemId) {
  ensureGemInventory(profile);
  const gear = getGearInstance(profile, gearInstanceId);
  if (!gear) return { ok: false, error: 'Gear not found' };
  if (!gear.sockets?.length) return { ok: false, error: 'This gear has no sockets.' };

  const idx = Math.floor(socketIndex);
  if (idx < 0 || idx >= gear.sockets.length) return { ok: false, error: 'Invalid socket.' };
  if (gear.sockets[idx].gem) return { ok: false, error: 'Socket already filled.' };

  const parsed = parseGemStackId(gemId);
  if (!parsed) return { ok: false, error: 'Unknown gem' };
  const { rarity, stat, level } = parsed;
  const group = findGemGroup(profile, rarity, stat, level);
  if (!group || group.count < 1) return { ok: false, error: 'Gem not in inventory' };

  const socketedGem = { key: gemKey(rarity, stat), rarity, stat, level };

  // CRITICAL: re-acquire the LIVE gear reference here. Earlier validation calls
  // (getGearInstance) run ensureGearInventory, which REPLACES profile.gearInventory
  // with freshly normalized objects, detaching the `gear` captured above. Write to the
  // live object and do NOT call any ensure* helper after this point.
  const liveGear = (profile.gearInventory || []).find((g) => g.instanceId === gearInstanceId);
  if (!liveGear || !liveGear.sockets?.[idx]) return { ok: false, error: 'Gear not found' };
  if (liveGear.sockets[idx].gem) return { ok: false, error: 'Socket already filled.' };

  liveGear.sockets[idx].gem = socketedGem;
  const confirmedGem = normalizeSocketedGem(liveGear.sockets[idx].gem);
  if (!confirmedGem?.key) {
    liveGear.sockets[idx].gem = null;
    return { ok: false, error: 'Could not attach gem to this socket. Please try again.' };
  }

  // Consume one gem of the chosen type+level from inventory.
  group.count -= 1;
  profile.gemInventory = profile.gemInventory.filter((g) => g.count > 0);

  liveGear.sockets[idx].gem = confirmedGem;
  profile.updatedAt = new Date().toISOString();
  return {
    ok: true,
    gem: liveGear.sockets[idx].gem,
    gear: liveGear,
    insertCost: gemSocketInsertCoinCost(rarity),
  };
}

/** Remove a gem from a gear socket back into inventory (returns to its own level row). */
export function unsocketGemFromGear(profile, gearInstanceId, socketIndex) {
  ensureGemInventory(profile);
  const gear = getGearInstance(profile, gearInstanceId);
  if (!gear) return { ok: false, error: 'Gear not found' };
  if (!gear.sockets?.length) return { ok: false, error: 'This gear has no sockets.' };

  const idx = Math.floor(socketIndex);
  if (idx < 0 || idx >= gear.sockets.length) return { ok: false, error: 'Invalid socket.' };

  const socketGem = normalizeSocketedGem(gear.sockets[idx].gem);
  if (!socketGem) return { ok: false, error: 'Socket is empty.' };

  // Re-acquire live gear (ensure* above may have rebuilt the array).
  const liveGear = (profile.gearInventory || []).find((g) => g.instanceId === gearInstanceId) ?? gear;
  addGems(profile, socketGem.rarity, socketGem.stat, socketGem.level, 1);
  if (liveGear.sockets?.[idx]) liveGear.sockets[idx].gem = null;
  profile.updatedAt = new Date().toISOString();
  return {
    ok: true,
    gem: socketGem,
    gear: liveGear,
    removeCost: gemSocketRemoveCoinCost(socketGem.rarity),
  };
}

/**
 * Flat gem stat bonuses from all socketed gems on equipped gear instances.
 */
export function sumGearSocketGemStats(gearInstances) {
  const flat = {
    hp: 0,
    attack: 0,
    magicAttack: 0,
    defence: 0,
    magicDefence: 0,
    dodge: 0,
    hitRate: 0,
  };
  for (const gear of gearInstances || []) {
    for (const socket of gear.sockets || []) {
      const gem = normalizeSocketedGem(socket.gem);
      if (!gem) continue;
      const value = gemStatValue(gem.rarity, gem.stat, gem.level);
      if (flat[gem.stat] != null) flat[gem.stat] += value;
    }
  }
  return flat;
}

/** @deprecated Gems no longer equip directly to monsters. */
export function normalizeEquippedGems() {
  return { offensive: null, defensive: null, utility: null };
}

/**
 * Gems in inventory that can be inserted into a gear socket.
 *
 * Every inventory stack is socketable. Socketing removes the consumed instance
 * from inventory, so a stack only remains listed while it still has an available
 * gem — even if another gem of the same rarity+stat is already forged elsewhere
 * (they are independent instances). Do NOT filter by isGemKeySocketed here, or a
 * just-merged gem would vanish from the forge list whenever a same-type gem is
 * already socketed.
 */
export function listSocketableGemStacks(profile) {
  ensureGemInventory(profile);
  return listGemStacks(profile);
}

/** UI summary rows for the gems screen — one row per (type + level). */
export function listGemStacks(profile) {
  ensureGemInventory(profile);
  return [...(profile.gemInventory || [])]
    .filter((stack) => stack && stack.count > 0 && stack.level >= 1)
    .map((stack) => {
      const def = makeGemDef(stack.rarity, stack.stat);
      const need = getRequiredGemsForUpgrade(stack.level);
      const mergeCoinCost = gemUpgradeCoinCost(stack.rarity, stack.level);
      const fuelAvailable = totalOfType(profile, stack.rarity, stack.stat) - 1;
      const atMaxLevel = stack.level >= GEM_MAX_LEVEL;
      return {
        ...def,
        id: gemStackId(stack.rarity, stack.stat, stack.level),
        level: stack.level,
        count: stack.count,
        fuelAvailable,
        upgradeCost: need,
        mergeCoinCost,
        canUpgrade: !atMaxLevel && fuelAvailable >= need,
        atMaxLevel,
        currentValue: gemStatValue(stack.rarity, stack.stat, stack.level),
        nextValue: !atMaxLevel ? gemStatValue(stack.rarity, stack.stat, stack.level + 1) : null,
        socketed: false,
      };
    })
    .sort((a, b) => {
      const rOrder = { mythic: 0, epic: 1, rare: 2 };
      const dr = (rOrder[a.rarity] ?? 9) - (rOrder[b.rarity] ?? 9);
      if (dr !== 0) return dr;
      const ds = a.stat.localeCompare(b.stat);
      if (ds !== 0) return ds;
      return b.level - a.level; // highest level first within a type
    });
}

/** Gear pieces with at least one socket (for gem insertion UI). */
export function listGearWithSockets(profile) {
  ensureGemInventory(profile);
  return (profile.gearInventory || [])
    .filter((g) => (g.sockets?.length ?? 0) > 0)
    .map((g) => ({
      instanceId: g.instanceId,
      name: g.name,
      rarity: g.rarity,
      slot: g.slot,
      equippedToMonsterId: g.equippedToMonsterId,
      sockets: (g.sockets || []).map((sk, i) => {
        const socketGem = normalizeSocketedGem(sk.gem);
        return {
          index: i,
          id: sk.id || `socket_${i + 1}`,
          gem: socketGem,
          removeCost: socketGem ? gemSocketRemoveCoinCost(socketGem.rarity) : null,
        };
      }),
    }));
}

export {
  gemDisplayName,
  gemBaseValue,
  gemSocketInsertCoinCost,
  gemSocketRemoveCoinCost,
  gemUpgradeCoinCost,
  parseGemKey,
} from './gemDefinitions';
