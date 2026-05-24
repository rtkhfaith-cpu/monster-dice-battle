/**
 * Monster Gear — stat / element / fun items with indexed slot equipping.
 */

import { getTemplateElement } from './elements';
import {
  compactGearIds,
  equipToFirstEmptySlot,
  normalizeEquippedSlots,
  setGearAtSlot,
} from './gearSlots';
import { getLadderGear } from './monsterLadder/ladderGearCatalog';

/** @typedef {'stat'|'element'|'fun'} GearCategory */

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   price: number,
 *   emoji: string,
 *   category: GearCategory,
 *   bonuses: {
 *     hp?: number,
 *     mp?: number,
 *     attackMin?: number,
 *     attackMax?: number,
 *     magicMin?: number,
 *     magicMax?: number,
 *     defMin?: number,
 *     defMax?: number,
 *     magicDefMin?: number,
 *     magicDefMax?: number,
 *     critPct?: number,
 *     dodgePct?: number,
 *     hitRate?: number,
 *     agility?: number,
 *     expPct?: number,
 *   },
 *   element?: string,
 *   elementMode?: 'override'|'enhance',
 * }} GearDef
 */

/**
 * Gear bonus numbers map to battle % via gearStats (hp/mp = %, atk/def min+max → %, crit/dodge = flat points).
 * Tuned for battleMpPool (~30–92 MP): MP items use 10–15 so one extra cast matters.
 */
/** @type {GearDef[]} */
export const GEAR_CATALOG = [
  // —— Stat gear (best-in-slot for raw stats) ——
  { id: 'crown', name: 'Royal Crown', price: 50, emoji: '👑', category: 'stat', bonuses: { hp: 8, defMax: 1 } },
  { id: 'wizard', name: 'Wizard Hat', price: 60, emoji: '🧙', category: 'stat', bonuses: { mp: 12, magicMin: 1, magicMax: 1 } },
  { id: 'sunglasses', name: 'Cool Shades', price: 40, emoji: '🕶️', category: 'stat', bonuses: { critPct: 3, dodgePct: 1 } },
  { id: 'cape', name: 'Hero Cape', price: 45, emoji: '🦸', category: 'stat', bonuses: { hp: 6, defMin: 1, defMax: 1 } },
  { id: 'boxing', name: 'Boxing Gloves', price: 55, emoji: '🥊', category: 'stat', bonuses: { attackMin: 2, attackMax: 2 } },
  { id: 'sockNecklace', name: 'Sock Necklace', price: 30, emoji: '🧿', category: 'stat', bonuses: { critPct: 2, expPct: 8 } },
  { id: 'hpCharm', name: 'HP Charm', price: 42, emoji: '❤️', category: 'stat', bonuses: { hp: 10 } },
  { id: 'mpOrb', name: 'MP Orb', price: 48, emoji: '🔮', category: 'stat', bonuses: { mp: 15 } },
  { id: 'powerBand', name: 'Power Band', price: 52, emoji: '💪', category: 'stat', bonuses: { attackMin: 2, attackMax: 2 } },
  { id: 'guardBadge', name: 'Guard Badge', price: 50, emoji: '🛡️', category: 'stat', bonuses: { defMin: 2, defMax: 2, magicDefMin: 1 } },
  // —— Element gear (override = element swap; stats slightly below pure BIS) ——
  { id: 'fireAura', name: 'Fire Aura', price: 80, emoji: '🔥', category: 'element', bonuses: { attackMin: 1, attackMax: 1, magicMin: 1 }, element: 'fire', elementMode: 'enhance' },
  { id: 'fireCore', name: 'Fire Core', price: 90, emoji: '🔥', category: 'element', bonuses: { mp: 10, magicMin: 2, magicMax: 1 }, element: 'fire', elementMode: 'override' },
  { id: 'waterShell', name: 'Water Shell', price: 85, emoji: '💧', category: 'element', bonuses: { hp: 10, magicDefMin: 1, magicDefMax: 1 }, element: 'water', elementMode: 'override' },
  { id: 'metalPlate', name: 'Metal Plate', price: 95, emoji: '⚙️', category: 'element', bonuses: { defMin: 2, defMax: 2, hp: 5 }, element: 'metal', elementMode: 'override' },
  { id: 'woodCharm', name: 'Wood Charm', price: 70, emoji: '🌿', category: 'element', bonuses: { hp: 6, mp: 10 }, element: 'wood', elementMode: 'enhance' },
  { id: 'earthRune', name: 'Earth Rune', price: 75, emoji: '🪨', category: 'element', bonuses: { defMin: 2, defMax: 1, hp: 6 }, element: 'earth', elementMode: 'enhance' },
  // —— Fun / meme (niche picks — not full BIS, but usable) ——
  { id: 'tpCape', name: 'TP Cape', price: 35, emoji: '🧻', category: 'fun', bonuses: { hp: 4, dodgePct: 2 } },
  { id: 'toiletLid', name: 'Toilet Lid Shield', price: 38, emoji: '🚽', category: 'fun', bonuses: { defMin: 2, defMax: 2, hp: 3 } },
  { id: 'slippers', name: 'Slippers of Speed', price: 44, emoji: '🩴', category: 'fun', bonuses: { dodgePct: 3, agility: 2 } },
  { id: 'durianHelm', name: 'Durian Helmet', price: 46, emoji: '🥭', category: 'fun', bonuses: { hp: 5, attackMin: 1, attackMax: 1 } },
  { id: 'smellySocks', name: 'Smelly Socks', price: 32, emoji: '🧦', category: 'fun', bonuses: { attackMin: 2, critPct: 1 } },
  { id: 'rubberDuck', name: 'Lucky Rubber Duck', price: 28, emoji: '🦆', category: 'fun', bonuses: { expPct: 10, mp: 6 } },
];

export const GEAR_CATEGORY_LABELS = {
  stat: 'Stat',
  element: 'Element',
  fun: 'Fun',
};

/** @deprecated */
export const GEAR_SLOT_LABELS = GEAR_CATEGORY_LABELS;

export function getGear(id) {
  const normalGear = GEAR_CATALOG.find((g) => g.id === id);
  if (normalGear) return normalGear;
  const ladderGear = getLadderGear(id);
  if (!ladderGear) return null;
  return {
    ...ladderGear,
    category: ladderGear.category ?? 'ladder',
    price: ladderGear.price ?? 0,
    emoji: ladderGear.emoji ?? '✨',
    ladderExclusive: true,
  };
}

/** Sum bonuses from equipped gear ids (compact list) */
export function sumGearBonuses(gearIds) {
  const out = {
    hp: 0,
    mp: 0,
    attackMin: 0,
    attackMax: 0,
    magicMin: 0,
    magicMax: 0,
    defMin: 0,
    defMax: 0,
    magicDefMin: 0,
    magicDefMax: 0,
    critPct: 0,
    dodgePct: 0,
    hitRate: 0,
    agility: 0,
    expPct: 0,
  };
  const ids = compactGearIds(gearIds);
  for (const id of ids) {
    const g = getGear(id);
    if (!g?.bonuses) continue;
    const b = g.bonuses;
    out.hp += b.hp ?? 0;
    out.mp += b.mp ?? 0;
    out.attackMin += b.attackMin ?? 0;
    out.attackMax += b.attackMax ?? 0;
    out.magicMin += b.magicMin ?? 0;
    out.magicMax += b.magicMax ?? 0;
    out.defMin += b.defMin ?? 0;
    out.defMax += b.defMax ?? 0;
    out.magicDefMin += b.magicDefMin ?? 0;
    out.magicDefMax += b.magicDefMax ?? 0;
    out.critPct += b.critPct ?? 0;
    out.dodgePct += b.dodgePct ?? 0;
    out.hitRate += b.hitRate ?? 0;
    out.agility += b.agility ?? 0;
    out.expPct += b.expPct ?? 0;
  }
  return out;
}

export function formatGearBonusLines(gearDef) {
  if (!gearDef?.bonuses) return [];
  const b = gearDef.bonuses;
  const lines = [];
  if (b.hp) lines.push(`+${Math.min(25, b.hp)}% HP`);
  if (b.mp) lines.push(`+${Math.min(25, b.mp)}% MP`);
  if (b.attackMin || b.attackMax) {
    lines.push(`+${Math.min(20, ((b.attackMin || 0) + (b.attackMax || 0)) * 2)}% Attack`);
  }
  if (b.magicMin || b.magicMax) lines.push(`+${Math.min(20, ((b.magicMin || 0) + (b.magicMax || 0)) * 2)}% Magic`);
  if (b.defMin || b.defMax) lines.push(`+${Math.min(20, ((b.defMin || 0) + (b.defMax || 0)) * 2)}% Defense`);
  if (b.magicDefMin || b.magicDefMax) lines.push(`+${Math.min(20, ((b.magicDefMin || 0) + (b.magicDefMax || 0)) * 2)}% Magic Def`);
  if (b.critPct) lines.push(`+${b.critPct}% Crit`);
  if (b.hitRate) lines.push(`+${b.hitRate}% Hit`);
  if (b.agility) lines.push(`+${b.agility} Agility`);
  if (b.dodgePct) lines.push(`+${Math.min(25, b.dodgePct * 2)}% Speed`);
  if (b.expPct) lines.push(`+${b.expPct}% EXP`);
  if (gearDef.element) {
    const mode = gearDef.elementMode === 'override' ? 'becomes' : 'boosts';
    lines.push(`${gearDef.element.charAt(0).toUpperCase() + gearDef.element.slice(1)} (${mode})`);
  }
  return lines;
}

export function resolveFighterElement(templateId, gearIds) {
  let element = getTemplateElement(templateId);
  for (const id of compactGearIds(gearIds)) {
    const g = getGear(id);
    if (!g?.element) continue;
    if (g.elementMode === 'override') element = g.element;
  }
  return element;
}

/** @deprecated — use setGearAtSlot via gameStorage */
export function equipGearInSlot(currentIds, gearId) {
  const max = Math.max(3, (currentIds || []).length);
  return equipToFirstEmptySlot(currentIds, gearId, max) ?? compactGearIds(currentIds);
}

export function unequipGearFromSlot(currentSlots, slotIndex, maxSlots) {
  const slots = normalizeEquippedSlots(currentSlots, maxSlots);
  if (slotIndex >= 0 && slotIndex < maxSlots) slots[slotIndex] = null;
  return slots;
}

export function unequipGear(currentSlots, gearId, maxSlots = 6) {
  const slots = normalizeEquippedSlots(currentSlots, maxSlots);
  return slots.map((id) => (id === gearId ? null : id));
}

export { setGearAtSlot, normalizeEquippedSlots, compactGearIds, equipToFirstEmptySlot };
