/**
 * Gear inventory helpers — filter, sort, lookup.
 */
import { ARRAY_GEAR_SLOTS } from './gearConstants';
import { formatGearStatLines } from './gearGenerator';
import { gearRarityColor } from '../../../utils/gearRarityUi';

export function ensureGearInventory(profile) {
  if (!profile) return;
  if (!Array.isArray(profile.gearInventory)) profile.gearInventory = [];
  profile.gearInventory = profile.gearInventory
    .map(normalizeGearInstance)
    .filter(Boolean);
  const seen = new Set();
  profile.gearInventory = profile.gearInventory.filter((g) => {
    if (!g.instanceId || seen.has(g.instanceId)) return false;
    seen.add(g.instanceId);
    return true;
  });
}

export function normalizeGearInstance(row) {
  if (!row || typeof row !== 'object') return null;
  const instanceId = String(row.instanceId || '');
  const gearId = String(row.gearId || '');
  if (!instanceId || !gearId) return null;
  const rarity = ['rare', 'epic', 'mythic'].includes(row.rarity) ? row.rarity : 'rare';
  const slot = ['head', 'body', 'weapon', 'hand', 'legs'].includes(row.slot) ? row.slot : 'head';
  return {
    instanceId,
    gearId,
    name: String(row.name || gearId),
    rarity,
    slot,
    set: row.set ?? null,
    setName: row.setName ?? null,
    stats: Array.isArray(row.stats) ? row.stats.map((s) => ({ type: s.type, value: Math.round(s.value) })) : [],
    sockets: Array.isArray(row.sockets)
      ? row.sockets.map((sk, i) => ({ id: sk.id || `socket_${i + 1}`, gem: sk.gem ?? null }))
      : [],
    equippedToMonsterId: row.equippedToMonsterId ?? null,
    acquiredAt: row.acquiredAt || new Date().toISOString(),
  };
}

export function getGearInstance(profile, instanceId) {
  ensureGearInventory(profile);
  return profile.gearInventory.find((g) => g.instanceId === instanceId) ?? null;
}

export function addGearToInventory(profile, instance) {
  ensureGearInventory(profile);
  const norm = normalizeGearInstance(instance);
  if (!norm) return { ok: false, error: 'Invalid gear instance' };
  if (profile.gearInventory.some((g) => g.instanceId === norm.instanceId)) {
    return { ok: false, error: 'Duplicate instance id' };
  }
  profile.gearInventory.push(norm);
  profile.updatedAt = new Date().toISOString();
  return { ok: true, gear: norm };
}

export function removeGearFromInventory(profile, instanceId) {
  ensureGearInventory(profile);
  const idx = profile.gearInventory.findIndex((g) => g.instanceId === instanceId);
  if (idx < 0) return { ok: false, error: 'Gear not found' };
  const [removed] = profile.gearInventory.splice(idx, 1);
  profile.updatedAt = new Date().toISOString();
  return { ok: true, gear: removed };
}

export function listUnequippedGear(profile) {
  ensureGearInventory(profile);
  return profile.gearInventory.filter((g) => !g.equippedToMonsterId);
}

export function listEquippedGear(profile) {
  ensureGearInventory(profile);
  return profile.gearInventory.filter((g) => g.equippedToMonsterId);
}

export function getMonsterNameForGear(profile, instanceId) {
  const g = getGearInstance(profile, instanceId);
  if (!g?.equippedToMonsterId) return null;
  const om = (profile.ownedMonsters || []).find((m) => m.id === g.equippedToMonsterId);
  return om?.nickname || om?.templateId || g.equippedToMonsterId;
}

export function filterGearInventory(gearList, filter) {
  let list = [...(gearList || [])];
  if (!filter || filter === 'all') return list;

  if (filter === 'equipped') return list.filter((g) => g.equippedToMonsterId);
  if (filter === 'unequipped') return list.filter((g) => !g.equippedToMonsterId);
  if (['rare', 'epic', 'mythic'].includes(filter)) return list.filter((g) => g.rarity === filter);
  if (['head', 'body', 'weapon', 'hand', 'legs'].includes(filter)) {
    return list.filter((g) => g.slot === filter);
  }
  if (['guardian', 'berserker', 'lifebloom', 'venomfang', 'flameheart'].includes(filter)) {
    return list.filter((g) => g.set === filter);
  }
  return list;
}

export function sortGearInventory(gearList, sortBy = 'rarity') {
  const rarityRank = { mythic: 3, epic: 2, rare: 1 };
  const slotRank = { head: 0, body: 1, weapon: 2, hand: 3, legs: 4 };
  return [...gearList].sort((a, b) => {
    if (sortBy === 'slot') {
      return (slotRank[a.slot] ?? 9) - (slotRank[b.slot] ?? 9);
    }
    if (sortBy === 'equipped') {
      return (a.equippedToMonsterId ? 1 : 0) - (b.equippedToMonsterId ? 1 : 0);
    }
    const dr = (rarityRank[b.rarity] ?? 0) - (rarityRank[a.rarity] ?? 0);
    if (dr !== 0) return dr;
    return a.name.localeCompare(b.name);
  });
}

export function gearCardSummary(gear, profile = null) {
  if (!gear) return null;
  return {
    instanceId: gear.instanceId,
    name: gear.name,
    rarity: gear.rarity,
    rarityColor: gearRarityColor(gear.rarity),
    slot: gear.slot,
    setName: gear.setName ?? gear.set,
    statLines: formatGearStatLines(gear.stats),
    socketCount: gear.sockets?.length ?? 0,
    equippedTo: gear.equippedToMonsterId,
    equippedMonsterName: profile ? getMonsterNameForGear(profile, gear.instanceId) : null,
  };
}

export function collectEquippedInstanceIds(equipment) {
  if (!equipment) return [];
  const ids = [];
  if (equipment.head) ids.push(equipment.head);
  if (equipment.body) ids.push(equipment.body);
  for (const slot of ARRAY_GEAR_SLOTS) {
    for (const id of equipment[slot] || []) {
      if (id) ids.push(id);
    }
  }
  return ids;
}
