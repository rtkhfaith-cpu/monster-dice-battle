/**
 * Migrate legacy cosmeticsOwned / equippedGear saves to new gear system.
 */
import { defaultMonsterEquipment } from './gearConstants';
import { ensureGearInventory } from './inventoryGearUtils';
import { clearLegacyMonsterGearFields, ensureMonsterEquipment } from './equipmentSystem';

export function migrateProfileToNewGear(profile) {
  if (!profile) return;
  ensureGearInventory(profile);

  if (profile._gearSystemMigrated) {
    for (const om of profile.ownedMonsters || []) {
      ensureMonsterEquipment(om);
      clearLegacyMonsterGearFields(om);
    }
    return;
  }

  for (const om of profile.ownedMonsters || []) {
    ensureMonsterEquipment(om);
    clearLegacyMonsterGearFields(om);
  }

  delete profile.cosmeticsOwned;
  delete profile.cosmeticEquippedP1;
  delete profile.cosmeticEquippedP2;

  const ml = profile.monsterLadder;
  if (ml && typeof ml === 'object') {
    delete ml.ownedGear;
  }

  profile._gearSystemMigrated = true;
  profile.updatedAt = new Date().toISOString();
}

export function initNewProfileGear(profile) {
  if (!profile) return;
  if (!Array.isArray(profile.gearInventory)) profile.gearInventory = [];
  migrateProfileToNewGear(profile);
}
