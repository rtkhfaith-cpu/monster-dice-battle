/**
 * Passive skill combat resolution — integrates with battleLogic resolvers.
 */
import { rollPercentChance } from '../../utils/battleLogic';
import {
  COMBAT_BALANCE,
  applyCombatDamageModifiers,
  dodgeChance,
  clamp,
  randomVariance,
} from '../gameBalance/combat';
import { statusStatMultiplier } from '../../utils/statusEffects';
import {
  PASSIVE_CAPS,
  PASSIVE_POPUP_PRIORITY,
  PASSIVE_SKILL_IDS,
  getPassiveEffect,
} from './passiveSkills';
import {
  applyDotStatus,
  healingMultiplier,
  isDotDamageContext,
} from './statusEffects';

const POPUP_LABELS = {
  DODGED: 'DODGED',
  MISS: 'MISS',
  CRITICAL: 'CRITICAL',
  BARRIER: 'BARRIER',
  IRON_GUARD: 'IRON GUARD',
  BLOOD_DRAIN: 'BLOOD DRAIN',
  REFLECT: 'REFLECT',
  POISONED: 'POISONED',
  BURN: 'BURN',
  REGEN: 'REGEN',
  RAGE_CORE: 'RAGE CORE',
};

function ensureBattleState(fighter) {
  if (!fighter.passiveBattleState) {
    fighter.passiveBattleState = { barrierConsumed: false, rageCoreShown: false };
  }
  return fighter.passiveBattleState;
}

function passivesOf(fighter) {
  return Array.isArray(fighter?.equippedPassives) ? fighter.equippedPassives : [];
}

function sumPassive(fighter, skillId, field) {
  return passivesOf(fighter)
    .filter((p) => p.skillId === skillId)
    .reduce((s, p) => s + (getPassiveEffect(p.skillId, p.rarity)[field] ?? 0), 0);
}

function hasPassive(fighter, skillId) {
  return passivesOf(fighter).some((p) => p.skillId === skillId);
}

function statMid(range, fallback) {
  if (typeof range === 'number') return range;
  if (!range || typeof range.min !== 'number' || typeof range.max !== 'number') return fallback;
  return Math.round((range.min + range.max) / 2);
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

function rollDodge(attacker, defender, magic, phantomBonus = 0) {
  let pct = dodgeChance({
    attackerSpeed: attacker?.stats?.agility ?? attacker?.stats?.speed ?? 10,
    defenderSpeed: defender?.stats?.agility ?? defender?.stats?.speed ?? 10,
    magic,
    bossKind: attacker?.ladderStageKind ?? null,
  });
  pct += phantomBonus;
  pct = clamp(pct, COMBAT_BALANCE.dodgeMin, PASSIVE_CAPS.dodgePct);
  return rollPercentChance(pct);
}

function rageCoreMultiplier(attacker) {
  if (!hasPassive(attacker, PASSIVE_SKILL_IDS.RAGE_CORE)) return 1;
  const p = passivesOf(attacker).find((x) => x.skillId === PASSIVE_SKILL_IDS.RAGE_CORE);
  if (!p) return 1;
  const e = getPassiveEffect(p.skillId, p.rarity);
  const maxHp = attacker.maxHp ?? attacker.stats?.hp ?? 1;
  const hpPct = maxHp > 0 ? (attacker.hp / maxHp) * 100 : 100;
  if (hpPct > (e.hpThresholdPct ?? 50)) return 1;
  return 1 + (e.atkBonusPct ?? 0) / 100;
}

function effectiveCritChance(attacker) {
  let pct = attacker?.stats?.critPct ?? COMBAT_BALANCE.baseCritChance;
  pct += sumPassive(attacker, PASSIVE_SKILL_IDS.FATAL_INSTINCT, 'critBonusPct');
  return clamp(pct, 0, PASSIVE_CAPS.critPct);
}

function addPopup(popups, label) {
  const priority = PASSIVE_POPUP_PRIORITY[label] ?? 99;
  popups.push({ label, priority });
}

function pickTopPopups(popups, max = 3) {
  return [...popups]
    .sort((a, b) => a.priority - b.priority)
    .slice(0, max)
    .map((p) => p.label);
}

function clampHeal(amount, fighter) {
  const maxHp = fighter.maxHp ?? fighter.stats?.hp ?? 100;
  const missing = Math.max(0, maxHp - fighter.hp);
  return Math.min(missing, Math.max(0, Math.round(amount)));
}

/**
 * Full attack resolution with passives.
 * @param {{ attacker: object, defender: object, skill?: object, strikeKind?: 'physical'|'magic', atkElement?: string, defElement?: string }} opts
 */
export function resolveAttackWithPassives({
  attacker,
  defender,
  skill = null,
  strikeKind = 'physical',
  atkElement,
  defElement,
}) {
  const popups = [];
  const battleLogEntries = [];
  let atk = { ...attacker };
  let def = { ...defender };
  ensureBattleState(atk);
  ensureBattleState(def);

  const magic = strikeKind === 'magic';
  const phantomBonus = sumPassive(def, PASSIVE_SKILL_IDS.PHANTOM_STEP, 'dodgeBonusPct');

  if (!rollPercentChance(attackHitChance(atk, def, magic))) {
    addPopup(popups, 'MISS');
    battleLogEntries.push(`${def.displayName ?? 'Defender'} avoided the attack!`);
    return buildResult({
      damage: 0,
      dodged: true,
      critical: false,
      weak: false,
      defended: false,
      strikeKind,
      attacker: atk,
      defender: def,
      popupsToShow: pickTopPopups(popups),
      battleLogEntries,
    });
  }

  if (rollDodge(atk, def, magic, phantomBonus)) {
    addPopup(popups, 'DODGED');
    battleLogEntries.push(`${def.displayName ?? 'Defender'} dodged!`);
    return buildResult({
      damage: 0,
      dodged: true,
      critical: false,
      weak: false,
      defended: false,
      strikeKind,
      attacker: atk,
      defender: def,
      popupsToShow: pickTopPopups(popups),
      battleLogEntries,
    });
  }

  const powerMult = skill?.power ?? (magic ? 1.2 : 1);
  const atkMult = statusStatMultiplier(atk, 'attack') * rageCoreMultiplier(atk);
  const defMult = statusStatMultiplier(def, 'def');

  let raw;
  if (magic) {
    const baseMagic = statMid(atk?.stats?.magic, 10) * powerMult * atkMult;
    const mdFallback = statMid(def?.stats?.def, 5);
    const defStat = statMid(def?.stats?.magicDef, mdFallback) * defMult;
    raw = (baseMagic - defStat * COMBAT_BALANCE.magicDefenseScalar) * randomVariance();
  } else {
    const baseAttack = statMid(atk?.stats?.attack, 10) * atkMult * powerMult;
    const defStat = statMid(def?.stats?.def, 5) * defMult;
    raw = (baseAttack - defStat * COMBAT_BALANCE.physicalDefenseScalar) * randomVariance();
  }

  let critical = rollPercentChance(effectiveCritChance(atk));
  let weak = false;
  if (critical) {
    addPopup(popups, 'CRITICAL');
    raw *= COMBAT_BALANCE.critMultiplier;
  } else if (rollPercentChance(magic ? 6 : 8)) {
    weak = true;
    raw *= 0.75;
  }

  let damage = applyCombatDamageModifiers(raw, { attacker: atk, defender: def, strikeKind });

  const defState = ensureBattleState(def);
  if (!defState.barrierConsumed && hasPassive(def, PASSIVE_SKILL_IDS.MANA_BARRIER) && damage > 0) {
    const p = passivesOf(def).find((x) => x.skillId === PASSIVE_SKILL_IDS.MANA_BARRIER);
    const e = getPassiveEffect(p.skillId, p.rarity);
    const red = (e.damageReductionPct ?? 0) / 100;
    const reduced = Math.round(damage * red);
    damage = Math.max(0, damage - reduced);
    defState.barrierConsumed = true;
    addPopup(popups, 'BARRIER');
    battleLogEntries.push(`Mana Barrier reduced damage by ${e.damageReductionPct}%.`);
  }

  if (critical && hasPassive(def, PASSIVE_SKILL_IDS.IRON_GUARD)) {
    const p = passivesOf(def).find((x) => x.skillId === PASSIVE_SKILL_IDS.IRON_GUARD);
    const e = getPassiveEffect(p.skillId, p.rarity);
    const cut = (e.critDamageReductionPct ?? 0) / 100;
    const extra = Math.round(damage * (COMBAT_BALANCE.critMultiplier - 1) * cut);
    damage = Math.max(1, damage - extra);
    addPopup(popups, 'IRON_GUARD');
    battleLogEntries.push(`Iron Guard softened the critical hit.`);
  }

  damage = Math.max(0, Math.round(damage));
  let healing = 0;
  let reflectedDamage = 0;
  const statusEffectsApplied = [];

  if (damage > 0) {
    def = { ...def, hp: Math.max(0, def.hp - damage) };

    const lsPct = Math.min(
      PASSIVE_CAPS.lifestealPct,
      sumPassive(atk, PASSIVE_SKILL_IDS.BLOOD_DRAIN, 'lifestealPct'),
    );
    if (lsPct > 0) {
      healing = clampHeal((damage * lsPct) / 100 * healingMultiplier(atk), atk);
      if (healing > 0) {
        atk = { ...atk, hp: Math.min(atk.maxHp ?? atk.stats?.hp ?? 100, atk.hp + healing) };
        addPopup(popups, 'BLOOD_DRAIN');
        battleLogEntries.push(
          `${atk.displayName ?? 'Attacker'} restored ${healing} HP with Blood Drain.`,
        );
      }
    }

    const toxic = passivesOf(atk).find((p) => p.skillId === PASSIVE_SKILL_IDS.TOXIC_FANG);
    if (toxic && rollPercentChance(20)) {
      const e = getPassiveEffect(toxic.skillId, toxic.rarity);
      def = applyDotStatus(def, 'poison', { dotMaxHpPct: e.dotMaxHpPct, turns: e.turns });
      statusEffectsApplied.push('poison');
      addPopup(popups, 'POISONED');
      battleLogEntries.push(`${def.displayName ?? 'Target'} was poisoned.`);
    }

    const inferno = passivesOf(atk).find((p) => p.skillId === PASSIVE_SKILL_IDS.INFERNO_CURSE);
    if (inferno && rollPercentChance(20)) {
      const e = getPassiveEffect(inferno.skillId, inferno.rarity);
      def = applyDotStatus(def, 'burn', {
        dotMaxHpPct: e.dotMaxHpPct,
        turns: e.turns,
        healReductionPct: e.healReductionPct,
      });
      statusEffectsApplied.push('burn');
      addPopup(popups, 'BURN');
      battleLogEntries.push(`${def.displayName ?? 'Target'} was burned.`);
    }

    const reflectPct = Math.min(
      PASSIVE_CAPS.reflectPct,
      sumPassive(def, PASSIVE_SKILL_IDS.MIRROR_SHELL, 'reflectPct'),
    );
    if (reflectPct > 0) {
      reflectedDamage = Math.max(1, Math.round((damage * reflectPct) / 100));
      atk = { ...atk, hp: Math.max(0, atk.hp - reflectedDamage) };
      addPopup(popups, 'REFLECT');
      battleLogEntries.push(`Mirror Shell reflected ${reflectedDamage} damage.`);
    }
  }

  if (rageCoreMultiplier(atk) > 1 && !ensureBattleState(atk).rageCoreShown) {
    ensureBattleState(atk).rageCoreShown = true;
    addPopup(popups, 'RAGE_CORE');
  }

  return buildResult({
    damage,
    critical,
    weak,
    defended: false,
    dodged: false,
    strikeKind,
    attacker: atk,
    defender: def,
    healing,
    reflectedDamage,
    statusEffectsApplied,
    popupsToShow: pickTopPopups(popups),
    battleLogEntries,
  });
}

function buildResult(fields) {
  return {
    finalDamage: fields.damage,
    damage: fields.damage,
    ...fields,
  };
}

/** Start-of-turn regen for one fighter. */
export function resolveStartOfTurnPassives(fighter) {
  const popups = [];
  const battleLogEntries = [];
  let f = { ...fighter };
  ensureBattleState(f);

  const regenPassive = passivesOf(f).find((p) => p.skillId === PASSIVE_SKILL_IDS.REGENERATION_AURA);
  if (regenPassive) {
    const e = getPassiveEffect(regenPassive.skillId, regenPassive.rarity);
    const maxHp = f.maxHp ?? f.stats?.hp ?? 100;
    let heal = Math.round((maxHp * (e.healMaxHpPct ?? 0)) / 100);
    heal = Math.round(heal * healingMultiplier(f));
    const applied = clampHeal(heal, f);
    if (applied > 0) {
      f = { ...f, hp: f.hp + applied };
      addPopup(popups, 'REGEN');
      battleLogEntries.push(`${f.displayName ?? 'Monster'} recovered ${applied} HP (Regeneration Aura).`);
    }
  }

  return {
    fighter: f,
    healing: 0,
    popupsToShow: pickTopPopups(popups),
    battleLogEntries,
  };
}

export { POPUP_LABELS, isDotDamageContext };
