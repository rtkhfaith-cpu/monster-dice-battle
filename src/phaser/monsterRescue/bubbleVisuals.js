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
 * Crisp arcade bubble (minimal soft layers — avoids blurry overlap halos).
 * @param {Phaser.Scene} scene
 * @param {{ color: number }} cell
 * @param {number} depth
 * @param {number} [radius] bubble radius (defaults to constant)
 * @returns {Phaser.GameObjects.Container}
 */
export function createShinyBubble(scene, cell, depth = 5, radius = DEFAULT_BUBBLE_RADIUS) {
  const fill = bubbleColor(cell);
  const r = Math.round(radius);
  const container = scene.add.container(0, 0).setDepth(depth);

  const shadow = scene.add.circle(0, Math.max(1, Math.round(r * 0.08)), r, 0x000000, 0.28);
  const body = scene.add.circle(0, 0, r, fill, 1);
  const shade = scene.add.circle(0, Math.round(r * 0.12), r * 0.88, darkenColor(fill, 0.18), 0.35);
  const rim = scene.add.circle(0, 0, r, 0x000000, 0).setStrokeStyle(2, darkenColor(fill, 0.35), 1);
  const spec = scene.add.circle(
    Math.round(-r * 0.28),
    Math.round(-r * 0.34),
    Math.max(3, Math.round(r * 0.28)),
    0xffffff,
    0.72
  );
  const specDot = scene.add.circle(
    Math.round(-r * 0.1),
    Math.round(-r * 0.48),
    Math.max(2, Math.round(r * 0.1)),
    0xffffff,
    1
  );

  container.add([shadow, body, shade, rim, spec, specDot]);
  container.setData('bubbleColor', fill);
  return container;
}
