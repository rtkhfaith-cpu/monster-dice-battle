/**
 * Ladder-exclusive gear — NOT in GEAR_CATALOG / Gear Mart.
 */

/** @type {Array<{ id: string, name: string, rarity: string, slot: string, emoji: string, bonuses: object, effects?: object[] }>} */
export const LADDER_GEAR_CATALOG = [
  { id: 'glitch_core', name: 'Glitch Core', rarity: 'mythic', slot: 'core', emoji: '💠', bonuses: { magicMin: 3, magicMax: 3, critPct: 2 }, effects: [{ type: 'magicDamagePct', value: 20 }, { type: 'repeatMagicChance', value: 5 }] },
  { id: 'toilet_lid_aegis', name: 'Toilet Lid Aegis', rarity: 'epic', slot: 'shield', emoji: '🚽', bonuses: { defMin: 2, defMax: 3, hp: 10 }, effects: [{ type: 'firstHitReduction', value: 50 }] },
  { id: 'sauce_cannon', name: 'Sauce Cannon', rarity: 'rare', slot: 'weapon', emoji: '🔫', bonuses: { attackMin: 2, attackMax: 2, magicMin: 1 }, effects: [{ type: 'elementBoost', element: 'fire', value: 15 }] },
  { id: 'pearl_launcher', name: 'Pearl Launcher', rarity: 'legendary', slot: 'weapon', emoji: '🧋', bonuses: { magicMin: 2, magicMax: 3 }, effects: [{ type: 'multiHitMagic', hits: 3, ratio: 0.45 }] },
  { id: 'lag_cloak', name: 'Lag Cloak', rarity: 'epic', slot: 'cloak', emoji: '🧥', bonuses: { dodgePct: 4, magicDefMin: 1 }, effects: [{ type: 'enemyMissMagicChance', value: 15 }] },
  { id: 'durian_helm', name: 'Durian Helm', rarity: 'rare', slot: 'helmet', emoji: '🥭', bonuses: { hp: 12, defMin: 1 }, effects: [{ type: 'thornDamage', value: 8 }] },
  { id: 'signal_booster', name: 'Signal Booster', rarity: 'rare', slot: 'tech', emoji: '📶', bonuses: { mp: 8, critPct: 2, magicMin: 1 }, effects: [{ type: 'magicCritPct', value: 10 }] },
  { id: 'fizzy_tank', name: 'Fizzy Tank', rarity: 'common', slot: 'body', emoji: '🥤', bonuses: { mp: 10, hp: 4 }, effects: [{ type: 'skillMpDiscount', elements: ['water'], value: 1 }] },
  { id: 'plug_fang', name: 'Plug Fang', rarity: 'common', slot: 'weapon', emoji: '🔌', bonuses: { attackMin: 1, attackMax: 2 }, effects: [{ type: 'elementBoost', element: 'metal', value: 10 }, { type: 'stunChance', value: 8 }] },
  { id: 'rewrite_halo', name: 'Rewrite Halo', rarity: 'mythic', slot: 'head', emoji: '😇', bonuses: { hp: 15, magicDefMax: 2 }, effects: [{ type: 'fatalSurvivalOnce', value: 1 }] },
  { id: 'trash_can_armor', name: 'Trash Can Armor', rarity: 'rare', slot: 'body', emoji: '🗑️', bonuses: { defMin: 2, defMax: 2, hp: 8 }, effects: [{ type: 'counterChance', value: 12 }] },
  { id: 'cheese_cape', name: 'Cheese Cape', rarity: 'common', slot: 'cloak', emoji: '🧀', bonuses: { hp: 10 }, effects: [{ type: 'resist', element: 'fire', value: 5 }] },
  { id: 'rain_charm', name: 'Rain Charm', rarity: 'rare', slot: 'charm', emoji: '🌧️', bonuses: { mp: 6, magicMin: 1 }, effects: [{ type: 'waterSkillHeal', value: 6 }] },
  { id: 'ctrl_alt_shield', name: 'Ctrl-Alt Shield', rarity: 'epic', slot: 'shield', emoji: '🛡️', bonuses: { magicDefMin: 2, magicDefMax: 2 }, effects: [{ type: 'blockDebuffOnce', value: 1 }] },
  { id: 'spicy_broth_orb', name: 'Spicy Broth Orb', rarity: 'legendary', slot: 'core', emoji: '🍜', bonuses: { magicMin: 2, magicMax: 2 }, effects: [{ type: 'dotDamagePct', value: 25 }] },
  { id: 'sneaker_soles', name: 'Sneaker Soles', rarity: 'rare', slot: 'shoes', emoji: '👟', bonuses: { dodgePct: 5, attackMin: 1 }, effects: [{ type: 'firstActionBonus', value: 1 }] },
  { id: 'battery_pack', name: 'Battery Pack', rarity: 'common', slot: 'tech', emoji: '🔋', bonuses: { mp: 12 }, effects: [] },
  { id: 'viral_beads', name: 'Viral Beads', rarity: 'epic', slot: 'charm', emoji: '📿', bonuses: { mp: 6, critPct: 1 }, effects: [{ type: 'buffDurationBonus', value: 1 }] },
  { id: 'sprinkle_crown', name: 'Sprinkle Crown', rarity: 'rare', slot: 'helmet', emoji: '👑', bonuses: { hp: 14, defMax: 1 }, effects: [{ type: 'freezeResist', value: 20 }] },
  { id: 'microwave_plate', name: 'Microwave Plate', rarity: 'legendary', slot: 'core', emoji: '🍽️', bonuses: { magicMin: 2, magicMax: 3, attackMin: 1 }, effects: [{ type: 'chargePerTurn', value: 8 }] },
  { id: 'safety_cone_vest', name: 'Safety Cone Vest', rarity: 'common', slot: 'body', emoji: '🚧', bonuses: { defMin: 2, defMax: 2, hp: 6 }, effects: [] },
  { id: 'bubblewrap_boots', name: 'Bubblewrap Boots', rarity: 'common', slot: 'shoes', emoji: '🫧', bonuses: { defMin: 1, hp: 8 }, effects: [{ type: 'firstPhysicalReduction', value: 25 }] },
  { id: 'drone_propeller', name: 'Drone Propeller', rarity: 'rare', slot: 'back', emoji: '🛸', bonuses: { magicMin: 2, magicMax: 1, attackMax: 1 }, effects: [{ type: 'rangedMagicPct', value: 12 }] },
  { id: 'blackout_ears', name: 'Blackout Ears', rarity: 'epic', slot: 'head', emoji: '🐰', bonuses: { magicMin: 2, critPct: 2 }, effects: [{ type: 'silenceChance', value: 18 }] },
  { id: 'core_feed_crown', name: 'Core Feed Crown', rarity: 'mythic', slot: 'crown', emoji: '👑', bonuses: { magicMin: 3, magicMax: 3, critPct: 3 }, effects: [{ type: 'magicDamagePct', value: 15 }, { type: 'bossDamagePct', value: 20 }] },
];

/** @type {Record<string, typeof LADDER_GEAR_CATALOG[0]>} */
export const LADDER_GEAR_BY_ID = Object.fromEntries(LADDER_GEAR_CATALOG.map((g) => [g.id, g]));

export function getLadderGear(id) {
  return LADDER_GEAR_BY_ID[id] ?? null;
}

export function getLadderGearByRarity(rarity) {
  return LADDER_GEAR_CATALOG.filter((g) => g.rarity === rarity);
}
