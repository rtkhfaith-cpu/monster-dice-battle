/** Visual scale for in-battle attack effects (projectiles, splats, hit FX). */
export const ATTACK_EFFECT_SCALE = 1;

export function fx(n) {
  return Math.round(n * ATTACK_EFFECT_SCALE);
}
