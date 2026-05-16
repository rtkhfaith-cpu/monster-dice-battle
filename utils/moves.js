export const normalMoves = [
  { name: 'Blow Fire', emoji: '🔥', effectType: 'fire' },
  { name: 'Spray Water', emoji: '💦', effectType: 'water' },
  { name: 'Throw Toilet Paper', emoji: '🧻', effectType: 'toiletPaper' },
  { name: 'Throw Eggs', emoji: '🥚', effectType: 'egg' },
  { name: 'Kick Water Bottles', emoji: '🍼', effectType: 'bottle' },
  { name: 'Throw Cactus', emoji: '🌵', effectType: 'cactus' },
];

export const magicMoves = [
  { name: '67 Magic Attack', emoji: '67', effectType: 'magic67' },
  { name: "Mummy's Whip", emoji: '〰️', effectType: 'whip' },
  { name: "Daddy's Roar", emoji: '🗣️', effectType: 'roar' },
  { name: "Ah Ma's Nag", emoji: '💬', effectType: 'nag' },
  { name: "Kor Kor's Smelly Socks", emoji: '🧦', effectType: 'smellySocks' },
];

export function pickRandomNormal() {
  return normalMoves[Math.floor(Math.random() * normalMoves.length)];
}

export function pickRandomMagic() {
  return magicMoves[Math.floor(Math.random() * magicMoves.length)];
}
