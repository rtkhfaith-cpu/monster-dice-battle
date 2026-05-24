import { randInt } from './random';
import { getElementRelation, resolveMagicElementRelation } from './elements';
import { applyStatus, statusStatMultiplier } from './statusEffects';
import { getLadderGear } from './monsterLadder/ladderGearCatalog';
import {
  COMBAT_BALANCE,
  applyCombatDamageModifiers,
  dodgeChance,
  elementalDamageMultiplier,
  randomVariance as balancedVariance,
} from '../src/gameBalance/combat';

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

/** Auto dodge roll from speed delta (capped). */
function rollAutoDodge(attacker, defender, magic = false) {
  const pct = dodgeChance({
    attackerSpeed: attacker?.stats?.agility ?? attacker?.stats?.speed ?? attacker?.stats?.dodgePct ?? 10,
    defenderSpeed: defender?.stats?.agility ?? defender?.stats?.speed ?? defender?.stats?.dodgePct ?? 10,
    magic,
    bossKind: attacker?.ladderStageKind ?? null,
  });
  return rollPercentChance(pct);
}

function attackHitChance(attacker, defender, magic = false) {
  const hitRate = attacker?.stats?.hitRate ?? 92;
  const attackerAgility = attacker?.stats?.agility ?? attacker?.stats?.speed ?? 10;
  const defenderAgility = defender?.stats?.agility ?? defender?.stats?.speed ?? 10;
  const agilityDelta = defenderAgility - attackerAgility;
  const magicBonus = magic ? 2 : 0;
  const pct = 92 + (hitRate - 92) * 0.45 - agilityDelta * 0.25 + magicBonus;
  return Math.max(76, Math.min(98, pct));
}

function rollAttackAvoided(attacker, defender, magic = false) {
  if (!rollPercentChance(attackHitChance(attacker, defender, magic))) return true;
  return rollAutoDodge(attacker, defender, magic);
}

function ladderEffects(fighter, type) {
  const ids = Array.isArray(fighter?.equippedGear) ? fighter.equippedGear : [];
  const effects = [];
  for (const id of ids) {
    const gear = getLadderGear(id);
    for (const fx of gear?.effects || []) {
      if (fx?.type === type) effects.push(fx);
    }
  }
  return effects;
}

function ladderEffectPct(fighter, type, predicate = null) {
  return ladderEffects(fighter, type)
    .filter((fx) => !predicate || predicate(fx))
    .reduce((sum, fx) => sum + (typeof fx.value === 'number' ? fx.value : 0), 0);
}

function defenderElementPair(defender, defElementOverride) {
  const els = Array.isArray(defender?.elements) ? defender.elements : [];
  const primary = defElementOverride ?? defender?.element ?? els[0] ?? 'earth';
  const secondary = els[1] && els[1] !== primary ? els[1] : null;
  return { primary, secondary };
}

function magicElementRelation(attacker, defender, atkElement, defElementOverride) {
  const def = defenderElementPair(defender, defElementOverride);
  return resolveMagicElementRelation({
    attackerTemplateId: attacker?.monsterTemplateId,
    defenderTemplateId: defender?.monsterTemplateId,
    atkElement,
    defPrimary: def.primary,
    defSecondary: def.secondary,
  });
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
  const atkMult = statusStatMultiplier(attacker, 'attack');
  const defMult = statusStatMultiplier(defender, 'def');

  const baseAttack = statMid(attacker?.stats?.attack, 10) * atkMult * powerMult;
  const defStat = statMid(defender?.stats?.def, 5) * defMult;

  let raw = (baseAttack - defStat * COMBAT_BALANCE.physicalDefenseScalar) * balancedVariance();
  const elementBoost = ladderEffectPct(attacker, 'elementBoost', (fx) => fx.element === attacker?.element);
  const bossBoost = defender?.isLadderEnemy && defender?.ladderStageKind === 'bigBoss'
    ? ladderEffectPct(attacker, 'bossDamagePct')
    : 0;
  raw *= 1 + (elementBoost + bossBoost) / 100;

  let critical = false;
  let weak = false;
  if (rollPercentChance(attacker?.stats?.critPct ?? COMBAT_BALANCE.baseCritChance)) {
    critical = true;
    raw *= COMBAT_BALANCE.critMultiplier;
  } else if (rollPercentChance(8)) {
    weak = true;
    raw *= 0.75;
  }

  const damage = applyCombatDamageModifiers(raw, {
    attacker,
    defender,
    strikeKind: 'physical',
    elementRelation: 'neutral',
  });
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
  const extraMiss = ladderEffectPct(defender, 'enemyMissMagicChance');
  if (rollAttackAvoided(attacker, defender, true) || rollPercentChance(extraMiss)) {
    const aEl = atkElement ?? skill?.element ?? attacker?.element ?? 'earth';
    const def = defenderElementPair(defender, defElement);
    return {
      damage: 0,
      critical: false,
      weak: false,
      defended: false,
      dodged: true,
      strikeKind: 'magic',
      elementRelation: magicElementRelation(attacker, defender, aEl, def.primary),
      atkElement: aEl,
      defElement: def.primary,
    };
  }

  const powerMult = skill?.power ?? 1.2;
  const defMult = statusStatMultiplier(defender, 'def');

  const baseMagic = statMid(attacker?.stats?.magic, 10) * powerMult;
  const mdFallback = statMid(defender?.stats?.def, 5);
  const defStat = statMid(defender?.stats?.magicDef, mdFallback) * defMult;

  const aEl = atkElement ?? skill?.element ?? attacker?.element ?? 'earth';
  const def = defenderElementPair(defender, defElement);
  const elementRelation = magicElementRelation(attacker, defender, aEl, def.primary);
  const elementalModifier = elementalDamageMultiplier(elementRelation);

  let raw = (baseMagic - defStat * COMBAT_BALANCE.magicDefenseScalar) * balancedVariance() * elementalModifier;
  const magicBoost = ladderEffectPct(attacker, 'magicDamagePct');
  const elementBoost = ladderEffectPct(attacker, 'elementBoost', (fx) => fx.element === aEl);
  const bossBoost = defender?.isLadderEnemy && defender?.ladderStageKind === 'bigBoss'
    ? ladderEffectPct(attacker, 'bossDamagePct')
    : 0;
  raw *= 1 + (magicBoost + elementBoost + bossBoost) / 100;

  let critical = false;
  let weak = false;
  if (rollPercentChance(attacker?.stats?.critPct ?? COMBAT_BALANCE.baseCritChance)) {
    critical = true;
    raw *= COMBAT_BALANCE.critMultiplier;
  } else if (rollPercentChance(6)) {
    weak = true;
    raw *= 0.75;
  }

  const damage = applyCombatDamageModifiers(raw, {
    attacker,
    defender,
    strikeKind: 'magic',
    elementRelation,
  });
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
    defElement: def.primary,
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
