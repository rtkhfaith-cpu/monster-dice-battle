/**
 * Per-monster skills — 1 physical + 2–3 magic (MP cost, element, simple status).
 */

import { getTemplateElement } from './elements';

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   kind: 'physical'|'magic',
 *   mpCost?: number,
 *   element?: string,
 *   power?: number,
 *   effectType?: string,
 *   emoji?: string,
 *   status?: { type: string, chance: number, turns?: number },
 * }} BattleSkill
 */

/** @type {Record<string, { physical: BattleSkill, magic: BattleSkill[] }>} */
export const MONSTER_SKILL_SETS = {
  cockroachsaurus: {
    physical: { id: 'dirty_bite', name: 'Dirty Bite', kind: 'physical', effectType: 'normal', emoji: '🦷', power: 1 },
    magic: [
      { id: 'fly_face', name: 'Fly In Your Face', kind: 'magic', mpCost: 12, element: 'earth', power: 1.2, effectType: 'normal', emoji: '🪰' },
      { id: 'spread_bacteria', name: 'Spread Bacteria', kind: 'magic', mpCost: 14, element: 'earth', power: 1.1, effectType: 'poison', emoji: '🦠', status: { type: 'poison', chance: 0.4, turns: 2 } },
      { id: 'dumpster_explosion', name: 'Dumpster Explosion', kind: 'magic', mpCost: 18, element: 'earth', power: 1.35, effectType: 'fire', emoji: '🗑️' },
    ],
  },
  chickenzilla: {
    physical: { id: 'peck_slam', name: 'Peck Slam', kind: 'physical', effectType: 'normal', emoji: '🐔', power: 1 },
    magic: [
      { id: 'egg_bomb', name: 'Egg Bomb', kind: 'magic', mpCost: 12, element: 'fire', power: 1.25, effectType: 'fire', emoji: '🥚' },
      { id: 'feather_storm', name: 'Feather Storm', kind: 'magic', mpCost: 15, element: 'wood', power: 1.15, effectType: 'normal', emoji: '🪶', status: { type: 'atkDown', chance: 0.35, turns: 2 } },
      { id: 'screech', name: 'Loud Screech', kind: 'magic', mpCost: 10, element: 'fire', power: 1.05, effectType: 'normal', emoji: '📢' },
    ],
  },
  water_bottle_beast: {
    physical: { id: 'hydro_slam', name: 'Hydro Slam', kind: 'physical', effectType: 'water', emoji: '💧', power: 1 },
    magic: [
      { id: 'cold_splash', name: 'Cold Splash', kind: 'magic', mpCost: 11, element: 'water', power: 1.2, effectType: 'water', emoji: '❄️' },
      { id: 'crush_wave', name: 'Crush Wave', kind: 'magic', mpCost: 16, element: 'water', power: 1.3, effectType: 'water', emoji: '🌊' },
    ],
  },
  crocs_goblin: {
    physical: { id: 'stomp_kick', name: 'Stomp Kick', kind: 'physical', effectType: 'normal', emoji: '👟', power: 1 },
    magic: [
      { id: 'mud_splash', name: 'Mud Splash', kind: 'magic', mpCost: 12, element: 'earth', power: 1.15, effectType: 'normal', emoji: '💩', status: { type: 'defDown', chance: 0.35, turns: 2 } },
      { id: 'goblin_rush', name: 'Goblin Rush', kind: 'magic', mpCost: 14, element: 'earth', power: 1.25, effectType: 'normal', emoji: '🏃' },
    ],
  },
  iphone_warrior: {
    physical: { id: 'screen_slap', name: 'Screen Slap', kind: 'physical', effectType: 'normal', emoji: '📱', power: 1 },
    magic: [
      { id: 'app_crash', name: 'App Crash', kind: 'magic', mpCost: 13, element: 'metal', power: 1.25, effectType: 'magic67', emoji: '💥' },
      { id: 'low_battery', name: 'Low Battery', kind: 'magic', mpCost: 11, element: 'metal', power: 1.1, effectType: 'normal', emoji: '🔋', status: { type: 'atkDown', chance: 0.4, turns: 2 } },
      { id: 'notification_barrage', name: 'Notification Barrage', kind: 'magic', mpCost: 16, element: 'metal', power: 1.2, effectType: 'normal', emoji: '🔔' },
    ],
  },
  lunchbox_dragon: {
    physical: { id: 'lunch_crunch', name: 'Lunch Crunch', kind: 'physical', effectType: 'normal', emoji: '🍱', power: 1 },
    magic: [
      { id: 'spicy_noodles', name: 'Spicy Noodles', kind: 'magic', mpCost: 12, element: 'fire', power: 1.2, effectType: 'fire', emoji: '🍜', status: { type: 'burn', chance: 0.4, turns: 2 } },
      { id: 'snack_storm', name: 'Snack Storm', kind: 'magic', mpCost: 15, element: 'fire', power: 1.28, effectType: 'normal', emoji: '🍿' },
    ],
  },
  pencil_shark: {
    physical: { id: 'point_strike', name: 'Point Strike', kind: 'physical', effectType: 'normal', emoji: '✏️', power: 1 },
    magic: [
      { id: 'ink_jet', name: 'Ink Jet', kind: 'magic', mpCost: 12, element: 'water', power: 1.22, effectType: 'water', emoji: '🖊️' },
      { id: 'paper_cut', name: 'Paper Cut Fury', kind: 'magic', mpCost: 14, element: 'metal', power: 1.18, effectType: 'normal', emoji: '📄', status: { type: 'poison', chance: 0.3, turns: 2 } },
    ],
  },
  homework_troll: {
    physical: { id: 'book_slam', name: 'Book Slam', kind: 'physical', effectType: 'normal', emoji: '📚', power: 1 },
    magic: [
      { id: 'math_maze', name: 'Math Maze', kind: 'magic', mpCost: 13, element: 'wood', power: 1.2, effectType: 'normal', emoji: '🔢', status: { type: 'defDown', chance: 0.35, turns: 2 } },
      { id: 'deadline_panic', name: 'Deadline Panic', kind: 'magic', mpCost: 16, element: 'wood', power: 1.3, effectType: 'normal', emoji: '⏰' },
    ],
  },
  toilet_paper_ninja: {
    physical: { id: 'roll_whip', name: 'Roll Whip', kind: 'physical', effectType: 'toiletPaper', emoji: '🧻', power: 1 },
    magic: [
      { id: 'tp_tornado', name: 'TP Tornado', kind: 'magic', mpCost: 12, element: 'wood', power: 1.2, effectType: 'toiletPaper', emoji: '🌪️' },
      { id: 'clog_trap', name: 'Clog Trap', kind: 'magic', mpCost: 14, element: 'water', power: 1.15, effectType: 'water', emoji: '🚽', status: { type: 'defDown', chance: 0.4, turns: 2 } },
    ],
  },
  schoolbag_golem: {
    physical: { id: 'backpack_bash', name: 'Backpack Bash', kind: 'physical', effectType: 'normal', emoji: '🎒', power: 1 },
    magic: [
      { id: 'heavy_books', name: 'Heavy Books', kind: 'magic', mpCost: 13, element: 'earth', power: 1.25, effectType: 'normal', emoji: '📖' },
      { id: 'locker_slam', name: 'Locker Slam', kind: 'magic', mpCost: 15, element: 'metal', power: 1.2, effectType: 'normal', emoji: '🔐', status: { type: 'atkDown', chance: 0.35, turns: 2 } },
    ],
  },
  t_rex: {
    physical: { id: 'chomp', name: 'Mega Chomp', kind: 'physical', effectType: 'normal', emoji: '🦖', power: 1.05 },
    magic: [
      { id: 'tail_slam', name: 'Tail Slam', kind: 'magic', mpCost: 14, element: 'fire', power: 1.28, effectType: 'fire', emoji: '🔥' },
      { id: 'roar', name: 'Earthquake Roar', kind: 'magic', mpCost: 17, element: 'earth', power: 1.35, effectType: 'roar', emoji: '📣' },
    ],
  },
  tablet_wizard: {
    physical: { id: 'wand_tap', name: 'Wand Tap', kind: 'physical', effectType: 'normal', emoji: '🪄', power: 1 },
    magic: [
      { id: 'spell_burst', name: 'Spell Burst', kind: 'magic', mpCost: 12, element: 'metal', power: 1.25, effectType: 'magic67', emoji: '✨' },
      { id: 'wifi_blast', name: 'Wi-Fi Blast', kind: 'magic', mpCost: 15, element: 'metal', power: 1.22, effectType: 'normal', emoji: '📶' },
      { id: 'screen_glare', name: 'Screen Glare', kind: 'magic', mpCost: 11, element: 'fire', power: 1.1, effectType: 'fire', emoji: '💡', status: { type: 'burn', chance: 0.35, turns: 2 } },
    ],
  },
  skibidi_bot: {
    physical: { id: 'flush_punch', name: 'Flush Punch', kind: 'physical', effectType: 'toiletPaper', emoji: '🚽', power: 1 },
    magic: [
      { id: 'skibidi_beam', name: 'Skibidi Beam', kind: 'magic', mpCost: 14, element: 'water', power: 1.3, effectType: 'water', emoji: '🎵' },
      { id: 'camera_flash', name: 'Camera Flash', kind: 'magic', mpCost: 12, element: 'metal', power: 1.15, effectType: 'normal', emoji: '📸' },
    ],
  },
  bubble_tea_slime: {
    physical: { id: 'boba_splash', name: 'Boba Splash', kind: 'physical', effectType: 'water', emoji: '🧋', power: 1 },
    magic: [
      { id: 'sugar_rush', name: 'Sugar Rush', kind: 'magic', mpCost: 11, element: 'water', power: 1.18, effectType: 'water', emoji: '🍬' },
      { id: 'sticky_slime', name: 'Sticky Slime', kind: 'magic', mpCost: 14, element: 'water', power: 1.12, effectType: 'water', emoji: '🫧', status: { type: 'defDown', chance: 0.4, turns: 2 } },
    ],
  },
  sixtyseven_rex: {
    physical: { id: 'mythic_claw', name: 'Mythic Claw', kind: 'physical', effectType: 'normal', emoji: '⚡', power: 1.08 },
    magic: [
      { id: 'sixtyseven_blast', name: '67 Blast', kind: 'magic', mpCost: 15, element: 'metal', power: 1.35, effectType: 'magic67', emoji: '6️⃣' },
      { id: 'golden_roar', name: 'Golden Roar', kind: 'magic', mpCost: 18, element: 'fire', power: 1.4, effectType: 'roar', emoji: '👑', status: { type: 'burn', chance: 0.45, turns: 2 } },
      { id: 'hype_wave', name: 'Hype Wave', kind: 'magic', mpCost: 12, element: 'metal', power: 1.2, effectType: 'normal', emoji: '🌟' },
    ],
  },
  goldzilla: {
    physical: { id: 'executive_slam', name: 'Executive Slam', kind: 'physical', effectType: 'normal', emoji: '💼', power: 1.13 },
    magic: [
      { id: 'golden_wall', name: 'Golden Wall', kind: 'magic', mpCost: 15, element: 'metal', power: 1.42, effectType: 'normal', emoji: '🧱', status: { type: 'defDown', chance: 0.4, turns: 2 } },
      { id: 'billionaire_roar', name: 'Billionaire Roar', kind: 'magic', mpCost: 18, element: 'fire', power: 1.47, effectType: 'roar', emoji: '💰', status: { type: 'burn', chance: 0.45, turns: 2 } },
    ],
  },
};

/** @param {string} templateId */
export function getMonsterSkillSet(templateId) {
  const set = MONSTER_SKILL_SETS[templateId];
  if (set) return set;
  const el = getTemplateElement(templateId);
  return {
    physical: { id: 'basic_hit', name: 'Basic Hit', kind: 'physical', effectType: 'normal', emoji: '👊', power: 1 },
    magic: [
      { id: 'spark', name: 'Element Spark', kind: 'magic', mpCost: 12, element: el, power: 1.2, effectType: 'normal', emoji: '✨' },
    ],
  };
}

/** @param {string} templateId */
export function getPhysicalSkill(templateId) {
  return getMonsterSkillSet(templateId).physical;
}

/** @param {string} templateId */
export function getMagicSkills(templateId) {
  return getMonsterSkillSet(templateId).magic;
}

/** @param {BattleSkill} skill */
export function canAffordSkill(fighter, skill) {
  if (!skill || skill.kind !== 'magic') return true;
  const cost = skill.mpCost ?? 0;
  return (fighter?.mp ?? 0) >= cost;
}
