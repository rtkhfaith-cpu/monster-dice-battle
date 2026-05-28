/**
 * Central final battle stat calculator — all modes should use this.
 *
 * Order: base + level → merge tier → gear flats → set bonus → pets (no stat caps on gear/pet).
 */
import { applyPetStatBonuses, buildPetCombatModifiers } from '../petBonuses';
import {
  applyGearSetBonusToStats,
  buildSetCombatModifiers,
  detectActiveGearSet,
} from './gearSets';
import { ensureMonsterEquipment } from './equipmentSystem';
import { getGearInstance } from './inventoryGearUtils';

function sumGearFlatStats(gearInstances) {
  const flat = {
    hp: 0,
    attack: 0,
    defense: 0,
    speed: 0,
    crit: 0,
    dodge: 0,
    hitRate: 0,
    healPower: 0,
    firePower: 0,
    poisonPower: 0,
    skillPower: 0,
  };
  for (const g of gearInstances) {
    for (const s of g.stats || []) {
      if (flat[s.type] != null) flat[s.type] += s.value;
    }
  }
  return flat;
}

function applyFlatGearToStats(baseStats, flat) {
  const stats = { ...baseStats };

  if (typeof stats.hp === 'number') stats.hp += flat.hp;
  if (stats.attack?.min != null) {
    stats.attack = {
      min: stats.attack.min + flat.attack,
      max: stats.attack.max + flat.attack,
    };
  }
  if (stats.magic?.min != null) {
    stats.magic = {
      min: stats.magic.min + Math.floor(flat.attack * 0.6),
      max: stats.magic.max + Math.floor(flat.attack * 0.6),
    };
  }
  if (stats.def?.min != null) {
    stats.def = {
      min: stats.def.min + flat.defense,
      max: stats.def.max + flat.defense,
    };
  }
  if (stats.magicDef?.min != null) {
    stats.magicDef = {
      min: stats.magicDef.min + Math.floor(flat.defense * 0.6),
      max: stats.magicDef.max + Math.floor(flat.defense * 0.6),
    };
  }

  const spd = stats.speed ?? stats.agility ?? 10;
  const nextSpd = spd + flat.speed;
  stats.speed = nextSpd;
  stats.agility = (stats.agility ?? spd) + flat.speed;

  stats.critPct = (stats.critPct ?? 0) + flat.crit;
  stats.dodgePct = (stats.dodgePct ?? 0) + flat.dodge;
  stats.dodge = (stats.dodge ?? stats.dodgePct ?? 0) + flat.dodge;
  stats.hitRate = (stats.hitRate ?? 90) + flat.hitRate;

  return stats;
}

/**
 * @param {object} baseStats - after merge tier, with template caps already applied
 * @param {object} profile
 * @param {object} ownedMonster
 * @param {object|null} equippedPetSnapshot - from petBattleSnapshot
 */
export function computeFinalBattleStats(baseStats, profile, ownedMonster, equippedPetSnapshot = null) {
  const equipment = ensureMonsterEquipment(ownedMonster);
  const instanceIds = [];
  if (equipment.head) instanceIds.push(equipment.head);
  if (equipment.body) instanceIds.push(equipment.body);
  for (const slot of ['weapon', 'hand', 'legs']) {
    for (const id of equipment[slot] || []) {
      if (id) instanceIds.push(id);
    }
  }

  const gearInstances = instanceIds
    .map((id) => getGearInstance(profile, id))
    .filter(Boolean);

  const flat = sumGearFlatStats(gearInstances);
  let stats = applyFlatGearToStats(baseStats, flat);

  const setBonus = detectActiveGearSet(profile, equipment);
  stats = applyGearSetBonusToStats(stats, setBonus);

  const gearModifiers = {
    healPower: flat.healPower,
    firePower: flat.firePower,
    poisonPower: flat.poisonPower,
    skillPower: flat.skillPower,
    ...buildSetCombatModifiers(setBonus),
  };

  let petBonuses = { hp: 0, atk: 0, def: 0, spd: 0 };
  if (equippedPetSnapshot?.currentStats) {
    const applied = applyPetStatBonuses(stats, equippedPetSnapshot.currentStats);
    stats = applied.stats;
    petBonuses = applied.petBonuses;
  }

  return {
    stats,
    baseStats,
    gearBonuses: flat,
    gearModifiers,
    activeSetBonus: setBonus,
    petBonuses,
    equippedGearInstances: gearInstances,
  };
}

export function buildFighterStatPackage(baseStats, profile, ownedMonster, equippedPetSnapshot) {
  const result = computeFinalBattleStats(baseStats, profile, ownedMonster, equippedPetSnapshot);
  return {
    stats: result.stats,
    baseStats: result.baseStats,
    gearBonuses: result.gearBonuses,
    gearModifiers: result.gearModifiers,
    activeSetBonus: result.activeSetBonus,
    petBonuses: result.petBonuses,
    petCombatModifiers: buildPetCombatModifiers(equippedPetSnapshot),
    equippedGearInstanceIds: result.equippedGearInstances.map((g) => g.instanceId),
  };
}
