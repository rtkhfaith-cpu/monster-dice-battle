import { BUBBLE_TYPES } from './constants';

/**
 * @typedef {{
 *   id: number,
 *   label: string,
 *   colorCount: number,
 *   shotLimit: number,
 *   fillRows: number,
 *   monsterChance: number,
 *   chestChance: number,
 *   bombChance: number,
 *   expChance: number,
 *   gearChance: number,
 *   targetScore: number,
 * }} RescueStageDef
 */

/** @type {RescueStageDef[]} */
export const RESCUE_STAGES = [
  { id: 1, label: 'Bubble Bay', colorCount: 4, shotLimit: 35, fillRows: 8, monsterChance: 0.12, chestChance: 0.04, bombChance: 0.03, expChance: 0.05, gearChance: 0.02, targetScore: 400 },
  { id: 2, label: 'Coral Cave', colorCount: 4, shotLimit: 32, fillRows: 9, monsterChance: 0.14, chestChance: 0.05, bombChance: 0.04, expChance: 0.05, gearChance: 0.03, targetScore: 550 },
  { id: 3, label: 'Misty Marsh', colorCount: 5, shotLimit: 30, fillRows: 9, monsterChance: 0.15, chestChance: 0.05, bombChance: 0.05, expChance: 0.06, gearChance: 0.03, targetScore: 700 },
  { id: 4, label: 'Crystal Cliffs', colorCount: 5, shotLimit: 28, fillRows: 10, monsterChance: 0.16, chestChance: 0.06, bombChance: 0.05, expChance: 0.06, gearChance: 0.04, targetScore: 900 },
  { id: 5, label: 'Starfall Shrine', colorCount: 6, shotLimit: 26, fillRows: 10, monsterChance: 0.18, chestChance: 0.07, bombChance: 0.06, expChance: 0.07, gearChance: 0.05, targetScore: 1200 },
  { id: 6, label: 'Neon Nest', colorCount: 6, shotLimit: 24, fillRows: 11, monsterChance: 0.2, chestChance: 0.08, bombChance: 0.07, expChance: 0.08, gearChance: 0.06, targetScore: 1500 },
];

export function getRescueStage(id) {
  return RESCUE_STAGES.find((s) => s.id === id) ?? RESCUE_STAGES[0];
}

export function pickSpecialType(stage, roll) {
  const r = roll ?? Math.random();
  let acc = stage.monsterChance;
  if (r < acc) return BUBBLE_TYPES.MONSTER;
  acc += stage.chestChance;
  if (r < acc) return BUBBLE_TYPES.CHEST;
  acc += stage.bombChance;
  if (r < acc) return BUBBLE_TYPES.BOMB;
  acc += stage.expChance;
  if (r < acc) return BUBBLE_TYPES.EXP;
  acc += stage.gearChance;
  if (r < acc) return BUBBLE_TYPES.GEAR;
  return BUBBLE_TYPES.NORMAL;
}
