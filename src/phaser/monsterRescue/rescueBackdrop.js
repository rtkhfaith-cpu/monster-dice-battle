import { GRID_ZONE_RATIO } from './rescueLayout';

/**
 * Procedural volcanic arena when PNG is still loading.
 * @param {Phaser.Scene} scene
 * @param {number} w
 * @param {number} h
 */
export function drawProceduralArena(scene, w, h) {
  const g = scene.add.graphics().setDepth(0);

  g.fillGradientStyle(0x12081f, 0x1a0c28, 0x3d1810, 0x6b2a12, 1);
  g.fillRect(0, 0, w, h);

  const floorTop = h * 0.52;
  g.fillStyle(0x2a1528, 0.55);
  g.fillTriangle(w * 0.08, floorTop, w * 0.92, floorTop, w * 0.5, h);
  g.fillStyle(0x4a2010, 0.35);
  g.fillTriangle(w * 0.15, floorTop + 20, w * 0.85, floorTop + 20, w * 0.5, h - 8);

  const cx = w * 0.5;
  const cy = h - 72;
  g.fillStyle(0xff6b1a, 0.08);
  g.fillCircle(cx, cy, 90);
  g.lineStyle(2, 0xffc04d, 0.2);
  g.strokeCircle(cx, cy, 58);

  return g;
}

/**
 * Darken top grid zone so bubbles stay readable.
 * @param {Phaser.Scene} scene
 * @param {number} w
 * @param {number} h
 */
export function drawGridVignette(scene, w, h) {
  const g = scene.add.graphics().setDepth(2);
  const gridH = h * GRID_ZONE_RATIO;

  g.fillStyle(0x0a0614, 0.38);
  g.fillRect(0, 0, w, gridH * 0.55);
  g.fillStyle(0x0a0614, 0.12);
  g.fillRect(0, gridH * 0.55, w, gridH * 0.45);

  return g;
}
