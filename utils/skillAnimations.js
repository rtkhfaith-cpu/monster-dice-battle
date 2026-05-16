/**
 * Maps battle skills to visual animation kinds, projectiles, and SFX keys.
 * Gameplay unchanged — presentation only.
 */

/** @typedef {'fly_lunge'|'projectile'|'cloud_spread'|'water_wave'|'fire_blast'|'egg_bomb'|'rush'|'sparkle'} AnimKind */

/**
 * @param {{ id?: string, name?: string, effectType?: string, kind?: string }} [skill]
 * @returns {{ animKind: AnimKind, projectileId: string, sfxKey: string, sicklyFlash?: boolean }}
 */
export function getSkillAnimMeta(skill) {
  const id = skill?.id ?? '';
  const effectType = skill?.effectType ?? 'normal';
  const name = (skill?.name ?? '').toLowerCase();

  /** @type {Record<string, Partial<ReturnType<typeof getSkillAnimMeta>>>} */
  const BY_ID = {
    fly_face: { animKind: 'fly_lunge', projectileId: 'flyBug', sfxKey: 'fly' },
    spread_bacteria: { animKind: 'cloud_spread', projectileId: 'bacteria', sfxKey: 'bacteria', sicklyFlash: true },
    egg_bomb: { animKind: 'egg_bomb', projectileId: 'eggBomb', sfxKey: 'egg' },
    cold_splash: { animKind: 'water_wave', projectileId: 'waterWave', sfxKey: 'water' },
    crush_wave: { animKind: 'water_wave', projectileId: 'waterWave', sfxKey: 'water' },
    boba_splash: { animKind: 'water_wave', projectileId: 'waterSpray', sfxKey: 'water' },
    ink_jet: { animKind: 'water_wave', projectileId: 'waterWave', sfxKey: 'water' },
    skibidi_beam: { animKind: 'water_wave', projectileId: 'waterWave', sfxKey: 'water' },
    tail_slam: { animKind: 'fire_blast', projectileId: 'fireBlast', sfxKey: 'fire' },
    spicy_noodles: { animKind: 'fire_blast', projectileId: 'fireBlast', sfxKey: 'fire' },
    screen_glare: { animKind: 'fire_blast', projectileId: 'fireBlast', sfxKey: 'fire' },
    dumpster_explosion: { animKind: 'fire_blast', projectileId: 'fireBlast', sfxKey: 'fire' },
    app_crash: { animKind: 'sparkle', projectileId: 'phone', sfxKey: 'metal' },
    locker_slam: { animKind: 'sparkle', projectileId: 'phone', sfxKey: 'metal' },
    goblin_rush: { animKind: 'rush', projectileId: 'slipper', sfxKey: 'fly' },
    feather_storm: { animKind: 'cloud_spread', projectileId: 'feather', sfxKey: 'fly' },
    tp_tornado: { animKind: 'cloud_spread', projectileId: 'toiletRoll', sfxKey: 'fly' },
    spell_burst: { animKind: 'sparkle', projectileId: 'pencil', sfxKey: 'magic' },
    notification_barrage: { animKind: 'rush', projectileId: 'phone', sfxKey: 'metal' },
    roar: { animKind: 'cloud_spread', projectileId: 'stinkCloud', sfxKey: 'roar' },
  };

  if (BY_ID[id]) {
    return {
      animKind: 'projectile',
      projectileId: 'poop',
      sfxKey: 'hit',
      ...BY_ID[id],
    };
  }

  if (name.includes('fly') || name.includes('rush') || name.includes('face')) {
    return { animKind: 'fly_lunge', projectileId: 'flyBug', sfxKey: 'fly' };
  }
  if (name.includes('bacteria') || name.includes('poison') || effectType === 'poison') {
    return { animKind: 'cloud_spread', projectileId: 'bacteria', sfxKey: 'bacteria', sicklyFlash: true };
  }
  if (name.includes('egg')) {
    return { animKind: 'egg_bomb', projectileId: 'eggBomb', sfxKey: 'egg' };
  }
  if (effectType === 'water' || name.includes('splash') || name.includes('wave')) {
    return { animKind: 'water_wave', projectileId: 'waterWave', sfxKey: 'water' };
  }
  if (effectType === 'fire' || name.includes('fire') || name.includes('spicy')) {
    return { animKind: 'fire_blast', projectileId: 'fireBlast', sfxKey: 'fire' };
  }
  if (effectType === 'magic67' || name.includes('spell') || name.includes('magic')) {
    return { animKind: 'sparkle', projectileId: 'pencil', sfxKey: 'magic' };
  }
  if (effectType === 'toiletPaper') {
    return { animKind: 'cloud_spread', projectileId: 'toiletRoll', sfxKey: 'fly' };
  }

  return { animKind: 'projectile', projectileId: 'poop', sfxKey: effectType === 'normal' ? 'hit' : effectType };
}
