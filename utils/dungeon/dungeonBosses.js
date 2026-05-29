/**
 * Dungeon mode — end-game boss raid definitions, availability, skills, and the
 * position / formation balance constants.
 *
 * Dungeons are additive: they reuse monster/pet/equipment/gem/skill stats but
 * run on their own 3-vs-1 turn engine (see dungeonBattleEngine.js).
 */

import { GAME_ASSETS } from '../gameAssetPaths';

/** Fixed reference date for the rotation schedule. */
export const DUNGEON_GAME_START = '2026-01-01';

/** Position bonuses (always applied by position). */
export const POSITION_BONUS = {
  1: { damageReduction: 15 },
  2: {},
  3: { damageBonus: 10, critDamageBonus: 10 },
};

/** Extra bonuses when the right role sits in its ideal position. */
export const ROLE_POSITION_BONUS = {
  tanker: { damageReduction: 15, threatBonus: 25, maxHpBonus: 10 },
  damager: { attackBonus: 10, magicAttackBonus: 10, critRateBonus: 5 },
};

/** Applied to all 3 monsters when the full correct formation is used. */
export const FORMATION_BONUS = { allStatsBonus: 5, bossDamageReduction: 5 };

/** Default single-target boss aim weights when all 3 are alive. */
export const DEFAULT_TARGET_WEIGHTS = { 1: 50, 2: 25, 3: 25 };

/** Status effect tuning. */
export const DUNGEON_EFFECTS = {
  stun: { skipNextTurn: true, canDodge: false, canAttack: false },
  freeze: { skipNextTurn: true, dodgeReduction: 100, damageTakenIncrease: 10 },
  burn: { damagePercentOfMaxHp: 5, durationTurns: 3 },
};

/** Team-wide pet skill types when the pet sits on Position 2. */
export const TEAM_WIDE_POSITION2_PET_SKILLS = [
  'heal',
  'shield',
  'dodgeBoost',
  'critBoost',
  'attackBoost',
  'magicAttackBoost',
  'defenceBoost',
  'magicDefenceBoost',
  'hitRateBoost',
  'cleanseDebuff',
  // existing engine skill ids that map to support
  'dodge_boost',
  'crit_boost',
  'cleanse',
  'energy_gain',
];

const deathKnightSkills = [
  { name: 'Dark Slash', type: 'singleAttack', damageType: 'physical', multiplier: 1.5, description: 'Heavy single-target attack, usually aimed at Position 1.' },
  { name: 'Grave Stun', type: 'stun', damageType: 'physical', multiplier: 0.8, stunChance: 35, durationTurns: 1, description: 'Damages and may stun one monster for 1 turn.' },
  { name: 'Cursed Cleave', type: 'aoeAttack', damageType: 'physical', multiplier: 0.72, description: 'AOE attack that hits all player monsters.' },
  { name: 'Death Mark', type: 'debuff', effect: 'increaseDamageTaken', value: 20, durationTurns: 2, description: 'Marked monster takes more damage.' },
];

const iceQueenSkills = [
  { name: 'Ice Spear', type: 'singleAttack', damageType: 'magic', multiplier: 1.6, description: 'Heavy magic attack on one monster.' },
  { name: 'Frozen Prison', type: 'freeze', damageType: 'magic', multiplier: 0.7, freezeChance: 40, durationTurns: 1, description: 'Damages and may freeze one monster.' },
  { name: 'Blizzard', type: 'aoeAttack', damageType: 'magic', multiplier: 0.78, description: 'AOE magic attack that hits all monsters.' },
  { name: 'Frostbite Curse', type: 'debuff', effect: 'reduceSpeedAndDodge', value: 25, durationTurns: 2, target: 'all', description: 'Reduces speed and dodge for all monsters.' },
];

const blackDragonSkills = [
  { name: 'Dragon Claw', type: 'singleAttack', damageType: 'physical', multiplier: 1.8, description: 'Very heavy single-target attack.' },
  { name: 'Hellfire Breath', type: 'aoeAttack', damageType: 'magic', multiplier: 0.85, effect: 'burn', burnDamagePercent: 4, durationTurns: 3, description: 'AOE fire attack that burns all monsters.' },
  { name: 'Dark Wing Storm', type: 'aoeAttack', damageType: 'physical', multiplier: 0.75, description: 'AOE physical attack that hits all monsters.' },
  { name: 'Dragon Fear', type: 'stun', damageType: 'none', stunChance: 30, target: 'all', durationTurns: 1, description: 'Chance to stun each monster.' },
  { name: 'Black Dragon Rage', type: 'rage', triggerBelowHpPercent: 30, effect: { attackIncrease: 25, magicAttackIncrease: 25, hitRateIncrease: 15 }, description: 'Below 30% HP, Black Dragon becomes stronger.' },
  { name: 'Final Breath', type: 'trueDamage', target: 'all', multiplier: 0.95, triggerBelowHpPercent: 20, cooldownTurns: 4, description: 'Dangerous AOE true damage attack below 20% HP.' },
];

/** Boss skill rotation by name (engine resolves names → skill objects). */
const DEATH_KNIGHT_PATTERN = ['Dark Slash', 'Grave Stun', 'Cursed Cleave', 'Dark Slash', 'Death Mark'];
const ICE_QUEEN_PATTERN = ['Ice Spear', 'Frostbite Curse', 'Frozen Prison', 'Blizzard', 'Ice Spear'];
const BLACK_DRAGON_PATTERN_NORMAL = ['Dragon Claw', 'Hellfire Breath', 'Dark Wing Storm', 'Dragon Fear'];
const BLACK_DRAGON_PATTERN_ENRAGED = ['Hellfire Breath', 'Dragon Claw', 'Dark Wing Storm', 'Final Breath'];

export const DUNGEON_BOSSES = [
  {
    id: 'death_knight',
    name: 'Death Knight',
    level: 60,
    element: 'dark',
    image: GAME_ASSETS.dungeonDeathKnight,
    battleGround: GAME_ASSETS.dungeonBattleGroundRescueArena,
    spawnFrequencyDays: 1,
    recommendedPower: 80000,
    rewardsText: 'Drops 3 random Epic or Legendary items',
    blurb: 'Physical dark boss. Tests whether your Position 1 can tank stun and cleave.',
    stats: {
      hp: 165000, attack: 4960, magicAttack: 2720, defence: 3200, magicDefence: 2400,
      dodge: 12, hitRate: 85, critRate: 12, critDamage: 140,
    },
    skills: deathKnightSkills,
    pattern: DEATH_KNIGHT_PATTERN,
    rewards: {
      dropCount: 3,
      dropRarityPool: ['epic', 'legendary'],
      dropCategoryPool: ['equipment', 'skill', 'monster', 'pet', 'gem'],
      gemRarityCap: 'epic',
    },
  },
  {
    id: 'ice_queen',
    name: 'Ice Queen',
    level: 80,
    element: 'ice',
    image: GAME_ASSETS.dungeonIceQueen,
    battleGround: GAME_ASSETS.dungeonBattleGroundIceQueen,
    spawnFrequencyDays: 2,
    recommendedPower: 140000,
    rewardsText: 'Drops 1 random Mythic item and 2 random Epic items',
    blurb: 'Magic-control boss. Tests Magic Defence, healing, cleanse and freeze resistance.',
    stats: {
      hp: 290000, attack: 3800, magicAttack: 8200, defence: 4000, magicDefence: 5800,
      dodge: 18, hitRate: 90, critRate: 15, critDamage: 145,
    },
    skills: iceQueenSkills,
    pattern: ICE_QUEEN_PATTERN,
    rewards: {
      fixedDrop: [
        { rarity: 'mythic', count: 1 },
        { rarity: 'epic', count: 2 },
      ],
      dropCategoryPool: ['equipment', 'skill', 'monster', 'pet', 'gem'],
      gemRarityCap: 'epic',
    },
  },
  {
    id: 'black_dragon',
    name: 'Black Dragon Boss',
    level: 100,
    element: 'fire_dark',
    image: GAME_ASSETS.dungeonBlackDragon,
    battleGround: GAME_ASSETS.dungeonBattleGroundRescueArena,
    spawnFrequencyDays: 3,
    recommendedPower: 280000,
    rewardsText: 'Drops 3 random Mythic items, including possible Mythic Gems',
    blurb: 'End-game raid boss. Demands a real team: tank, healer/support, damager, pets and gems.',
    stats: {
      hp: 520000, attack: 11000, magicAttack: 11000, defence: 7200, magicDefence: 7200,
      dodge: 22, hitRate: 95, critRate: 20, critDamage: 155,
    },
    skills: blackDragonSkills,
    pattern: BLACK_DRAGON_PATTERN_NORMAL,
    enragedPattern: BLACK_DRAGON_PATTERN_ENRAGED,
    rewards: {
      dropCount: 3,
      dropRarityPool: ['mythic'],
      dropCategoryPool: ['equipment', 'skill', 'monster', 'pet', 'gem'],
      gemRarityCap: 'mythic',
      mythicDropWeights: { equipment: 30, skill: 20, monster: 20, pet: 15, gem: 15 },
    },
  },
];

export const DUNGEON_RECOMMENDED_POWER = {
  death_knight: 80000,
  ice_queen: 140000,
  black_dragon: 280000,
};

export function getDungeonBoss(id) {
  return DUNGEON_BOSSES.find((b) => b.id === id) ?? null;
}

export function getBossSkillByName(boss, name) {
  return (boss?.skills || []).find((s) => s.name === name) ?? null;
}

/** @param {Date|number} currentDate */
export function getDaysSinceGameStart(currentDate = new Date()) {
  const now = currentDate instanceof Date ? currentDate : new Date(currentDate);
  const start = new Date(DUNGEON_GAME_START);
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

/** @param {object} boss @param {Date} currentDate @param {{ unlockAll?: boolean }} [opts] */
export function isDungeonBossAvailable(boss, currentDate = new Date(), opts = {}) {
  if (!boss) return false;
  if (opts.unlockAll) return true;
  return boss.id === 'death_knight';
}

/** Whole days until the boss is next available (0 if available now, null = coming soon). */
export function daysUntilDungeonBoss(boss, currentDate = new Date(), opts = {}) {
  if (!boss) return null;
  if (isDungeonBossAvailable(boss, currentDate, opts)) return 0;
  if (!opts.unlockAll && boss.id !== 'death_knight') return null;
  for (let i = 1; i <= 7; i += 1) {
    const probe = new Date(currentDate.getTime() + i * 24 * 60 * 60 * 1000);
    if (isDungeonBossAvailable(boss, probe, opts)) return i;
  }
  return 1;
}
