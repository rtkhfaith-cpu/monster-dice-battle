export const WINNER_COINS = 8;
export const LOSER_COINS = 2;
export const DRAW_COINS_EACH = 4;

export const FUNNY_WIN_TITLES = [
  'Toilet Champion',
  'Egg Throwing Master',
  'Fire Breathing Baby',
  "Ah Ma's Favourite",
  "Daddy's Nightmare",
  'Sock Slayer Supreme',
  'Cactus King',
  'Splash Zone Hero',
  'Combo Lord',
  'Dice Goblin',
];

export function pickFunnyWinTitle() {
  return FUNNY_WIN_TITLES[Math.floor(Math.random() * FUNNY_WIN_TITLES.length)];
}

const RARITY_WIN_TITLES = {
  common: ['Scrappy Champ', 'Budget Legend'],
  rare: ['Rare Beast Victory', 'Loot Goblin Crown'],
  epic: ['Epic Throwdown Hero', 'Purple Haze Champ'],
  legendary: ['Legendary Loudmouth', 'Golden Couch King'],
  mythic: ['Mythic Mayhem Master', 'Absolute Chaos Winner'],
};

/** Title biased by winner monster rarity when available */
export function winTitleForRarity(rarity) {
  const pool = RARITY_WIN_TITLES[rarity] ?? FUNNY_WIN_TITLES;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Modest win payout: base 5–10 + small level bonus + tiny random bonus. */
export function coinWinForEnemyLevel(enemyLevel) {
  const lv = Math.max(1, Math.floor(enemyLevel || 1));
  const base = 5 + Math.floor(Math.random() * 6);
  const levelBonus = Math.floor(lv / 2);
  const randomBonus = Math.floor(Math.random() * 4);
  return base + levelBonus + randomBonus;
}

/**
 * @param {'draw'|1|2} winner
 * @param {1|2} perspective — which player’s wallet
 */
export function coinsForBattleOutcome(winner, perspective) {
  if (winner === 'draw') return DRAW_COINS_EACH;
  if (winner === perspective) return WINNER_COINS;
  return LOSER_COINS;
}

/** Household coin jar: both payouts added after a battle. */
export function totalCoinsEarned(winner) {
  if (winner === 'draw') return DRAW_COINS_EACH * 2;
  return WINNER_COINS + LOSER_COINS;
}
