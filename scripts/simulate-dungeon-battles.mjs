/**
 * Simulate dungeon boss fights — 5 runs each for Death Knight, Ice Queen, Black Dragon.
 * Team: Lv100 mythics, Lv60 mythic pets, full epic gear sets, 3 epic passives each.
 */
import { createDungeonBattle, advanceDungeonStep } from '../utils/dungeon/dungeonBattleEngine.js';
import { getDungeonBoss } from '../utils/dungeon/dungeonBosses.js';
import { fighterFromOwned } from '../utils/fighterFromOwned.js';
import { dungeonRoleForOwned, estimateTeamPower } from '../utils/dungeon/dungeonRoles.js';
import { generateGearInstance } from '../src/gameSystems/gear/gearGenerator.js';
import { gearTemplatesForSet } from '../src/gameSystems/gear/gearDefinitions.js';
import { equipGearOnMonster } from '../src/gameSystems/gear/equipmentSystem.js';
import { addGearToInventory } from '../src/gameSystems/gear/inventoryGearUtils.js';
import { defaultMonsterEquipment } from '../src/gameSystems/gear/gearConstants.js';
import { getMonsterTemplate } from '../utils/monsterTemplates.js';

const PASSIVE = {
  IRON_GUARD: 'iron_guard',
  MANA_BARRIER: 'mana_barrier',
  REGENERATION_AURA: 'regeneration_aura',
  PHANTOM_STEP: 'phantom_step',
  FATAL_INSTINCT: 'fatal_instinct',
  RAGE_CORE: 'rage_core',
  BLOOD_DRAIN: 'blood_drain',
};

const TEAM = [
  {
    id: 'm_tank',
    templateId: 'bubble_tea_slime',
    position: 1,
    setId: 'dragon_guard',
    petId: 'solar_lion',
    passives: [PASSIVE.IRON_GUARD, PASSIVE.MANA_BARRIER, PASSIVE.REGENERATION_AURA],
  },
  {
    id: 'm_support',
    templateId: 'goldzilla',
    position: 2,
    setId: 'lifebloom',
    petId: 'star_unicorn',
    passives: [PASSIVE.REGENERATION_AURA, PASSIVE.MANA_BARRIER, PASSIVE.PHANTOM_STEP],
  },
  {
    id: 'm_dmg',
    templateId: 'sixtyseven_rex',
    position: 3,
    setId: 'warborn',
    petId: 'dragon_wisp',
    passives: [PASSIVE.FATAL_INSTINCT, PASSIVE.RAGE_CORE, PASSIVE.BLOOD_DRAIN],
  },
];

const BOSSES = ['death_knight', 'ice_queen', 'black_dragon'];

function equipFullEpicSet(profile, monsterId, setId, seedPrefix) {
  const templates = gearTemplatesForSet(setId).filter((t) => t.rarity === 'epic');
  const slotCounts = { head: 0, body: 0, weapon: 0, hand: 0, legs: 0 };
  for (const template of templates) {
    const gear = generateGearInstance(template.gearId, { seed: `${seedPrefix}_${template.gearId}` });
    if (!gear) throw new Error(`Failed to generate ${template.gearId}`);
    addGearToInventory(profile, gear);
    const idx = slotCounts[template.slot]++;
    const res = equipGearOnMonster(profile, monsterId, gear.instanceId, template.slot, idx);
    if (!res.ok) throw new Error(`Equip failed: ${res.error}`);
  }
}

function buildProfile() {
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

  for (const spec of TEAM) {
    const tpl = getMonsterTemplate(spec.templateId);
    if (!tpl) throw new Error(`Unknown template ${spec.templateId}`);

    const owned = {
      id: spec.id,
      templateId: spec.templateId,
      nickname: tpl.name,
      level: 100,
      exp: 0,
      mergeTier: 1,
      monsterParts: { ...tpl.visualProfile.defaultParts },
      equipment: defaultMonsterEquipment(),
      equippedPassives: spec.passives.map((skillId, i) => ({
        skillId,
        rarity: 'epic',
        instanceId: `psb_${spec.id}_${i}`,
        equippedAt: new Date().toISOString(),
      })),
      equippedPetInstanceId: null,
      equippedGems: { offensive: null, defensive: null, utility: null },
    };

    equipFullEpicSet(profile, spec.id, spec.setId, spec.id);

    const petInstanceId = `pet_${spec.id}`;
    profile.ownedPets.push({
      instanceId: petInstanceId,
      petId: spec.petId,
      level: 60,
      exp: 0,
      equippedToMonsterId: spec.id,
      acquiredAt: new Date().toISOString(),
    });
    owned.equippedPetInstanceId = petInstanceId;
    profile.ownedMonsters.push(owned);
  }

  return profile;
}

function buildTeam(profile) {
  return TEAM.map((spec) => {
    const owned = profile.ownedMonsters.find((m) => m.id === spec.id);
    const fighter = fighterFromOwned(owned, profile);
    return {
      owned,
      fighter,
      role: dungeonRoleForOwned(owned),
      position: spec.position,
    };
  });
}

function runOnce(bossId, profile) {
  const boss = getDungeonBoss(bossId);
  const team = buildTeam(profile);
  const state = createDungeonBattle({ boss, team });

  let guard = 8000;
  while (state.phase === 'active' && guard-- > 0) {
    advanceDungeonStep(state);
  }

  const alive = state.monsters.filter((m) => m.alive && m.hp > 0);
  return {
    result: state.phase,
    rounds: state.turn,
    bossHpPct: Math.round((state.boss.hp / state.boss.maxHp) * 100),
    survivors: alive.length,
    survivorHp: alive.map((m) => `${m.name}:${Math.round(m.hp)}`).join(', '),
  };
}

function main() {
  const profile = buildProfile();
  const team = buildTeam(profile);
  const power = estimateTeamPower(
    TEAM.map((s) => ({ ownedId: s.id, position: s.position })),
    profile,
  );

  console.log('=== Dungeon battle simulation ===');
  console.log('Team: Lv100 mythics | Lv60 mythic pets | full epic gear | 3 epic passives each');
  console.log(`  P1 Tank: ${TEAM[0].templateId} + ${TEAM[0].setId} + ${TEAM[0].petId}`);
  console.log(`  P2 Mid:  ${TEAM[1].templateId} + ${TEAM[1].setId} + ${TEAM[1].petId}`);
  console.log(`  P3 DPS:  ${TEAM[2].templateId} + ${TEAM[2].setId} + ${TEAM[2].petId}`);
  console.log(`  Roles: ${team.map((t) => `P${t.position}=${t.role}`).join(', ')}`);
  console.log(`  Team power: ${power.toLocaleString()}`);
  console.log('  Note: passive skill books are equipped but dungeon engine does not resolve them yet.\n');

  for (const bossId of BOSSES) {
    const boss = getDungeonBoss(bossId);
    console.log(`--- ${boss.name} (recommended ${boss.recommendedPower.toLocaleString()}) ---`);
    const runs = [];
    for (let i = 0; i < 5; i += 1) {
      runs.push(runOnce(bossId, profile));
    }
    const wins = runs.filter((r) => r.result === 'win').length;
    const losses = runs.filter((r) => r.result === 'lose').length;
    const avgRounds = (runs.reduce((s, r) => s + r.rounds, 0) / runs.length).toFixed(1);
    runs.forEach((r, i) => {
      console.log(
        `  Run ${i + 1}: ${r.result === 'win' ? 'WIN' : 'LOSE'} | ${r.rounds} rounds | boss HP left ${r.bossHpPct}% | survivors ${r.survivors}${r.survivors ? ` (${r.survivorHp})` : ''}`,
      );
    });
    console.log(`  Summary: ${wins}W / ${losses}L | avg ${avgRounds} rounds\n`);
  }
}

main();
