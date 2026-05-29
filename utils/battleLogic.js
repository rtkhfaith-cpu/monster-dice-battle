import { randInt } from './random';
import { getElementRelation, resolveMagicElementRelation } from './elements';
import { applyStatus, statusStatMultiplier } from './statusEffects';
import { healingMultiplier } from '../src/gameSystems/statusEffects';
import {
  COMBAT_BALANCE,
  applyCombatDamageModifiers,
  dodgeChance,
  elementalDamageMultiplier,
  randomVariance as balancedVariance,
} from '../src/gameBalance/combat';
import {
  getAttackerHitRateStat,
  getDefenderDodgeStat,
} from '../src/gameBalance/dodgeHitRate';

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

/** Auto dodge roll — defender.dodge minus attacker.hitRate (flat stats), clamped 0–60%. */
function rollAutoDodge(attacker, defender, magic = false) {
  const defenderDodge = getDefenderDodgeStat(defender?.stats);
  const hasFlatDodge =
    typeof defender?.stats?.dodge === 'number' || typeof defender?.stats?.dodgePct === 'number';
  const pct = dodgeChance({
    attackerSpeed: attacker?.stats?.agility ?? attacker?.stats?.speed ?? 10,
    defenderSpeed: defender?.stats?.agility ?? defender?.stats?.speed ?? 10,
    attackerHitRate: getAttackerHitRateStat(attacker?.stats),
    defenderDodge: hasFlatDodge ? defenderDodge : null,
    magic,
    bossKind: defender?.ladderStageKind ?? attacker?.ladderStageKind ?? null,
  });
  return rollPercentChance(pct);
}

/** Attack connects (before dodge) — agility only; hitRate does not affect this roll. */
function attackHitChance(attacker, defender, magic = false) {
  const attackerAgility = attacker?.stats?.agility ?? attacker?.stats?.speed ?? 10;
  const defenderAgility = defender?.stats?.agility ?? defender?.stats?.speed ?? 10;
  const agilityDelta = defenderAgility - attackerAgility;
  const magicBonus = magic ? 2 : 0;
  const pct = 92 - agilityDelta * 0.25 + magicBonus;
  return Math.max(76, Math.min(98, pct));
}

function rollAttackAvoided(attacker, defender, magic = false) {
  if (!rollPercentChance(attackHitChance(attacker, defender, magic))) return true;
  return rollAutoDodge(attacker, defender, magic);
}

/** Gear set / modifier bonuses from new gear system. */
function gearModifierPct(fighter, key) {
  const mods = fighter?.gearModifiers;
  if (!mods) return 0;
  return typeof mods[key] === 'number' ? mods[key] : 0;
}

/** Legacy ladder effect hook → new gear modifiers. */
function ladderEffectPct(fighter, type) {
  const mods = fighter?.gearModifiers;
  if (!mods) return 0;
  if (type === 'magicDamagePct' || type === 'elementBoost') {
    return (mods.fireDamagePct ?? 0) + Math.floor((mods.firePower ?? 0) * 0.5);
  }
  if (type === 'bossDamagePct') return 0;
  if (type === 'enemyMissMagicChance') return 0;
  return 0;
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

  let damage = applyCombatDamageModifiers(raw, {
    attacker,
    defender,
    strikeKind: 'physical',
    elementRelation: 'neutral',
  });
  const damageReduction = gearModifierPct(defender, 'damageReductionPct');
  if (damageReduction > 0) {
    damage = Math.max(1, Math.round(damage * (1 - damageReduction / 100)));
  }
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

  let damage = applyCombatDamageModifiers(raw, {
    attacker,
    defender,
    strikeKind: 'magic',
    elementRelation,
  });
  const damageReduction = gearModifierPct(defender, 'damageReductionPct');
  if (damageReduction > 0) {
    damage = Math.max(1, Math.round(damage * (1 - damageReduction / 100)));
  }
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

const SUPPORT_STATUS_TYPES = new Set(['heal', 'revive', 'atkUp', 'defUp']);

/** Magic skills that target the caster instead of dealing damage. */
export function isSupportMagicSkill(skill) {
  const t = skill?.status?.type;
  return skill?.kind === 'magic' && SUPPORT_STATUS_TYPES.has(t);
}

function clampHealAmount(amount, fighter) {
  const maxHp = fighter?.maxHp ?? fighter?.stats?.hp ?? 100;
  const missing = Math.max(0, maxHp - (fighter?.hp ?? 0));
  return Math.min(missing, Math.max(0, Math.round(amount)));
}

function ensurePassiveBattleState(fighter) {
  if (!fighter.passiveBattleState) {
    return { ...fighter, passiveBattleState: { barrierConsumed: false, rageCoreShown: false, skillCooldowns: {} } };
  }
  if (!fighter.passiveBattleState.skillCooldowns) {
    return {
      ...fighter,
      passiveBattleState: { ...fighter.passiveBattleState, skillCooldowns: {} },
    };
  }
  return fighter;
}

/** Decrement support skill cooldowns at start of a fighter's turn. */
export function tickSupportCooldowns(fighter) {
  const state = fighter?.passiveBattleState;
  if (!state?.skillCooldowns) return fighter;
  const cooldowns = { ...state.skillCooldowns };
  let changed = false;
  for (const key of Object.keys(cooldowns)) {
    if (cooldowns[key] > 0) {
      cooldowns[key] -= 1;
      changed = true;
    }
  }
  if (!changed) return fighter;
  return {
    ...fighter,
    passiveBattleState: { ...state, skillCooldowns: cooldowns },
  };
}

function reviveCooldownLeft(attacker, skill) {
  const cdKey = skill?.id ?? 'revive';
  return attacker?.passiveBattleState?.skillCooldowns?.[cdKey] ?? 0;
}

function setReviveCooldown(attacker, skill, st) {
  const cdKey = skill?.id ?? 'revive';
  const state = { ...(attacker.passiveBattleState ?? {}) };
  const cooldowns = { ...(state.skillCooldowns ?? {}) };
  cooldowns[cdKey] = Math.max(1, st.cooldownTurns ?? 4);
  return {
    ...attacker,
    passiveBattleState: { ...state, skillCooldowns: cooldowns },
  };
}

/**
 * Resolve self-target support magic (heal, revive, atkUp, defUp).
 * Revive restores a fallen ally — pass `fallenAllies` in team modes (dungeon / future co-op).
 * @returns {{ attacker: object, revivedAlly?: object|null, healing: number, message: string|null, ok: boolean }}
 */
export function resolveSupportMagicSkill(attacker, skill, { fallenAllies = [] } = {}) {
  const st = skill?.status;
  if (!st?.type || !SUPPORT_STATUS_TYPES.has(st.type)) {
    return { attacker, healing: 0, message: null, ok: false };
  }
  if (!rollPercentChance(Math.round((st.chance ?? 1) * 100))) {
    return { attacker, healing: 0, message: null, ok: false };
  }

  let atk = ensurePassiveBattleState({ ...attacker });
  const maxHp = atk.maxHp ?? atk.stats?.hp ?? 100;
  const name = atk.displayName ?? 'Monster';

  if (st.type === 'heal') {
    const pct = st.healMaxHpPct ?? 20;
    let heal = Math.round((maxHp * pct) / 100 * healingMultiplier(atk));
    heal = clampHealAmount(heal, atk);
    if (heal <= 0) {
      return { attacker: atk, healing: 0, message: `${name} is already at full HP.`, ok: false };
    }
    atk = { ...atk, hp: Math.min(maxHp, atk.hp + heal) };
    return { attacker: atk, healing: heal, message: `${name} restored ${heal} HP!`, ok: true };
  }

  if (st.type === 'revive') {
    const cdLeft = reviveCooldownLeft(atk, skill);
    if (cdLeft > 0) {
      return {
        attacker: atk,
        healing: 0,
        message: `Revival on cooldown (${cdLeft} turn${cdLeft === 1 ? '' : 's'}).`,
        ok: false,
      };
    }
    if (atk.hp <= 0) {
      return { attacker: atk, healing: 0, message: 'Cannot cast Revival while defeated.', ok: false };
    }
    const fallen = (fallenAllies || []).filter((a) => a && ((a.hp ?? 0) <= 0 || a.alive === false));
    if (fallen.length === 0) {
      return { attacker: atk, healing: 0, message: 'No fallen allies to revive.', ok: false };
    }
    const target = fallen.sort((a, b) => (a.position ?? 99) - (b.position ?? 99))[0];
    const pct = st.reviveHpPct ?? 40;
    const targetMaxHp = target.maxHp ?? target.stats?.hp ?? 100;
    const restoredHp = Math.max(1, Math.round(targetMaxHp * (pct / 100)));
    const revivedAlly = {
      ...target,
      hp: restoredHp,
      alive: true,
      statuses: {},
      status: null,
    };
    atk = setReviveCooldown(atk, skill, st);
    const targetName = target.displayName ?? target.name ?? 'Ally';
    return {
      attacker: atk,
      revivedAlly,
      healing: restoredHp,
      message: `${name} revived ${targetName} at ${pct}% HP!`,
      ok: true,
    };
  }

  if (st.type === 'atkUp' || st.type === 'defUp') {
    atk = applyStatus(atk, st.type, st.turns ?? 2, 1);
    const label = st.type === 'atkUp' ? 'Attack Up' : 'Defense Up';
    return { attacker: atk, healing: 0, message: `${name} gained ${label}!`, ok: true };
  }

  return { attacker: atk, healing: 0, message: null, ok: false };
}

/** Apply skill status proc to defender after a hit */
export function maybeApplySkillStatus(defender, skill) {
  const st = skill?.status;
  if (!st?.type || !st.chance || SUPPORT_STATUS_TYPES.has(st.type)) return defender;
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
