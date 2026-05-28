/**
 * Profile gear inventory & equip — used by gameStorage and UI.
 */
import {
  generateGearInstance,
  shopPriceForGear,
} from '../src/gameSystems/gear/gearGenerator';
import { getGearTemplate } from '../src/gameSystems/gear/gearDefinitions';
import {
  equipGearOnMonster,
  unequipGearFromMonster,
  ensureMonsterEquipment,
} from '../src/gameSystems/gear/equipmentSystem';
import {
  addGearToInventory,
  removeGearFromInventory,
  ensureGearInventory,
} from '../src/gameSystems/gear/inventoryGearUtils';
import { grantGearDrop } from '../src/gameSystems/gear/gearDrops';
import { GEAR_SELL_VALUES, GEAR_SHOP_RARITIES } from '../src/gameSystems/gear/gearConstants';
import { migrateProfileToNewGear } from '../src/gameSystems/gear/gearMigration';

export function normalizeProfileGear(profile) {
  if (!profile) return;
  migrateProfileToNewGear(profile);
  ensureGearInventory(profile);
  for (const om of profile.ownedMonsters || []) {
    ensureMonsterEquipment(om);
  }
}

/** Buy generated gear instance (Rare/Epic only). */
export function buyGeneratedGear(profile, gearId, rarity) {
  normalizeProfileGear(profile);
  if (!GEAR_SHOP_RARITIES.includes(rarity)) {
    return { ok: false, error: 'Mythic gear cannot be purchased.' };
  }
  const template = getGearTemplate(gearId);
  if (!template) return { ok: false, error: 'Unknown gear' };
  const price = shopPriceForGear(rarity, `${profile.id}_${gearId}_${rarity}`);
  if (profile.coins < price) return { ok: false, error: 'Not enough coins' };

  const instance = generateGearInstance(gearId, rarity);
  if (!instance) return { ok: false, error: 'Failed to generate gear' };
  const grant = addGearToInventory(profile, instance);
  if (!grant.ok) return grant;

  profile.coins -= price;
  profile.updatedAt = new Date().toISOString();
  return { ok: true, gear: grant.gear, price };
}

export function equipGearInstance(profile, monsterId, instanceId, slot, slotIndex = 0) {
  normalizeProfileGear(profile);
  return equipGearOnMonster(profile, monsterId, instanceId, slot, slotIndex);
}

export function unequipGearInstance(profile, monsterId, slot, slotIndex = 0) {
  normalizeProfileGear(profile);
  return unequipGearFromMonster(profile, monsterId, slot, slotIndex);
}

export function sellGearInstance(profile, instanceId) {
  normalizeProfileGear(profile);
  const gear = profile.gearInventory.find((g) => g.instanceId === instanceId);
  if (!gear) return { ok: false, error: 'Gear not found' };
  if (gear.equippedToMonsterId) {
    return { ok: false, error: 'Unequip this gear before selling.' };
  }
  const value = GEAR_SELL_VALUES[gear.rarity] ?? 20;
  removeGearFromInventory(profile, instanceId);
  profile.coins += value;
  profile.updatedAt = new Date().toISOString();
  return { ok: true, coins: value };
}

export function grantGearDropToProfile(profile, source) {
  normalizeProfileGear(profile);
  return grantGearDrop(profile, source);
}

export function expMultiplierFromEquipment() {
  return 1;
}
