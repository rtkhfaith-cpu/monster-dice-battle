/**
 * Projectile emoji presets — shared by client bundle and Node server.
 */

const PROJECTILES = {
  poop: { emoji: '💩', splat: '💥', spin: true },
  milkBottle: { emoji: '🍼', splat: '💦' },
  toiletRoll: { emoji: '🧻', splat: '✨' },
  slipper: { emoji: '🩴', splat: '💢' },
  rottenEgg: { emoji: '🥚', splat: '🍳' },
  eggBomb: { emoji: '🥚', splat: '🍳', crack: '🥚💥', spin: true },
  socks: { emoji: '🧦', splat: '💨' },
  waterSpray: { emoji: '💦', splat: '💧' },
  waterWave: { emoji: '🌊', splat: '💧', wide: true },
  waterDrop: { emoji: '💧', splat: '💧' },
  ice: { emoji: '❄️', splat: '💧' },
  cactus: { emoji: '🌵', splat: '🌵' },
  burger: { emoji: '🍔', splat: '💥' },
  pencil: { emoji: '✏️', splat: '✨', spin: true },
  tissue: { emoji: '🧻', splat: '✨' },
  feather: { emoji: '🪶', splat: '✨' },
  stinkCloud: { emoji: '💨', splat: '☁️' },
  fireball: { emoji: '🔥', splat: '💥' },
  fireBlast: { emoji: '🔥', splat: '💥', trail: true },
  bacteria: { emoji: '🦠', splat: '☁️', cloud: true },
  flyBug: { emoji: '🪰', splat: '💥' },
  bite: { emoji: '🦷', splat: '💢', spin: false },
  phone: { emoji: '📱', splat: '⚡' },
  crocs: { emoji: '🐊', splat: '💢' },
  homework: { emoji: '📚', splat: '📄' },
  bubbleTea: { emoji: '🧋', splat: '💦' },
  trash: { emoji: '🗑️', splat: '💥', trail: true },
  chicken: { emoji: '🐔', splat: '💢' },
  speaker: { emoji: '📢', splat: '☁️', cloud: true },
  shoe: { emoji: '👟', splat: '💢' },
  bento: { emoji: '🍱', splat: '💥' },
  noodles: { emoji: '🍜', splat: '🔥', trail: true },
  popcorn: { emoji: '🍿', splat: '✨', cloud: true },
  pen: { emoji: '🖊️', splat: '💧' },
  paper: { emoji: '📄', splat: '✨', spin: true },
  numbers: { emoji: '🔢', splat: '✨', spin: true },
  clock: { emoji: '⏰', splat: '💥' },
  toilet: { emoji: '🚽', splat: '💧' },
  backpack: { emoji: '🎒', splat: '💢' },
  locker: { emoji: '🔐', splat: '⚡' },
  dino: { emoji: '🦖', splat: '💢' },
  wand: { emoji: '🪄', splat: '✨', spin: true },
  sparkle: { emoji: '✨', splat: '✨', spin: true },
  wifi: { emoji: '📶', splat: '✨' },
  lightbulb: { emoji: '💡', splat: '🔥', trail: true },
  music: { emoji: '🎵', splat: '💧', wide: true },
  camera: { emoji: '📸', splat: '✨' },
  candy: { emoji: '🍬', splat: '✨' },
  slime: { emoji: '🫧', splat: '💧' },
  lightning: { emoji: '⚡', splat: '💥' },
  sixtyseven: { emoji: '6️⃣', splat: '7️⃣', spin: true },
  crown: { emoji: '👑', splat: '☁️', cloud: true },
  goldBrick: { emoji: '🧱', splat: '✨', spin: true },
  briefcase: { emoji: '💼', splat: '💢' },
  moneyBag: { emoji: '💰', splat: '☁️', cloud: true },
  star: { emoji: '🌟', splat: '✨', wide: true },
  fist: { emoji: '👊', splat: '💢' },
  crash: { emoji: '💥', splat: '⚡' },
  battery: { emoji: '🔋', splat: '⚡' },
  bell: { emoji: '🔔', splat: '⚡' },
};

function getProjectile(id) {
  return PROJECTILES[id] ?? PROJECTILES.poop;
}

function getCloudEmojis(skillEmoji, projectile) {
  const primary = skillEmoji || projectile.emoji;
  const secondary = projectile.emoji !== primary ? projectile.emoji : '☁️';
  const tertiary =
    projectile.splat && projectile.splat !== primary && projectile.splat !== secondary
      ? projectile.splat
      : '✨';
  return [primary, secondary, tertiary];
}

module.exports = { PROJECTILES, getProjectile, getCloudEmojis };
