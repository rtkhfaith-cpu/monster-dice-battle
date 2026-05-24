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

function attackHitChance(attacker, defender, magic = false) {
  const hitRate = attacker?.stats?.hitRate ?? 92;
  const attackerAgility = attacker?.stats?.agility ?? attacker?.stats?.speed ?? 10;
  const defenderAgility = defender?.stats?.agility ?? defender?.stats?.speed ?? 10;
  const agilityDelta = defenderAgility - attackerAgility;
  const magicBonus = magic ? 2 : 0;
  return Math.max(76, Math.min(98, 92 + (hitRate - 92) * 0.45 - agilityDelta * 0.25 + magicBonus));
}

function rollAutoDodge(attacker, defender, magic = false) {
  const attackerAgility = attacker?.stats?.agility ?? attacker?.stats?.speed ?? attacker?.stats?.dodgePct ?? 10;
  const defenderAgility = defender?.stats?.agility ?? defender?.stats?.speed ?? defender?.stats?.dodgePct ?? 10;
  const base = 3 + (defenderAgility - attackerAgility) * 0.25;
  const pct = Math.max(3, Math.min(25, magic ? base * 0.5 : base));
  return rollPercentChance(pct);
}

function rollAttackAvoided(attacker, defender, magic = false) {
  if (!rollPercentChance(attackHitChance(attacker, defender, magic))) return true;
  return rollAutoDodge(attacker, defender, magic);
}

function defenseMitigationRatio(defStat, attackPower) {
  const d = Math.max(0, defStat);
  const a = Math.max(1, attackPower);
  return Math.min(0.75, d / (d + a * 0.65 + 14));
}

function outgoingDamageLevelFactor(level) {
  const lv = Math.max(1, Math.floor(level ?? 1));
  if (lv <= 30) return 1;
  const t = (lv - 30) / 70;
  return 1 - t * 0.22;
}

function resolvePhysicalBattleDamage({ attacker, defender, skill = null }) {
  if (rollAttackAvoided(attacker, defender, false)) {
    return {
      damage: 0,
      critical: false,
      weak: false,
      defended: false,
      dodged: true,
      strikeKind: 'physical',
      elementRelation: 'neutral',
    };
  }

  const powerMult = skill?.power ?? 1;
  const baseAttack = statMid(attacker?.stats?.attack, 10) * powerMult;
  const levelBonus = (attacker?.level ?? 1) * 1.5;
  const defStat = statMid(defender?.stats?.def, 5);
  const randomVariance = 0.85 + Math.random() * 0.3;

  const attackPower = baseAttack + levelBonus;
  const mit = defenseMitigationRatio(defStat, attackPower);
  let raw = attackPower * randomVariance * (1 - mit);
  raw *= outgoingDamageLevelFactor(Math.max(attacker?.level ?? 1, defender?.level ?? 1));

  let critical = false;
  let weak = false;
  if (rollPercentChance(attacker?.stats?.critPct ?? 10)) {
    critical = true;
    raw *= 1.5;
  } else if (rollPercentChance(8)) {
    weak = true;
    raw *= 0.75;
  }

  const damage = Math.max(1, Math.round(raw));
  return {
    damage,
    critical,
    weak,
    defended: false,
    dodged: false,
    strikeKind: 'physical',
    elementRelation: 'neutral',
  };
}

function resolveMagicBattleDamage({
  attacker,
  defender,
  skill,
  atkElement,
  defElement,
}) {
  if (rollAttackAvoided(attacker, defender, true)) {
    const aEl = atkElement ?? skill?.element ?? attacker?.element ?? 'earth';
    const dEl = defElement ?? defender?.element ?? 'earth';
    return {
      damage: 0,
      critical: false,
      weak: false,
      defended: false,
      dodged: true,
      strikeKind: 'magic',
      elementRelation: getElementRelation(aEl, dEl),
    };
  }

  const powerMult = skill?.power ?? 1.2;
  const baseMagic = statMid(attacker?.stats?.magic, 10) * powerMult;
  const levelBonus = (attacker?.level ?? 1) * 1.8;
  const mdFallback = statMid(defender?.stats?.def, 5);
  const defStat = statMid(defender?.stats?.magicDef, mdFallback);
  const randomVariance = 0.88 + Math.random() * 0.28;

  const aEl = atkElement ?? skill?.element ?? attacker?.element ?? 'earth';
  const dEl = defElement ?? defender?.element ?? 'earth';
  const elementRelation = getElementRelation(aEl, dEl);
  const elementalModifier = getElementalDamageModifier(elementRelation);

  const attackPower = baseMagic * 1.35 + levelBonus;
  const mit = defenseMitigationRatio(defStat, attackPower);
  let raw = attackPower * randomVariance * elementalModifier * (1 - mit);
  raw *= outgoingDamageLevelFactor(Math.max(attacker?.level ?? 1, defender?.level ?? 1));

  let critical = false;
  let weak = false;
  if (rollPercentChance((attacker?.stats?.critPct ?? 10) + 2)) {
    critical = true;
    raw *= 1.5;
  } else if (rollPercentChance(6)) {
    weak = true;
    raw *= 0.75;
  }

  const damage = Math.max(1, Math.round(raw));
  return {
    damage,
    critical,
    weak,
    defended: false,
    dodged: false,
    strikeKind: 'magic',
    elementRelation,
  };
}

module.exports = {
  resolvePhysicalBattleDamage,
  resolveMagicBattleDamage,
};
