/**
 * Pet catalog — 15 starter pets (5 rare, 5 epic, 5 mythic).
 */

import { PET_SKILL_LABELS } from './petSkills';

/** @typedef {'rare'|'epic'|'mythic'} PetRarity */

const RARITY_BASE = {
  rare: { hp: 10, atk: 3, def: 2, spd: 1, growth: { hp: 1.2, atk: 0.35, def: 0.25, spd: 0.08 } },
  epic: { hp: 15, atk: 4, def: 3, spd: 2, growth: { hp: 1.6, atk: 0.45, def: 0.32, spd: 0.1 } },
  mythic: { hp: 22, atk: 6, def: 4, spd: 3, growth: { hp: 2.2, atk: 0.6, def: 0.42, spd: 0.14 } },
};

/** @type {Record<string, { id: string, name: string, emoji: string, rarity: PetRarity, skills: string[], shopPrice?: number|null }>} */
export const PET_CATALOG = {
  lucky_pup: { id: 'lucky_pup', name: 'Lucky Pup', emoji: '🐶', rarity: 'rare', skills: ['heal'], shopPrice: 600 },
  moon_cat: { id: 'moon_cat', name: 'Moon Cat', emoji: '🐱', rarity: 'rare', skills: ['dodge_boost'], shopPrice: 600 },
  tiny_chick: { id: 'tiny_chick', name: 'Tiny Chick', emoji: '🐥', rarity: 'rare', skills: ['lucky_coins'], shopPrice: 600 },
  shell_buddy: { id: 'shell_buddy', name: 'Shell Buddy', emoji: '🐢', rarity: 'rare', skills: ['shield'], shopPrice: 600 },
  bounce_bunny: { id: 'bounce_bunny', name: 'Bounce Bunny', emoji: '🐰', rarity: 'rare', skills: ['energy_gain'], shopPrice: 600 },

  ember_fox: { id: 'ember_fox', name: 'Ember Fox', emoji: '🦊', rarity: 'epic', skills: ['fire_aura'], shopPrice: 2500 },
  frost_wolf: { id: 'frost_wolf', name: 'Frost Wolf', emoji: '🐺', rarity: 'epic', skills: ['crit_boost'], shopPrice: 2500 },
  bamboo_guard: { id: 'bamboo_guard', name: 'Bamboo Guard', emoji: '🐼', rarity: 'epic', skills: ['shield'], shopPrice: 2500 },
  ice_penguin: { id: 'ice_penguin', name: 'Ice Penguin', emoji: '🐧', rarity: 'epic', skills: ['cleanse'], shopPrice: 2500 },
  trick_monkey: { id: 'trick_monkey', name: 'Trick Monkey', emoji: '🐵', rarity: 'epic', skills: ['counter_spark'], shopPrice: 2500 },

  dragon_wisp: { id: 'dragon_wisp', name: 'Dragon Wisp', emoji: '🐉', rarity: 'mythic', skills: ['fire_aura', 'crit_boost'], shopPrice: null },
  star_unicorn: { id: 'star_unicorn', name: 'Star Unicorn', emoji: '🦄', rarity: 'mythic', skills: ['heal', 'cleanse'], shopPrice: null },
  solar_lion: { id: 'solar_lion', name: 'Solar Lion', emoji: '🦁', rarity: 'mythic', skills: ['shield', 'lucky_coins'], shopPrice: null },
  thunder_eagle: { id: 'thunder_eagle', name: 'Thunder Eagle', emoji: '🦅', rarity: 'mythic', skills: ['energy_gain', 'dodge_boost'], shopPrice: null },
  shadow_drake: { id: 'shadow_drake', name: 'Shadow Drake', emoji: '🐲', rarity: 'mythic', skills: ['poison_bite', 'counter_spark'], shopPrice: null },
};

export const MYTHIC_PET_IDS = Object.values(PET_CATALOG)
  .filter((p) => p.rarity === 'mythic')
  .map((p) => p.id);

export const PET_SHOP_IDS = Object.values(PET_CATALOG)
  .filter((p) => typeof p.shopPrice === 'number')
  .map((p) => p.id);

export function getPetDef(petId) {
  return PET_CATALOG[petId] ?? null;
}

export function getPetBaseStats(rarity) {
  const r = RARITY_BASE[rarity] ?? RARITY_BASE.rare;
  return { hp: r.hp, atk: r.atk, def: r.def, spd: r.spd, growth: { ...r.growth } };
}

/**
 * Pet stats at level — level affects stats only, not skill power.
 * @param {{ rarity: PetRarity, level?: number }} params
 */
export function calculatePetStats({ rarity, level = 1 }) {
  const base = getPetBaseStats(rarity);
  const lv = Math.max(1, Math.min(60, Math.floor(level)));
  const steps = lv - 1;
  return {
    hp: Math.round(base.hp + base.growth.hp * steps),
    atk: Math.round(base.atk + base.growth.atk * steps),
    def: Math.round(base.def + base.growth.def * steps),
    spd: Math.round(base.spd + base.growth.spd * steps),
  };
}

/** Display label for skill list */
export function formatPetSkillList(petId) {
  const def = getPetDef(petId);
  if (!def) return '';
  return def.skills.map((s) => PET_SKILL_LABELS[s] || s).join(' · ');
}
