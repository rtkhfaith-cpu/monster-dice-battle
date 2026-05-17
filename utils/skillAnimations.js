/**
 * Maps battle skills to visual animation kinds, projectiles, and SFX keys.
 * Gameplay unchanged — presentation only.
 */

const { getSkillAnimMeta: getMeta } = require('./skillAnimRegistry');

/** @typedef {'fly_lunge'|'projectile'|'cloud_spread'|'water_wave'|'fire_blast'|'egg_bomb'|'rush'|'sparkle'|'metal_slash'|'bite_lunge'} AnimKind */

/**
 * @param {{ id?: string, name?: string, effectType?: string, kind?: string, emoji?: string }} [skill]
 * @returns {{ animKind: AnimKind, projectileId: string, sfxKey: string, sicklyFlash?: boolean, skillEmoji?: string }}
 */
export function getSkillAnimMeta(skill) {
  const meta = getMeta(skill);
  return {
    ...meta,
    skillEmoji: skill?.emoji,
  };
}
