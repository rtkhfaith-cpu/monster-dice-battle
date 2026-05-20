import { BUBBLE_COLORS, BUBBLE_RADIUS as DEFAULT_BUBBLE_RADIUS } from '../../../utils/monsterRescue/constants';

function bubbleColor(cell) {
  const idx = cell.color % BUBBLE_COLORS.length;
  return BUBBLE_COLORS[idx] ?? 0xffffff;
}

function darkenColor(hex, amount = 0.22) {
  const r = ((hex >> 16) & 0xff) * (1 - amount);
  const g = ((hex >> 8) & 0xff) * (1 - amount);
  const b = (hex & 0xff) * (1 - amount);
  return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
}

/**
 * Sharp arcade bubble — solid fills only (no translucent overlap halos).
 * @param {Phaser.Scene} scene
 * @param {{ color: number }} cell
 * @param {number} depth
 * @param {number} [radius] bubble radius (defaults to constant)
 * @returns {Phaser.GameObjects.Container}
 */
export function createShinyBubble(scene, cell, depth = 5, radius = DEFAULT_BUBBLE_RADIUS) {
  const fill = bubbleColor(cell);
  const r = Math.max(4, Math.round(radius));
  const container = scene.add.container(0, 0).setDepth(depth);

  const body = scene.add.circle(0, 0, r, fill, 1);
  const rim = scene.add
    .circle(0, 0, r, 0x000000, 0)
    .setStrokeStyle(Math.max(2, Math.round(r * 0.09)), darkenColor(fill, 0.42), 1);
  const spec = scene.add.circle(
    Math.round(-r * 0.3),
    Math.round(-r * 0.32),
    Math.max(3, Math.round(r * 0.22)),
    0xffffff,
    1,
  );
  const specDot = scene.add.circle(
    Math.round(-r * 0.08),
    Math.round(-r * 0.45),
    Math.max(2, Math.round(r * 0.08)),
    0xffffff,
    1,
  );

  container.add([body, rim, spec, specDot]);
  container.setData('bubbleColor', fill);
  return container;
}
