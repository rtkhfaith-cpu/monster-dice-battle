/**
 * Gear drop rolls for chests, ladder, quest, daily spin, mini-boss.
 */
import { GEAR_DROP_TABLES } from './gearConstants';
import { generateRandomGearInstance } from './gearGenerator';
import { addGearToInventory } from './inventoryGearUtils';

function rollRarity(table) {
  const roll = Math.random() * 100;
  let cumulative = 0;
  const order = ['mythic', 'epic', 'rare'];
  for (const rarity of order) {
    cumulative += table[rarity] ?? 0;
    if (roll < cumulative) return rarity;
  }
  return null;
}

/**
 * @param {'miniBoss'|'ladder'|'quest'|'dailySpin'} source
 * @returns {'rare'|'epic'|'mythic'|null}
 */
export function rollGearDropRarity(source) {
  const table = GEAR_DROP_TABLES[source];
  if (!table) return null;
  const total = (table.rare ?? 0) + (table.epic ?? 0) + (table.mythic ?? 0);
  if (total <= 0 || Math.random() * 100 >= total) return null;
  return rollRarity(table);
}

/**
 * Grant gear drop to profile.
 * @returns {{ ok: boolean, gear?: object, rarity?: string, error?: string }}
 */
/** Roll rarity from table weights only (no “empty roll” gate). */
export function rollGearRarityFromTable(source) {
  const table = GEAR_DROP_TABLES[source];
  if (!table) return 'rare';
  const order = ['rare', 'epic', 'mythic'];
  const total = order.reduce((s, r) => s + (table[r] ?? 0), 0);
  if (total <= 0) return 'rare';
  let roll = Math.random() * total;
  for (const rarity of order) {
    roll -= table[rarity] ?? 0;
    if (roll <= 0) return rarity;
  }
  return 'rare';
}

export function grantGearDrop(profile, source, opts = {}) {
  const rarity = opts.guaranteed
    ? rollGearRarityFromTable(source)
    : rollGearDropRarity(source);
  if (!rarity) return { ok: false, skipped: true };
  const instance = generateRandomGearInstance(rarity);
  if (!instance) return { ok: false, error: 'Failed to generate gear' };
  const res = addGearToInventory(profile, instance);
  if (!res.ok) return res;
  return {
    ok: true,
    gear: res.gear,
    rarity,
    kind: 'gear_instance',
    label: `${rarity} ${instance.name}`,
  };
}

export function formatGearRewardMessage(gear) {
  if (!gear) return 'Gear acquired!';
  const lines = (gear.stats || []).map((s) => `+${s.value} ${s.type}`).join(', ');
  const sockets = gear.sockets?.length ? `\nSockets: ${gear.sockets.length}` : '';
  return `${gear.rarity} ${gear.name}\n${lines}${sockets}`;
}
