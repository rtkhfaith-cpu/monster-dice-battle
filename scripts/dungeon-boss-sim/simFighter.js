/**
 * Node-safe fighter builder for dungeon sims (avoids gameStorage / React Native).
 */
import { computeBattleStats } from '../../utils/statsCalc.js';
import { buildFighterStatPackage } from '../../src/gameSystems/gear/battleStatCalculator.js';
import { ensureMonsterEquipment } from '../../src/gameSystems/gear/equipmentSystem.js';
import { getMonsterTemplate } from '../../utils/monsterTemplates.js';
import { getTemplateElements } from '../../utils/elements.js';
import { clampMergeTier, scaleStatsByMergeTier } from '../../utils/mergeSystem.js';
import { findOwnedPet, petBattleSnapshot } from '../../src/gameSystems/petInventory.js';

const ROLE_MAP = {
  tank: 'tanker',
  tank_mage: 'tanker',
  mage: 'healer',
  trickster: 'support',
  debuffer: 'support',
  brawler: 'damager',
  speedster: 'damager',
  balanced: 'hybrid',
  mythic: 'hybrid',
};

export function dungeonRoleForOwned(owned) {
  if (!owned) return 'hybrid';
  const tpl = getMonsterTemplate(owned.templateId);
  return ROLE_MAP[tpl?.role ?? 'balanced'] ?? 'hybrid';
}

function resolveEquippedPet(profile, owned) {
  if (!profile || !owned) return null;
  const row = owned.equippedPetInstanceId
    ? findOwnedPet(profile, owned.equippedPetInstanceId)
    : null;
  return petBattleSnapshot(row);
}

/** Build a runtime fighter for dungeon battle engine (no RN / gameStorage). */
export function simFighterFromOwned(owned, profile = null) {
  ensureMonsterEquipment(owned);
  const tpl = getMonsterTemplate(owned.templateId);
  if (!tpl) return null;

  const built = computeBattleStats(owned.templateId, owned.level);
  if (!built) return null;

  const mergeTier = clampMergeTier(owned.mergeTier);
  const mergedBase = scaleStatsByMergeTier(built.stats, mergeTier);
  const equippedPet = resolveEquippedPet(profile, owned);
  const pkg = buildFighterStatPackage(mergedBase, profile, owned, equippedPet);
  const elements = getTemplateElements(owned.templateId);

  return {
    stats: pkg.stats,
    baseStats: pkg.baseStats,
    gearBonuses: pkg.gearBonuses,
    gearModifiers: pkg.gearModifiers,
    activeSetBonus: pkg.activeSetBonus,
    petBonuses: pkg.petBonuses,
    equippedPet,
    petCombatModifiers: pkg.petCombatModifiers,
    displayName: owned.nickname || tpl.name,
    monsterParts: owned.monsterParts,
    element: elements[0] ?? 'neutral',
    elements,
    equippedPassives: Array.isArray(owned.equippedPassives) ? [...owned.equippedPassives] : [],
  };
}
