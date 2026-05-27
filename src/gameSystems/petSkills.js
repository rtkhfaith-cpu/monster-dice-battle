/**
 * Pet skill definitions — strength by pet rarity only (NOT by pet level).
 */

/** @typedef {'heal'|'crit_boost'|'dodge_boost'|'poison_bite'|'fire_aura'|'shield'|'energy_gain'|'cleanse'|'counter_spark'|'lucky_coins'} PetSkillType */

/** @type {Record<PetSkillType, Record<'rare'|'epic'|'mythic', object>>} */
export const PET_SKILL_SCALING = {
  heal: {
    rare: { healMaxHpPct: 6, everyTurns: 4 },
    epic: { healMaxHpPct: 9, everyTurns: 4 },
    mythic: { healMaxHpPct: 12, everyTurns: 3 },
  },
  crit_boost: {
    rare: { petCritBonusPct: 5 },
    epic: { petCritBonusPct: 8 },
    mythic: { petCritBonusPct: 12 },
  },
  dodge_boost: {
    rare: { petDodgeBonusPct: 4 },
    epic: { petDodgeBonusPct: 7 },
    mythic: { petDodgeBonusPct: 10 },
  },
  poison_bite: {
    rare: { chancePct: 15, dotMaxHpPct: 5, turns: 2 },
    epic: { chancePct: 22, dotMaxHpPct: 7, turns: 2 },
    mythic: { chancePct: 30, dotMaxHpPct: 10, turns: 3 },
  },
  fire_aura: {
    rare: { chancePct: 10, dotMaxHpPct: 6, turns: 2 },
    epic: { chancePct: 18, dotMaxHpPct: 9, turns: 2 },
    mythic: { chancePct: 25, dotMaxHpPct: 12, turns: 3 },
  },
  shield: {
    rare: { shieldMaxHpPct: 8 },
    epic: { shieldMaxHpPct: 12 },
    mythic: { shieldMaxHpPct: 18 },
  },
  energy_gain: {
    rare: { mpRestore: 8 },
    epic: { mpRestore: 12 },
    mythic: { mpRestore: 18 },
  },
  cleanse: {
    rare: { chancePct: 15 },
    epic: { chancePct: 25 },
    mythic: { chancePct: 40 },
  },
  counter_spark: {
    rare: { chancePct: 10, atkDamagePct: 20 },
    epic: { chancePct: 15, atkDamagePct: 30 },
    mythic: { chancePct: 22, atkDamagePct: 45 },
  },
  lucky_coins: {
    rare: { coinBonusPct: 5 },
    epic: { coinBonusPct: 10 },
    mythic: { coinBonusPct: 18 },
  },
};

export const PET_SKILL_LABELS = {
  heal: 'Heal',
  crit_boost: 'Crit Boost',
  dodge_boost: 'Dodge Boost',
  poison_bite: 'Poison Bite',
  fire_aura: 'Fire Aura',
  shield: 'Shield',
  energy_gain: 'Energy Gain',
  cleanse: 'Cleanse',
  counter_spark: 'Counter Spark',
  lucky_coins: 'Lucky Coins',
};

/** @param {PetSkillType} skillType @param {'rare'|'epic'|'mythic'} rarity */
export function getPetSkillEffect(skillType, rarity) {
  const table = PET_SKILL_SCALING[skillType];
  if (!table) return {};
  return { ...(table[rarity] || table.rare) };
}

/** @param {PetSkillType} skillType @param {'rare'|'epic'|'mythic'} rarity */
export function describePetSkill(skillType, rarity) {
  const e = getPetSkillEffect(skillType, rarity);
  switch (skillType) {
    case 'heal':
      return `Restore ${e.healMaxHpPct}% HP every ${e.everyTurns} turns`;
    case 'crit_boost':
      return `+${e.petCritBonusPct}% pet crit (beyond player cap)`;
    case 'dodge_boost':
      return `+${e.petDodgeBonusPct}% pet dodge (beyond player cap)`;
    case 'poison_bite':
      return `${e.chancePct}% poison · ${e.dotMaxHpPct}% HP/turn`;
    case 'fire_aura':
      return `${e.chancePct}% burn · ${e.dotMaxHpPct}% HP/turn`;
    case 'shield':
      return `Shield ${e.shieldMaxHpPct}% max HP`;
    case 'energy_gain':
      return `Restore ${e.mpRestore} MP`;
    case 'cleanse':
      return `${e.chancePct}% cleanse debuffs`;
    case 'counter_spark':
      return `${e.chancePct}% counter · ${e.atkDamagePct}% ATK`;
    case 'lucky_coins':
      return `+${e.coinBonusPct}% battle coins`;
    default:
      return skillType;
  }
}
