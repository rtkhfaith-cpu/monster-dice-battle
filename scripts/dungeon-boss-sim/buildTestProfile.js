/**
 * Build a synthetic player profile for dungeon boss simulations.
 */
import { generateGearInstance } from '../../src/gameSystems/gear/gearGenerator.js';
import { gearTemplatesForSet } from '../../src/gameSystems/gear/gearDefinitions.js';
import { equipGearOnMonster } from '../../src/gameSystems/gear/equipmentSystem.js';
import { addGearToInventory } from '../../src/gameSystems/gear/inventoryGearUtils.js';
import { defaultMonsterEquipment } from '../../src/gameSystems/gear/gearConstants.js';
import { getMonsterTemplate } from '../../utils/monsterTemplates.js';
import { DEFAULT_OPTIONS, DEFAULT_TEAM } from './config.js';

function equipFullSet(profile, monsterId, setId, gearRarity, seedPrefix) {
  const templates = gearTemplatesForSet(setId).filter((t) => t.rarity === gearRarity);
  const slotCounts = { head: 0, body: 0, weapon: 0, hand: 0, legs: 0 };
  for (const template of templates) {
    const gear = generateGearInstance(template.gearId, { seed: `${seedPrefix}_${template.gearId}` });
    if (!gear) throw new Error(`Failed to generate ${template.gearId}`);
    addGearToInventory(profile, gear);
    const idx = slotCounts[template.slot]++;
    const res = equipGearOnMonster(profile, monsterId, gear.instanceId, template.slot, idx);
    if (!res.ok) throw new Error(`Equip failed for ${template.gearId}: ${res.error}`);
  }
}

/**
 * @param {object} [opts]
 * @param {typeof DEFAULT_TEAM} [opts.team]
 * @param {number} [opts.monsterLevel]
 * @param {number} [opts.petLevel]
 * @param {string} [opts.gearRarity]
 * @param {number} [opts.mergeTier]
 */
export function buildTestProfile(opts = {}) {
  const team = opts.team ?? DEFAULT_TEAM;
  const monsterLevel = opts.monsterLevel ?? DEFAULT_OPTIONS.monsterLevel;
  const petLevel = opts.petLevel ?? DEFAULT_OPTIONS.petLevel;
  const gearRarity = opts.gearRarity ?? DEFAULT_OPTIONS.gearRarity;
  const mergeTier = opts.mergeTier ?? DEFAULT_OPTIONS.mergeTier;

  const profile = {
    id: 'sim_profile',
    name: 'Sim',
    coins: 0,
    gearInventory: [],
    ownedPets: [],
    ownedMonsters: [],
    passiveSkillBooksOwned: [],
    equippedPassiveSkills: {},
    gemInventory: [],
  };

  for (const spec of team) {
    const tpl = getMonsterTemplate(spec.templateId);
    if (!tpl) throw new Error(`Unknown template ${spec.templateId}`);

    const passiveRarity = spec.passiveRarity ?? 'epic';
    const owned = {
      id: spec.id,
      templateId: spec.templateId,
      nickname: tpl.name,
      level: monsterLevel,
      exp: 0,
      mergeTier,
      monsterParts: { ...tpl.visualProfile.defaultParts },
      equipment: defaultMonsterEquipment(),
      equippedPassives: (spec.passives || []).map((skillId, i) => ({
        skillId,
        rarity: passiveRarity,
        instanceId: `psb_${spec.id}_${i}`,
        equippedAt: new Date().toISOString(),
      })),
      equippedPetInstanceId: null,
      equippedGems: { offensive: null, defensive: null, utility: null },
    };

    equipFullSet(profile, spec.id, spec.setId, gearRarity, spec.id);

    const petInstanceId = `pet_${spec.id}`;
    profile.ownedPets.push({
      instanceId: petInstanceId,
      petId: spec.petId,
      level: petLevel,
      exp: 0,
      equippedToMonsterId: spec.id,
      acquiredAt: new Date().toISOString(),
    });
    owned.equippedPetInstanceId = petInstanceId;
    profile.ownedMonsters.push(owned);
  }

  return profile;
}
