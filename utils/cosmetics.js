/**
 * Monster Gear — equippable cosmetics with one item per slot and small stat bonuses.
 */

/** @typedef {'hat'|'glasses'|'body'|'hands'|'aura'} GearSlot */

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   price: number,
 *   emoji: string,
 *   slot: GearSlot,
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
 *     expPct?: number,
 *   },
 * }} GearDef
 */

/** @type {GearDef[]} */
export const GEAR_CATALOG = [
  { id: 'crown', name: 'Royal Crown', price: 50, emoji: '👑', slot: 'hat', bonuses: { hp: 5, defMax: 1 } },
  { id: 'wizard', name: 'Wizard Hat', price: 60, emoji: '🧙', slot: 'hat', bonuses: { mp: 5, magicMin: 1, magicMax: 1 } },
  { id: 'sunglasses', name: 'Cool Shades', price: 40, emoji: '🕶️', slot: 'glasses', bonuses: { dodgePct: 2, critPct: 1 } },
  { id: 'cape', name: 'Hero Cape', price: 45, emoji: '🦸', slot: 'body', bonuses: { hp: 5, defMin: 1, defMax: 1 } },
  { id: 'tpCape', name: 'TP Cape', price: 35, emoji: '🧻', slot: 'body', bonuses: { hp: 3, dodgePct: 1 } },
  { id: 'boxing', name: 'Boxing Gloves', price: 55, emoji: '🥊', slot: 'hands', bonuses: { attackMin: 1, attackMax: 2 } },
  { id: 'sockNecklace', name: 'Sock Necklace', price: 30, emoji: '🧿', slot: 'body', bonuses: { critPct: 2, expPct: 5 } },
  { id: 'fireAura', name: 'Fire Aura', price: 80, emoji: '🔥', slot: 'aura', bonuses: { attackMin: 1, attackMax: 1, magicMin: 1 } },
];

/** @deprecated use GEAR_CATALOG */
export const COSMETIC_CATALOG = GEAR_CATALOG;

export const GEAR_SLOT_LABELS = {
  hat: 'Hat',
  glasses: 'Glasses',
  body: 'Body',
  hands: 'Hands',
  aura: 'Aura',
};

export function getGear(id) {
  return GEAR_CATALOG.find((g) => g.id === id) ?? null;
}

/** @deprecated */
export const getCosmetic = getGear;

/** Sum bonuses from equipped gear ids */
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
    expPct: 0,
  };
  for (const id of gearIds || []) {
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
    out.expPct += b.expPct ?? 0;
  }
  return out;
}

/** Human-readable bonus chips for UI */
export function formatGearBonusLines(gearDef) {
  if (!gearDef?.bonuses) return [];
  const b = gearDef.bonuses;
  const lines = [];
  if (b.hp) lines.push(`+${b.hp} HP`);
  if (b.mp) lines.push(`+${b.mp} MP`);
  if (b.attackMin || b.attackMax) {
    const a = b.attackMin === b.attackMax ? `+${b.attackMin}` : `+${b.attackMin ?? 0}–${b.attackMax ?? 0}`;
    lines.push(`${a} Attack`);
  }
  if (b.magicMin || b.magicMax) lines.push(`+${b.magicMin ?? 0} Magic`);
  if (b.defMin || b.defMax) lines.push(`+${b.defMin ?? 0} Defense`);
  if (b.magicDefMin || b.magicDefMax) lines.push(`+${b.magicDefMin ?? 0} Magic Def`);
  if (b.critPct) lines.push(`+${b.critPct}% Crit`);
  if (b.dodgePct) lines.push(`+${b.dodgePct}% Dodge`);
  if (b.expPct) lines.push(`+${b.expPct}% EXP`);
  return lines;
}

/**
 * Equip one gear id; removes any other gear in the same slot.
 * @param {string[]} currentIds
 * @param {string} gearId
 */
export function equipGearInSlot(currentIds, gearId) {
  const item = getGear(gearId);
  if (!item) return [...(currentIds || [])];
  const withoutSlot = (currentIds || []).filter((id) => getGear(id)?.slot !== item.slot);
  return [...withoutSlot, gearId];
}

export function unequipGear(currentIds, gearId) {
  return (currentIds || []).filter((id) => id !== gearId);
}

export function getEquippedInSlot(gearIds, slot) {
  return (gearIds || []).find((id) => getGear(id)?.slot === slot) ?? null;
}
