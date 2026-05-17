export const ROLE_GROWTH = {
  tank: { hp: 8, mp: 2, attack: 2, defense: 4, magic: 1, speed: 1 },
  attacker: { hp: 5, mp: 2, attack: 4, defense: 2, magic: 2, speed: 2 },
  brawler: { hp: 5, mp: 2, attack: 4, defense: 2, magic: 2, speed: 2 },
  mage: { hp: 4, mp: 5, attack: 1, defense: 1, magic: 4, speed: 2 },
  speedster: { hp: 4, mp: 3, attack: 3, defense: 1, magic: 2, speed: 4 },
  support: { hp: 5, mp: 4, attack: 2, defense: 2, magic: 3, speed: 2 },
  debuffer: { hp: 5, mp: 4, attack: 2, defense: 2, magic: 3, speed: 3 },
  trickster: { hp: 5, mp: 4, attack: 2, defense: 2, magic: 3, speed: 3 },
  balanced: { hp: 5, mp: 3, attack: 3, defense: 2, magic: 3, speed: 2 },
  mythic: { hp: 6, mp: 4, attack: 3, defense: 3, magic: 4, speed: 3 },
  tank_mage: { hp: 7, mp: 4, attack: 2, defense: 4, magic: 3, speed: 1 },
};

export const ROLE_BASE_SPEED = {
  tank: 8,
  brawler: 11,
  attacker: 12,
  mage: 10,
  speedster: 16,
  support: 11,
  debuffer: 12,
  trickster: 14,
  balanced: 12,
  mythic: 13,
  tank_mage: 9,
};

export function growthForRole(role) {
  return ROLE_GROWTH[role] ?? ROLE_GROWTH.balanced;
}

export function baseSpeedForRole(role) {
  return ROLE_BASE_SPEED[role] ?? ROLE_BASE_SPEED.balanced;
}
