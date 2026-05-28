/**
 * Full set bonus detection and application — exact setId match only.
 */
import { ARRAY_GEAR_SLOTS } from './gearConstants';
import { getGearInstance } from './inventoryGearUtils';

/** Per-set bonuses keyed by exact setId (15 sets). */
export const GEAR_SET_BONUSES = {
  // Rare
  iron_guard: {
    setId: 'iron_guard',
    name: 'Iron Guard Set',
    description: '+5% HP and +3% Defense',
    hpPct: 5,
    defensePct: 3,
  },
  wild_fang: {
    setId: 'wild_fang',
    name: 'Wild Fang Set',
    description: '+5% Attack and +2 Crit',
    attackPct: 5,
    critFlat: 2,
  },
  meadow_bloom: {
    setId: 'meadow_bloom',
    name: 'Meadow Bloom Set',
    description: '+10% healing and +1 HP each turn',
    healPowerPct: 10,
    regenHpPerTurn: 1,
  },
  toxic_bite: {
    setId: 'toxic_bite',
    name: 'Toxic Bite Set',
    description: '+10% poison damage and +5% poison chance',
    poisonDamagePct: 10,
    poisonChancePct: 5,
  },
  ember_paw: {
    setId: 'ember_paw',
    name: 'Ember Paw Set',
    description: '+10% fire damage and +5% burn chance',
    fireDamagePct: 10,
    burnChancePct: 5,
  },
  // Epic
  dragon_guard: {
    setId: 'dragon_guard',
    name: 'Dragon Guard Set',
    description: '+10% HP and +8% Defense',
    hpPct: 10,
    defensePct: 8,
  },
  warborn: {
    setId: 'warborn',
    name: 'Warborn Set',
    description: '+10% Attack and +5 Crit',
    attackPct: 10,
    critFlat: 5,
  },
  lifebloom: {
    setId: 'lifebloom',
    name: 'Lifebloom Set',
    description: '+15% healing and +2 HP each turn',
    healPowerPct: 15,
    regenHpPerTurn: 2,
  },
  venomfang: {
    setId: 'venomfang',
    name: 'Venomfang Set',
    description: '+20% poison damage and +10% poison chance',
    poisonDamagePct: 20,
    poisonChancePct: 10,
  },
  flameheart: {
    setId: 'flameheart',
    name: 'Flameheart Set',
    description: '+20% fire damage and +10% burn chance',
    fireDamagePct: 20,
    burnChancePct: 10,
  },
  // Mythic
  celestial_guardian: {
    setId: 'celestial_guardian',
    name: 'Celestial Guardian Set',
    description: '+15% HP, +12% Defense, and 5% damage reduction',
    hpPct: 15,
    defensePct: 12,
    damageReductionPct: 5,
  },
  titan_berserker: {
    setId: 'titan_berserker',
    name: 'Titan Berserker Set',
    description: '+15% Attack and +8 Crit',
    attackPct: 15,
    critFlat: 8,
  },
  eternal_bloom: {
    setId: 'eternal_bloom',
    name: 'Eternal Bloom Set',
    description: '+20% healing and +3 HP each turn',
    healPowerPct: 20,
    regenHpPerTurn: 3,
  },
  abyss_venom: {
    setId: 'abyss_venom',
    name: 'Abyss Venom Set',
    description: '+25% poison damage and +15% poison chance',
    poisonDamagePct: 25,
    poisonChancePct: 15,
  },
  inferno_king: {
    setId: 'inferno_king',
    name: 'Inferno King Set',
    description: '+25% fire damage and +15% burn chance',
    fireDamagePct: 25,
    burnChancePct: 15,
  },
};

const MAIN_CATEGORIES = ['head', 'body', 'weapon', 'hand', 'legs'];

function gearSetId(item) {
  return item?.setId ?? item?.set ?? null;
}

function equippedInstanceIds(equipment) {
  if (!equipment) return [];
  const ids = [];
  if (equipment.head) ids.push(equipment.head);
  if (equipment.body) ids.push(equipment.body);
  for (const slot of ARRAY_GEAR_SLOTS) {
    for (const id of equipment[slot] || []) {
      if (id) ids.push(id);
    }
  }
  return ids;
}

/**
 * Returns active set bonus if monster has ≥1 item from the same exact setId in each main category.
 */
export function detectActiveGearSet(profile, equipment) {
  const ids = equippedInstanceIds(equipment);
  if (!ids.length) return null;

  const bySet = {};
  for (const instanceId of ids) {
    const item = getGearInstance(profile, instanceId);
    const setId = gearSetId(item);
    if (!setId) continue;
    if (!bySet[setId]) {
      bySet[setId] = { head: false, body: false, weapon: false, hand: false, legs: false };
    }
    const cat = item.slot;
    if (MAIN_CATEGORIES.includes(cat)) bySet[setId][cat] = true;
  }

  let best = null;
  let bestScore = 0;
  for (const [setId, cats] of Object.entries(bySet)) {
    const complete = MAIN_CATEGORIES.every((c) => cats[c]);
    if (!complete) continue;
    const score = ids.filter((id) => gearSetId(getGearInstance(profile, id)) === setId).length;
    if (!best || score > bestScore) {
      best = setId;
      bestScore = score;
    }
  }
  return best ? GEAR_SET_BONUSES[best] ?? null : null;
}

/**
 * Apply set bonus modifiers onto stats bundle (no re-cap).
 * @param {object} stats
 * @param {object|null} setBonus
 */
export function applyGearSetBonusToStats(stats, setBonus) {
  if (!setBonus || !stats) return stats;
  const next = { ...stats };

  if (setBonus.hpPct && typeof next.hp === 'number') {
    next.hp = Math.max(1, Math.round(next.hp * (1 + setBonus.hpPct / 100)));
  }
  if (setBonus.defensePct && next.def?.min != null) {
    const mul = 1 + setBonus.defensePct / 100;
    next.def = {
      min: Math.max(1, Math.round(next.def.min * mul)),
      max: Math.max(1, Math.round(next.def.max * mul)),
    };
  }
  if (setBonus.attackPct && next.attack?.min != null) {
    const mul = 1 + setBonus.attackPct / 100;
    next.attack = {
      min: Math.max(1, Math.round(next.attack.min * mul)),
      max: Math.max(1, Math.round(next.attack.max * mul)),
    };
  }
  if (setBonus.critFlat) {
    next.critPct = (next.critPct ?? 0) + setBonus.critFlat;
  }
  if (setBonus.damageReductionPct) {
    next.damageReductionPct = (next.damageReductionPct ?? 0) + setBonus.damageReductionPct;
  }

  return next;
}

/** Combat modifiers from set (heal/poison/fire). */
export function buildSetCombatModifiers(setBonus) {
  if (!setBonus) {
    return {
      healPowerPct: 0,
      regenHpPerTurn: 0,
      poisonDamagePct: 0,
      poisonChancePct: 0,
      fireDamagePct: 0,
      burnChancePct: 0,
      damageReductionPct: 0,
      setId: null,
      setName: null,
    };
  }
  return {
    healPowerPct: setBonus.healPowerPct ?? 0,
    regenHpPerTurn: setBonus.regenHpPerTurn ?? 0,
    poisonDamagePct: setBonus.poisonDamagePct ?? 0,
    poisonChancePct: setBonus.poisonChancePct ?? 0,
    fireDamagePct: setBonus.fireDamagePct ?? 0,
    burnChancePct: setBonus.burnChancePct ?? 0,
    damageReductionPct: setBonus.damageReductionPct ?? 0,
    setId: setBonus.setId,
    setName: setBonus.name,
  };
}

/**
 * Preview whether equipping `candidate` would activate or break a set.
 */
export function previewSetBonusChange(profile, equipment, candidateInstanceId, targetSlot, targetIndex = 0) {
  const candidate = getGearInstance(profile, candidateInstanceId);
  if (!candidate) return { message: null };

  const sim = JSON.parse(JSON.stringify(equipment || {}));
  if (candidate.slot === 'head') sim.head = candidateInstanceId;
  else if (candidate.slot === 'body') sim.body = candidateInstanceId;
  else if (ARRAY_GEAR_SLOTS.includes(candidate.slot)) {
    if (!Array.isArray(sim[candidate.slot])) sim[candidate.slot] = [null, null];
    sim[candidate.slot][targetIndex] = candidateInstanceId;
  }

  const before = detectActiveGearSet(profile, equipment);
  const after = detectActiveGearSet(profile, sim);

  if (after && (!before || before.setId !== after.setId)) {
    return { message: `Equipping this item will activate ${after.name} bonus.` };
  }
  if (before && !after) {
    return { message: `Unequipping may remove ${before.name} bonus.` };
  }
  if (before && after && before.setId !== after.setId) {
    return { message: `Set bonus will change from ${before.name} to ${after.name}.` };
  }
  return { message: null };
}
