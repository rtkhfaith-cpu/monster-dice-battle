/**
 * Passive skill book drop tables for chests and lucky spin.
 */
import { PASSIVE_SKILL_IDS, PASSIVE_SKILLS } from './passiveSkills';

const BOOK_RARITY_WEIGHTS = {
  miniBoss: { rare: 50, epic: 25, legendary: 15, mythic: 10 },
  boss: { rare: 50, epic: 25, legendary: 15, mythic: 10 },
  item: { rare: 55, epic: 30, legendary: 10, mythic: 5 },
};

/** Chest content band weights (must sum ~100). */
export const CHEST_CONTENT_WEIGHTS = {
  miniBoss: { gear: 70, skillBook: 25, bonus: 5 },
  boss: { monster: 50, skillBook: 35, gear: 10, bonus: 5 },
  item: { gear: 80, skillBook: 15, bonus: 5 },
};

export const LUCKY_SPIN_SKILL_BOOK_WEIGHTS = {
  rare: 10,
  epic: 4,
  legendary: 1,
  mythic: 0.2,
};

function rollWeighted(weights) {
  const entries = Object.entries(weights).filter(([, w]) => w > 0);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [key, w] of entries) {
    r -= w;
    if (r <= 0) return key;
  }
  return entries[entries.length - 1]?.[0] ?? 'rare';
}

/** @param {'miniBoss'|'boss'|'item'} chestKind */
export function rollPassiveBookRarity(chestKind) {
  const table = BOOK_RARITY_WEIGHTS[chestKind] || BOOK_RARITY_WEIGHTS.item;
  return rollWeighted(table);
}

/** @param {'miniBoss'|'boss'|'item'} chestKind */
export function rollChestContentBand(chestKind) {
  const w = CHEST_CONTENT_WEIGHTS[chestKind] || CHEST_CONTENT_WEIGHTS.item;
  return rollWeighted(w);
}

/** @returns {PassiveBookRarity} */
export function rollLuckySpinSkillBookRarity() {
  const r = Math.random() * 100;
  if (r < LUCKY_SPIN_SKILL_BOOK_WEIGHTS.mythic) return 'mythic';
  if (r < LUCKY_SPIN_SKILL_BOOK_WEIGHTS.mythic + LUCKY_SPIN_SKILL_BOOK_WEIGHTS.legendary) return 'legendary';
  if (r < LUCKY_SPIN_SKILL_BOOK_WEIGHTS.mythic + LUCKY_SPIN_SKILL_BOOK_WEIGHTS.legendary + LUCKY_SPIN_SKILL_BOOK_WEIGHTS.epic) {
    return 'epic';
  }
  if (r < LUCKY_SPIN_SKILL_BOOK_WEIGHTS.rare + LUCKY_SPIN_SKILL_BOOK_WEIGHTS.epic + LUCKY_SPIN_SKILL_BOOK_WEIGHTS.legendary + LUCKY_SPIN_SKILL_BOOK_WEIGHTS.mythic) {
    return 'rare';
  }
  return null;
}

/** Pick random skill id from catalog. */
export function rollRandomPassiveSkillId(skillIds) {
  if (!skillIds?.length) return null;
  return skillIds[Math.floor(Math.random() * skillIds.length)];
}

export function allPassiveSkillIds() {
  return Object.keys(PASSIVE_SKILLS);
}

export { PASSIVE_SKILL_IDS };
