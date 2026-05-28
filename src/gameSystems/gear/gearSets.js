/**
 * Full set bonus detection and application.
 */
import { ARRAY_GEAR_SLOTS, GEAR_SLOTS } from './gearConstants';
import { getGearInstance } from './inventoryGearUtils';

export const GEAR_SET_BONUSES = {
  guardian: {
    setId: 'guardian',
    name: 'Guardian Set',
    description: '+10% HP and +8% Defense',
    hpPct: 10,
    defensePct: 8,
  },
  berserker: {
    setId: 'berserker',
    name: 'Berserker Set',
    description: '+10% Attack and +5 Crit',
    attackPct: 10,
    critFlat: 5,
  },
  lifebloom: {
    setId: 'lifebloom',
    name: 'Lifebloom Set',
    description: '+15% healing and small HP recovery each turn',
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
};

const MAIN_CATEGORIES = ['head', 'body', 'weapon', 'hand', 'legs'];

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
 * Returns active set id if monster has ≥1 item from same set in each main category.
 * Only one set bonus at a time (highest piece count wins tie).
 */
export function detectActiveGearSet(profile, equipment) {
  const ids = equippedInstanceIds(equipment);
  if (!ids.length) return null;

  const bySet = {};
  for (const instanceId of ids) {
    const item = getGearInstance(profile, instanceId);
    if (!item?.set) continue;
    if (!bySet[item.set]) {
      bySet[item.set] = { head: false, body: false, weapon: false, hand: false, legs: false };
    }
    const cat = item.slot;
    if (MAIN_CATEGORIES.includes(cat)) bySet[item.set][cat] = true;
  }

  let best = null;
  let bestScore = 0;
  for (const [setId, cats] of Object.entries(bySet)) {
    const complete = MAIN_CATEGORIES.every((c) => cats[c]);
    if (!complete) continue;
    const score = ids.filter((id) => getGearInstance(profile, id)?.set === setId).length;
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
