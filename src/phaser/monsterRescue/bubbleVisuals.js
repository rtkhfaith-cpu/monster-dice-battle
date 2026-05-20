import { BUBBLE_COLORS, BUBBLE_RADIUS } from '../../../utils/monsterRescue/constants';

function bubbleColor(cell) {
  const idx = cell.color % BUBBLE_COLORS.length;
  return BUBBLE_COLORS[idx] ?? 0xffffff;
}

const BUBBLE_GLOW_COLORS = [
  0xff9aad,
  0x7ff5e8,
  0xfff08a,
  0xddbfff,
  0x9ed4ff,
  0xffb8dc,
];

function glowColor(cell) {
  const idx = cell.color % BUBBLE_GLOW_COLORS.length;
  return BUBBLE_GLOW_COLORS[idx] ?? 0xffffff;
}

/**
 * Glossy arcade bubble (shared by grid + shooter).
 * @param {Phaser.Scene} scene
 * @param {{ color: number }} cell
 * @param {number} depth
 * @returns {Phaser.GameObjects.Container}
 */
export function createShinyBubble(scene, cell, depth = 5) {
  const fill = bubbleColor(cell);
  const glow = glowColor(cell);
  const r = BUBBLE_RADIUS;
  const container = scene.add.container(0, 0).setDepth(depth);

  const outerGlow = scene.add.circle(0, 0, r + 8, glow, 0.22);
  const midGlow = scene.add.circle(0, 1, r + 3, glow, 0.35);
  const body = scene.add.circle(0, 0, r, fill, 0.92);
  const inner = scene.add.circle(0, 2, r * 0.72, 0xffffff, 0.14);
  const rim = scene.add.circle(0, 0, r, 0xffffff, 0).setStrokeStyle(2.5, 0xffffff, 0.55);
  const specLarge = scene.add.circle(-r * 0.32, -r * 0.38, r * 0.38, 0xffffff, 0.42);
  const specSmall = scene.add.circle(-r * 0.12, -r * 0.52, r * 0.14, 0xffffff, 0.88);

  container.add([outerGlow, midGlow, body, inner, rim, specLarge, specSmall]);
  container.setData('bubbleColor', fill);
  return container;
}
