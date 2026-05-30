/**
 * Gem inventory — own, upgrade (consume duplicates + coins), socket into gear.
 *
 * Data model:
 *   profile.gemInventory: Array<{ key, rarity, stat, level, copies }>
 *     - one stack per (rarity, stat); `copies` are spare duplicates used to upgrade
 *   gear.sockets[].gem: { key, rarity, stat, level, copies } | null
 *     - socketing consumes one owned gem; spare duplicate copies stay in inventory
 *
 * Gems only apply battle stats when socketed into epic/mythic gear with sockets.
 */
import {
  GEM_RARITIES,
  GEM_STATS,
  GEM_MAX_LEVEL,
  gemKey,
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

export function normalizeGemStack(row) {
  if (!row || typeof row !== 'object') return null;
  let key = String(row.key || '').trim();
  let parsed = parseGemKey(key);
  if (!parsed && row.rarity && row.stat) {
    key = gemKey(row.rarity, row.stat);
    parsed = parseGemKey(key);
  }
  if (!parsed) return null;
  return {
    key,
    rarity: parsed.rarity,
    stat: parsed.stat,
    level: Math.max(1, Math.min(GEM_MAX_LEVEL, Math.floor(row.level || 1))),
    copies: Math.max(0, Math.floor(row.copies || 0)),
  };
}

/** Normalize a gem stored inside a gear socket. */
export function normalizeSocketedGem(gem) {
  return normalizeGemStack(gem);
}

function mergeGemInventoryStacks(rows) {
  const byKey = new Map();
  for (const row of rows || []) {
    const g = normalizeGemStack(row);
    if (!g) continue;
    const prev = byKey.get(g.key);
    if (!prev) {
      byKey.set(g.key, { ...g });
      continue;
    }
    prev.level = Math.max(prev.level, g.level);
    prev.copies += g.copies;
  }
  return [...byKey.values()];
}

/** @param {object} profile */
export function ensureGemInventory(profile) {
  if (!profile) return;
  if (!Array.isArray(profile.gemInventory)) profile.gemInventory = [];
  profile.gemInventory = mergeGemInventoryStacks(profile.gemInventory);
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

export function findGemStack(profile, key) {
  if (!profile?.gemInventory) return null;
  return profile.gemInventory.find((g) => g.key === key) ?? null;
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

/** Grant gem(s) (rarity+stat). First grant creates the owned stack; extras become merge duplicates. */
export function grantGem(profile, rarity, stat, quantity = 1) {
  ensureGemInventory(profile);
  const key = gemKey(rarity, stat);
  if (!isValidGemKey(key)) return { ok: false, error: 'Unknown gem' };
  const qty = Math.max(1, Math.floor(quantity));
  let stack = findGemStack(profile, key);
  if (!stack) {
    stack = { key, rarity, stat, level: 1, copies: Math.max(0, qty - 1) };
    profile.gemInventory.push(stack);
  } else {
    stack.copies += qty;
  }
  profile.updatedAt = new Date().toISOString();
  return { ok: true, gem: stack, granted: qty };
}

export function grantGemByKey(profile, key, quantity = 1) {
  const parsed = parseGemKey(key);
  if (!parsed) return { ok: false, error: 'Unknown gem' };
  return grantGem(profile, parsed.rarity, parsed.stat, quantity);
}

/** Upgrade a gem one level, consuming duplicate copies (coins handled by caller). */
export function upgradeGem(profile, key) {
  ensureGemInventory(profile);
  const stack = findGemStack(profile, key);
  if (!stack) return { ok: false, error: 'Gem not owned' };
  if (isGemKeySocketed(profile, key)) {
    return { ok: false, error: 'Unsocket the gem before upgrading.' };
  }
  if (stack.level >= GEM_MAX_LEVEL) return { ok: false, error: 'Gem already at max level' };
  const need = getRequiredGemsForUpgrade(stack.level);
  if (stack.copies < need) {
    return {
      ok: false,
      error: `Need ${need} duplicate gem${need === 1 ? '' : 's'} to merge (have ${stack.copies}).`,
    };
  }
  stack.copies -= need;
  stack.level += 1;
  profile.updatedAt = new Date().toISOString();
  return { ok: true, gem: stack, level: stack.level };
}

/** Insert a gem from inventory into a gear socket. */
export function socketGemInGear(profile, gearInstanceId, socketIndex, key) {
  ensureGemInventory(profile);
  const gear = getGearInstance(profile, gearInstanceId);
  if (!gear) return { ok: false, error: 'Gear not found' };
  if (!gear.sockets?.length) return { ok: false, error: 'This gear has no sockets.' };

  const idx = Math.floor(socketIndex);
  if (idx < 0 || idx >= gear.sockets.length) return { ok: false, error: 'Invalid socket.' };
  if (gear.sockets[idx].gem) return { ok: false, error: 'Socket already filled.' };

  const parsed = parseGemKey(key);
  if (!parsed) return { ok: false, error: 'Unknown gem' };
  const stack = findGemStack(profile, key);
  if (!stack) return { ok: false, error: 'Gem not in inventory' };
  if (isGemKeySocketed(profile, key)) return { ok: false, error: 'Gem already socketed elsewhere.' };

  const invIdx = profile.gemInventory.findIndex((g) => g.key === key);
  if (invIdx < 0) return { ok: false, error: 'Gem not in inventory' };
  const source = profile.gemInventory[invIdx];
  const socketedGem = {
    key: source.key,
    rarity: source.rarity,
    stat: source.stat,
    level: source.level,
    copies: 0,
  };

  gear.sockets[idx].gem = socketedGem;
  const confirmedGem = normalizeSocketedGem(gear.sockets[idx].gem);
  if (!confirmedGem?.key) {
    gear.sockets[idx].gem = null;
    return { ok: false, error: 'Could not attach gem to this socket. Please try again.' };
  }

  if ((source.copies ?? 0) > 0) {
    source.copies -= 1;
  } else {
    profile.gemInventory.splice(invIdx, 1);
  }

  gear.sockets[idx].gem = confirmedGem;
  profile.updatedAt = new Date().toISOString();
  return {
    ok: true,
    gem: gear.sockets[idx].gem,
    gear,
    insertCost: gemSocketInsertCoinCost(parsed.rarity),
  };
}

/** Remove a gem from a gear socket back into inventory. */
export function unsocketGemFromGear(profile, gearInstanceId, socketIndex) {
  ensureGemInventory(profile);
  const gear = getGearInstance(profile, gearInstanceId);
  if (!gear) return { ok: false, error: 'Gear not found' };
  if (!gear.sockets?.length) return { ok: false, error: 'This gear has no sockets.' };

  const idx = Math.floor(socketIndex);
  if (idx < 0 || idx >= gear.sockets.length) return { ok: false, error: 'Invalid socket.' };

  const socketGem = normalizeSocketedGem(gear.sockets[idx].gem);
  if (!socketGem) return { ok: false, error: 'Socket is empty.' };

  let stack = findGemStack(profile, socketGem.key);
  if (stack) {
    stack.copies += 1 + Math.max(0, socketGem.copies ?? 0);
    stack.level = Math.max(stack.level, socketGem.level);
  } else {
    profile.gemInventory.push({ ...socketGem });
  }
  gear.sockets[idx].gem = null;
  profile.updatedAt = new Date().toISOString();
  return {
    ok: true,
    gem: socketGem,
    gear,
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

/** Gems in inventory that can be inserted into a gear socket. */
export function listSocketableGemStacks(profile) {
  ensureGemInventory(profile);
  return listGemStacks(profile).filter((g) => !isGemKeySocketed(profile, g.id));
}

/** UI summary rows for the gems screen. */
export function listGemStacks(profile) {
  ensureGemInventory(profile);
  return [...(profile.gemInventory || [])]
    .filter((stack) => stack && stack.level >= 1)
    .map((stack) => {
      const def = makeGemDef(stack.rarity, stack.stat);
      const need = getRequiredGemsForUpgrade(stack.level);
      const mergeCoinCost = gemUpgradeCoinCost(stack.rarity, stack.level);
      return {
        ...def,
        level: stack.level,
        copies: stack.copies,
        upgradeCost: need,
        mergeCoinCost,
        canUpgrade: stack.level < GEM_MAX_LEVEL && stack.copies >= need,
        atMaxLevel: stack.level >= GEM_MAX_LEVEL,
        currentValue: gemStatValue(stack.rarity, stack.stat, stack.level),
        nextValue:
          stack.level < GEM_MAX_LEVEL
            ? gemStatValue(stack.rarity, stack.stat, stack.level + 1)
            : null,
        socketed: false,
      };
    })
    .sort((a, b) => {
      const rOrder = { mythic: 0, epic: 1, rare: 2 };
      const dr = (rOrder[a.rarity] ?? 9) - (rOrder[b.rarity] ?? 9);
      if (dr !== 0) return dr;
      return a.stat.localeCompare(b.stat);
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
