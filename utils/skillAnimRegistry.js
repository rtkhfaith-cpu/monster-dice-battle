/**
 * Shared skill → battle VFX mapping (client + Node server).
 */

/** @typedef {'fly_lunge'|'projectile'|'cloud_spread'|'water_wave'|'fire_blast'|'egg_bomb'|'rush'|'sparkle'|'metal_slash'|'bite_lunge'} AnimKind */

const SKILL_ANIM_BY_ID = {
  dirty_bite: { animKind: 'bite_lunge', projectileId: 'bite', sfxKey: 'bite' },
  fly_face: { animKind: 'fly_lunge', projectileId: 'flyBug', sfxKey: 'fly' },
  spread_bacteria: { animKind: 'cloud_spread', projectileId: 'bacteria', sfxKey: 'bacteria', sicklyFlash: true },
  dumpster_explosion: { animKind: 'fire_blast', projectileId: 'trash', sfxKey: 'fire' },
  peck_slam: { animKind: 'bite_lunge', projectileId: 'chicken', sfxKey: 'bite' },
  egg_bomb: { animKind: 'egg_bomb', projectileId: 'eggBomb', sfxKey: 'egg' },
  feather_storm: { animKind: 'cloud_spread', projectileId: 'feather', sfxKey: 'fly' },
  screech: { animKind: 'cloud_spread', projectileId: 'speaker', sfxKey: 'roar' },
  hydro_slam: { animKind: 'water_wave', projectileId: 'waterDrop', sfxKey: 'water' },
  cold_splash: { animKind: 'water_wave', projectileId: 'ice', sfxKey: 'water' },
  crush_wave: { animKind: 'water_wave', projectileId: 'waterWave', sfxKey: 'water' },
  stomp_kick: { animKind: 'rush', projectileId: 'shoe', sfxKey: 'fly' },
  mud_splash: { animKind: 'projectile', projectileId: 'poop', sfxKey: 'poop' },
  goblin_rush: { animKind: 'rush', projectileId: 'crocs', sfxKey: 'fly' },
  screen_slap: { animKind: 'bite_lunge', projectileId: 'phone', sfxKey: 'metal' },
  app_crash: { animKind: 'metal_slash', projectileId: 'crash', sfxKey: 'metal' },
  low_battery: { animKind: 'projectile', projectileId: 'battery', sfxKey: 'metal' },
  notification_barrage: { animKind: 'rush', projectileId: 'bell', sfxKey: 'metal' },
  lunch_crunch: { animKind: 'bite_lunge', projectileId: 'bento', sfxKey: 'bite' },
  spicy_noodles: { animKind: 'fire_blast', projectileId: 'noodles', sfxKey: 'fire' },
  snack_storm: { animKind: 'cloud_spread', projectileId: 'popcorn', sfxKey: 'fly' },
  point_strike: { animKind: 'metal_slash', projectileId: 'pencil', sfxKey: 'metal' },
  ink_jet: { animKind: 'water_wave', projectileId: 'pen', sfxKey: 'water' },
  paper_cut: { animKind: 'metal_slash', projectileId: 'paper', sfxKey: 'metal' },
  book_slam: { animKind: 'rush', projectileId: 'homework', sfxKey: 'hit' },
  math_maze: { animKind: 'sparkle', projectileId: 'numbers', sfxKey: 'magic' },
  deadline_panic: { animKind: 'rush', projectileId: 'clock', sfxKey: 'hit' },
  roll_whip: { animKind: 'projectile', projectileId: 'toiletRoll', sfxKey: 'fly' },
  tp_tornado: { animKind: 'cloud_spread', projectileId: 'toiletRoll', sfxKey: 'fly' },
  clog_trap: { animKind: 'water_wave', projectileId: 'toilet', sfxKey: 'water' },
  backpack_bash: { animKind: 'rush', projectileId: 'backpack', sfxKey: 'hit' },
  heavy_books: { animKind: 'projectile', projectileId: 'homework', sfxKey: 'hit' },
  locker_slam: { animKind: 'metal_slash', projectileId: 'locker', sfxKey: 'metal' },
  chomp: { animKind: 'bite_lunge', projectileId: 'dino', sfxKey: 'bite' },
  tail_slam: { animKind: 'fire_blast', projectileId: 'fireBlast', sfxKey: 'fire' },
  roar: { animKind: 'cloud_spread', projectileId: 'stinkCloud', sfxKey: 'roar' },
  wand_tap: { animKind: 'sparkle', projectileId: 'wand', sfxKey: 'magic' },
  spell_burst: { animKind: 'sparkle', projectileId: 'sparkle', sfxKey: 'magic' },
  wifi_blast: { animKind: 'sparkle', projectileId: 'wifi', sfxKey: 'magic' },
  screen_glare: { animKind: 'fire_blast', projectileId: 'lightbulb', sfxKey: 'fire' },
  flush_punch: { animKind: 'bite_lunge', projectileId: 'toilet', sfxKey: 'hit' },
  skibidi_beam: { animKind: 'water_wave', projectileId: 'music', sfxKey: 'water' },
  camera_flash: { animKind: 'sparkle', projectileId: 'camera', sfxKey: 'magic' },
  boba_splash: { animKind: 'water_wave', projectileId: 'bubbleTea', sfxKey: 'water' },
  sugar_rush: { animKind: 'rush', projectileId: 'candy', sfxKey: 'fly' },
  sticky_slime: { animKind: 'water_wave', projectileId: 'slime', sfxKey: 'water' },
  mythic_claw: { animKind: 'bite_lunge', projectileId: 'lightning', sfxKey: 'hit' },
  sixtyseven_blast: { animKind: 'sparkle', projectileId: 'sixtyseven', sfxKey: 'magic' },
  golden_roar: { animKind: 'cloud_spread', projectileId: 'crown', sfxKey: 'roar' },
  hype_wave: { animKind: 'water_wave', projectileId: 'star', sfxKey: 'magic' },
  basic_hit: { animKind: 'bite_lunge', projectileId: 'fist', sfxKey: 'hit' },
  spark: { animKind: 'sparkle', projectileId: 'sparkle', sfxKey: 'magic' },
};

const DEFAULT_META = { animKind: 'projectile', projectileId: 'poop', sfxKey: 'hit' };

/**
 * @param {{ id?: string, name?: string, effectType?: string, emoji?: string }} [skill]
 */
function getSkillAnimMeta(skill) {
  const id = skill?.id ?? '';
  const effectType = skill?.effectType ?? 'normal';
  const name = (skill?.name ?? '').toLowerCase();

  if (SKILL_ANIM_BY_ID[id]) {
    return { ...DEFAULT_META, ...SKILL_ANIM_BY_ID[id] };
  }

  if (name.includes('bite') || name.includes('chomp') || name.includes('peck')) {
    return { animKind: 'bite_lunge', projectileId: 'bite', sfxKey: 'bite' };
  }
  if (name.includes('fly') || name.includes('face')) {
    return { animKind: 'fly_lunge', projectileId: 'flyBug', sfxKey: 'fly' };
  }
  if (name.includes('rush') || name.includes('bash') || name.includes('kick')) {
    return { animKind: 'rush', projectileId: 'slipper', sfxKey: 'fly' };
  }
  if (name.includes('slash') || name.includes('slap') || name.includes('crash')) {
    return { animKind: 'metal_slash', projectileId: 'phone', sfxKey: 'metal' };
  }
  if (name.includes('poop') || name.includes('mud') || name.includes('splat')) {
    return { animKind: 'projectile', projectileId: 'poop', sfxKey: 'poop' };
  }
  if (name.includes('bacteria') || name.includes('poison') || effectType === 'poison') {
    return { animKind: 'cloud_spread', projectileId: 'bacteria', sfxKey: 'bacteria', sicklyFlash: true };
  }
  if (name.includes('storm') || name.includes('tornado') || name.includes('roar')) {
    return { animKind: 'cloud_spread', projectileId: 'stinkCloud', sfxKey: 'roar' };
  }
  if (name.includes('egg')) {
    return { animKind: 'egg_bomb', projectileId: 'eggBomb', sfxKey: 'egg' };
  }
  if (effectType === 'water' || name.includes('splash') || name.includes('wave') || name.includes('hydro')) {
    return { animKind: 'water_wave', projectileId: 'waterWave', sfxKey: 'water' };
  }
  if (effectType === 'fire' || name.includes('fire') || name.includes('spicy')) {
    return { animKind: 'fire_blast', projectileId: 'fireBlast', sfxKey: 'fire' };
  }
  if (effectType === 'magic67' || name.includes('spell') || name.includes('wifi') || name.includes('blast')) {
    return { animKind: 'sparkle', projectileId: 'sparkle', sfxKey: 'magic' };
  }
  if (effectType === 'toiletPaper') {
    return { animKind: 'cloud_spread', projectileId: 'toiletRoll', sfxKey: 'fly' };
  }

  return { ...DEFAULT_META, sfxKey: effectType === 'normal' ? 'hit' : effectType };
}

module.exports = { SKILL_ANIM_BY_ID, getSkillAnimMeta, DEFAULT_META };
