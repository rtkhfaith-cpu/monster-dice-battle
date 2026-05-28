/**
 * Equip / unequip / validate monster equipment slots.
 */
import { ARRAY_GEAR_SLOTS, defaultMonsterEquipment } from './gearConstants';
import { getGearInstance, ensureGearInventory } from './inventoryGearUtils';
import { previewSetBonusChange } from './gearSets';

export function ensureMonsterEquipment(monster) {
  if (!monster) return defaultMonsterEquipment();
  if (!monster.equipment || typeof monster.equipment !== 'object') {
    monster.equipment = defaultMonsterEquipment();
  }
  const eq = monster.equipment;
  if (!('head' in eq)) eq.head = null;
  if (!('body' in eq)) eq.body = null;
  for (const slot of ARRAY_GEAR_SLOTS) {
    if (!Array.isArray(eq[slot]) || eq[slot].length !== 2) {
      eq[slot] = [null, null];
    }
  }
  return eq;
}

export function clearLegacyMonsterGearFields(monster) {
  if (!monster) return;
  delete monster.equippedGear;
  delete monster.gearSlotCount;
  delete monster.equippedLadderGear;
}

function slotRef(equipment, slot, index = 0) {
  if (slot === 'head' || slot === 'body') return { key: slot, index: null };
  if (ARRAY_GEAR_SLOTS.includes(slot)) return { key: slot, index };
  return null;
}

function getSlotInstanceId(equipment, slot, index = 0) {
  if (slot === 'head' || slot === 'body') return equipment[slot] ?? null;
  if (ARRAY_GEAR_SLOTS.includes(slot)) return equipment[slot]?.[index] ?? null;
  return null;
}

function setSlotInstanceId(equipment, slot, index, instanceId) {
  if (slot === 'head' || slot === 'body') {
    equipment[slot] = instanceId;
    return;
  }
  if (ARRAY_GEAR_SLOTS.includes(slot)) {
    if (!Array.isArray(equipment[slot])) equipment[slot] = [null, null];
    equipment[slot][index] = instanceId;
  }
}

function clearGearEquippedFlags(profile, instanceId, exceptMonsterId = null) {
  const g = getGearInstance(profile, instanceId);
  if (g && g.equippedToMonsterId && g.equippedToMonsterId !== exceptMonsterId) {
    return {
      ok: false,
      error: 'This gear is already equipped to another monster.',
    };
  }
  return { ok: true };
}

function syncEquippedFlagsForMonster(profile, monsterId, equipment) {
  ensureGearInventory(profile);
  const active = new Set();
  if (equipment.head) active.add(equipment.head);
  if (equipment.body) active.add(equipment.body);
  for (const slot of ARRAY_GEAR_SLOTS) {
    for (const id of equipment[slot] || []) {
      if (id) active.add(id);
    }
  }
  for (const g of profile.gearInventory) {
    if (g.equippedToMonsterId === monsterId && !active.has(g.instanceId)) {
      g.equippedToMonsterId = null;
    }
  }
  for (const id of active) {
    const g = getGearInstance(profile, id);
    if (g) g.equippedToMonsterId = monsterId;
  }
}

/**
 * @returns {{ ok: boolean, replacedInstanceId?: string|null, error?: string, setPreview?: object }}
 */
export function equipGearOnMonster(profile, monsterId, instanceId, slot, slotIndex = 0) {
  ensureGearInventory(profile);
  const om = (profile.ownedMonsters || []).find((m) => m.id === monsterId);
  if (!om) return { ok: false, error: 'Monster not found' };

  const gear = getGearInstance(profile, instanceId);
  if (!gear) return { ok: false, error: 'Gear not in inventory' };
  if (gear.slot !== slot) return { ok: false, error: `This item is ${gear.slot} gear, not ${slot}.` };

  const block = clearGearEquippedFlags(profile, instanceId, monsterId);
  if (!block.ok) return block;

  const equipment = ensureMonsterEquipment(om);

  const alreadyOnMonster = collectInstanceOnMonster(equipment, instanceId);
  if (alreadyOnMonster && (alreadyOnMonster.slot !== slot || alreadyOnMonster.index !== slotIndex)) {
    return { ok: false, error: 'This gear is already equipped on this monster in another slot.' };
  }

  const replacedInstanceId = getSlotInstanceId(equipment, slot, slotIndex);
  if (replacedInstanceId && replacedInstanceId !== instanceId) {
    const old = getGearInstance(profile, replacedInstanceId);
    if (old) old.equippedToMonsterId = null;
  }

  setSlotInstanceId(equipment, slot, slotIndex, instanceId);
  gear.equippedToMonsterId = monsterId;
  syncEquippedFlagsForMonster(profile, monsterId, equipment);
  profile.updatedAt = new Date().toISOString();

  const setPreview = previewSetBonusChange(profile, equipment, instanceId, slot, slotIndex);
  return { ok: true, replacedInstanceId: replacedInstanceId || null, setPreview };
}

export function unequipGearFromMonster(profile, monsterId, slot, slotIndex = 0) {
  const om = (profile.ownedMonsters || []).find((m) => m.id === monsterId);
  if (!om) return { ok: false, error: 'Monster not found' };
  const equipment = ensureMonsterEquipment(om);
  const instanceId = getSlotInstanceId(equipment, slot, slotIndex);
  if (!instanceId) return { ok: false, error: 'Slot is empty' };
  setSlotInstanceId(equipment, slot, slotIndex, null);
  const g = getGearInstance(profile, instanceId);
  if (g) g.equippedToMonsterId = null;
  profile.updatedAt = new Date().toISOString();
  return { ok: true, instanceId };
}

function collectInstanceOnMonster(equipment, instanceId) {
  if (equipment.head === instanceId) return { slot: 'head', index: 0 };
  if (equipment.body === instanceId) return { slot: 'body', index: 0 };
  for (const slot of ARRAY_GEAR_SLOTS) {
    const idx = (equipment[slot] || []).indexOf(instanceId);
    if (idx >= 0) return { slot, index: idx };
  }
  return null;
}

export function getEquippedGearForMonster(profile, monsterId) {
  const om = (profile.ownedMonsters || []).find((m) => m.id === monsterId);
  if (!om) return [];
  const equipment = ensureMonsterEquipment(om);
  const ids = [];
  if (equipment.head) ids.push(equipment.head);
  if (equipment.body) ids.push(equipment.body);
  for (const slot of ARRAY_GEAR_SLOTS) {
    for (const id of equipment[slot] || []) {
      if (id) ids.push(id);
    }
  }
  return ids.map((id) => getGearInstance(profile, id)).filter(Boolean);
}

export { collectInstanceOnMonster, getSlotInstanceId };
