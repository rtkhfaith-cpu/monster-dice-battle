/**
 * Turn-based damage (mirrors utils/battleLogic.js for Node CJS).
 */

const BEATS = {
  water: 'fire',
  fire: 'wood',
  wood: 'earth',
  earth: 'metal',
  metal: 'water',
};

function rollPercentChance(pct) {
  const p = Math.max(0, Math.min(100, pct));
  return Math.random() * 100 < p;
}

function statMid(range, fallback) {
  if (typeof range === 'number') return range;
  if (!range || typeof range.min !== 'number' || typeof range.max !== 'number') return fallback;
  return Math.round((range.min + range.max) / 2);
}

function normalizeElement(el) {
  const list = ['water', 'fire', 'wood', 'earth', 'metal'];
  return list.includes(el) ? el : 'earth';
}

function getElementRelation(attackerEl, defenderEl) {
  const a = normalizeElement(attackerEl);
  const d = normalizeElement(defenderEl);
  if (BEATS[a] === d) return 'advantage';
  if (BEATS[d] === a) return 'disadvantage';
  return 'neutral';
}

function getElementalDamageModifier(relation) {
  if (relation === 'advantage') return 1.3;
  if (relation === 'disadvantage') return 0.7;
  return 1;
}

function resolvePhysicalBattleDamage({ attacker, defender, defending = false, skill = null }) {
  const powerMult = skill?.power ?? 1;
  const baseAttack = statMid(attacker?.stats?.attack, 10) * powerMult;
  const levelBonus = (attacker?.level ?? 1) * 1.5;
  const defStat = statMid(defender?.stats?.def, 5);
  const randomVariance = 0.85 + Math.random() * 0.3;

  let raw = (baseAttack + levelBonus - defStat * 0.6) * randomVariance;

  let critical = false;
  let weak = false;
  if (rollPercentChance(attacker?.stats?.critPct ?? 10)) {
    critical = true;
    raw *= 1.5;
  } else if (rollPercentChance(8)) {
    weak = true;
    raw *= 0.75;
  }

  if (defending) raw *= 0.6;

  return {
    damage: Math.max(1, Math.round(raw)),
    critical,
    weak,
    defended: !!defending,
    dodged: false,
    strikeKind: 'physical',
    elementRelation: 'neutral',
  };
}

function resolveMagicBattleDamage({
  attacker,
  defender,
  defending = false,
  skill,
  atkElement,
  defElement,
}) {
  const powerMult = skill?.power ?? 1.2;
  const baseMagic = statMid(attacker?.stats?.magic, 10) * powerMult;
  const levelBonus = (attacker?.level ?? 1) * 1.8;
  const defStat = statMid(defender?.stats?.magicDef, 5);
  const randomVariance = 0.88 + Math.random() * 0.28;

  const aEl = atkElement ?? skill?.element ?? attacker?.element ?? 'earth';
  const dEl = defElement ?? defender?.element ?? 'earth';
  const elementRelation = getElementRelation(aEl, dEl);
  const elementalModifier = getElementalDamageModifier(elementRelation);

  let raw = (baseMagic * 1.35 + levelBonus - defStat * 0.55) * randomVariance * elementalModifier;

  let critical = false;
  let weak = false;
  if (rollPercentChance((attacker?.stats?.critPct ?? 10) + 2)) {
    critical = true;
    raw *= 1.5;
  } else if (rollPercentChance(6)) {
    weak = true;
    raw *= 0.75;
  }

  if (defending) raw *= 0.6;

  return {
    damage: Math.max(1, Math.round(raw)),
    critical,
    weak,
    defended: !!defending,
    dodged: false,
    strikeKind: 'magic',
    elementRelation,
  };
}

module.exports = {
  resolvePhysicalBattleDamage,
  resolveMagicBattleDamage,
};
