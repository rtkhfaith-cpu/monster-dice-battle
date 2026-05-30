/**
 * Gear inventory helpers — filter, sort, lookup.
 */
import { ARRAY_GEAR_SLOTS, GEAR_SELL_VALUES } from './gearConstants';
import { formatGearStatLines } from './gearGenerator';
import { GEAR_SET_IDS, getGearTemplate } from './gearDefinitions';
import { gearRarityColor } from '../../../utils/gearRarityUi';
import { gemKey, parseGemKey } from '../gems/gemDefinitions';

function normalizeSocketGemRaw(gem) {
  if (!gem || typeof gem !== 'object') return null;
  let key = String(gem.key || '').trim();
  let parsed = parseGemKey(key);
  if (!parsed && gem.rarity && gem.stat) {
    key = gemKey(gem.rarity, gem.stat);
    parsed = parseGemKey(key);
  }
  if (!parsed) return null;
  return {
    key,
    rarity: parsed.rarity,
    stat: parsed.stat,
    level: Math.max(1, Math.min(10, Math.floor(gem.level || 1))),
    copies: Math.max(0, Math.floor(gem.copies || 0)),
  };
}

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

  const template = getGearTemplate(gearId);
  if (!template) return null;

  const rarity = template.rarity;
  const slot = template.slot;
  const setId = template.setId;
  const socketCount = rarity === 'rare' ? 0 : rarity === 'epic' ? Math.min(row.sockets?.length ?? 0, 1) : Math.min(row.sockets?.length ?? 0, 2);

  return {
    instanceId,
    gearId,
    name: template.name,
    rarity,
    slot,
    setId,
    setName: template.setName,
    buildType: template.buildType,
    stats: Array.isArray(row.stats) ? row.stats.map((s) => ({ type: s.type, value: Math.round(s.value) })) : [],
    sockets: Array.isArray(row.sockets)
      ? row.sockets.slice(0, socketCount).map((sk, i) => ({
          id: sk.id || `socket_${i + 1}`,
          gem: normalizeSocketGemRaw(sk.gem),
        }))
      : [],
    equippedToMonsterId: row.equippedToMonsterId ?? null,
    acquiredAt: row.acquiredAt || new Date().toISOString(),
  };
}

export function getGearInstance(profile, instanceId) {
  if (!profile) return null;
  ensureGearInventory(profile);
  return (profile.gearInventory || []).find((g) => g.instanceId === instanceId) ?? null;
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

  if (filter === 'sockets') return list.filter((g) => (g?.sockets?.length ?? 0) > 0);
  if (filter === 'equipped') return list.filter((g) => g.equippedToMonsterId);
  if (filter === 'unequipped') return list.filter((g) => !g.equippedToMonsterId);
  if (['rare', 'epic', 'mythic'].includes(filter)) return list.filter((g) => g.rarity === filter);
  if (['head', 'body', 'weapon', 'hand', 'legs'].includes(filter)) {
    return list.filter((g) => g.slot === filter);
  }
  if (['tank', 'attack', 'recovery', 'poison', 'fire'].includes(filter)) {
    return list.filter((g) => g.buildType === filter);
  }
  if (GEAR_SET_IDS.includes(filter)) {
    return list.filter((g) => g.setId === filter);
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
    setName: gear.setName ?? gear.setId,
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

/** Coin payout when selling unequipped gear (matches sellGearInstance). */
export function gearSellCoinValue(gearOrRarity) {
  const rarity = typeof gearOrRarity === 'string' ? gearOrRarity : gearOrRarity?.rarity;
  return GEAR_SELL_VALUES[rarity] ?? 20;
}
