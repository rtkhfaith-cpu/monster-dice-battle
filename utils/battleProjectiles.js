/**
 * Silly battle projectile presets — emoji-based, lightweight.
 */

const { PROJECTILES, getProjectile, getCloudEmojis } = require('./battleProjectilesData');
import { getSkillAnimMeta } from './skillAnimations';

export { PROJECTILES, getProjectile, getCloudEmojis };

const EFFECT_TO_PROJECTILE = {
  fire: 'fireball',
  water: 'waterSpray',
  toiletPaper: 'toiletRoll',
  egg: 'rottenEgg',
  bottle: 'milkBottle',
  cactus: 'cactus',
  smellySocks: 'socks',
  whip: 'slipper',
  roar: 'tissue',
  nag: 'pencil',
  magic67: 'pencil',
};

const MONSTER_POOLS = {
  cockroachsaurus: ['poop', 'toiletRoll', 'stinkCloud'],
  chickenzilla: ['rottenEgg', 'feather', 'milkBottle'],
  water_bottle_beast: ['milkBottle', 'waterSpray'],
  toilet_paper_ninja: ['toiletRoll', 'tissue'],
  pencil_shark: ['pencil', 'waterSpray'],
  lunchbox_dragon: ['burger', 'rottenEgg'],
  homework_troll: ['homework', 'pencil'],
  iphone_warrior: ['phone', 'slipper'],
  crocs_goblin: ['crocs', 'slipper'],
  schoolbag_golem: ['homework', 'socks'],
  bubble_tea_slime: ['bubbleTea', 'waterSpray'],
  t_rex: ['burger', 'fireball'],
  skibidi_bot: ['toiletRoll', 'poop'],
};

const FALLBACK_POOL = ['poop', 'slipper', 'rottenEgg', 'socks', 'pencil'];

/**
 * Pick a projectile style from move effect + attacker monster.
 */
export function pickProjectile({ templateId, effectType, projectileId }) {
  if (projectileId && PROJECTILES[projectileId]) return projectileId;

  const fromEffect = EFFECT_TO_PROJECTILE[effectType];
  if (fromEffect && PROJECTILES[fromEffect]) return fromEffect;

  const pool = MONSTER_POOLS[templateId] || FALLBACK_POOL;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return PROJECTILES[pick] ? pick : 'poop';
}

/**
 * Resolve full attack VFX payload fields for battle screens.
 */
export function resolveAttackVisuals(skill, { templateId } = {}) {
  const meta = getSkillAnimMeta(skill);
  const projectileId = pickProjectile({
    templateId,
    effectType: skill?.effectType ?? 'normal',
    projectileId: meta.projectileId,
  });
  const projectile = getProjectile(projectileId);
  const skillEmoji = skill?.emoji;
  return {
    animKind: meta.animKind,
    sfxKey: meta.sfxKey,
    sicklyFlash: !!meta.sicklyFlash,
    projectileId,
    skillEmoji,
    displayEmoji: skillEmoji || projectile.emoji,
    cloudEmojis: getCloudEmojis(skillEmoji, projectile),
    splatEmoji: projectile.splat || skillEmoji || '💥',
  };
}
