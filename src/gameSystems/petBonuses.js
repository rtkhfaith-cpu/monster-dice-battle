/**
 * Apply pet stat bonuses to monster battle stats at runtime (not saved on monster).
 */

/**
 * @param {object} monsterStats - flat or min/max stat object from fighter
 * @param {{ hp?: number, atk?: number, def?: number, spd?: number }|null} petStats
 */
export function applyPetStatBonuses(monsterStats, petStats) {
  if (!monsterStats || !petStats) {
    return { stats: monsterStats, petBonuses: { hp: 0, atk: 0, def: 0, spd: 0 } };
  }

  const bonus = {
    hp: Math.max(0, Math.round(petStats.hp ?? 0)),
    atk: Math.max(0, Math.round(petStats.atk ?? 0)),
    def: Math.max(0, Math.round(petStats.def ?? 0)),
    spd: Math.max(0, Math.round(petStats.spd ?? 0)),
  };

  const stats = { ...monsterStats };

  if (typeof stats.hp === 'number') stats.hp += bonus.hp;
  if (typeof stats.attack === 'number') stats.attack += bonus.atk;
  else if (stats.attack?.min != null) {
    stats.attack = { min: stats.attack.min + bonus.atk, max: stats.attack.max + bonus.atk };
  }
  if (typeof stats.def === 'number') stats.def += bonus.def;
  else if (stats.def?.min != null) {
    stats.def = { min: stats.def.min + bonus.def, max: stats.def.max + bonus.def };
  }
  const spdKey = stats.agility != null ? 'agility' : stats.speed != null ? 'speed' : null;
  if (spdKey && typeof stats[spdKey] === 'number') stats[spdKey] += bonus.spd;

  return { stats, petBonuses: bonus };
}

/** Merge pet combat modifiers (separate from player caps). */
export function buildPetCombatModifiers(equippedPet) {
  if (!equippedPet) {
    return { petCritBonusPct: 0, petDodgeBonusPct: 0, coinBonusPct: 0, skills: [] };
  }
  return {
    petCritBonusPct: equippedPet.petCritBonusPct ?? 0,
    petDodgeBonusPct: equippedPet.petDodgeBonusPct ?? 0,
    coinBonusPct: equippedPet.coinBonusPct ?? 0,
    skills: equippedPet.skills ?? [],
    petId: equippedPet.petId,
    petName: equippedPet.name,
    petEmoji: equippedPet.emoji,
    rarity: equippedPet.rarity,
  };
}
