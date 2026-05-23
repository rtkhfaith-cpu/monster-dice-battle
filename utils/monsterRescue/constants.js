/** Bubble colors used in every rescue stage (fixed — does not scale with level). */
export const RESCUE_COLOR_COUNT = 4;

/** Glossy jewel palette — length must match RESCUE_COLOR_COUNT */
export const BUBBLE_COLORS = [
  0xff5c7a, // ruby
  0x2eecc8, // mint
  0xffdd57, // gold
  0xbf8cff, // violet
];

export const BUBBLE_TYPES = {
  NORMAL: 'normal',
  MONSTER: 'monster',
  CHEST: 'chest',
  BOMB: 'bomb',
  EXP: 'exp',
  GEAR: 'gear',
};

/** Fewer columns = larger bubbles that still fit the play frame width. */
export const GRID_COLS = 9;
export const GRID_ROWS = 14;
export const BUBBLE_RADIUS = 22;
export const ROW_STAGGER = true;

export const COMBO_COIN_BASE = 8;
export const COMBO_EXP_BASE = 12;
export const RESCUE_COIN_BONUS = 25;
export const RESCUE_EXP_BONUS = 18;

/** Seconds allowed per shot before auto-fire (no on-screen timer). */
export const RESCUE_MOVE_TIME_SEC = 15;

/** Overall stage time limit — lose when this reaches zero. */
export const RESCUE_GAME_TIME_SEC = 120;
