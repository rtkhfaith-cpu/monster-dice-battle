import { BUBBLE_TYPES } from '../../../utils/monsterRescue/constants';

/** @typedef {{ color: number, type: string, monsterTemplateId?: string }} BubbleCell */

const TYPE_META = {
  [BUBBLE_TYPES.NORMAL]: { emoji: null, glow: 0xffffff, score: 10 },
  [BUBBLE_TYPES.MONSTER]: { emoji: '🐾', glow: 0xffd93d, score: 40 },
  [BUBBLE_TYPES.CHEST]: { emoji: '📦', glow: 0xfbbf24, score: 60 },
  [BUBBLE_TYPES.BOMB]: { emoji: '💣', glow: 0xfb7185, score: 30 },
  [BUBBLE_TYPES.EXP]: { emoji: '✨', glow: 0x86efac, score: 35 },
  [BUBBLE_TYPES.GEAR]: { emoji: '⚙️', glow: 0x93c5fd, score: 45 },
};

export function getBubbleTypeMeta(type) {
  return TYPE_META[type] ?? TYPE_META[BUBBLE_TYPES.NORMAL];
}

/** All bubbles match by color only (no special blocking). */
export function isMatchableType(_type) {
  return true;
}

export function createBubbleCell(color, type, monsterTemplateId) {
  return {
    color,
    type: type ?? BUBBLE_TYPES.NORMAL,
    ...(monsterTemplateId ? { monsterTemplateId } : {}),
  };
}
