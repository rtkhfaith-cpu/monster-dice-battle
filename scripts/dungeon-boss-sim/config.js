/**
 * Default dungeon boss sim team + boss list.
 * Edit these presets when balance-testing different loadouts.
 */

export const PASSIVE = {
  IRON_GUARD: 'iron_guard',
  MANA_BARRIER: 'mana_barrier',
  REGENERATION_AURA: 'regeneration_aura',
  PHANTOM_STEP: 'phantom_step',
  FATAL_INSTINCT: 'fatal_instinct',
  RAGE_CORE: 'rage_core',
  BLOOD_DRAIN: 'blood_drain',
};

/** Standard end-game test team: Lv100 mythics, epic sets, Lv60 mythic pets. */
export const DEFAULT_TEAM = [
  {
    id: 'm_tank',
    templateId: 'bubble_tea_slime',
    position: 1,
    setId: 'dragon_guard',
    petId: 'solar_lion',
    passiveRarity: 'epic',
    passives: [PASSIVE.IRON_GUARD, PASSIVE.MANA_BARRIER, PASSIVE.REGENERATION_AURA],
  },
  {
    id: 'm_support',
    templateId: 'goldzilla',
    position: 2,
    setId: 'lifebloom',
    petId: 'star_unicorn',
    passiveRarity: 'epic',
    passives: [PASSIVE.REGENERATION_AURA, PASSIVE.MANA_BARRIER, PASSIVE.PHANTOM_STEP],
  },
  {
    id: 'm_dmg',
    templateId: 'sixtyseven_rex',
    position: 3,
    setId: 'warborn',
    petId: 'dragon_wisp',
    passiveRarity: 'epic',
    passives: [PASSIVE.FATAL_INSTINCT, PASSIVE.RAGE_CORE, PASSIVE.BLOOD_DRAIN],
  },
];

export const ALL_BOSSES = ['death_knight', 'ice_queen', 'black_dragon'];

export const DEFAULT_OPTIONS = {
  monsterLevel: 100,
  petLevel: 60,
  gearRarity: 'epic',
  mergeTier: 1,
  runsPerBoss: 5,
  maxSteps: 8000,
};
