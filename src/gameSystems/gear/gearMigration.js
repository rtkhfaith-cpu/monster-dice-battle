/**
 * Migrate legacy cosmeticsOwned / equippedGear saves to new gear system.
 */
import { ensureGearInventory } from './inventoryGearUtils';
import {
  clearLegacyMonsterGearFields,
  ensureMonsterEquipment,
  repairMonsterEquipmentRefs,
} from './equipmentSystem';
import { getGearTemplate } from './gearDefinitions';

export function migrateProfileToNewGear(profile) {
  if (!profile) return;
  ensureGearInventory(profile);

  purgeObsoleteGear(profile);

  if (profile._gearSystemMigrated) {
    for (const om of profile.ownedMonsters || []) {
      ensureMonsterEquipment(om);
      repairMonsterEquipmentRefs(profile, om);
      clearLegacyMonsterGearFields(om);
    }
    return;
  }

  for (const om of profile.ownedMonsters || []) {
    ensureMonsterEquipment(om);
    repairMonsterEquipmentRefs(profile, om);
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

/** Remove gear instances whose template ids no longer exist (e.g. old shared-rarity catalog). */
function purgeObsoleteGear(profile) {
  if (!Array.isArray(profile.gearInventory)) return;
  const validIds = new Set(
    profile.gearInventory
      .filter((g) => g?.gearId && getGearTemplate(g.gearId))
      .map((g) => g.instanceId),
  );
  profile.gearInventory = profile.gearInventory.filter((g) => validIds.has(g.instanceId));

  for (const om of profile.ownedMonsters || []) {
    const eq = om.equipment;
    if (!eq) continue;
    if (eq.head && !validIds.has(eq.head)) eq.head = null;
    if (eq.body && !validIds.has(eq.body)) eq.body = null;
    for (const slot of ['weapon', 'hand', 'legs']) {
      if (!Array.isArray(eq[slot])) continue;
      eq[slot] = eq[slot].map((id) => (id && validIds.has(id) ? id : null));
    }
  }
}

export function initNewProfileGear(profile) {
  if (!profile) return;
  if (!Array.isArray(profile.gearInventory)) profile.gearInventory = [];
  migrateProfileToNewGear(profile);
}
