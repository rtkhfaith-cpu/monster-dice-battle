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

/**
 * Physical strike with ranged stats.
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
