/** Per-monster gear slot progression (3 default → 6 max). */

export const DEFAULT_GEAR_SLOTS = 3;
export const MAX_GEAR_SLOTS = 6;

/** @type {Record<number, number>} */
export const GEAR_SLOT_UNLOCK_COST = {
  4: 30,
  5: 60,
  6: 100,
};

/** @param {{ gearSlotCount?: number }|null|undefined} ownedMonster */
export function getUnlockedSlotCount(ownedMonster) {
  const n = ownedMonster?.gearSlotCount ?? DEFAULT_GEAR_SLOTS;
  return Math.max(DEFAULT_GEAR_SLOTS, Math.min(MAX_GEAR_SLOTS, Math.floor(n)));
}

/** Cost to unlock the next slot, or null if maxed */
export function nextSlotUnlockCost(ownedMonster) {
  const current = getUnlockedSlotCount(ownedMonster);
  if (current >= MAX_GEAR_SLOTS) return null;
  return GEAR_SLOT_UNLOCK_COST[current + 1] ?? null;
}

/** @param {(string|null)[]|string[]|null|undefined} equipped */
export function normalizeEquippedSlots(equipped, slotCount) {
  const slots = Array.from({ length: slotCount }, (_, i) => {
    const v = equipped?.[i];
    return typeof v === 'string' && v.length > 0 ? v : null;
  });
  return slots;
}

/** Gear ids only (no nulls) for stat math */
export function compactGearIds(slots) {
  return (slots || []).filter((id) => typeof id === 'string' && id.length > 0);
}

/**
 * Equip gear at slot index; removes same gear from other slots.
 * @param {(string|null)[]} currentSlots
 * @param {string} gearId
 * @param {number} slotIndex
 * @param {number} maxSlots
 */
export function setGearAtSlot(currentSlots, gearId, slotIndex, maxSlots) {
  const slots = normalizeEquippedSlots(currentSlots, maxSlots);
  for (let i = 0; i < maxSlots; i += 1) {
    if (slots[i] === gearId) slots[i] = null;
  }
  if (slotIndex >= 0 && slotIndex < maxSlots) {
    slots[slotIndex] = gearId;
  }
  return slots;
}

/** First empty unlocked slot, or -1 */
export function firstEmptySlotIndex(slots, maxSlots) {
  const normalized = normalizeEquippedSlots(slots, maxSlots);
  return normalized.findIndex((id) => !id);
}

/** Equip to first empty slot; returns null if full */
export function equipToFirstEmptySlot(currentSlots, gearId, maxSlots) {
  const idx = firstEmptySlotIndex(currentSlots, maxSlots);
  if (idx < 0) return null;
  return setGearAtSlot(currentSlots, gearId, idx, maxSlots);
}
