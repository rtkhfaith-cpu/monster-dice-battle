import { randInt } from './random';

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
  if (!range || typeof range.min !== 'number' || typeof range.max !== 'number') return fallback;
  return Math.round((range.min + range.max) / 2);
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
