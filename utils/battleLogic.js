import { randInt } from './random';
import { getElementRelation, getElementalDamageModifier } from './elements';
import { applyStatus, statusStatMultiplier } from './statusEffects';

/**
 * @param {{min:number,max:number}} range
 */
export function pickInRange(range) {
  const lo = Math.min(range.min, range.max);
  const hi = Math.max(range.min, range.max);
  return randInt(lo, hi);
}

/**
 * True with probability `pct` / 100.
 */
export function rollPercentChance(pct) {
  const p = Math.max(0, Math.min(100, pct));
  return Math.random() * 100 < p;
}

function statMid(range, fallback) {
  if (typeof range === 'number') return range;
  if (!range || typeof range.min !== 'number' || typeof range.max !== 'number') return fallback;
  return Math.round((range.min + range.max) / 2);
}

/** Auto dodge roll from defender dodge % (capped). */
function rollAutoDodge(defender) {
  const pct = Math.max(0, Math.min(55, defender?.stats?.dodgePct ?? 15));
  return rollPercentChance(pct);
}

/** How much defense shaves off incoming power (0–0.75). */
function defenseMitigationRatio(defStat, attackPower) {
  const d = Math.max(0, defStat);
  const a = Math.max(1, attackPower);
  return Math.min(0.75, d / (d + a * 0.65 + 14));
}

/**
 * Physical strike — attack vs defense, auto dodge, no manual defend.
 * @param {{ attacker: object, defender: object, skill?: { power?: number } }} opts
 */
export function resolvePhysicalBattleDamage({ attacker, defender, skill = null }) {
  if (rollAutoDodge(defender)) {
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
  const atkMult = statusStatMultiplier(attacker, 'attack');
  const defMult = statusStatMultiplier(defender, 'def');

  const baseAttack = statMid(attacker?.stats?.attack, 10) * atkMult * powerMult;
  const levelBonus = (attacker?.level ?? 1) * 1.5;
  const defStat = statMid(defender?.stats?.def, 5) * defMult;
  const randomVariance = 0.85 + Math.random() * 0.3;

  const attackPower = baseAttack + levelBonus;
  const mit = defenseMitigationRatio(defStat, attackPower);
  let raw = attackPower * randomVariance * (1 - mit);

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
  // Defense is baked into damage — do not flag every mitigated hit as "Blocked" UI.
  const defended = false;

  return {
    damage,
    critical,
    weak,
    defended,
    dodged: false,
    strikeKind: 'physical',
    elementRelation: 'neutral',
  };
}

/** @deprecated use resolvePhysicalBattleDamage */
export function resolveTurnBattleDamage(opts) {
  return resolvePhysicalBattleDamage(opts);
}

/**
 * Magic strike — stronger base, uses magic stats + element cycle + auto dodge.
 * @param {{ attacker: object, defender: object, skill: object, atkElement?: string, defElement?: string }} opts
 */
export function resolveMagicBattleDamage({
  attacker,
  defender,
  skill,
  atkElement,
  defElement,
}) {
  if (rollAutoDodge(defender)) {
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
      atkElement: aEl,
      defElement: dEl,
    };
  }

  const powerMult = skill?.power ?? 1.2;
  const defMult = statusStatMultiplier(defender, 'def');

  const baseMagic = statMid(attacker?.stats?.magic, 10) * powerMult;
  const levelBonus = (attacker?.level ?? 1) * 1.8;
  const defStat = statMid(defender?.stats?.magicDef, 5) * defMult;
  const randomVariance = 0.88 + Math.random() * 0.28;

  const aEl = atkElement ?? skill?.element ?? attacker?.element ?? 'earth';
  const dEl = defElement ?? defender?.element ?? 'earth';
  const elementRelation = getElementRelation(aEl, dEl);
  const elementalModifier = getElementalDamageModifier(elementRelation);

  const attackPower = baseMagic * 1.35 + levelBonus;
  const mit = defenseMitigationRatio(defStat, attackPower);
  let raw = attackPower * randomVariance * elementalModifier * (1 - mit);

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
  const defended = false;

  return {
    damage,
    critical,
    weak,
    defended,
    dodged: false,
    strikeKind: 'magic',
    elementRelation,
    atkElement: aEl,
    defElement: dEl,
  };
}

/** Apply skill status proc to defender after a hit */
export function maybeApplySkillStatus(defender, skill) {
  const st = skill?.status;
  if (!st?.type || !st.chance) return defender;
  if (!rollPercentChance(Math.round(st.chance * 100))) return defender;
  return applyStatus(defender, st.type, st.turns ?? 2, 1);
}

/**
 * Dice-driven damage for normal / magic strikes (balanced 8–25 band at low levels).
 */
export function resolveDiceBattleDamage({
  attacker,
  defender,
  attackerDice,
  defenderDice,
  defenseChoice,
  strikeKind = 'normal',
  rageMode = false,
}) {
  const atkDice = Math.max(1, Math.min(6, Math.floor(attackerDice || 1)));
  const defDice = Math.max(1, Math.min(6, Math.floor(defenderDice || 1)));

  if (defenseChoice === 'dodge') {
    const dodgePct = defender?.stats?.dodgePct ?? 25;
    if (rollPercentChance(dodgePct)) {
      return { damage: 0, critical: false, weak: false, dodged: true, defended: false };
    }
  }

  const atkPower =
    strikeKind === 'magic'
      ? statMid(attacker?.stats?.magic, 10)
      : statMid(attacker?.stats?.attack, 10);
  const defPower =
    strikeKind === 'magic'
      ? statMid(defender?.stats?.magicDef, 5)
      : statMid(defender?.stats?.def, 5);

  const comboBonus = (attacker?.combo ?? 0) * 2;
  const diceBonus = atkDice * 2;
  const levelBonus = Math.round((attacker?.level ?? 1) * 1.5);

  let raw =
    atkPower + diceBonus + comboBonus + levelBonus - defPower;

  let defended = false;
  if (defenseChoice === 'defend') {
    defended = true;
    raw *= 0.6;
    if (defDice > atkDice) raw *= 0.85;
    if (defDice === 6) raw *= 0.9;
  }

  let critical = false;
  let weak = false;
  if (atkDice === 6 && rollPercentChance(20)) {
    critical = true;
    raw *= 1.5;
  } else if (atkDice === 1 && rollPercentChance(20)) {
    weak = true;
    raw *= 0.75;
  }

  if (rageMode && raw > 0) raw *= 1.15;

  const damage = Math.max(1, Math.round(raw));
  return { damage, critical, weak, dodged: false, defended };
}

/**
 * Physical strike with ranged stats (legacy / fallback).
 */
export function resolveNormalHit({ atkRange, defRange, defenseChoice, dodgePct, critPct, rageMode = false }) {
  const actualAttack = pickInRange(atkRange);

  let rolledDef = null;
  let dodged = false;
  let damage = 0;

  if (defenseChoice === 'defend') {
    rolledDef = pickInRange(defRange);
    damage = Math.max(5, actualAttack - rolledDef);
  } else {
    dodged = rollPercentChance(dodgePct);
    damage = dodged ? 0 : actualAttack;
  }

  const effectiveCritPct = rageMode ? Math.min(100, critPct * 2) : critPct;
  let critical = false;
  if (damage > 0 && rollPercentChance(effectiveCritPct)) {
    damage *= 2;
    critical = true;
  }

  if (rageMode && damage > 0) {
    damage = Math.round(damage * 1.2);
  }

  return { damage, critical, dodged, actualAttack, rolledDef, defenseChoice };
}

export function resolveMagicHit({ magRange, mdRange, defenseChoice, dodgePct, critPct, rageMode = false }) {
  const actualMagic = pickInRange(magRange);

  let rolledMagicDef = null;
  let dodged = false;
  let damage = 0;

  if (defenseChoice === 'defend') {
    rolledMagicDef = pickInRange(mdRange);
    damage = Math.max(5, actualMagic - rolledMagicDef);
  } else {
    dodged = rollPercentChance(dodgePct);
    damage = dodged ? 0 : actualMagic;
  }

  const effectiveCritPct = rageMode ? Math.min(100, critPct * 2) : critPct;
  let critical = false;
  if (damage > 0 && rollPercentChance(effectiveCritPct)) {
    damage *= 2;
    critical = true;
  }

  if (rageMode && damage > 0) {
    damage = Math.round(damage * 1.2);
  }

  return { damage, critical, dodged, actualMagic, rolledMagicDef, defenseChoice };
}

/**
 * Super: two ranged rolls, no dodge/def rolls.
 */
export function resolveSuperStrike(attackRange, magicRange) {
  const rollAtk = pickInRange(attackRange);
  const rollMag = pickInRange(magicRange);
  const damage = Math.round(rollAtk * 1.5 + rollMag * 1.5);
  return { damage, rollAtk, rollMag };
}
